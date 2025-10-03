
// -- helpers pour citer les colonnes avec espaces + formater le prix``

function startGenerating() {
  document.body.classList.add('is-generating');
}
function stopGenerating() {
  document.body.classList.remove('is-generating');
}



function q(name){ if(!name) return ""; return /[\s()\-]/.test(name) ? `"${String(name).replace(/"/g,'""')}"` : name; }
function formatAED(v){
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toLocaleString()} AED` : (v ?? "");
}


// --- Supabase init robuste (ne jette pas si le SDK n'est pas encore global)
(function initSupabase() {
  const URL = 'https://hiigdwqtilboeimlybl.supabase.co';
  const KEY = 'sb_publishable_k0Lb2Wz-effCwGk0ZMq-3Q_Kfo8PY7y';

  // 1) Si window.supabase est déjà un client (.from), on garde
  if (window.supabase && typeof window.supabase.from === 'function') return;

  // 2) Si le SDK est chargé en global (window.supabase.createClient)
  if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    window.supabase = window.supabase.createClient(URL, KEY);
    return;
  }

  // 3) Variante où le global s'appelle supabase (sans window.)
  if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    window.supabase = supabase.createClient(URL, KEY);
    return;
  }

  // 4) SDK manquant → message clair
  console.error('Supabase SDK non chargé : ajoute <script src="https://unpkg.com/@supabase/supabase-js@^2"></script> AVANT ce fichier.');
})();



/* ===== Helper prix — EN uniquement pour CETTE page ===== */
function formatAED_EN(value){
  // si value est numérique (ou string numérique) -> "250,000 AED"
  const n = Number(value);
  if (Number.isFinite(n)) {
    return `${new Intl.NumberFormat('en-US').format(n)} AED`;
  }
  // sinon, on renvoie tel quel (ex: "From 250,000 AED")
  return value ?? "";
}


// Quote un nom de colonne s'il contient des espaces  , parenthèses, tirets…
function qq(name){
  if(!name) return null;
  return /[\s()\-]/.test(name) ? `"${String(name).replace(/"/g,'""')}"` : name;
}




/* ================= Helpers simples ================= */
function toList(raw){
  if (!raw && raw !== 0) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  const s = String(raw).trim();
  if (!s) return [];
  if (s.startsWith('[') && s.endsWith(']')) {
    try { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr.filter(Boolean).map(String); } catch {}
  }
  return s.replace(/^\[|\]$/g,'').split(/[\n,;|]+/).map(x=>x.trim()).filter(Boolean);
}
function toPublicUrls(raw, defaultBucket){
  const FALLBACK = "https://via.placeholder.com/800x500?text=No+image";
  const list = toList(raw);
  const out  = [];
  const allowed = new Set(["buy","rent","commercial","offplan","photos_biens","agents","agency","images","uploads"]);
  for (let item of list){
    if (!item) continue;
    let v = String(item).replace(/^["']+|["']+$/g, "").trim();
    if (/^https?:\/\//i.test(v) || /\/storage\/v1\/object\/public\//i.test(v)) { out.push(v); continue; }
    let bucket = String(defaultBucket || "buy").toLowerCase();
    let key = v.replace(/^\/+/, "");
    const m = /^([^/]+)\/(.+)$/.exec(key);
    if (m && allowed.has(m[1].toLowerCase())) { bucket = m[1].toLowerCase(); key = m[2]; }
    if (key.toLowerCase().startsWith(bucket + "/")) key = key.slice(bucket.length + 1);
    try {
      const { data } = window.supabase?.storage?.from(bucket)?.getPublicUrl(key) || {};
      if (data?.publicUrl) out.push(data.publicUrl);
    } catch {}
  }
  const uniq = Array.from(new Set(out));
  return uniq.length ? uniq : [FALLBACK];
}

// ---- état global "source de vérité"
window.__currentMode = 'all';        // 'buy' | 'rent' | 'offplan' | 'all'
window.__activeFilters = {};         // ex: { min_price, max_price, bedrooms, locations, ... }

async function refreshProperties(limit = 30) {
  const data = await fetchProperties({
    mode: window.__currentMode,
    filters: window.__activeFilters,
    limit
  });
  renderProperties(data);
}

/** Change le mode (onglet) + met à jour l’UI + recharge les biens. */
function setMode(next) {
  window.__currentMode = (next || 'all').toLowerCase().replace(/[\s_-]+/g,'');
  // toggle l'état visuel des boutons
  document.querySelectorAll('.chat-pick-btn-v2').forEach(b => {
    const raw = ((b.dataset.type || b.textContent) || '')
      .trim().toLowerCase().replace(/[\s_-]+/g,'');
    b.classList.toggle('active', raw === window.__currentMode);
  });
  refreshProperties();
}



/* ================= FETCH BUY ================= */
async function fetchBuy(filters = {}, limit = 30){
  const cols = [
    "id","title","property_type","bedrooms","bathrooms",
    "price","sqft","photo_bien_url","photos",
    "created_at", `"localisation accueil"`
  ].join(",");

  let q = window.supabase.from("buy").select(cols).order("created_at", { ascending: false }).limit(limit);

  if (filters.min_price != null) q = q.gte("price", filters.min_price);
  if (filters.max_price != null) q = q.lte("price", filters.max_price);
  if (filters.bedrooms != null)     q = q.eq("bedrooms", filters.bedrooms);
  if (filters.min_bedrooms != null) q = q.gte("bedrooms", filters.min_bedrooms);
  if (filters.max_bedrooms != null) q = q.lte("bedrooms", filters.max_bedrooms);
  if (filters.bathrooms != null)     q = q.eq("bathrooms", filters.bathrooms);
  if (filters.min_bathrooms != null) q = q.gte("bathrooms", filters.min_bathrooms);
  if (filters.max_bathrooms != null) q = q.lte("bathrooms", filters.max_bathrooms);
  if (filters.min_sqft != null) q = q.gte("sqft", filters.min_sqft);
  if (filters.max_sqft != null) q = q.lte("sqft", filters.max_sqft);
  if (filters.property_type) q = q.ilike("property_type", `%${filters.property_type}%`);
  if (filters.locations && filters.locations.length) q = q.in(`localisation accueil`, filters.locations);

  const { data, error } = await q;
  if (error) { console.error("fetchBuy error", error); return []; }

  return (data || []).map(r => {
    const imgs = toPublicUrls(r.photos?.length ? r.photos : r.photo_bien_url, "buy");
    return {
      id: r.id,
      source: "buy",
      title: r.title || "",
      typeLabel: r.property_type || "",
      location: r["localisation accueil"] || "",
      bedrooms: r.bedrooms ?? "",
      bathrooms: r.bathrooms ?? "",
      size: r.sqft ?? "",
      price: r.price,
      images: imgs,
      created_at: r.created_at
    };
  });
}

/* ================= FETCH RENT ================= */
async function fetchRent(filters = {}, limit = 30){
  const cols = [
    "id","created_at","title","property_type","bedrooms","bathrooms",
    "price","sqft","photo_url","agent_id", `"localisation acceuil"`
  ].join(",");

  let q = window.supabase.from("rent").select(cols).order("created_at", { ascending: false }).limit(limit);

  if (filters.min_price != null) q = q.gte("price", filters.min_price);
  if (filters.max_price != null) q = q.lte("price", filters.max_price);
  if (filters.bedrooms != null)     q = q.eq("bedrooms", filters.bedrooms);
  if (filters.min_bedrooms != null) q = q.gte("bedrooms", filters.min_bedrooms);
  if (filters.max_bedrooms != null) q = q.lte("bedrooms", filters.max_bedrooms);
  if (filters.bathrooms != null)     q = q.eq("bathrooms", filters.bathrooms);
  if (filters.min_bathrooms != null) q = q.gte("bathrooms", filters.min_bathrooms);
  if (filters.max_bathrooms != null) q = q.lte("bathrooms", filters.max_bathrooms);
  if (filters.min_sqft != null) q = q.gte("sqft", filters.min_sqft);
  if (filters.max_sqft != null) q = q.lte("sqft", filters.max_sqft);
  if (filters.property_type) q = q.ilike("property_type", `%${filters.property_type}%`);
  if (filters.locations && filters.locations.length) q = q.in(`localisation acceuil`, filters.locations);

  const { data, error } = await q;
  if (error) { console.error("fetchRent error", error); return []; }

  return (data || []).map(r => ({
    id: r.id,
    source: "rent",
    title: r.title || "",
    typeLabel: r.property_type || "",
    location: r["localisation acceuil"] || "",
    bedrooms: r.bedrooms ?? "",
    bathrooms: r.bathrooms ?? "",
    size: r.sqft ?? "",
    price: r.price,
    images: toPublicUrls(r.photo_url, "rent"),
    created_at: r.created_at
  }));
}

/* ================= FETCH OFFPLAN ================= */
async function fetchOffplan(filters = {}, limit = 30){
  const cols = [
    "id","created_at","titre","localisation","description",
    `"price starting"`, `"units types"`, `"project status"`,
    `"developer name"`, `"developer photo_url"`, "photo_url","lat","lon"
  ].join(",");

  let q = window.supabase.from("offplan").select(cols).order("created_at", { ascending: false }).limit(limit);

  if (filters.min_price != null) q = q.gte("price starting", filters.min_price);
  if (filters.max_price != null) q = q.lte("price starting", filters.max_price);
  if (filters.units_types)    q = q.ilike("units types", `%${filters.units_types}%`);
  if (filters.project_status) q = q.ilike("project status", `%${filters.project_status}%`);
  if (filters.developer_name) q = q.ilike("developer name", `%${filters.developer_name}%`);
  if (filters.locations && filters.locations.length) q = q.in("localisation", filters.locations);

  const { data, error } = await q;
  if (error) { console.error("fetchOffplan error", error); return []; }

  return (data || []).map(p => {
    const imgs = toPublicUrls([p.photo_url, p["developer photo_url"]], "offplan");
    return {
      id: p.id,
      source: "offplan",
      title: p.titre || "",
      location: p.localisation || "Dubai",
      bedrooms: p["units types"] || "",
      bathrooms: p["project status"] || "",
      size: "",
      price: (p["price starting"] != null) ? `From ${formatAED_EN(p["price starting"])}` : "",
      images: imgs,
      description: p.description || "",
      lat: p.lat ?? null,
      lon: p.lon ?? null,
      created_at: p.created_at
    };
  });
}

/* ================= Routeur unique (accepte {type} ou {mode}) ================= */
async function fetchProperties({ mode, type, filters = {}, limit = 30 } = {}){
  const m = (mode || type || "all").toLowerCase().replace(/[\s_-]+/g,'');
  if (m === "buy")     return await fetchBuy(filters, limit);
  if (m === "rent")    return await fetchRent(filters, limit);
  if (m === "offplan") return await fetchOffplan(filters, limit);
  const parts = await Promise.all([fetchBuy(filters, limit), fetchRent(filters, limit), fetchOffplan(filters, limit)]);
  return parts.flat();
}



async function recordClick(source, payload){
  try {
    if (source === "buy"){
      const { error } = await window.supabase.from("buy click").insert({
        buy_id: payload.buy_id,
        localisation: payload.localisation ?? null,
        description: payload.description ?? null,
        "property details": payload.property_details ?? null
      });
      if (error) throw error;
    } else if (source === "rent"){
      const { error } = await window.supabase.from("rent click").insert({
        rent_id: payload.rent_id,
        localisation: payload.localisation ?? null,
        description: payload.description ?? null,
        "property details": payload.property_details ?? null
      });
      if (error) throw error;
    } else if (source === "offplan"){
      const { error } = await window.supabase.from("offplan click").insert({
        "offplan id": payload.offplan_id,
        description: payload.description ?? null,
        "developer vision": payload.developer_vision ?? null,
        "other projects": payload.other_projects ?? null
      });
      if (error) throw error;
    }
  } catch(e){ console.error("recordClick error", e); }
}






// ========= UTILS & LOCAL STORAGE =========
function uuid() { return '_' + Math.random().toString(36).substr(2, 9); }
function getChats() { return JSON.parse(localStorage.getItem('multiChatHistory') || '[]'); }
function saveChats(chats) { localStorage.setItem('multiChatHistory', JSON.stringify(chats)); }
function getFavs() { return JSON.parse(localStorage.getItem('favorites') || '[]'); }
function saveFavs(arr) { localStorage.setItem('favorites', JSON.stringify(arr)); }


// ========== ChatGPT-like helpers ==========
// sécurise un peu le HTML du modèle (on reste simple)
function escapeHTML(s){
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function ensureDraftBubble(){
  const wrap = document.getElementById('chat-messages-container');
  let draft = document.getElementById('assistant-draft');

  // créer si absent
  if (!draft){
    draft = document.createElement('div');
    draft.id = 'assistant-draft';
    draft.className = 'chat-message-bot';
    draft.innerHTML = `<div class="msg"></div>`;
  }

  // ⚠️ Toujours replacer la draft tout en bas (collée au dernier message)
  if (wrap.lastElementChild !== draft) {
    wrap.appendChild(draft);
  }

  return draft;
}




// rend les liens de quartiers sous un message bot
function renderAreaSuggestionsUnder(elem, areas = [], baseFilters = {}) {
  if (!areas?.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'ai-areas';
  wrap.innerHTML = areas.map(a => `<a href="#" data-area="${escapeHTML(a)}">${escapeHTML(a)}</a>`).join('');
  elem.appendChild(wrap);

  // délégation de clic
  wrap.addEventListener('click', (e)=>{
    const a = e.target.closest('a[data-area]');
    if (!a) return;
    e.preventDefault();
    const areaName = a.dataset.area;
    selectArea(areaName, baseFilters);
  });
}


function enableAreaLinks(scope = document) {
  scope.querySelectorAll('a.area-chip').forEach(a => {
    if (a.__bound) return;     // évite double-binding
    a.__bound = true;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const area = a.dataset.area?.trim();
      if (!area) return;

      // utilise ta logique existante → applique filtre + recharge
      selectArea(area, window.__activeFilters || {});
    });
  });
}


// sélectionne un quartier → applique filters + refresh
function selectArea(areaName, baseFilters = {}) {
  // on merge avec les filtres en cours (ou ceux fournis par le message)
  window.__activeFilters = {
    ...(window.__activeFilters || {}),
    ...(baseFilters || {}),
    locations: [areaName]
  };
  // on garde le mode si déjà fixé par l'IA, sinon on ne change rien
  refreshProperties();
}




// --- STREAM CHAR-BY-CHAR comme ChatGPT ---
let _typing = { active:false, stop:false };

async function typeIntoDraft(text, speed = 28, mode = 'char'){
  const scroll = document.getElementById('chat-messages-scroll');
  let draft = ensureDraftBubble();
  draft.classList.add('streaming');

  const box = draft.querySelector('.msg');
  _typing.active = true; _typing.stop = false;

  const source = String(text ?? "");
  const tokens = Array.from(source);
  let written = "";
  const BATCH = 2;

  for (let i = 0; i < tokens.length; i++){
    if (_typing.stop) break;
    written += tokens[i];

    if ((i % BATCH === 0) || i === tokens.length - 1){
      const html = renderMarkdownToHTML(written);
      box.innerHTML = html + `<span class="typing-caret">▋</span>`;
      box.dataset.src = written;                 // <<< mémorise le texte brut
      enableAreaLinks(box);
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    }
    await new Promise(r => setTimeout(r, speed));
  }

  box.innerHTML = renderMarkdownToHTML(written || source);
  box.dataset.src = written || source;          // <<< mémorise aussi à la fin
  enableAreaLinks(box);
  _typing.active = false;
}









function finalizeDraftToMessage(){
  const draft = document.getElementById('assistant-draft');
  if (!draft) { stopGenerating(); return; }
  draft.classList.remove('streaming');

  const box = draft.querySelector('.msg');
  const raw = box?.dataset.src || box?.textContent || "";  // <<< récupère le texte brut
  draft.remove();
  if (raw) addMessageToCurrentChat('bot', raw);

  stopGenerating();
}




// actions sur la bulle draft
document.addEventListener('click', (e)=>{
  if (e.target?.id === 'stop-generation'){
    _typing.stop = true;
    finalizeDraftToMessage();
  }
});




/* ===== RENDU DES BIENS (prix affiché en "250,000 AED") ===== */
/* === STYLES CARROUSEL — ne change PAS la taille de l’image === */
function ensurePropertyCarouselStyles() {
  if (document.getElementById('prop-carousel-styles')) return;
  const css = `
  .prop-slider{ position:relative; overflow:hidden; }              /* pas de width/height ici */
  .prop-slider .nav{
    position:absolute; top:50%; transform:translateY(-50%);
    width:36px; height:36px; border:none; border-radius:50%;
    background:#fff; box-shadow:0 4px 14px rgba(0,0,0,.18);
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    font-size:20px; line-height:1; opacity:.95
  }
  .prop-slider .nav.prev{ left:10px }
  .prop-slider .nav.next{ right:10px }
  .prop-slider .nav:active{ transform:translateY(-50%) scale(.97) }
  .prop-slider .count-badge{
    position:absolute; left:10px; bottom:10px; padding:6px 9px; border-radius:12px;
    background:rgba(0,0,0,.55); color:#fff; font:600 12px/1.1 system-ui;
    display:flex; gap:6px; align-items:center
  }
  .prop-slider .count-badge i{ font-size:13px }
  `;
  const tag = document.createElement('style');
  tag.id = 'prop-carousel-styles';
  tag.textContent = css;
  document.head.appendChild(tag);
}

/* === INIT CARROUSEL — remplace juste la src, sans toucher aux dimensions === */
function initCardSlider(rootEl, images) {
  const pics = (Array.isArray(images) && images.length ? images : ["https://via.placeholder.com/800x500"]);
  const imgEl = rootEl.querySelector('img.property-img-v2') || rootEl.querySelector('img');
  const prev  = rootEl.querySelector('.nav.prev');
  const next  = rootEl.querySelector('.nav.next');
  const nSpan = rootEl.querySelector('.img-total');
  const isMobile = window.matchMedia('(max-width:800px)').matches;

  let i = 0;

  // copy radius de l'image pour que tout clippe pareil
  if (imgEl) {
    const br = getComputedStyle(imgEl).borderRadius;
    if (br) rootEl.style.borderRadius = br;
  }

  // ----- pager à points (mobile) -----
  let dotsWrap = null;
  let dots = [];
  if (isMobile) {
    dotsWrap = document.createElement('div');
    dotsWrap.className = 'prop-dots';
    dots = pics.map((_, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'prop-dot';
      b.setAttribute('aria-label', `Image ${idx + 1}`);
      b.addEventListener('click', (e) => { e.stopPropagation(); show(idx); });
      dotsWrap.appendChild(b);
      return b;
    });
    rootEl.appendChild(dotsWrap);
  }

  // ----- flèches / compteur (desktop) -----
  if (nSpan) nSpan.textContent = pics.length;
  const showNav = !isMobile && pics.length > 1;
  if (prev) prev.style.display = showNav ? '' : 'none';
  if (next) next.style.display = showNav ? '' : 'none';

  function alignNavToImage() {
    if (!imgEl || !prev || !next) return;
    const sr = rootEl.getBoundingClientRect();
    const ir = imgEl.getBoundingClientRect();
    const leftGap  = Math.max(0, ir.left  - sr.left);
    const rightGap = Math.max(0, sr.right - ir.right);
    prev.style.left  = `${10 + leftGap}px`;
    next.style.right = `${10 + rightGap}px`;
  }

  function updateDots() {
    if (!isMobile || !dots.length) return;
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
  }

  function show(k) {
    i = (k + pics.length) % pics.length;
    if (imgEl) imgEl.src = pics[i];
    updateDots();
    if (!isMobile) requestAnimationFrame(alignNavToImage);
  }

  if (prev) prev.addEventListener('click', (e)=>{ e.stopPropagation(); show(i-1); });
  if (next) next.addEventListener('click', (e)=>{ e.stopPropagation(); show(i+1); });

  // swipe mobile
  let sx = null;
  rootEl.addEventListener('touchstart', (e)=>{ sx = e.touches[0].clientX; }, {passive:true});
  rootEl.addEventListener('touchend',   (e)=>{
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    sx = null;
  }, {passive:true});

  // resize: recaler les flèches sur desktop
  if (!isMobile) {
    const ro = new ResizeObserver(()=> alignNavToImage());
    if (imgEl) ro.observe(imgEl);
    window.addEventListener('resize', alignNavToImage);
  }

  show(0);
  if (!isMobile) alignNavToImage();
}







  




/* ===== RENDU DES BIENS (carrousel par-dessus l’image existante) ===== */
function renderProperties(list) {
  ensurePropertyCarouselStyles();

  const container = document.getElementById("property-cards-container");
  container.innerHTML = "";
  const favs = getFavs();

  list.forEach((property, idx) => {
    const sliderId = `ps-${property.id || idx}-${Math.random().toString(36).slice(2,7)}`;
    const card = document.createElement("div");
    card.className = "property-card-ui-v2";
    card.style.cursor = "pointer";
    card.style.position = "relative";

    const isFav = favs.includes(property.id);
    const favBtn = `
      <button class="fav-btn${isFav ? " fav-active" : ""}" data-id="${property.id}" aria-label="Ajouter aux favoris">
        <i class="fa fa-heart"></i>
      </button>
    `;

    card.innerHTML = `
      ${favBtn}

      <!-- on garde TA taille via .property-img-v2, on ne la touche pas -->
      <div class="prop-slider" id="${sliderId}">
        <img src="${(property.images && property.images[0]) || ''}" class="property-img-v2" alt="${property.title}" loading="lazy" decoding="async">
        <button class="nav prev"  aria-label="Previous image" onclick="event.stopPropagation()">‹</button>
        <button class="nav next"  aria-label="Next image"     onclick="event.stopPropagation()">›</button>
        <div class="count-badge"><i class="fa fa-camera"></i><span class="img-total">1</span></div>
      </div>

      <div class="property-title-ui-v2">${property.title}</div>
      <div class="property-loc-ui-v2"><i class="fas fa-map-marker-alt"></i> ${property.location || ""}</div>
      <div class="property-features-ui-v2">
        <span><i class="fas fa-bed"></i> ${property.bedrooms ?? ""}</span>
        <span><i class="fas fa-bath"></i> ${property.bathrooms ?? ""}</span>
        <span><i class="fas fa-ruler-combined"></i> ${property.size ?? ""} sqft</span>
      </div>
      <div class="property-desc-ui-v2">${property.description || ''}</div>
      <div class="property-price-ui-v2">${formatAED_EN(property.price)}</div>

      <div class="property-actions-ui-v2">
        <button type="button" onclick="event.stopPropagation();window.location.href='tel:+000000000';">Call</button>
        <button type="button" onclick="event.stopPropagation();window.location.href='mailto:info@propindubai.com';">Email</button>
        <button type="button" onclick="event.stopPropagation();window.open('https://wa.me/', '_blank');">WhatsApp</button>
      </div>
    `;

  
  card.addEventListener("click", () => {
  if (property.source === 'offplan') {
    recordClick('offplan', { offplan_id: property.id, description: property.description });
    sessionStorage.setItem('selected_offplan', JSON.stringify({ id: property.id, type: 'offplan' }));
    window.location.href = `off-plan-click.html?id=${encodeURIComponent(property.id)}`;
    return;
  }
  if (property.source === 'buy') {
    recordClick('buy', { buy_id: property.id, localisation: property.location });
  } else if (property.source === 'rent') {
    recordClick('rent', { rent_id: property.id, localisation: property.location });
  }
  const type = property.source || property._table || 'buy';
  sessionStorage.setItem('selected_property', JSON.stringify({ id: property.id, type }));
  window.location.href = `bien.html?id=${encodeURIComponent(property.id)}&type=${encodeURIComponent(type)}`;
});



    container.appendChild(card);

    // init carrousel (ne modifie PAS les dimensions)
    const sliderEl = document.getElementById(sliderId);
    initCardSlider(sliderEl, property.images);
  });

  setupFavBtns();
}







function setupFavBtns() {
  document.querySelectorAll('.fav-btn').forEach(btn => {
    const id = btn.dataset.id;
    btn.onclick = (e) => {
      e.stopPropagation();
      let favs = getFavs();
      if (favs.includes(id)) {
        favs = favs.filter(x => x !== id);
        btn.classList.remove('fav-active');
      } else {
        favs.push(id);
        btn.classList.add('fav-active');
      }
      saveFavs(favs);
    };
  });
}

// ========= RENDU CHAT =========
function renderChatList(selectedId) {
  
  const list = document.getElementById('chat-list');
  const chats = getChats();
  list.innerHTML = '';
  chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = 'multi-chat-list-item' + (chat.id === selectedId ? ' active' : '');
    let chatName = chat.title || "New chat";
    if (chatName.length > 30) chatName = chatName.slice(0, 30) + '…';
    item.innerHTML = `
      <i class="fa fa-comments"></i>
      <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:150px;">${chatName}</span>
      <button class="delete-chat-btn" title="Delete chat" data-id="${chat.id}">
        <i class="fa fa-trash"></i>
      </button>
    `;
    item.onclick = (e) => {
      if (e.target.closest('.delete-chat-btn')) return;
      selectChat(chat.id);
    };
    list.appendChild(item);
  });
  list.querySelectorAll('.delete-chat-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      deleteChat(btn.dataset.id);
    };
  });
}



/// mini-escape
function escapeHTML(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// --- Tiny markdown parser (bold, lists, paragraphs)
function markdownLite(md = '') {
  const sEsc = String(md)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // **bold**
  let s = sEsc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  const lines = s.split(/\r?\n/);
  const out = [];
  let ul = null, ol = null;

  const flush = () => {
    if (ul) { out.push('<ul>' + ul.join('') + '</ul>'); ul = null; }
    if (ol) { out.push('<ol>' + ol.join('') + '</ol>'); ol = null; }
  };

  for (const L of lines) {
    if (/^\s*[-•]\s+/.test(L)) { if (!ul) { flush(); ul = []; } ul.push('<li>' + L.replace(/^\s*[-•]\s+/, '') + '</li>'); continue; }
    if (/^\s*\d+\.\s+/.test(L)) { if (!ol) { flush(); ol = []; } ol.push('<li>' + L.replace(/^\s*\d+\.\s+/, '') + '</li>'); continue; }
    flush();
    out.push(L.trim() ? ('<p>' + L + '</p>') : '<br>');
  }
  flush();
  return out.join('\n');
}





// Accroche : met en gras la première phrase si raisonnable
function boldFirstSentence(md = '') {
  const i = md.indexOf('.');
  if (i > 10 && i < 160) return `**${md.slice(0, i + 1)}**` + md.slice(i + 1);
  return md;
}



// Markdown -> HTML + puces quartiers et retours à la ligne
function renderMarkdownToHTML(md = '') {
  let src = String(md || '');

  // 1) Si un texte contient "... __Quartier__", on force un saut de ligne avant la puce
  src = src.replace(/\.\s*__\s*/g, '.\n\n__');

  // 2) On transforme __**Quartier**__ et __Quartier__ en marqueurs [[Quartier]]
  src = src.replace(/__\*\*([\s\S]+?)\*\*__/g, '[[$1]]');
  src = src.replace(/__([^_][\s\S]*?)__/g, '[[$1]]');

  // 3) Markdown léger existant (gras, listes, paragraphes)
  let html = markdownLite(src);

  // 4) Nos marqueurs [[Quartier]] deviennent des liens "chips" cliquables en gras
  html = html.replace(/\[\[([\s\S]+?)\]\]/g, (_, area) => {
    const safe = String(area).replace(/"/g, '&quot;').trim();
    return `<a href="#" class="area-chip" data-area="${safe}"><strong>${safe}</strong></a>`;
  });

  return html;
}


// Transforme les <ol> du message en “steps”
function beautifySteps(root) {
  const box = root.querySelector('.msg') || root;
  box.querySelectorAll('ol').forEach(ol => {
    ol.classList.add('steps'); // pense à styliser .steps en CSS si tu veux
  });
}




// Plie les longs messages avec un bouton “Lire la suite”
function applyCollapsible(root) {
  const MAX = 220; // hauteur d’aperçu px
  const box = root.querySelector('.msg') || root;

  // déjà appliqué ?
  if (box.dataset.collapsibleApplied === '1') return;
  if (box.scrollHeight <= MAX + 30) return;

  box.dataset.collapsibleApplied = '1';
  box.style.maxHeight = MAX + 'px';
  box.style.overflow = 'hidden';
  box.style.webkitMaskImage = 'linear-gradient(to bottom, black 80%, transparent)';
  box.style.maskImage = 'linear-gradient(to bottom, black 80%, transparent)';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'read-toggle';
  btn.textContent = 'Lire la suite';
  btn.addEventListener('click', () => {
    const isCollapsed = !!box.style.maxHeight;
    if (isCollapsed) {
      box.style.maxHeight = '';
      box.style.webkitMaskImage = 'none';
      box.style.maskImage = 'none';
      btn.textContent = 'Réduire';
    } else {
      box.style.maxHeight = MAX + 'px';
      box.style.webkitMaskImage = 'linear-gradient(to bottom, black 80%, transparent)';
      box.style.maskImage = 'linear-gradient(to bottom, black 80%, transparent)';
      btn.textContent = 'Lire la suite';
    }
  });

  box.after(btn);
}








function renderChat(chat) {
  const container = document.getElementById('chat-messages-container');
  const scroll    = document.getElementById('chat-messages-scroll');
  if (!container) return;

  // 🛟 Sauver/retirer la bulle draft pendant le re-render
  const draft = document.getElementById('assistant-draft');
  const keepDraft = !!(draft && _typing && _typing.active);
  if (keepDraft) draft.remove();

  container.innerHTML = '';
  if (!chat) return;

  const titleEl = document.getElementById('current-chat-title');
  if (titleEl) titleEl.textContent = chat.title || 'Chat';

  chat.messages.forEach(msg => {
    const div = document.createElement('div');

    if (msg.type === 'user') {
      div.className = 'chat-message-user';
      div.textContent = msg.text || '';
    } else {
      div.className = 'chat-message-bot';
      const md = boldFirstSentence(String(msg.text || ''));
      const html = renderMarkdownToHTML(md);        // markdownLite -> HTML (déjà échappé)
      div.innerHTML = `<div class="msg">${html}</div>`;
      beautifySteps(div);
      applyCollapsible(div);
      enableAreaLinks(div);
    }

    container.appendChild(div);
  });

  // ♻️ Ré-attacher la draft si on stream le texte
  if (keepDraft) container.appendChild(draft);

  requestAnimationFrame(() => { if (scroll) scroll.scrollTop = scroll.scrollHeight; });
}






function closeAllMobileLayers() {
  // Overlay de la sidebar
  document.querySelectorAll('.mobile-sidebar-overlay').forEach(ov => ov.classList.remove('active'));
  // Overlay de la nav du header
  const navOverlay = document.getElementById('navOverlay');
  if (navOverlay) navOverlay.style.display = 'none';

  // Fermer la sidebar si ouverte
  const sidebar = document.querySelector('.multi-sidebar');
  if (sidebar) sidebar.classList.remove('open');

  // Fermer le menu header si ouvert
  const nav = document.querySelector('.all-button');
  if (nav) nav.classList.remove('menu-open');

  // Nettoyer le body (scroll + state)
  document.body.style.overflow = '';
  document.body.classList.remove('drawer-open');
}



async function renderAll() {
  let chats = getChats();
  let current = getCurrentChat();
  if (!chats.length) { addNewChat(); chats = getChats(); current = getCurrentChat(); }
  renderChatList(current ? current.id : null);
  renderChat(current);

  // Était : const data = await fetchProperties({ mode: "all", limit: 30 }); renderProperties(data);
  setMode('all'); // initialise l’onglet & charge les biens
}


function selectChat(id) {
  localStorage.setItem('multiCurrentChatId', id);
  closeAllMobileLayers();
  renderAll();
}


function addNewChat(selectIt = true) {
  let chats = getChats();
  const newId = uuid();
  const chat = {
    id: newId,
    title: "New chat",
    messages: [{ type: 'bot', text: "Welcome to Chat Property. Tell me what you’re looking for and I’ll assist." }]
  };
  chats.push(chat);
  saveChats(chats);
  if (selectIt) localStorage.setItem('multiCurrentChatId', newId);
  closeAllMobileLayers();   // ← indispensable sur mobile
  renderAll();
}






function getCurrentChat() {
  const chats = getChats();
  const id = localStorage.getItem('multiCurrentChatId');
  return chats.find(chat => chat.id === id);
}

function addMessageToCurrentChat(type, text) {
  let chats = getChats();
  const id = localStorage.getItem('multiCurrentChatId');
  let chat = chats.find(chat => chat.id === id);
  if (!chat) return;

  chat.messages.push({ type, text });

  // Met à jour le titre au 1er message user
  if (type === 'user' && chat.messages.filter(m => m.type === 'user').length === 1) {
    let title = text.trim().split(/\s+/).slice(0, 7).join(' ');
    if (title.length > 34) title = title.slice(0, 34) + '...';
    chat.title = title || "New chat";
  }

  saveChats(chats);

  // 🔒 Ne re-render PAS si on est en train d'animer le "typing"
  if (!_typing || !_typing.active) {
    renderChat(chat);
  } else {
    // Si on tape déjà (draft affichée), on ajoute juste la bulle user sans casser la draft
    const container = document.getElementById('chat-messages-container');
    const draft = document.getElementById('assistant-draft');
    if (container && draft && type === 'user') {
      const div = document.createElement('div');
      div.className = 'chat-message-user';
      div.textContent = text || '';
      container.insertBefore(div, draft); // avant la draft
    }
  }

  renderChatList(chat.id);
}



function resetCurrentChat() {
  let chats = getChats();
  const id = localStorage.getItem('multiCurrentChatId');
  let chat = chats.find(chat => chat.id === id);
  if (!chat) return;
  chat.messages = [{ type: 'bot', text: "Welcome to Chat Property. Tell me what you’re looking for and I’ll assist." }];
  chat.title = "New chat";
    saveChats(chats);
  if (!_typing || !_typing.active) {
    renderChat(chat);
  }
  renderChatList(chat.id);

}



function deleteChat(chatId) {
  let chats = getChats();
  const idx = chats.findIndex(c => c.id === chatId);
  if (idx === -1) return;
  chats.splice(idx, 1);
  saveChats(chats);
  let newId = (chats[idx] && chats[idx].id) || (chats[idx - 1] && chats[idx - 1].id) || (chats[0] && chats[0].id);
  if (!newId) { addNewChat(true); return; }
  localStorage.setItem('multiCurrentChatId', newId);
  renderAll();
}


function setupFilters() {
  document.querySelectorAll('.chat-pick-btn-v2').forEach(btn => {
    btn.addEventListener('click', function () {
      const raw = ((this.dataset.type || this.textContent) || '').trim().toLowerCase();
      const norm = raw.replace(/[\s_-]+/g, '');
      const map = { offplan:'offplan', off:'offplan', new:'offplan', buy:'buy', rent:'rent', commercial:'commercial', all:'all' };
      const type = map[norm] || 'all';
      setMode(type); // <-- c'est tout
    });
  });
}





// ========= DOM READY =========
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-btn').forEach((btn, i) => {
    if (i === 0) btn.onclick = () => { window.location.href = "accueil.html"; };
    btn.addEventListener('click', function () {
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  document.getElementById('new-chat-btn').onclick = () => addNewChat(true);



// --- dictionnaire minimal de quartiers (ajoute les tiens librement)
const KNOWN_AREAS = [
  "Jumeirah Village Circle", "JVC", "Dubai Marina", "JBR",
  "Downtown Dubai", "Business Bay", "Arabian Ranches",
  "Dubai Hills", "Palm Jumeirah", "Jumeirah Park",
  "Dubai Creek Harbour", "Creek Harbour", "City Walk", "Al Sufouh"
];

// normalise pour matcher facilement
function norm(s){ return String(s||'').toLowerCase().replace(/\s+/g,' ').trim(); }

// heuristique: extrait bedrooms, budget, et quartiers du message user
function quickExtractFromMessage(msg){
  const out = { filters:{}, areas:[] };
  const s = norm(msg);

  // bedrooms (ex: "3 chambres", "4br", "4 bedrooms")
  const mBr = s.match(/(\d+)\s*(?:br|bed|ch(?:ambres?)?)/);
  if (mBr) out.filters.bedrooms = Number(mBr[1]);

  // budget (ex: "2.5M", "3,000,000", "under 1.2m", "max 2m")
  const mBudget = s.match(/(?:(?:under|max|jusqu'?a|<=?)\s*)?([\d,.]+)\s*m/);
  if (mBudget){
    const m = Number(mBudget[1].replace(/[, ]/g,'')) * 1_000_000;
    if (!isNaN(m)) out.filters.max_price = m;
  } else {
    const mAbs = s.match(/([\d][\d,.]{4,})/); // 100,000+ brut
    if (mAbs){
      const v = Number(mAbs[1].replace(/[, ]/g,''));
      if (!isNaN(v) && v > 50_000) out.filters.max_price = v;
    }
  }

  // type (buy/rent/off plan)
  if (/\boff[\s-]?plan\b/.test(s)) out.filters.type = 'offplan';
  else if (/\brent|louer|location\b/.test(s)) out.filters.type = 'rent';
  else if (/\bbuy|acheter|achat\b/.test(s)) out.filters.type = 'buy';

  // quartiers mentionnés (match tolérant)
  const areas = [];
  for (const a of KNOWN_AREAS){
    const aNorm = norm(a);
    if (aNorm && s.includes(norm(aNorm))) areas.push(a);
  }
  out.areas = Array.from(new Set(areas));

  // s'il n'y a qu'un seul quartier, fixe le filtre locations
  if (out.areas.length === 1) out.filters.locations = [out.areas[0]];

  return out;
}



async function callChatGPT(message){
  const { data, error } = await window.supabase.functions.invoke(
    'hyper-function',
    { body: { message } }    // ← pas d’en-têtes custom, supabase-js s’en charge
  );
  if (error) throw error;
  return data; // { reply, filters }
}



async function applyAIFilters(filters = {}) {
  window.__activeFilters = filters || {};
  if (filters?.type) {
    setMode(filters.type);     // applique le type puis rafraîchit
  } else {
    refreshProperties();       // garde le mode courant, recharge avec les filtres
  }
}



document.getElementById('chat-form').onsubmit = async function (e) {
  e.preventDefault();
  const input = document.getElementById('user-input');
  const msg = input.value.trim();
  if (!msg) return;

  // 1) push le message user
  addMessageToCurrentChat('user', msg);
  input.value = '';

  // 2) on passe en mode “génération” et on montre la bulle draft
  startGenerating();
  const draft = ensureDraftBubble();
  const draftMsg = draft.querySelector('.msg');
  draftMsg.textContent = "";

  // 3) petit loader pendant l’appel réseau
  let dots = 0, alive = true;
  const scroll = document.getElementById('chat-messages-scroll');
  const loader = setInterval(()=>{
    if (!alive) return;
    draftMsg.textContent = "Thinking" + ".".repeat((dots++ % 3) + 1);
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  }, 280);

  try {
    // 4) appel backend → { reply, filters }
    const { reply, filters } = await callChatGPT(msg);

    // 5) stop loader + streaming de la réponse
    alive = false; clearInterval(loader);
    await typeIntoDraft(reply || "I couldn't find an answer.");

    // 6) convertir en message “fixe”
    finalizeDraftToMessage();

    // 7) appliquer filtres éventuels
    if (filters) await applyAIFilters(filters);

  } catch (err) {
    console.error(err);
    alive = false; clearInterval(loader);
    await typeIntoDraft("Sorry, something went wrong. Please try again.");
    finalizeDraftToMessage();
  }
};








  

  document.getElementById('reset-chat-btn').onclick = () => resetCurrentChat();

  setupFilters();
  renderAll();
});





// ========= DROPDOWN =========
document.addEventListener('DOMContentLoaded', function () {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');
  mainBuyBtn.addEventListener('click', function (e) {
    e.preventDefault();
    buyDropdown.classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    if (!buyDropdown.contains(e.target)) {
      buyDropdown.classList.remove('open');
    }
  });
});


/* ====== BURGER MOBILE (header) — AreaForYou ====== */
(function () {
  const burger = document.getElementById('burgerMenu');
  const nav = document.querySelector('.all-button');
  if (!burger || !nav) return;

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
  let overlay;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'navOverlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'transparent',
      zIndex: '2000',   // <<< au-dessus du header + du menu
      display: 'none'
    });
    document.body.appendChild(overlay);
    return overlay;
  }


function openMenu() {
  nav.classList.add('menu-open');
  nav.classList.add('mobile-open');   // <<< pour compat rétro si CSS attend "mobile-open"
  document.body.style.overflow = 'hidden';
  ensureOverlay().style.display = 'block';
}

function closeMenu() {
  nav.classList.remove('menu-open');
  nav.classList.remove('mobile-open'); // <<<
  document.body.style.overflow = '';
  if (overlay) overlay.style.display = 'none';
}


  burger.addEventListener('click', (e) => {
    if (!isMobile()) return;
    e.preventDefault();
    e.stopPropagation();
    nav.classList.contains('menu-open') ? closeMenu() : openMenu();
  });

  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (!isMobile()) closeMenu(); });
})();

// --- Fermer le menu si clic en dehors ou touche Échap
(function () {
  const burger = document.getElementById('burgerMenu');
  const nav = document.querySelector('.all-button');
  if (!burger || !nav) return;

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  function fallbackClose() {
    nav.classList.remove('menu-open', 'mobile-open');
    document.body.style.overflow = '';
    const overlay = document.getElementById('navOverlay');
    if (overlay) overlay.style.display = 'none';
  }


  function handleOutside(target) {
    return !nav.contains(target) && !burger.contains(target);
  }

  // Clic / tap n'importe où → fermer si ouvert et clic hors menu
  const closeOnDoc = (e) => {
    if (!isMobile()) return;
    if (nav.classList.contains('menu-open') && handleOutside(e.target)) {
      // si closeMenu n'est pas accessible (scopé dans l'IIFE), on fait le fallback
      if (typeof closeMenu === 'function') closeMenu(); else fallbackClose();
    }
  };
  document.addEventListener('click', closeOnDoc, true);
  document.addEventListener('touchstart', closeOnDoc, { passive: true, capture: true });

  // Échap → fermer
  window.addEventListener('keydown', (e) => {
    if (!isMobile()) return;
    if (e.key === 'Escape' && nav.classList.contains('menu-open')) {
      if (typeof closeMenu === 'function') closeMenu(); else fallbackClose();
    }
  });
})();



(function () {
  const mq = window.matchMedia('(max-width: 800px)');
  const chat = document.getElementById('chat-col-v2');
  const props = document.getElementById('properties-col');
  const bar = document.getElementById('splitterBar');
  const container = document.getElementById('split-mobile-container');
  if (!chat || !props || !bar || !container) return;

  /* Réglages ARRÊTS (part de hauteur occupée par le chat)
     - MIN_R → arrêt du BAS (empêche la poignée de “tomber” sous la barre iOS)
     - MAX_R → arrêt du HAUT (empêche la poignée de passer sous le notch / toolbar)
     Ajuste les 2 lignes ci-dessous pour “commencer plus haut / s’arrêter plus bas” */
  const MIN_R = 0.12;  // 10%  (monte-le à 0.12/0.15 si tu veux que le bas reste plus haut)
  const MAX_R = 0.85;  // 88%  (baisse-le à 0.85/0.82 si tu veux que le haut s’arrête plus bas)

  const RATIOS = { closed: MIN_R, half: 0.52, open: MAX_R };
  const STATES = ['half', 'open', 'closed'];   // ordre au clic sur la barre
  let state = 'half';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function enableSmooth() {
    chat.style.transition = 'height .22s';
    props.style.transition = 'height .22s';
  }
  function disableSmooth() {
    chat.style.transition = '';
    props.style.transition = '';
  }
  function overrideMins(zeroForChat, zeroForProps) {
    if (zeroForChat) chat.style.setProperty('min-height', '0', 'important');
    else chat.style.removeProperty('min-height');
    if (zeroForProps) props.style.setProperty('min-height', '0', 'important');
    else props.style.removeProperty('min-height');
  }
  function totalH() {
    return container.getBoundingClientRect().height - bar.offsetHeight;
  }
  function applyRatio(r) {
    const t = totalH();
    const rr = clamp(r, MIN_R, MAX_R);
    const chatH = Math.round(t * rr);
    chat.style.height = chatH + 'px';
    props.style.height = (t - chatH) + 'px';
  }

  function snapTo(newState, animate = true) {
    state = newState;
    if (animate) enableSmooth(); else disableSmooth();

    if (state === 'closed') {
      overrideMins(true, true);
      applyRatio(RATIOS.closed);
    } else if (state === 'open') {
      overrideMins(true, true);
      applyRatio(RATIOS.open);
    } else {
      overrideMins(false, false);
      applyRatio(RATIOS.half);
    }
    setTimeout(disableSmooth, 260);
  }

  // init mobile: semi-ouvert
  function init() {
    if (!mq.matches) return;
    snapTo('half', false);
  }
  init();

  // resize: nettoyage desktop / re-application mobile
  window.addEventListener('resize', () => {
    if (!mq.matches) {
      disableSmooth();
      chat.style.height = '';
      chat.style.removeProperty('min-height');
      props.style.height = '';
      props.style.removeProperty('min-height');
    } else {
      snapTo(state, false);
    }
  });

  // Drag avec bornes + snap au plus proche (bas / milieu / haut)
  let dragging = false, startY = 0, startChatH = 0, moved = 0;

  bar.addEventListener('mousedown', (e) => {
    if (!mq.matches) return;
    dragging = true; moved = 0;
    startY = e.clientY;
    startChatH = chat.getBoundingClientRect().height;
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    moved = Math.max(moved, Math.abs(dy));
    overrideMins(true, true);
    disableSmooth();

    const t = totalH();
    const minH = Math.round(MIN_R * t);
    const maxH = Math.round(MAX_R * t);

    const h = clamp(startChatH + dy, minH, maxH);  // ← clampé entre MIN/MAX
    chat.style.height = h + 'px';
    props.style.height = (t - h) + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';

    const t = totalH();
    const h = parseFloat(chat.style.height) || 0;
    const ratio = clamp(h / t, MIN_R, MAX_R);

    // choisir l'état le plus proche
    let best = 'half', bestDist = Infinity;
    ['closed', 'half', 'open'].forEach(s => {
      const d = Math.abs(ratio - RATIOS[s]);
      if (d < bestDist) { bestDist = d; best = s; }
    });
    snapTo(best, true);
  });

  // Touch
  bar.addEventListener('touchstart', (e) => {
    if (!mq.matches) return;
    const t = e.touches[0];
    dragging = true; moved = 0;
    startY = t.clientY;
    startChatH = chat.getBoundingClientRect().height;
    document.body.style.userSelect = 'none';
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    const dy = t.clientY - startY;
    moved = Math.max(moved, Math.abs(dy));
    overrideMins(true, true);
    disableSmooth();

    const tot = totalH();
    const minH = Math.round(MIN_R * tot);
    const maxH = Math.round(MAX_R * tot);

    const h = clamp(startChatH + dy, minH, maxH);  // ← clampé
    chat.style.height = h + 'px';
    props.style.height = (tot - h) + 'px';
  }, { passive: true });
  function endTouch() {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    const t = totalH();
    const h = parseFloat(chat.style.height) || 0;
    const ratio = clamp(h / t, MIN_R, MAX_R);
    let best = 'half', bestDist = Infinity;
    ['closed', 'half', 'open'].forEach(s => {
      const d = Math.abs(ratio - RATIOS[s]);
      if (d < bestDist) { bestDist = d; best = s; }
    });
    snapTo(best, true);
  }
  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);

  // Clic sur la barre → cycle entre half → open → closed → half…
  bar.addEventListener('click', () => {
    if (!mq.matches || moved > 3) return; // ignore si c’était un drag
    const i = STATES.indexOf(state);
    const next = STATES[(i + 1) % STATES.length];
    snapTo(next, true);
  });
})();



/* ===== MOBILE EDGE TAB → ouvre/ferme la sidebar (mobile only) ===== */
(function () {

    

  const mq = window.matchMedia('(max-width: 800px)');
  if (!mq.matches) return;

  const sidebar = document.querySelector('.multi-sidebar');
  if (!sidebar) return;

  // overlay (réutilise ta classe .mobile-sidebar-overlay)
  let overlay = document.getElementById('mobileSidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobileSidebarOverlay';
    overlay.className = 'mobile-sidebar-overlay';
    document.body.appendChild(overlay);
  }

  // onglet collé à gauche
  let tab = document.getElementById('mobileSidebarTab');
  if (!tab) {
    tab = document.createElement('button');
    tab.id = 'mobileSidebarTab';
    tab.className = 'mobile-sidebar-tab';
    tab.setAttribute('aria-label', 'Open menu');
    tab.innerHTML = '<span class="tab-arrow">❯</span>'; // chevron
    document.body.appendChild(tab);
  }

  // style injecté (mobile only)
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width:800px){
      .mobile-sidebar-tab{
        position: fixed;
        left: 0;
        top: 42vh;                   /* ajuste si tu veux plus haut/bas */
        transform: translateX(-4px);
        width: 28px; height: 56px;
        border-radius: 0 14px 14px 0;
        border: none; background: #ff9100; color:#fff;
        box-shadow: 0 4px 16px rgba(0,0,0,.18);
        z-index: 2050; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
      }
      .mobile-sidebar-tab .tab-arrow{ font-size:20px; line-height:1; transform: translateX(1px); }
      .mobile-sidebar-tab.hidden{ display:none !important; }
    }`;
  document.head.appendChild(style);

  function openSidebar(){
    sidebar.classList.add('open');
    overlay.classList.add('active');
    tab.classList.add('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar(){
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    tab.classList.remove('hidden');
    document.body.style.overflow = '';
  }
  function toggleSidebar(){
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  }

  // actions
  tab.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', closeSidebar);

  

  // fermer après clic dans le menu
  sidebar.querySelectorAll('a, button').forEach(el => el.addEventListener('click', closeSidebar));

  // si on repasse desktop, on nettoie
  window.addEventListener('resize', () => {
    if (!mq.matches) {
      closeSidebar();
      tab && tab.remove();
      overlay && overlay.classList.remove('active');
    }
  });
})();




/* === Mobile: “chat list” opener left to the title (no side tab) === */
(function mobileChatDrawer(){
  const mq = window.matchMedia('(max-width: 800px)');
  if (!mq.matches) return;

  // Nettoyage: enlève toute ancienne poignée/flèche latérale si présente
  document.querySelectorAll('#mobileSidebarTab, .mobile-sidebar-tab, .chat-prompt-tab, .side-tab, .drawer-handle, .chat-side-handle')
    .forEach(el => el.remove());

  const header  = document.querySelector('.multi-header');
  const title   = document.getElementById('current-chat-title');
  const sidebar = document.querySelector('.multi-sidebar');
  if (!header || !title || !sidebar) return;

  // Overlay (créé si absent)
  let overlay = document.querySelector('.mobile-sidebar-overlay');
  if (!overlay){
    overlay = document.createElement('div');
    overlay.className = 'mobile-sidebar-overlay';
    document.body.appendChild(overlay);
  }

  // Bouton d’ouverture (icône chat), à gauche du titre
  let trigger = header.querySelector('.chat-toggle-btn-mobile');
  if (!trigger){
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'chat-toggle-btn-mobile';
    trigger.setAttribute('aria-label','Open chat list');
    trigger.innerHTML = '<i class="fa fa-comments"></i>'; // icône chat (≠ burger)
    header.insertBefore(trigger, title);
  }

  const openDrawer = ()=>{
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.classList.add('drawer-open');  // cache le bouton via CSS
    document.body.style.overflow = 'hidden';
  };
  const closeDrawer = ()=>{
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.classList.remove('drawer-open');
    document.body.style.overflow = '';
  };
  const toggleDrawer = ()=> (sidebar.classList.contains('open') ? closeDrawer() : openDrawer());

  trigger.addEventListener('click', (e)=>{ e.preventDefault(); toggleDrawer(); });
  overlay.addEventListener('click', closeDrawer);
  window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeDrawer(); });

  // Si on repasse desktop, on ferme proprement
  window.addEventListener('resize', ()=>{ if(!window.matchMedia('(max-width:800px)').matches) closeDrawer(); });
})();





/* ==== PATCH "New chat reste visible quand j'écris" (mobile) ==== */
(function keepNewChatVisibleOnTyping(){
  const mq = window.matchMedia('(max-width: 800px)');
  if (!mq.matches) return;

  const container = document.getElementById('split-mobile-container');
  const chatCol   = document.getElementById('chat-col-v2');
  const propsCol  = document.getElementById('properties-col');
  const bar       = document.getElementById('splitterBar');
  const input     = document.getElementById('user-input');
  const scrollBox = document.getElementById('chat-messages-scroll');

  if (!container || !chatCol || !propsCol || !bar || !input || !scrollBox) return;

  // Empêche le zoom iOS sur focus (iOS zoome <16px)
  try { input.style.fontSize = '16px'; } catch {}

  // Bornes pour que la poignée ne sorte jamais de l’écran (mêmes valeurs que ton splitter)
  const MIN_R = 0.12;     // stop bas (augmente si la poignée "tombe" trop bas)
  const MAX_R = 0.85;     // stop haut (baisse si ça monte trop haut)
  const MID_R = 0.54;     // milieu légèrement > 0.52 pour laisser le header visible

  function totalH(){
    return container.getBoundingClientRect().height - bar.offsetHeight;
  }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  // Applique un ratio sans dépendre du code interne du splitter
  function applyRatio(r){
    const t = totalH();
    const rr = clamp(r, MIN_R, MAX_R);
    const h = Math.round(t * rr);
    chatCol.style.setProperty('min-height','0','important');
    propsCol.style.setProperty('min-height','0','important');
    chatCol.style.height  = h + 'px';
    propsCol.style.height = (t - h) + 'px';
  }

  // Force le "stop milieu" pendant la saisie
  function snapToMid(){
    applyRatio(MID_R);
    // Ajoute un padding bas temporaire pour que l’input ne masque pas les derniers messages
    const kbPad = Math.max(60, (document.querySelector('#chat-form')?.offsetHeight || 64)) + 16;
    scrollBox.style.paddingBottom = kbPad + 'px';
    // Scroll en bas pour rester collé à la conversation
    requestAnimationFrame(()=> { scrollBox.scrollTop = scrollBox.scrollHeight; });
  }

  function releasePad(){
    scrollBox.style.paddingBottom = '';
  }

  // Détecte ouverture/fermeture du clavier via visualViewport (iOS/Android)
  let kbOpen = false;
  const vv = window.visualViewport;
  function onViewportChange(){
    if (!mq.matches) return;
    if (!vv) return;

    // Heuristique: si la hauteur visible chute de >8%, on considère que le clavier est ouvert
    const shrink = (vv.height / window.innerHeight) < 0.92;
    if (shrink && !kbOpen){
      kbOpen = true;
      snapToMid();
    } else if (!shrink && kbOpen){
      kbOpen = false;
      releasePad();
      // On laisse l’utilisateur là où il est, pas de snap inverse agressif
    }
  }
  if (vv){
    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
  }

  // Focus / Blur input : même logique que visualViewport pour les navigateurs qui ne l’exposent pas
  input.addEventListener('focus', () => {
    kbOpen = true;
    snapToMid();
  });
  input.addEventListener('blur', () => {
    kbOpen = false;
    // on retire juste le padding; on ne bouge pas le splitter pour ne pas surprendre
    releasePad();
  });

  // Pendant la frappe, on garde l’ancrage bas (utile quand nouveaux messages arrivent)
  const keepAnchored = () => {
    if (!kbOpen) return;
    // Si on est déjà proche du bas, on recolle.
    const nearBottom = (scrollBox.scrollHeight - scrollBox.scrollTop - scrollBox.clientHeight) < 32;
    if (nearBottom) scrollBox.scrollTop = scrollBox.scrollHeight;
  };
  input.addEventListener('input', keepAnchored);

  // Sécurité : si l’utilisateur tape très vite après le chargement
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && kbOpen) snapToMid();
  });

  // Première passe: s’assure que la poignée ne peut pas sortir dès maintenant
  applyRatio(0.52);
})();






/* Ouvrir/fermer la barre de gauche en cliquant sur le logo chat */
(function sidebarToggleWithChatIcon(){
  const trigger  = document.getElementById('chatTrigger');
  const sidebar  = document.querySelector('.multi-sidebar');
  if (!trigger || !sidebar) return;

  // overlay réutilise ton style .mobile-sidebar-overlay si présent
  let overlay = document.getElementById('chatSidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'chatSidebarOverlay';
    overlay.className = 'mobile-sidebar-overlay'; // classe que tu as déjà
    document.body.appendChild(overlay);
  }

  const open  = () => { sidebar.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow='hidden'; };
  const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.style.overflow=''; };
  const toggle= () => (sidebar.classList.contains('open') ? close() : open());

  // clic sur le logo chat → toggle
  trigger.addEventListener('click', (e)=>{ e.preventDefault(); toggle(); });

  // clic hors de la barre → ferme
  overlay.addEventListener('click', close);
  document.addEventListener('click', (e)=>{
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !trigger.contains(e.target)) close();
  }, true);

  // Échap → ferme
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });

  // quand on sélectionne un chat ou crée un nouveau → refermer pour libérer la place
  sidebar.addEventListener('click', (e)=>{
    if (e.target.closest('.multi-chat-list-item') || e.target.closest('#new-chat-btn')) close();
  });
})();

/* Met la page en mode "sidebar flottante" et aligne sous le header */
(function initSidebarFloat(){
  const sidebar = document.querySelector('.multi-sidebar');
  const header  = document.querySelector('.header2');
  if (!sidebar || !header) return;

  // classe qui active les règles CSS ci-dessus
  document.body.classList.add('sidebar-float');

  // calcule la hauteur du header (pour top:)
  const applyTop = () => {
    const h = header.offsetHeight || 80;
    sidebar.style.setProperty('--headerH', h + 'px');
  };
  applyTop();
  window.addEventListener('resize', applyTop);
})();



// Active le mode "sidebar off-canvas" UNIQUEMENT sur desktop
(function desktopSidebarFloatOnly(){
  const body    = document.body;
  const header  = document.querySelector('.header2');
  const sidebar = document.querySelector('.multi-sidebar');

  function apply() {
    const isDesktop = window.matchMedia('(min-width: 801px)').matches;
    body.classList.toggle('desktop-sidebar-float', isDesktop);

    // Aligne la sidebar sous le header
    if (sidebar && header) {
      sidebar.style.setProperty('--headerH', (header.offsetHeight || 60) + 'px');
    }
    // Au chargement desktop: fermée par défaut
    if (isDesktop && sidebar) sidebar.classList.remove('open');
  }

  apply();
  window.addEventListener('resize', apply);
})();
