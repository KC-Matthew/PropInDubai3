/* off-plan-map.js — data 100% depuis Supabase, UI inchangée */
function detailHref(projet){
  const url = new URL('off-plan-click.html', location.href);
  if (projet?.id != null) url.searchParams.set('id', String(projet.id));
  if (projet?.titre)   url.searchParams.set('project', String(projet.titre));
  return url.toString();
}


/* ======== ÉTATS / GLOBALES ======== */
let projets = [];                    // remplace l'ancien tableau d'exemples
let filteredProjets = [];
let globalMinPrice = 500000, globalMaxPrice = 20000000, PRICE_STEP = 10000;
let windowSelectedMinPrice = globalMinPrice, windowSelectedMaxPrice = globalMaxPrice;

let priceSlider = null; // <-- ajoute ça en haut avec les autres let

let gmap;                     // Google Map
let gmarkers = [];            // AdvancedMarkerElement[]
let infoWindow = null;        // une seule InfoWindow réutilisée
let lastMarkerScale = 1;



// mémoire pour popups (évite le “flash”)
const OPEN_INFO = { id: null, html: "", marker: null };

// ferme-pas-la-popup à cause du clic carte hérité
let canCloseByMap = true;

// overlay pour conversions pixels <-> latLng (sert au pan offseté smooth)
let _overlay = null;


/* ======== CONFIG SOURCE ======== */
const OFFPLAN_TABLES = ["offplan"];
const STORAGE_BUCKET = "photos_biens";
const DEBUG_IMAGES = false;  // passe à false en prod


function ensureOverlay() {
  if (_overlay) return _overlay;
  const Ov = function(){};
  Ov.prototype = new google.maps.OverlayView();
  Ov.prototype.onAdd = function(){};
  Ov.prototype.onRemove = function(){};
  Ov.prototype.draw = function(){};
  _overlay = new Ov();
  _overlay.setMap(gmap);
  return _overlay;
}

function panToWithOffset(latLng, offsetX, offsetY) {
  if (!gmap || !latLng) return;
  const ov = ensureOverlay();
  const proj = ov.getProjection();
  if (!proj) { setTimeout(() => gmap.panTo(latLng), 0); return; }
  const pt = proj.fromLatLngToDivPixel(latLng);
  pt.x += offsetX;  // + = droite
  pt.y += offsetY;  // + = bas
  const target = proj.fromDivPixelToLatLng(pt);
  gmap.panTo(target); // ✅ une seule anim
}

function panToMarkerSmooth(marker) {
  const pos = marker.position;
  if (!pos) return;
  gmap.panTo(pos); // pas d’offset ici, l’ajustement se fera après rendu du popup
}



function desiredTopGap(){           // marge voulue
  return window.innerWidth < 701 ? 100 : 50;
}

// élément du popup (selon versions de Google Maps)
function getIwEl(){
  const root = gmap?.getDiv?.();
  return root?.querySelector('.gm-style-iw-d')
      || root?.querySelector('.gm-style-iw')
      || document.querySelector('.gm-style-iw-d')
      || document.querySelector('.gm-style-iw');
}

// boucle d’ajustement : mesure -> panBy -> attend 'idle' -> re-mesure
function nudgePopupTop(targetGap = desiredTopGap(), tries = 6){
  const iw = getIwEl();
  if (!iw || !gmap) return;
  const mapRect = gmap.getDiv().getBoundingClientRect();
  const r = iw.getBoundingClientRect();
  const current = r.top - mapRect.top;          // marge actuelle
  const delta   = Math.round(targetGap - current);
  if (Math.abs(delta) <= 1 || tries <= 0) return;

  gmap.panBy(0, delta);
  google.maps.event.addListenerOnce(gmap, 'idle', () => nudgePopupTop(targetGap, tries - 1));
}

function panToMarkerSmooth(marker){
  const pos = marker.position;
  if (!pos) return;
  gmap.panTo(pos);
}







function storagePublicUrl(key){
  if (!key) return null;
  const { data } = window.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
  return data?.publicUrl ?? null;
}

// Nettoyage minimal + conversion vers "clé" interne du bucket
function toBucketKey(value){
  if (value == null) return null;

  // Si Postgres a renvoyé un text[] => on prend le 1er élément non vide
  if (Array.isArray(value)) {
    for (const v of value) {
      const k = toBucketKey(v);
      if (k) return k;
    }
    return null;
  }

  let s = String(value)
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')  // zero-width
    .trim()
    .replace(/^"+|"+$/g, '')                      // "xx"
    .replace(/^'+|'+$/g, '');                     // 'xx'
  if (!s) return null;

  // text[] sérialisé "{a,b}" → "a"
  if (s[0] === '{' && s[s.length-1] === '}'){
    s = s.slice(1,-1).split(',')
         .map(x => x.replace(/^"+|"+$/g,'').trim())
         .find(Boolean) || '';
  }
  if (!s) return null;

  // On NE GARDE PAS les URLs http(s) → on force l’usage du bucket
  // On enlève les slashes de tête et tout préfixe "photos_biens/"
  s = s.replace(/^\/+/, '');
  const bucketRe = new RegExp(`^(?:${STORAGE_BUCKET}\\/)+`, 'i');
  s = s.replace(bucketRe, '');

  if (DEBUG_IMAGES) console.log('[bucket:key]', value, '=>', s);
  return s || null;
}

// value → URL publique du bucket (ou null)
function toPublicUrlFromBucket(value){
  const key = toBucketKey(value);
  return key ? storagePublicUrl(key) : null;
}

// Taille des marqueurs en fonction du zoom (diminue fortement quand on dézoome)
function markerScaleForZoom(z){
  const zoom = (z == null) ? (gmap?.getZoom?.() ?? 12) : z;
  const max = 1;
  const min = 0.2;
  const pivot = 14; // zoom auquel on garde la taille max
  const scale = max - Math.max(0, (pivot - zoom) * 0.2);
  return Math.max(min, Math.min(max, scale));
}



/* ======== HELPERS ======== */
const num = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = typeof v === "number" ? v : Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};


const currencyAED = (n) => {
  if (n == null) return "—";
  try { return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(n); }
  catch { return `AED ${Number(n).toLocaleString()}`; }
};


function storagePublicUrl(path){
  if (!path) return null;
  const { data } = window.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

// Nettoie les bizarreries fréquentes (espaces invisibles, guillemets, etc.)
function cleanString(s){
  return String(s)
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')   // zero-width & BOM
    .replace(/^\s+|\s+$/g, '')                    // trim normal
    .replace(/^"+|"+$/g, '')                      // guillemets entourant
    .replace(/^'+|'+$/g, '');                     // apostrophes entourant
}

// Chemin -> URL publique (gère string, text[], {"..."}), ou garde http(s)
function toPublicUrl(value){
  if (value == null) return null;

  // Postgres text[] déjà parsé en JS
  if (Array.isArray(value)){
    for (const v of value){
      const u = toPublicUrl(v);
      if (u) return u;
    }
    return null;
  }

  let s = cleanString(value);
  if (!s) return null;

  // text[] sérialisé: "{a,b}" -> on garde le 1er non vide
  if (s[0] === '{' && s[s.length-1] === '}'){
    const first = s.slice(1,-1).split(',')
      .map(x => cleanString(x.replace(/^"(.*)"$/, '$1')))
      .find(Boolean);
    s = first || '';
  }
  if (!s) return null;

  // Déjà URL absolue
  if (/^https?:\/\//i.test(s)) return s;

  // Enlève slashes de tête + tout préfixe "bucket/" répété
  s = s.replace(/^\/+/, '');
  const bucketRe = new RegExp(`^(?:${STORAGE_BUCKET}\\/)+`, 'i');
  s = s.replace(bucketRe, '');   // "photos_biens/biens2.jpg" -> "biens2.jpg"

  const url = storagePublicUrl(s);
  if (DEBUG_IMAGES){
    console.log('[img] raw=', value, '| cleaned=', s, '| url=', url);
  }
  return url;
}






/* ======== DÉTECTION DES COLONNES (exacte + fallback léger) ======== */
async function detectColumns(table){
  const { data, error } = await window.supabase.from(table).select("*").limit(1);
  if (error) throw error;
  const sample = (data && data[0]) || {};
  const has  = (k) => k && Object.prototype.hasOwnProperty.call(sample, k);
  const pick = (...c) => c.find(has);

  return {
    id:           pick("id","uuid"),

    title:        pick("titre","title","name"),
    location:     pick("localisation","location"),

    status:       pick("project status","status","project_status"),
    handover:     pick("handover estimated","handover","handover_estimated"),
    price:        pick("price starting","price","price_starting"),

    dev:          pick("developer name","developer","developer_name"),
    // ⬇️ ajout du nom correct avec underscore
    logoUrl:      pick("developer_photo_url","developer photo_url","developer_logo","logo_url"),

    imageUrl:     pick("photo_url","image_url","cover_url"),
    brochureUrl:  pick("brochure_url"),

    paymentPlan:  pick("payment plan","payment_plan"),
    desc:         pick("description","summary"),

    type:         pick("units types","unit_types","unit_type","property_type"),
    rooms:        pick("rooms","bedrooms","br"),
    bathrooms:    pick("bathrooms","baths","ba"),

    lat:          pick("lat","latitude"),
    lon:          pick("lon","lng","longitude"),
  };
}






async function waitForSupabase(timeout=8000){
  if (window.supabase) return;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Supabase not ready (timeout)")), timeout);
    const onReady = () => { clearTimeout(t); window.removeEventListener("supabase:ready", onReady); resolve(); };
    window.addEventListener("supabase:ready", onReady);
  });
}


function mapRow(row, COL){
  const priceNum = num(row[COL.price]);

  // --- helpers locaux : ne touchent pas le reste du fichier ---
  const parseCandidates = (val) => {
    if (val == null) return [];
    if (Array.isArray(val)) return val;
    let s = String(val).replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "").trim(); // invisibles
    if (!s) return [];
    if (s[0]==="{" && s[s.length-1]==="}") return s.slice(1,-1).split(",");
    if (s[0]==="[" && s[s.length-1]==="]") {
      try { return JSON.parse(s); } catch { return [s]; }
    }
    return s.split(/[\n,;|]/);
  };
  const normKey = (k) => {
    let key = String(k).trim().replace(/^["']+|["']+$/g, "");
    if (!key) return "";
    // si c’est déjà une URL publique supabase -> on ne garde que la clé après le bucket
    key = key.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/[^/]+\//i, "");
    key = key.replace(/^\/+/, "");
    key = key.replace(new RegExp(`^(?:${STORAGE_BUCKET}\\/)+`, "i"), "");
    return key;
  };
  const publicFromBucketKey = (key) => {
    if (!key) return null;
    const { data } = window.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
    return data?.publicUrl || null;
  };

  // --- Résolution des médias ---
  // 1) PHOTO: on privilégie *toujours* une clé du bucket; si rien -> fallback sur http
  const resolvePhoto = (val) => {
    const cand = parseCandidates(val);
    // a) clés du bucket d’abord
    for (const c of cand) {
      const s = String(c).trim();
      if (!/^https?:\/\//i.test(s)) {
        const url = publicFromBucketKey(normKey(s));
        if (url) return url;
      }
      if (/\/storage\/v1\/object\/public\//i.test(s)) {
        const url = publicFromBucketKey(normKey(s));
        if (url) return url;
      }
    }
    // b) sinon 1er http(s) valable
    for (const c of cand) {
      const s = String(c).trim().replace(/^["']+|["']+$/g, "");
      if (/^https?:\/\//i.test(s)) return s;
    }
    return null;
  };

  // 2) LOGO: on garde http d’abord (tu n’as pas de logos dans le bucket), puis bucket si fourni
  const resolveLogo = (val) => {
    const cand = parseCandidates(val);
    for (const c of cand) {
      const s = String(c).trim().replace(/^["']+|["']+$/g, "");
      if (/^https?:\/\//i.test(s)) return s; // http prioritaire pour logo
    }
    for (const c of cand) {
      const url = publicFromBucketKey(normKey(c));
      if (url) return url;
    }
    return null;
  };

  const rawPhoto = row.photo_url ?? row[COL.imageUrl];
  const rawLogo  = row.developer_photo_url ?? row[COL.logoUrl];

  const mainImg = resolvePhoto(rawPhoto);
  const logoImg = resolveLogo(rawLogo);

  const img  = mainImg || logoImg || "styles/photo/dubai-map.jpg";
  const logo = logoImg || img;

  // ---- Statut / handover ----
  const statusRaw   = String(row[COL.status] ?? "").trim();
  const handoverStr = String(row[COL.handover] ?? "").trim();
  const statusPhase =
    /launch/i.test(statusRaw)                  ? "launch"   :
    /handover|ready|complete/i.test(statusRaw) ? "handover" :
    /\bQ[1-4]\s*20\d{2}\b/i.test(handoverStr)  ? "handover" : "launch";
  const statusLabel = statusRaw || (statusPhase === "handover" ? "Handover Soon" : "Launch Soon");

  // ---- Bullets ----
  const details = [];
  if (row[COL.paymentPlan]) {
    String(row[COL.paymentPlan]).split(/\s*[\n•;,;-]\s*/).map(s=>s.trim()).filter(Boolean).forEach(x=>details.push(x));
  }
  if (Number.isFinite(priceNum) && !details.some(d => /AED/i.test(d))) {
    details.unshift(`From ${currencyAED(priceNum)}`);
  }
  if (row[COL.desc] && details.length < 3) {
    String(row[COL.desc]).split(/\s*[\n•;,;-]\s*/).map(s=>s.trim()).filter(Boolean).slice(0, 3 - details.length).forEach(x=>details.push(x));
  }

  // log ciblé pour vérifier bien1/bien2
  console.log("[media]", row[COL.id], {
    rawPhoto, resolvedImage: mainImg,
    rawLogo,  resolvedLogo: logoImg
  });

  return {
    id:  row[COL.id],
    lat: Number(row[COL.lat]),
    lon: Number(row[COL.lon]),
    statusPhase,
    statusLabel,
    titre: row[COL.title] || "Untitled",
    location: row[COL.location] || "",
    logo,
    image: img,
    prix: Number.isFinite(priceNum) ? currencyAED(priceNum) : "—",
    handover: handoverStr,
    dev: row[COL.dev] || "",
    details,
    rooms: row[COL.rooms] ?? "",
    bathrooms: row[COL.bathrooms] ?? "",
    type: row[COL.type] || "",
    _priceNum: Number.isFinite(priceNum) ? priceNum : null
  };
}











/* ======== FETCH MULTI-TABLE (avec fallback) ======== */
async function fetchOffplanData(){
  for (const table of OFFPLAN_TABLES){
    try {
      const COL = await detectColumns(table);

      // 1) essai principal
      let data = null, error = null;

      if (table === "properties" && COL.category){
        // d'abord avec le filtre
        let r = await window.supabase.from(table).select("*").eq(COL.category, "offplan").limit(500);
        data = r.data; error = r.error;

        // si 0 ligne, retry sans filtre (au cas où la valeur soit différente: OffPlan/off_plan/…)
        if (!error && (!data || data.length === 0)) {
          r = await window.supabase.from(table).select("*").limit(500);
          data = r.data; error = r.error;
          console.warn(`[Supabase] "${table}" sans filtre category (fallback). Lignes:`, data?.length ?? 0);
        }
      } else {
        const r = await window.supabase.from(table).select("*").limit(500);
        data = r.data; error = r.error;
      }

      if (error) { console.warn(`[Supabase] ${table}:`, error.message); continue; }
      if (!data || !data.length) continue;

      const mapped = data
        .map(r => mapRow(r, COL))
        .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));

      if (mapped.length) {
        console.log(`[offplan] table="${table}" colonnes détectées:`, COL);
        console.log(`[offplan] lignes brutes: ${data.length} | géocodées valides: ${mapped.length}`);
        return mapped;
      } else {
        console.warn(`[offplan] "${table}" trouvé mais pas de lat/lon valides (vérifie les noms de colonnes).`);
      }
    } catch (e) {
      console.warn(`[Supabase] fetch error on table`, table, e?.message || e);
      continue;
    }
  }
  return [];
}


/* ======== UI Helpers (dropdowns + prix) ======== */
function refreshDropdownOptions(){
  const devs  = [...new Set(projets.map(p => p.dev).filter(Boolean))].sort();
  const types = [...new Set(projets.map(p => p.type).filter(Boolean))].sort();

  const promoteurSel = document.getElementById('promoteurFilter');
  const typeSel      = document.getElementById('propertyTypeFilter');

  if (promoteurSel && promoteurSel.options.length <= 1){
    devs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d; opt.textContent = d;
      promoteurSel.appendChild(opt);
    });
  }
  if (typeSel && typeSel.options.length <= 1){
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      typeSel.appendChild(opt);
    });
  }
}
function recomputePriceBounds(){
  const nums = projets.map(p => p._priceNum).filter(n => Number.isFinite(n));
  if (!nums.length) return; // garde valeurs par défaut
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  globalMinPrice = Math.max(0, Math.floor(min/1000)*1000);
  globalMaxPrice = Math.ceil(max/1000)*1000;
  windowSelectedMinPrice = globalMinPrice;
  windowSelectedMaxPrice = globalMaxPrice;
}

/* ======== CHARGEMENT PRINCIPAL ======== */
async function loadProjectsFromSupabase(){
  if (!window.supabase){
    console.error("Supabase non initialisé. Vérifie que 'supabaseClient.js' est chargé AVANT ce fichier.");
    return;
  }
  const data = await fetchOffplanData();
  if (!data.length){
    console.warn("Aucune donnée off-plan trouvée (table vide, mauvais nom, ou RLS bloque la lecture).");
  }
  projets = data;
  if (DEBUG_IMAGES){
  projets.forEach(p => {
    if (!p.image || /dubai-map\.jpg$/i.test(p.image)){
      console.warn('[img-missing]', p.id, p.titre, 'image=', p.image, 'logo=', p.logo);
    }
  });
}

  recomputePriceBounds();
  refreshDropdownOptions();
  applyAllFilters(); // synchronise la carte avec les filtres en l'état
}


/* ======== MARKER (badge basé sur la DB) ======== */
function createPromoteurMarker(projet) {
  const badge = `
    <span class="marker-badge ${projet.statusPhase}">
      ${projet.statusLabel}
    </span>`;
  return `
    <div class="promoteur-marker">
      <img src="${projet.logo}" class="promoteur-marker-logo" alt="logo"/>
      <div class="promoteur-marker-title small">${projet.dev}</div>
      ${badge}
      <span class="promoteur-marker-pin"></span>
    </div>`;
}






/* ======== FILTRAGE + SYNCHRO ======== */
function applyAllFilters() {
  const selectedStatus       = document.getElementById('handoverFilter')?.value || "";
  const selectedPromoteur    = document.getElementById('promoteurFilter')?.value || "";
  const selectedPropertyType = document.getElementById('propertyTypeFilter')?.value || "";
  const selectedRoom         = document.getElementById('roomFilter')?.value || "";
  const selectedBathroom     = document.getElementById('bathroomFilter')?.value || "";
  const minVal = windowSelectedMinPrice, maxVal = windowSelectedMaxPrice;

  filteredProjets = projets.filter(p => {
    let ok = true;
    if (selectedStatus && selectedStatus !== "all")
      ok = ok && ((selectedStatus === 'handover') ? p.statusPhase === 'handover' : p.statusPhase === 'launch');
    if (selectedPromoteur && selectedPromoteur !== "all")
      ok = ok && (p.dev === selectedPromoteur);
    if (selectedPropertyType)
      ok = ok && (p.type === selectedPropertyType);
    if (selectedRoom)
      ok = ok && (selectedRoom === "4" ? Number(p.rooms) >= 4 : String(p.rooms) === selectedRoom);
    if (selectedBathroom)
      ok = ok && (selectedBathroom === "4" ? Number(p.bathrooms) >= 4 : String(p.bathrooms) === selectedBathroom);

    const priceNum = Number.isFinite(p._priceNum) ? p._priceNum : Infinity;
    ok = ok && priceNum >= minVal && priceNum <= maxVal;

    return ok;
  });

  updateMapMarkers();
}


function updateMapMarkers() {
  // clear
  gmarkers.forEach(m => { try { m.setMap && m.setMap(null); } catch{} });
  gmarkers = [];

  const hasAdvanced = !!(google.maps.marker && google.maps.marker.AdvancedMarkerElement);
  const currentScale = markerScaleForZoom();

  // helper: OverlayView HTML quand la lib 'marker' n'est pas dispo
  function makeHtmlOverlay(position, html, onClick) {
    class HtmlMarker extends google.maps.OverlayView {
      constructor(pos, html, onClick) { super(); this.position = pos; this.html = html; this.onClick = onClick; this._div = null; }
      onAdd() {
        this._div = document.createElement('div');
        this._div.className = 'gm-card-pin';
        this._div.innerHTML = this.html;
        this._div.style.position = 'absolute';
        this._div.style.transform = 'translate(-50%, -100%) scale(var(--marker-scale, 1))'; // ancre en bas-centre
        this._div.style.setProperty('--marker-scale', currentScale);
        this._div.style.cursor = 'pointer';
        if (this.onClick) this._div.addEventListener('click', this.onClick);
        this.getPanes().overlayMouseTarget.appendChild(this._div);
      }
      draw() {
        const proj = this.getProjection();
        if (!proj || !this._div) return;
        const p = proj.fromLatLngToDivPixel(this.position);
        this._div.style.left = p.x + 'px';
        this._div.style.top  = p.y + 'px';
      }
      onRemove() { if (this._div) { this._div.remove(); this._div = null; } }
    }
    return new HtmlMarker(position, html, onClick);
  }

  filteredProjets.forEach((projet) => {
    const pos = { lat: projet.lat, lng: projet.lon };
    let marker;

    if (hasAdvanced) {
      // --- Carte blanche custom (photo + Launch/Handover + promoteur)
      const wrapper = document.createElement('div');
      wrapper.className = 'gm-card-pin';
      wrapper.innerHTML = createPromoteurMarker(projet);
      wrapper.style.setProperty('--marker-scale', currentScale);

      marker = new google.maps.marker.AdvancedMarkerElement({
        map: gmap,
        position: pos,
        content: wrapper,
        gmpClickable: true,
        collisionBehavior: google.maps.CollisionBehavior.REQUIRED,
        zIndex: Math.round(pos.lat * 1e6)
      });

      marker.addListener('click', () => {
        canCloseByMap = false;
        panToMarkerSmooth(marker);
        showProjectPopup(projet, marker); // ancré au marker
        setTimeout(() => { canCloseByMap = true; }, 160);
      });
    } else {
      // --- Fallback: OverlayView HTML (aucune goutte non plus)
      const onClick = () => {
        canCloseByMap = false;
        const dy = window.innerWidth < 701 ? -160 : -110;
        panToWithOffset(new google.maps.LatLng(pos), 0, dy);
        showProjectPopup(projet, pos); // on passe la position (pas d'ancre)
        setTimeout(() => { canCloseByMap = true; }, 160);
      };
      marker = makeHtmlOverlay(pos, createPromoteurMarker(projet), onClick);
      marker.setMap(gmap);
      marker.__pos = pos; // pour réancrage popup
    }

    marker.__pid = projet.id;
    gmarkers.push(marker);
  });

  applyMarkerScale(currentScale);

  // si une popup était ouverte, on la ré-ancre proprement
  if (OPEN_INFO.id) {
    const mk = gmarkers.find(m => m.__pid === OPEN_INFO.id);
    if (mk) {
      if (infoWindow.getContent() !== OPEN_INFO.html) infoWindow.setContent(OPEN_INFO.html);
      if (mk.position) {
        // AdvancedMarker -> on ancre
        infoWindow.open({ anchor: mk, map: gmap });
        OPEN_INFO.marker = mk;
      } else if (mk.__pos) {
        // Overlay fallback -> on positionne
        infoWindow.setPosition(mk.__pos);
        infoWindow.open({ map: gmap });
        OPEN_INFO.marker = null;
      }
    }
  }
}

// Ajuste la taille des marqueurs selon le zoom (évite qu'ils couvrent la carte en dézoomant)
function applyMarkerScale(forceScale){
  const scale = forceScale ?? markerScaleForZoom();
  if (scale === lastMarkerScale) return;
  lastMarkerScale = scale;
  gmarkers.forEach(m => {
    const el = m.content || m._div || m.element;
    if (el && el.style) el.style.setProperty('--marker-scale', scale);
  });
}


/* ======== POPUP PRIX & HISTO ======== */
function fmt(n) { return Number(n).toLocaleString('en-US'); }

function openPricePopup() {
  const popup = document.getElementById("priceFilterPopup");
  popup.classList.add('active');
  updatePriceSliderAndHistogram();
  setTimeout(() => document.getElementById("priceMinInput").focus(), 120);
}
function closePricePopup() {
  document.getElementById("priceFilterPopup").classList.remove('active');
  document.body.classList.remove('price-popup-open');
}
function updatePriceSliderAndHistogram() {
  const minPrice = globalMinPrice, maxPrice = globalMaxPrice;
  const sliderElem = document.getElementById("priceSlider");
  if (priceSlider) { priceSlider.destroy(); priceSlider = null; sliderElem.innerHTML = ""; }
  const currentMin = windowSelectedMinPrice, currentMax = windowSelectedMaxPrice;
  const minInput = document.getElementById("priceMinInput");
  const maxInput = document.getElementById("priceMaxInput");

  priceSlider = noUiSlider.create(sliderElem, {
    start: [currentMin, currentMax],
    connect: true,
    step: PRICE_STEP,
    range: { min: minPrice, max: maxPrice },
    tooltips: [true, true],
    format: {
      to: v => fmt(Math.round(v)),
      from: v => Number(String(v).replace(/[^\d]/g, ""))
    }
  });

  minInput.value = fmt(currentMin);
  maxInput.value = fmt(currentMax);

  priceSlider.on('update', function(values){
    minInput.value = values[0];
    maxInput.value = values[1];
    document.getElementById("selectedPriceRange").textContent = values[0] + " - " + values[1] + " AED";
    drawPriceHistogram(minPrice, maxPrice, values);
  });

  minInput.onchange = function() {
    let minVal = Number(String(minInput.value).replace(/[^\d]/g,"")) || minPrice;
    let maxVal = Number(String(maxInput.value).replace(/[^\d]/g,"")) || maxPrice;
    minVal = Math.max(minPrice, Math.min(maxVal, minVal));
    priceSlider.set([minVal, null]);
  };
  maxInput.onchange = function() {
    let minVal = Number(String(minInput.value).replace(/[^\d]/g,"")) || minPrice;
    let maxVal = Number(String(maxInput.value).replace(/[^\d]/g,"")) || maxPrice;
    maxVal = Math.min(maxPrice, Math.max(minVal, maxVal));
    priceSlider.set([null, maxVal]);
  };

  document.getElementById("sliderMinLabel").textContent = fmt(minPrice) + " AED";
  document.getElementById("sliderMaxLabel").textContent = fmt(maxPrice) + " AED";
  document.getElementById("selectedPriceRange").textContent = fmt(currentMin) + " - " + fmt(currentMax) + " AED";
  drawPriceHistogram(minPrice, maxPrice, [currentMin, currentMax]);
}

function drawPriceHistogram(min, max, [sliderMin, sliderMax]=[min,max]) {
  const canvas = document.getElementById('priceHistogram');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const prices = [];
  for (let i = 0; i < 30; i++) prices.push(Math.floor(Math.random() * (max - min)) + min);
  const bins = 18, hist = Array(bins).fill(0);
  prices.forEach(price => {
    let idx = Math.floor((price - min) / (max - min) * (bins - 1));
    idx = Math.max(0, Math.min(bins - 1, idx));
    hist[idx]++;
  });
  const maxHist = Math.max(...hist, 2);
  for (let i = 0; i < bins; i++) {
    const x = Math.floor(i * width / bins) + 3;
    const barWidth = Math.floor(width / bins) - 7;
    const y = Math.floor(height - (hist[i] / maxHist) * (height-10));
    const barHeight = height - y;
    ctx.beginPath();
    ctx.fillStyle = (function(){
      const binStart = min + (i / bins) * (max - min);
      const binEnd = min + ((i+1)/bins) * (max - min);
      return (binEnd >= sliderMin && binStart <= sliderMax) ? "#f17100" : "#ffd2a5";
    })();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    if (ctx.roundRect) ctx.roundRect(x, y, barWidth, barHeight, 5); else ctx.rect(x, y, barWidth, barHeight);
    ctx.fill();
    ctx.stroke();
  }
  ctx.save();
  ctx.globalAlpha = 0.78;
  prices.forEach(price => {
    let px = Math.floor((price - min) / (max - min) * width);
    px = Math.max(4, Math.min(width - 4, px));
    ctx.beginPath();
    ctx.arc(px, height - 8, 2.2, 0, 2 * Math.PI);
    ctx.fillStyle = "#ff8300";
    ctx.fill();
  });
  ctx.restore();
}

/* ======== POPUP LEAFLET (zone cliquable -> fiche) ======== */
function showProjectPopup(projet, markerOrLatLng) {

const href = detailHref(projet);

const html = `
  <a class="offplan-iw-card popup-clickable"
     href="${href}"
     style="width:290px;display:block;color:inherit;text-decoration:none;cursor:pointer;">

    <div class="offplan-iw-hero">
      <img src="${projet.image || projet.logo}"
           onerror="this.onerror=null;this.src='styles/photo/dubai-map.jpg';"
           alt="${projet.titre || 'Project'}">
    </div>

    <div style="padding:10px 14px 0 14px;">
      <div class="offplan-iw-body">
        <div style="font-size:1.11rem;font-weight:700;margin-bottom:2px;">${projet.titre || ''}</div>
        <div style="color:#999;font-size:1rem;margin-bottom:5px;">
          <img src="https://img.icons8.com/ios-filled/15/aaaaaa/marker.png" style="margin-bottom:-2px;opacity:.68;">
          ${projet.location || ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
          <span style="color:#ff9100;font-weight:700;font-size:1.08rem;">${projet.prix || '—'}</span>
          <span style="font-weight:600;border-radius:9px;padding:2.5px 13px;font-size:.98rem;
            background:${projet.statusPhase==='launch'?'#f6efff':'#fff6e0'};
            color:${projet.statusPhase==='launch'?'#8429d3':'#ff9100'};">
            ${projet.statusLabel || ''}
          </span>
        </div>
        <div style="color:#757575;font-size:.99rem;margin-bottom:4px;">
          <img src="https://img.icons8.com/ios-glyphs/16/aaaaaa/clock--v1.png" style="margin-bottom:-2px;opacity:.8;"> <b>${projet.handover || ''}</b>
          &nbsp; <img src="https://img.icons8.com/ios-glyphs/16/aaaaaa/worker-male--v2.png" style="margin-bottom:-2px;opacity:.7;"> <b>${projet.dev || ''}</b>
        </div>
        ${(projet.details || []).map(d => `<div style="font-size:.98rem;color:#3d3d3d;">• ${d}</div>`).join('')}
      </div>
    </div>
  </a>
`;



  // ne remets pas le même contenu si déjà correct
  if (OPEN_INFO.html !== html) {
    infoWindow.setContent(html);
  }

  // ouvre (ancre marker si dispo, sinon latLng)
  if (markerOrLatLng?.position) {
    infoWindow.open({ anchor: markerOrLatLng, map: gmap });


    google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
  // 1) premier ajustement après que le DOM du popup existe
  nudgePopupTop();

  // 2) si l’image change la hauteur, on réajuste
  const iw = getIwEl();
  const img = iw?.querySelector?.('.offplan-iw-hero img');
  if (img && !img.complete) img.addEventListener('load', () => nudgePopupTop(), { once: true });

  // 3) filet de sécurité (layout async)
  setTimeout(() => nudgePopupTop(), 120);
});

// et si tu veux, encore un ajustement quand la carte a fini de recentrer
google.maps.event.addListenerOnce(gmap, 'idle', () => nudgePopupTop());


    google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
  // 1er réglage immédiat
  setPopupTopGap();

  // re-réglage après chargement de l’image (la hauteur change)
  const iw = document.querySelector('.gm-style-iw') || document.querySelector('.gm-style-iw-d');
  const img = iw?.querySelector?.('.offplan-iw-hero img');
  if (img && !img.complete) img.addEventListener('load', () => setPopupTopGap(), { once: true });

  // filet de sécurité (layout async)
  setTimeout(() => setPopupTopGap(), 120);
});

    setTimeout(() => ensurePopupVisible(), 0);
    OPEN_INFO.marker = markerOrLatLng;
  } else if (markerOrLatLng?.lat && markerOrLatLng?.lng) {
    infoWindow.setPosition(markerOrLatLng);
    infoWindow.open({ map: gmap });
    OPEN_INFO.marker = null;
  }

  OPEN_INFO.id = projet.id;
  OPEN_INFO.html = html;

  // branche le “click to detail” sur le DOM de l'InfoWindow
  setTimeout(() => {
    const iw = document.querySelector(".gm-style-iw") || document.body;
    const clickable = iw.querySelector?.(".popup-clickable");
    if (!clickable) return;

    const goToDetail = (e) => {
      e?.stopPropagation?.();
      const url = new URL('off-plan-click.html', location.href);
      if (projet.id) url.searchParams.set('id', String(projet.id));
      if (projet.titre) url.searchParams.set('project', String(projet.titre));
      window.location.href = url.toString();
    };

    clickable.addEventListener('click', goToDetail);
    clickable.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToDetail(e); }
    });

    window.__closeOffplanIW = () => infoWindow.close();
  }, 0);
}



function closeLeafletPopup() {
  if (window._leafletCustomPopup) {
    map.closePopup(window._leafletCustomPopup);
    window._leafletCustomPopup = null;
  }
}

function initOffplanMap() {
  const el = document.getElementById('map');
  if (!el) return;

  gmap = new google.maps.Map(el, {
    center: { lat: 25.2048, lng: 55.2708 },
    zoom: 11,
    mapTypeControl: false,
    fullscreenControl: true,
    streetViewControl: false,
  });

  infoWindow = new google.maps.InfoWindow({
    shouldFocus: false,
    disableAutoPan: true  // évite le micro “bump”
  });

  // clic à l’extérieur → ferme la popup (sauf clic hérité de marker)
  gmap.addListener("click", () => {
    if (!canCloseByMap) return;
    if (infoWindow && infoWindow.getMap()) {
      infoWindow.close();
      OPEN_INFO.id = null; OPEN_INFO.html = ""; OPEN_INFO.marker = null;
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && infoWindow && infoWindow.getMap()) {
      infoWindow.close();
      OPEN_INFO.id = null; OPEN_INFO.html = ""; OPEN_INFO.marker = null;
    }
  });

  ensureOverlay(); // pour le pan offset

  gmap.addListener('zoom_changed', () => {
    applyMarkerScale();
  });

  // si on a déjà les données, on affiche; sinon updateMapMarkers sera appelé après load
  if (filteredProjets.length) updateMapMarkers();
}

// expose pour le callback script
window.initOffplanMap = initOffplanMap;
// compat si le HTML appelle initMap
window.initMap = initOffplanMap;



/* ======== INIT GLOBAL (UI inchangée) ======== */
document.addEventListener('DOMContentLoaded', async function () {
  // 1) Carte


  // 2) Filtres
  document.getElementById('handoverFilter')    ?.addEventListener('change', applyAllFilters);
  document.getElementById('promoteurFilter')   ?.addEventListener('change', applyAllFilters);
  document.getElementById('propertyTypeFilter')?.addEventListener('change', applyAllFilters);
  document.getElementById('roomFilter')        ?.addEventListener('change', applyAllFilters);
  document.getElementById('bathroomFilter')    ?.addEventListener('change', applyAllFilters);
  document.getElementById('resetFilters')      ?.addEventListener('click', function () {
    document.getElementById('handoverFilter').selectedIndex = 0;
    document.getElementById('promoteurFilter').selectedIndex = 0;
    document.getElementById('propertyTypeFilter').selectedIndex = 0;
    document.getElementById('roomFilter').selectedIndex = 0;
    document.getElementById('bathroomFilter').selectedIndex = 0;
    windowSelectedMinPrice = globalMinPrice;
    windowSelectedMaxPrice = globalMaxPrice;
    document.getElementById('priceLabel').textContent = 'Price';
    applyAllFilters();
  });

  // 3) Popup prix
  document.getElementById("openPriceFilter")  ?.addEventListener("click", (e) => { e.stopPropagation(); openPricePopup(); });
  document.getElementById("closePricePopup")  ?.addEventListener("click", closePricePopup);
  document.getElementById("validatePriceBtn") ?.addEventListener("click", function () {
    let minVal = Number(String(document.getElementById("priceMinInput").value).replace(/[^\d]/g,"")) || globalMinPrice;
    let maxVal = Number(String(document.getElementById("priceMaxInput").value).replace(/[^\d]/g,"")) || globalMaxPrice;
    minVal = Math.max(globalMinPrice, Math.min(globalMaxPrice, minVal));
    maxVal = Math.max(globalMinPrice, Math.min(globalMaxPrice, maxVal));
    windowSelectedMinPrice = minVal;
    windowSelectedMaxPrice = maxVal;
    document.getElementById('priceLabel').textContent =
      (minVal > globalMinPrice || maxVal < globalMaxPrice) ? `${fmt(minVal)} – ${fmt(maxVal)} AED` : 'Price';
    applyAllFilters();
    closePricePopup();
  });
  document.addEventListener('mousedown', function(e) {
    const popup = document.getElementById('priceFilterPopup');
    if (popup?.classList.contains('active') &&
        !popup.querySelector('.price-popup-inner').contains(e.target) &&
        e.target.id !== 'openPriceFilter') {
      closePricePopup();
    }
  });

  // 4) Burger + menu d'achat (inchangé)
  const burger = document.getElementById('burgerMenu');
  const allButton = document.querySelector('.all-button');
  if (burger && allButton) {
    burger.onclick = function (e) {
      e.stopPropagation();
      allButton.classList.toggle('mobile-open');
    };
    document.addEventListener('click', function (e) {
      if (!allButton.contains(e.target) && !burger.contains(e.target)) {
        allButton.classList.remove('mobile-open');
      }
    });
  }
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');
  if (buyDropdown && mainBuyBtn) {
    mainBuyBtn.addEventListener('click', function(e) {
      e.preventDefault();
      buyDropdown.classList.toggle('open');
    });
    document.addEventListener('click', function(e) {
      if (!buyDropdown.contains(e.target)) buyDropdown.classList.remove('open');
    });
  }

  // 5) Tabs navigation (inchangé)
  (() => {
    const tabMap = document.getElementById('tab-map');
    const tabListing = document.getElementById('tab-listing');
    const go = (file) => new URL(file, window.location).href;
    if (tabMap) {
      tabMap.addEventListener('click', (e) => { e.preventDefault(); window.location.href = go('off-plan-search.html'); }, { once: true });
    }
    if (tabListing) {
      tabListing.addEventListener('click', (e) => { e.preventDefault(); window.location.href = go('off-plan-search.html'); }, { once: true });
    }
    const p = location.pathname.toLowerCase();
    if (p.endsWith('/off-plan-search.html')) {
      tabMap?.classList.add('active'); tabListing?.classList.remove('active');
    } else if (p.endsWith('/off-plan-search.html')) {
      tabListing?.classList.add('active'); tabMap?.classList.remove('active');
    }
  })();

  // 6) CHARGEMENT SUPABASE
  try {
    await waitForSupabase();              // <— NEW
    await loadProjectsFromSupabase();
    console.log("[offplan] projets chargés:", projets.length);
  } catch (e) {
    console.error(e);
  }

});
