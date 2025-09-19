
// ----- keep a consistent top gap for the popup -----
function desiredTopGapMap(){                // air souhaité
  return window.innerWidth < 701 ? 26 : 32;
}
function getIwElMap(){
  const root = map?.getDiv?.();
  return root?.querySelector('.gm-style-iw-d')
      || root?.querySelector('.gm-style-iw')
      || document.querySelector('.gm-style-iw-d')
      || document.querySelector('.gm-style-iw');
}
function nudgePopupTopMap(targetGap = desiredTopGapMap(), tries = 6){
  const iw = getIwElMap();
  if (!iw || !map) return;
  const mapRect = map.getDiv().getBoundingClientRect();
  const r = iw.getBoundingClientRect();
  const current = r.top - mapRect.top;           // marge actuelle (px)
  const delta   = Math.round(targetGap - current);
  if (Math.abs(delta) <= 1 || tries <= 0) return;
  map.panBy(0, delta);
  google.maps.event.addListenerOnce(map, 'idle', () => nudgePopupTopMap(targetGap, tries - 1));
}




// early-exit si la page n'a pas les éléments attendus
if (!document.getElementById("agentsGrid") &&
    !document.querySelector(".agents-container") &&
    !document.getElementById("agentList")) {
  // rien à faire sur cette page
  // stoppe l'exécution du fichier entier
  // (encapsule le reste de ton code dans un bloc ou retourne ici si module)
}

// ===== Helpers "card hover" – dispo en global =====
function highlightProperty(idx) {
  const cards = document.querySelectorAll(".property-card");
  if (cards[idx]) cards[idx].classList.add("active");
}
function unhighlightProperty(idx) {
  const cards = document.querySelectorAll(".property-card");
  if (cards[idx]) cards[idx].classList.remove("active");
}
// on les expose pour les autres scripts (common.js, etc.)
window.highlightProperty = highlightProperty;
window.unhighlightProperty = unhighlightProperty;



  function goToDetails(p) {
    // on garde aussi en session pour le fallback de bien.js
    try {
      sessionStorage.setItem('selected_property', JSON.stringify({ id: p.id, type: p.type }));
    } catch {}
    const url = `bien.html?id=${encodeURIComponent(p.id)}&type=${encodeURIComponent(p.type)}`;
    window.location.href = url;
  }

  // Basemap EN color (CARTO Voyager)
  const EN_TILE_URL =
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const EN_ATTR =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> & <a href="https://carto.com/attributions">CARTO</a>';


  // (Optionnel) clé MapTiler pour géocode plus robuste EN.
  // Laisse vide => fallback Nominatim (OK en dev, éviter en prod pour gros volume).
  const MAPTILER_KEY = ""; // ex: "AbCdEfGh..."

  /* ===========================
    STATE
    =========================== */

  let allProperties = [];            // rempli depuis Supabase
let map;



  let currentPage = 1;
  const cardsPerPage = 6;
  let filteredProperties = [];
  let visibleProperties = [];
  let popupLayer = null;
  // --- anti-fermeture immédiate de l'InfoWindow ---
  let _justOpenedFromMarker = false;



  

  // mini cache local (évite de re-géocoder les mêmes lieux)
  const GEO_CACHE_KEY = "propindubai_geo_cache_v1";
  let GEO_CACHE = {};
  try { GEO_CACHE = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}"); } catch { GEO_CACHE = {}; }

  function saveGeoCache() {
    try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(GEO_CACHE)); } catch {}
  }

  /* ===========================
    UI helpers
    =========================== */

  function showInlineError(msg) {
    let bar = document.getElementById("supabase-error");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "supabase-error";
      bar.style.cssText = "position:fixed;top:12px;left:12px;z-index:9999;background:#ffe7e7;color:#920; border:1px solid #f3b; padding:10px 14px;border-radius:9px;box-shadow:0 6px 24px rgba(0,0,0,.08);font:600 14px system-ui;";
      document.body.appendChild(bar);
    }
    bar.textContent = msg;
  }

  /* ===========================
    SUPABASE -> Rows
    =========================== */

  async function waitSupabaseReady() {
    if (window.supabase) return;
    await new Promise(res => window.addEventListener("supabase:ready", res, { once:true }));
  }

  function normalizePlace(str) {
    return (str || "").toString().trim();
  }

  // Sélectionne les bonnes colonnes selon la table (image aliasée => image_url).
  function selectFor(table) {
    const a1 = 'localisation_accueil:"localisation accueil"';
    const a2 = 'localisation_accueil:"localisation acceuil"';

    if (table === "buy") {
      const common = 'id,title,property_type,bedrooms,bathrooms,price,sqft,agent_id,created_at,';
      const img = 'image_url:photo_bien_url';
      return [
        `${common}${img},${a1}`,
        `${common}${img},${a2}`
      ];
    }

    if (table === "rent") {
      const common = 'id,title,property_type,bedrooms,bathrooms,price,sqft,agent_id,created_at,';
      const img = 'image_url:photo_url';
      return [
        `${common}${img},${a1}`,
        `${common}${img},${a2}`
      ];
    }

    // commercial: la colonne est "property type" (avec un espace)
    const commonCommercial =
      'id,title,property_type:"property type",bedrooms,bathrooms,price,sqft,agent_id,created_at,';
    const imgCommercial = 'image_url:photo_url';
    return [
      `${commonCommercial}${imgCommercial},${a1}`,
      `${commonCommercial}${imgCommercial},${a2}`
    ];
  }

  async function safeSelect(table) {
    const sb = window.supabase;
    const variants = selectFor(table);
    let lastErr = null;
    for (const sel of variants) {
      const { data, error } = await sb.from(table)
        .select(sel)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (!error) return { data };
      lastErr = error;
    }
    return { error: lastErr, data: null };
  }

  async function loadRows() {
    await waitSupabaseReady();
    const [buy, rent, commercial] = await Promise.all([
      safeSelect("buy"),
      safeSelect("rent"),
      safeSelect("commercial"),
    ]);

    const firstErr = buy.error || rent.error || commercial.error;
    if (firstErr) {
      showInlineError(`Supabase error: ${firstErr.message}`);
    }

    const rows = []
      .concat((buy.data || []).map(r => ({ t: "buy", r })))
      .concat((rent.data || []).map(r => ({ t: "rent", r })))
      .concat((commercial.data || []).map(r => ({ t: "commercial", r })));

    return rows;
  }

  /* ===========================
    Geocoding (EN only)
    =========================== */

  // 1) essaie la table "geocache" (si tu la crées dans Supabase)
  // 2) sinon cache localStorage
  // 3) sinon MapTiler (anglais), sinon Nominatim (fallback)

  async function geocodeFromDb(qKey) {
    try {
      const { data, error } = await window.supabase
        .from("geocache")
        .select("lat,lng")
        .eq("q", qKey)
        .maybeSingle?.() // supabase-js v2
        || await window.supabase
        .from("geocache")
        .select("lat,lng")
        .eq("q", qKey)
        .limit(1);
      if (data && (data.lat || (data[0] && data[0].lat))) {
        const row = data.lat ? data : data[0];
        return { lat: Number(row.lat), lng: Number(row.lng) };
      }
    } catch {}
    return null;
  }

  async function upsertGeocache(qKey, original, coords) {
    try {
      await window.supabase.from("geocache").upsert({
        q: qKey, original, lat: coords.lat, lng: coords.lng
      }, { onConflict: "q" });
    } catch {}
  }

  async function geocodeViaMapTiler(q) {
    if (!MAPTILER_KEY) return null;
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${MAPTILER_KEY}&language=en&limit=1&country=AE`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const f = j.features && j.features[0];
    if (!f || !f.center) return null;
    const [lng, lat] = f.center;
    return { lat, lng };
  }

  async function geocodeViaNominatim(q) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q + ", Dubai, UAE")}&accept-language=en`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || !j[0]) return null;
    return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
  }

  async function geocodePlace(placeRaw) {
    const place = normalizePlace(placeRaw);
    if (!place) return { lat: 25.2048, lng: 55.2708 }; // centre Dubai

    const key = place.toLowerCase();

    // 0) cache local
    if (GEO_CACHE[key]) return GEO_CACHE[key];

    // 1) cache BDD (si table existe)
    const fromDb = await geocodeFromDb(key);
    if (fromDb) {
      GEO_CACHE[key] = fromDb; saveGeoCache();
      return fromDb;
    }

    // 2) MapTiler (EN)
    let coords = await geocodeViaMapTiler(place);
    // 3) fallback Nominatim (dev/test)
    if (!coords) coords = await geocodeViaNominatim(place);

    if (!coords) coords = { lat: 25.2048, lng: 55.2708 };

    GEO_CACHE[key] = coords; saveGeoCache();
    // essaie d’enregistrer côté Supabase (silencieux si table absente)
    upsertGeocache(key, place, coords);
    return coords;
  }

  /* ===========================
    Rows -> Properties
    =========================== */

  // rows -> property
function rowToProperty(row, tableName, coords) {
  // -- 0) utilitaire : convertir une clé storage -> URL publique
  function toPublicUrl(firstLike, bucketHint) {
    if (!firstLike) return null;
    const s = String(firstLike).replace(/^["']+|["']+$/g, "").replace(/^\/+/, "");

    // déjà une URL publique
    if (/^https?:\/\//i.test(s) || /\/storage\/v1\/object\/public\//i.test(s)) return s;

    // clé storage → URL publique via supabase.storage
    if (window.supabase?.storage) {
      const allowed = new Set(["buy","rent","commercial","offplan","agents","agency","photos_biens"]);
      let bucket = String(bucketHint || "buy").toLowerCase();
      let key = s;

      const m = /^([^/]+)\/(.+)$/.exec(key);
      if (m && allowed.has(m[1].toLowerCase())) { bucket = m[1].toLowerCase(); key = m[2]; }
      if (key.toLowerCase().startsWith(bucket + "/")) key = key.slice(bucket.length + 1);

      const { data } = window.supabase.storage.from(bucket).getPublicUrl(key);
      if (data?.publicUrl) return data.publicUrl;
    }
    return s; // fallback
  }

  // -- 1) lire la/les images depuis image_url
  const raw = row.image_url;
  let list = [];
  if (Array.isArray(raw)) {
    list = raw.slice();
  } else if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) list = arr;
      } catch {}
    }
    if (!list.length) {
      list = s.replace(/^\[|\]$/g, "")
              .split(/[\n,;,|]+/)
              .map(x => x.trim())
              .filter(Boolean);
    }
  }

  // pas d'image -> placeholder
  if (!list.length) list = ["styles/photo/fond.jpg"];

  // -- 2) résoudre en URL publiques
  const images = list.map(x => toPublicUrl(x, tableName)).filter(Boolean);
  const imgUrl = images[0] || "styles/photo/fond.jpg";

  // -- 3) reste des champs
  const location = row.localisation_accueil || "Dubai";
  const priceNum = Number(row.price) || 0;

  return {
    id: row.id,
    type: tableName,
    title: row.title || row.property_type || "Property",
    location,
    price: `${priceNum.toLocaleString("en-US")} AED`,
    priceNum,
    bedrooms: Number(row.bedrooms) || 0,
    bathrooms: Number(row.bathrooms) || 0,
    size: row.sqft ? `${row.sqft} sqft` : "",
    image: imgUrl,      // première image (compat)
    images,             // 🔥 toutes les images pour le carrousel
    lat: coords.lat,
    lng: coords.lng
  };
}



  async function loadPropertiesFromSupabase() {
    const rows = await loadRows();
    const out = [];

    // géocode en série pour éviter les rate-limits
    for (const { t, r } of rows) {
      const place = r.localisation_accueil || "";
      const coords = await geocodePlace(place);
      out.push(rowToProperty(r, t, coords));
    }
    allProperties = out;
    filteredProperties = allProperties.slice();
    visibleProperties = filteredProperties.slice();
  }

  /* ===========================
    MAP
    =========================== */
  /* ===========================
    MAP (Google Maps)
    =========================== */
/******************** 1) GLOBALS ********************/

let infoWindow = null;

let markersGroup = [];
let markerMap = Object.create(null);

// État de la popup ouverte pour éviter tout “flash”
const OPEN_INFO = {
  id: null,     // id du bien ouvert
  html: "",     // HTML déjà injecté (évite les setContent inutiles)
  marker: null  // marker où l’info est ancrée
};

// Évite la fermeture “héritée” juste après un clic marker
let canCloseByMap = true;


function initMap() {
  const center = { lat: 25.23, lng: 55.3 };
  const targetId = (window.innerWidth < 701) ? "leafletMapMobile" : "leafletMap";
  const el = document.getElementById(targetId);
  if (!el) return;

  // Carte
  map = new google.maps.Map(el, {
    center,
    zoom: 12,
    mapTypeControl: false,
    fullscreenControl: true,
    streetViewControl: false,
    clickableIcons: false
  });

  // Une seule InfoWindow réutilisée
  infoWindow = new google.maps.InfoWindow({
    shouldFocus: false,
    disableAutoPan: true
  });

  // À chaque rendu de l'InfoWindow, on enlève le bouton de fermeture natif
  google.maps.event.addListener(infoWindow, "domready", () => {
    const root = map.getDiv();
    root
      .querySelectorAll(
        ".gm-style-iw-c > button.gm-ui-hover-effect, .gm-style-iw-c > button[aria-label='Close']"
      )
      .forEach(btn => btn.remove()); // (ou: btn.style.display = "none")
  });

  // Clic sur la carte -> ferme la popup (protégé par canCloseByMap)
  map.addListener("click", () => {
    if (!canCloseByMap) return;
    if (infoWindow && infoWindow.getMap()) {
      infoWindow.close();
      OPEN_INFO.id = null;
      OPEN_INFO.html = "";
      OPEN_INFO.marker = null;
    }
  });

  // Échap -> ferme la popup
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && infoWindow && infoWindow.getMap()) {
      infoWindow.close();
      OPEN_INFO.id = null;
      OPEN_INFO.html = "";
      OPEN_INFO.marker = null;
    }
  });

  // Quand la vue se stabilise, (re)calcule les biens visibles
  map.addListener("idle", updateVisibleProperties);
}





  // Recalcule la liste visible + rerender + markers
  function updateVisibleProperties() {
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;

    visibleProperties = filteredProperties.filter(p =>
      bounds.contains(new google.maps.LatLng(p.lat, p.lng))
    );

    if (window.innerWidth < 701) {
      renderMobileProperties(visibleProperties);
    } else {
      renderProperties(currentPage);
    }
    showMarkers(visibleProperties);
  }

  // Expose la fonction pour le callback du SDK (&callback=initMap)
  window.initMap = initMap;







  /* ===========================
    SEARCH + RENDER (identique)
    =========================== */

  function filterProperties() {
    const searchInput = document.getElementById("searchInput");
    const minPriceInput = document.getElementById("minPriceInput");
    const maxPriceInput = document.getElementById("maxPriceInput");
    const value = (searchInput?.value || "").trim().toLowerCase();
    const minPrice = parseInt(minPriceInput?.value, 10) || 0;
    const maxPrice = parseInt(maxPriceInput?.value, 10) || Number.MAX_SAFE_INTEGER;
    filteredProperties = allProperties.filter(p =>
      (p.title.toLowerCase().includes(value) || p.location.toLowerCase().includes(value)) &&
      p.priceNum >= minPrice && p.priceNum <= maxPrice
    );
    updateVisibleProperties();
  }

  function filterMobileProperties() {
    const mobileSearchInput = document.getElementById("mobileSearchInput");
    const mobileMinPriceInput = document.getElementById("mobileMinPriceInput");
    const mobileMaxPriceInput = document.getElementById("mobileMaxPriceInput");
    const value = (mobileSearchInput?.value || "").trim().toLowerCase();
    const minPrice = parseInt(mobileMinPriceInput?.value, 10) || 0;
    const maxPrice = parseInt(mobileMaxPriceInput?.value, 10) || Number.MAX_SAFE_INTEGER;
    filteredProperties = allProperties.filter(p =>
      (p.title.toLowerCase().includes(value) || p.location.toLowerCase().includes(value)) &&
      p.priceNum >= minPrice && p.priceNum <= maxPrice
    );
    updateVisibleProperties();
  }

  function renderProperties(page = 1) {
    currentPage = page;
    const grid = document.getElementById("propertyGrid");
    const pagination = document.getElementById("pagination");
    if (!grid) return;
    grid.innerHTML = "";
    const start = (page - 1) * cardsPerPage;
    const slice = visibleProperties.slice(start, start + cardsPerPage);
    slice.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "property-card";
      card.innerHTML = `
        <img src="${p.image}" alt="${p.title}">
        <div class="property-info">
          <div class="property-title">${p.title}</div>
          <div class="property-location"><i class="fa fa-map-marker-alt"></i> ${p.location}</div>
          <div class="property-details-row">
            🛏️ ${p.bedrooms} &nbsp; 🛁 ${p.bathrooms} &nbsp; 📐 ${p.size}
          </div>
          <div class="property-price">${p.price}</div>
        </div>
      `;
      card.onmouseenter = () => { p.active = true; highlightMarker(p.id); card.classList.add("active"); };
      card.onmouseleave = () => { p.active = false; unhighlightMarker(p.id); card.classList.remove("active"); };
      card.onclick = () => { window.location.href = "bien.html"; };
      grid.appendChild(card);
    });
    renderPagination(pagination, visibleProperties.length);
  }

  function renderPagination(pagination, nb) {
    if (!pagination) return;
    const pages = Math.ceil(nb / cardsPerPage);
    pagination.innerHTML = "";
    if (pages <= 1) return;
    for (let i = 1; i <= pages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      if (i === currentPage) btn.classList.add("active");
      btn.onclick = () => renderProperties(i);
      pagination.appendChild(btn);
    }
  }

  function renderMobileProperties(props) {
    const list = document.getElementById("propertyListMobile");
    if (!list) return;
    list.innerHTML = "";
    props.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "property-card";
      card.style.margin = "12px 16px";
      card.innerHTML = `
        <img src="${p.image}" alt="${p.title}" style="width:100%;height:120px;object-fit:cover;border-radius:13px 13px 0 0;">
        <div class="property-info" style="padding:10px 10px 10px 14px;">
          <div class="property-title" style="font-weight:600;font-size:1.17rem;color:#222;margin-bottom:3px;">${p.title}</div>
          <div class="property-location" style="font-size:0.97rem;color:#666;margin-bottom:3px;">
            <i class="fa fa-map-marker-alt"></i> ${p.location}
          </div>
          <div class="property-details-row" style="font-size:0.97rem;color:#999;">
            🛏️ ${p.bedrooms} &nbsp; 🛁 ${p.bathrooms} &nbsp; 📐 ${p.size}
          </div>
          <div class="property-price" style="font-weight:bold;color:#ff8800;margin-top:7px;font-size:1.08rem;">
            ${p.price}
          </div>
        </div>
      `;
      card.onclick = () => { window.location.href = "bien.html"; };
      list.appendChild(card);
    });
  }

  /* ===========================
    MARKERS (Google Maps)
    =========================== */

  function clearMarkers() {
    for (const m of markersGroup) {
      try { m.setMap(null); } catch {}
    }
    markersGroup = [];
    markerMap = {};
  }

  function showMarkers(props) {
    if (!map) return;
    clearMarkers();

    props.forEach((p, idx) => {
      const marker = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        title: p.title || "",
        zIndex: p.active ? 999 : undefined,
      });

      marker.addListener("mouseover", () => window.highlightProperty?.(idx));
      marker.addListener("mouseout",  () => window.unhighlightProperty?.(idx));

marker.addListener("click", () => {
  canCloseByMap = false;
  showMiniCardOnMap(p, null, marker);
  setTimeout(() => { canCloseByMap = true; }, 160);
});





      markersGroup.push(marker);
      markerMap[p.id] = marker;
    });

    // --- à la fin de showMarkers(props) ---
if (OPEN_INFO.id && markerMap[OPEN_INFO.id]) {
  const mk = markerMap[OPEN_INFO.id];
  if (!infoWindow.getMap() || OPEN_INFO.marker !== mk) {
    // ne réécrit pas le contenu si identique
    if (infoWindow.getContent() !== OPEN_INFO.html) {
      infoWindow.setContent(OPEN_INFO.html);
    }
    infoWindow.open({ anchor: mk, map });
    OPEN_INFO.marker = mk;
  }
}


  }



  // Recentre doucement sur le marker et remonte un peu la vue
function focusOnMarker(marker) {
  if (!map || !marker) return;
  const pos = marker.getPosition();
  if (!pos) return;

  // si déjà centré +/- (évite un pan inutile)
  const c = map.getCenter();
  if (c && Math.abs(c.lat() - pos.lat()) < 0.0002 && Math.abs(c.lng() - pos.lng()) < 0.0002) {
    // petit offset seulement
    map.panBy(0, window.innerWidth < 701 ? -160 : -110);
    return;
  }

  // 1) panTo vers le marker
  map.panTo(pos);

  // 2) une fois le pan terminé (prochain idle), on applique un offset vers le haut
  const once = map.addListener("idle", () => {
    google.maps.event.removeListener(once);
    // remonte un peu pour que l'InfoWindow soit bien visible au-dessus du marker
    map.panBy(0, window.innerWidth < 701 ? -160 : -110);
  });
}


function showMiniCardOnMap(property, latlng, marker) {
  const detailUrl =
    `bien.html?id=${encodeURIComponent(property.id)}&type=${encodeURIComponent(property.type)}`;

  const hasGallery = Array.isArray(property.images) && property.images.length > 1;
  const imgId = `iw-img-${property.id}`;
  const prevId = `iw-prev-${property.id}`;
  const nextId = `iw-next-${property.id}`;
  const wrapId = `iw-wrap-${property.id}`;

  const html = `
    <a href="${detailUrl}" class="map-mini-card"
       style="display:block;width:260px;background:#fff;color:#111;text-decoration:none;border:2px solid #ffb347;border-radius:16px;overflow:hidden;box-shadow:0 6px 28px rgba(0,0,0,.14);cursor:pointer">
      <div id="${wrapId}" style="position:relative;width:100%;height:150px;overflow:hidden">
        <img id="${imgId}" src="${property.image}" alt="${property.title}"
             style="width:100%;height:100%;object-fit:cover;display:block;border-radius:0"/>
        ${hasGallery ? `
          <button id="${prevId}" type="button"
                  style="position:absolute;left:8px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:none;border-radius:50%;background:#fff;box-shadow:0 3px 10px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;opacity:.95">
            ‹
          </button>
          <button id="${nextId}" type="button"
                  style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:none;border-radius:50%;background:#fff;box-shadow:0 3px 10px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;opacity:.95">
            ›
          </button>
        ` : ``}
      </div>
      <div style="padding:12px 14px 12px 14px">
        <div style="font-weight:700;font-size:1.12rem;margin-bottom:2px;">${property.title}</div>
        <div style="font-size:.98rem;color:#666;margin-bottom:4px;">
          <i class="fa fa-map-marker-alt"></i> ${property.location}
        </div>
        <div style="font-size:.97rem;color:#444;margin-top:2px;">
          🛏️ ${property.bedrooms} &nbsp; 🛁 ${property.bathrooms} &nbsp; 📐 ${property.size}
        </div>
        <div style="font-weight:800;color:#ff8800;font-size:1.06rem;margin-top:6px;">
          ${property.price}
        </div>
      </div>
    </a>
  `;

  // pas de re-render inutile
  if (OPEN_INFO.id === property.id && infoWindow?.getMap() && OPEN_INFO.marker === marker) return;
  if (OPEN_INFO.html !== html) infoWindow.setContent(html);

  // ouvre/ancre sans déplacer la carte
  if (!infoWindow.getMap() || OPEN_INFO.marker !== marker) {
    if (marker) {
      infoWindow.open({ anchor: marker, map });
    } else if (latlng) {
      infoWindow.setPosition(latlng);
      infoWindow.open({ map });
    }
  }

  // brancher la logique du carrousel au moment où le DOM de l’InfoWindow est prêt
  google.maps.event.addListenerOnce(infoWindow, "domready", () => {
    // enlever le bouton "X" natif au cas où
    const root = map.getDiv();
    root.querySelectorAll('.gm-style-iw-c > button.gm-ui-hover-effect,[aria-label="Close"]')
        .forEach(b => b.remove());

    if (!hasGallery) return;

    const imgs = property.images.slice();
    let idx = 0;
    const imgEl = document.getElementById(imgId);
    const prev = document.getElementById(prevId);
    const next = document.getElementById(nextId);
    const wrap = document.getElementById(wrapId);

    function setIdx(n) {
      idx = (n + imgs.length) % imgs.length;
      if (imgEl) imgEl.src = imgs[idx];
    }
    function stopNav(e) { e.preventDefault(); e.stopPropagation(); } // évite d’ouvrir la fiche

    if (prev) prev.addEventListener("click", e => { stopNav(e); setIdx(idx - 1); });
    if (next) next.addEventListener("click", e => { stopNav(e); setIdx(idx + 1); });

    // swipe (mobile)
    let sx = 0, sy = 0;
    wrap?.addEventListener("touchstart", e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive:true });
    wrap?.addEventListener("touchend", e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        dx < 0 ? setIdx(idx + 1) : setIdx(idx - 1);
      }
    }, { passive:true });
  });

  OPEN_INFO.id = property.id;
  OPEN_INFO.html = html;
  OPEN_INFO.marker = marker || null;
}








  function highlightMarker(id) {
    const m = markerMap[id];
    if (!m) return;
    try { m.setAnimation(google.maps.Animation.BOUNCE); } catch {}
  }

  function unhighlightMarker(id) {
    const m = markerMap[id];
    if (!m) return;
    try { m.setAnimation(null); } catch {}
  }

  /* ===========================
    BOOTSTRAP
    =========================== */

  // Tes listeners (burger, dropdown, mobile deck, autocomplete, prix) restent inchangés.
  // On ajoute seulement ce bootstrap pour charger Supabase + géocoder avant rendu.

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      // Si Google Maps est déjà chargé, on init tout de suite,
      // sinon on laisse le callback ?callback=initMap le faire.
      if (window.google && window.google.maps) {
        initMap();
      } else {
        window.initMap = initMap;
      }

      await loadPropertiesFromSupabase();

      // branchements inchangés (desktop)
      const searchInput = document.getElementById("searchInput");
      const searchBtn = document.getElementById("searchBtn");
      const minPriceInput = document.getElementById("minPriceInput");
      const maxPriceInput = document.getElementById("maxPriceInput");
      if (searchInput && searchBtn && minPriceInput && maxPriceInput) {
        searchInput.addEventListener("input", filterProperties);
        searchBtn.addEventListener("click", filterProperties);
        minPriceInput.addEventListener("input", filterProperties);
        maxPriceInput.addEventListener("input", filterProperties);
      }

      // branchements inchangés (mobile)
      const mobileSearchInput = document.getElementById("mobileSearchInput");
      const mobileSearchBtn = document.getElementById("mobileSearchBtn");
      const mobileMinPriceInput = document.getElementById("mobileMinPriceInput");
      const mobileMaxPriceInput = document.getElementById("mobileMaxPriceInput");
      if (mobileSearchInput && mobileSearchBtn && mobileMinPriceInput && mobileMaxPriceInput) {
        mobileSearchInput.addEventListener("input", filterMobileProperties);
        mobileSearchBtn.addEventListener("click", filterMobileProperties);
        mobileMinPriceInput.addEventListener("input", filterMobileProperties);
        mobileMaxPriceInput.addEventListener("input", filterMobileProperties);
      }

      // premier rendu inchangé
      if (window.innerWidth < 701) {
        filterMobileProperties();
      } else {
        filterProperties();
      }
    } catch (e) {
      console.error(e);
      showInlineError(`Init error: ${e.message}`);
    }
  });



  /************ PRICE SUGGESTIONS (Min / Max) ************/

  // valeurs exactes demandées
  const priceOptions = [
    0,20000,50000,100000,200000,
    300000, 400000, 500000, 600000, 700000, 800000, 900000,
    1000000, 1100000, 1200000, 1300000, 1400000, 1500000,
    1600000, 1700000, 1800000, 1900000, 2000000, 2100000, 2200000,
    2300000, 2400000, 2500000, 2600000, 2700000, 2800000, 2900000,
    3000000, 3250000, 3500000, 3750000, 4000000, 4250000, 4500000,
    5000000, 6000000, 7000000, 8000000, 9000000, 10000000,
    25000000, 50000000
  ];

  function formatPrice(n) {
    return n.toLocaleString('en-US');
  }

  function showPriceSuggestions(input, suggestionsDiv) {
    if (!suggestionsDiv) return;
    suggestionsDiv.innerHTML = '';
    priceOptions.forEach(val => {
      const div = document.createElement('div');
      div.className = 'suggestion';
      div.textContent = formatPrice(val);
      div.onclick = () => {
        input.value = val;                 // on met la valeur numérique
        suggestionsDiv.style.display = 'none';
        input.dispatchEvent(new Event('input')); // retrigger le filtre live
        // en desktop, relance le filtre pour maj cards/markers
        if (typeof filterProperties === 'function') filterProperties();
      };
      suggestionsDiv.appendChild(div);
    });
    suggestionsDiv.style.display = 'block';
  }

  // brancher les listeners après le DOM prêt
  document.addEventListener('DOMContentLoaded', () => {
    const minInput = document.getElementById('minPriceInput');
    const maxInput = document.getElementById('maxPriceInput');
    const minSuggestions = document.getElementById('minPriceSuggestions');
    const maxSuggestions = document.getElementById('maxPriceSuggestions');

    if (minInput && minSuggestions) {
      const openMin = (e) => { e.stopPropagation(); showPriceSuggestions(minInput, minSuggestions); };
      minInput.addEventListener('focus', openMin);
      minInput.addEventListener('click', openMin);
    }
    if (maxInput && maxSuggestions) {
      const openMax = (e) => { e.stopPropagation(); showPriceSuggestions(maxInput, maxSuggestions); };
      maxInput.addEventListener('focus', openMax);
      maxInput.addEventListener('click', openMax);
    }

    // fermer si on clique ailleurs
    document.addEventListener('click', (e) => {
      if (minSuggestions && !minSuggestions.contains(e.target) && e.target !== minInput) {
        minSuggestions.style.display = 'none';
      }
      if (maxSuggestions && !maxSuggestions.contains(e.target) && e.target !== maxInput) {
        maxSuggestions.style.display = 'none';
      }
    });

    // un petit délai pour éviter de fermer instantanément au blur
    if (minInput && minSuggestions) {
      minInput.addEventListener('blur', () => setTimeout(() => minSuggestions.style.display = 'none', 120));
    }
    if (maxInput && maxSuggestions) {
      maxInput.addEventListener('blur', () => setTimeout(() => maxSuggestions.style.display = 'none', 120));
    }
  });




  /* === MOBILE BOTTOM-SHEET: compatible avec TON HTML/CSS existants === */
  /* À COLLER tout en bas de javascript/maps.js */
  (function attachMobileDeck() {
    document.addEventListener('DOMContentLoaded', () => {
      const deck = document.querySelector('.mobile-cards-deck');
      if (!deck || deck.dataset.deckInited === '1') return; // anti double-init
      deck.dataset.deckInited = '1';

      const handle = deck.querySelector('.deck-handle');
      const STATES = ['collapsed', 'half', 'full'];
      let state = STATES.find(s => deck.classList.contains(s)) || 'collapsed';

      function setState(s) {
        STATES.forEach(c => deck.classList.remove(c));
        deck.classList.add(s);
        state = s;
        // on rend la main au CSS, pas d'inline persistant
        deck.style.top = '';
        deck.style.height = '';
        // évite le scroll de la page quand la deck est en plein écran
        document.body.style.overflow = (s === 'full') ? 'hidden' : '';
      }

      // Mesure les positions pixel réelles définies par ton CSS (80/50/18vh)
      function measureTops() {
        const tops = {};
        const curState = state;
        const saved = {
          transition: deck.style.transition,
          top: deck.style.top,
          height: deck.style.height
        };
        deck.style.transition = 'none';

        STATES.forEach(s => {
          STATES.forEach(c => deck.classList.remove(c));
          deck.classList.add(s);
          deck.style.top = '';
          deck.style.height = '';
          // force reflow et lit la position réelle
          tops[s] = deck.getBoundingClientRect().top;
        });

        // restore
        STATES.forEach(c => deck.classList.remove(c));
        deck.classList.add(curState);
        deck.style.transition = saved.transition;
        deck.style.top = saved.top;
        deck.style.height = saved.height;

        return tops;
      }

      let TOPS = measureTops();
      window.addEventListener('resize', () => {
        TOPS = measureTops();
        setState(state); // réaligne visuellement
      });

      // Tap/clic sur le handle : cycle collapsed -> half -> full -> collapsed
      handle.addEventListener('click', () => {
        setState(state === 'collapsed' ? 'half' : state === 'half' ? 'full' : 'collapsed');
      });

      // Drag du handle
      let dragging = false, startY = 0, startTop = 0;

      function onDown(e) {
        dragging = true;
        deck.style.transition = 'none';
        startY = (e.touches ? e.touches[0].clientY : e.clientY);
        startTop = deck.getBoundingClientRect().top;

        document.addEventListener('mousemove', onMove, { passive: false });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchend', onUp);
      }

      function onMove(e) {
        if (!dragging) return;
        if (e.cancelable) e.preventDefault(); // évite le scroll pendant le drag

        const y = (e.touches ? e.touches[0].clientY : e.clientY);
        const dy = y - startY;

        const min = TOPS.full;        // plus haut (18vh)
        const max = TOPS.collapsed;   // plus bas (80vh)

        let newTop = startTop + dy;
        if (newTop < min) newTop = min;
        if (newTop > max) newTop = max;

        deck.style.top = `${newTop}px`;
      }

      function onUp() {
        if (!dragging) return;
        dragging = false;
        deck.style.transition = ''; // remet la transition CSS

        const curTop = deck.getBoundingClientRect().top;
        const candidates = [
          { s: 'collapsed', v: TOPS.collapsed },
          { s: 'half',      v: TOPS.half },
          { s: 'full',      v: TOPS.full }
        ].sort((a, b) => Math.abs(curTop - a.v) - Math.abs(curTop - b.v));

        setState(candidates[0].s);

        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchend', onUp);
      }

      handle.addEventListener('mousedown', onDown);
      handle.addEventListener('touchstart', onDown, { passive: true });
    });
  })();



  async function safeSelect(table) {
  const sb = window.supabase;
  const variants = selectFor(table);
  for (const sel of variants) {
    const { data, error } = await sb.from(table)
      .select(sel)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!error && Array.isArray(data)) return { data };
  }
  // toutes les variantes ont échoué → retourne tableau vide
  return { data: [] };
}






// === Place la barre de recherche dans le deck mobile (et la remet en desktop) ===
(function attachSearchBarRelocator() {
  const mq = window.matchMedia('(max-width: 900px)');
  const searchBar = document.getElementById('propertySearchBar') || document.querySelector('.property-search-bar');

  function placeSearchBar() {
    if (!searchBar) return;

    const deck      = document.querySelector('.mobile-cards-deck');
    const deckHandle= deck ? deck.querySelector('.deck-handle') : null;
    const leftCol   = document.querySelector('.map-side-left');
    const grid      = document.getElementById('propertyGrid');

    if (mq.matches && deck && deckHandle) {
      // MOBILE ➜ mets la barre juste sous la poignée du deck
      deckHandle.insertAdjacentElement('afterend', searchBar);
      searchBar.classList.add('in-deck');
    } else if (leftCol && grid) {
      // DESKTOP ➜ remets la barre au-dessus des cards
      leftCol.insertBefore(searchBar, grid);
      searchBar.classList.remove('in-deck');
    }
  }

  // au chargement + quand la taille change
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', placeSearchBar);
  } else {
    placeSearchBar();
  }
  if (mq.addEventListener) {
    mq.addEventListener('change', placeSearchBar);
  } else {
    window.addEventListener('resize', placeSearchBar);
  }
})();











/* ===== SCROLL UNLOCK (maps.js) ===== */
(function unlockScroll() {
  const unlock = () => {
    // enlève tout verrou éventuel
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
  };
  // au chargement + quand on redimensionne/oriente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', unlock);
  } else {
    unlock();
  }
  window.addEventListener('resize', unlock);
  window.addEventListener('orientationchange', unlock);
})();

/* ===== DECK: ne pas bloquer le body en "full" par défaut ===== */
/* Si tu as un script qui met le deck en "full" et fait body.style.overflow='hidden',
   force plutôt l'état 'half' au départ pour garder le scroll page. */
document.addEventListener('DOMContentLoaded', () => {
  const deck = document.querySelector('.mobile-cards-deck');
  if (deck && deck.classList.contains('collapsed')) {
    deck.classList.remove('collapsed');
    deck.classList.add('half'); // au lieu de 'full', garde le scroll du body
  }
});
