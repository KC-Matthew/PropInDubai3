



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
let map, markersGroup, markerMap = {};
let currentPage = 1;
const cardsPerPage = 6;
let filteredProperties = [];
let visibleProperties = [];
let popupLayer = null;

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
// Remplacer TOUTE la fonction rowToProperty par ceci
function rowToProperty(row, tableName, coords) {
  // 1) récupérer la "première" image depuis image_url (json/array/texte)
  let first = null;
  const raw = row.image_url;

  if (Array.isArray(raw)) {
    first = raw[0];
  } else if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) first = arr[0];
      } catch { /* ignore */ }
    }
    if (!first) {
      const parts = s.replace(/^\[|\]$/g, "").split(/[\n,;,|]+/).map(x=>x.trim()).filter(Boolean);
      first = parts[0] || s;
    }
  }

  // 2) Résoudre en URL publique
  let imgUrl = "styles/photo/fond.jpg";
  if (first) {
    // a) URL http déjà publique → on garde
    if (/^https?:\/\//i.test(first) || /\/storage\/v1\/object\/public\//i.test(first)) {
      imgUrl = first;
    }
    // b) Clé d'objet → on fabrique l'URL publique via supabase.storage
    else if (window.supabase?.storage) {
      const allowed = new Set(["buy","rent","commercial","offplan","agents","agency","photos_biens"]);
      let bucket = String(tableName || "buy").toLowerCase();
      let key = String(first).replace(/^["']+|["']+$/g, "").replace(/^\/+/, "");

      // si la clé commence par un bucket connu → on l’utilise
      const m = /^([^/]+)\/(.+)$/.exec(key);
      if (m && allowed.has(m[1].toLowerCase())) {
        bucket = m[1].toLowerCase();
        key = m[2];
      }
      // évite le doublon "bucket/bucket/..."
      if (key.toLowerCase().startsWith(bucket + "/")) key = key.slice(bucket.length + 1);

      const { data } = window.supabase.storage.from(bucket).getPublicUrl(key);
      if (data?.publicUrl) imgUrl = data.publicUrl;
    }
  }

  const location = row.localisation_accueil || "Dubai";
  const priceNum = Number(row.price) || 0;

  return {
    id: row.id,                       // ID Supabase
    type: tableName,                  // 'buy' | 'rent' | 'commercial'
    title: row.title || row.property_type || "Property",
    location,
    price: `${priceNum.toLocaleString("en-US")} AED`,
    priceNum,
    bedrooms: Number(row.bedrooms) || 0,
    bathrooms: Number(row.bathrooms) || 0,
    size: row.sqft ? `${row.sqft} sqft` : "",
    image: imgUrl,                    // ✅ URL publique du Bucket (ou fallback)
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

function initMap() {
  const center = [25.23, 55.3];
  if (window.innerWidth < 701) {
    map = L.map("leafletMapMobile", { center, zoom: 12, zoomControl: true });
  } else {
    map = L.map("leafletMap", { center, zoom: 12, zoomControl: true });
  }
  L.tileLayer(EN_TILE_URL, { attribution: EN_ATTR, maxZoom: 20 }).addTo(map);
  markersGroup = L.layerGroup().addTo(map);

  map.on("moveend zoomend", updateVisibleProperties);
  map.on("click", function () {
    if (popupLayer) {
      map.closePopup(popupLayer); popupLayer = null;
    }
  });
}

function updateVisibleProperties() {
  if (!map) return;
  const bounds = map.getBounds();
  visibleProperties = filteredProperties.filter(p => bounds.contains([p.lat, p.lng]));
  if (window.innerWidth < 701) {
    renderMobileProperties(visibleProperties);
  } else {
    renderProperties(currentPage);
  }
  showMarkers(visibleProperties);
}

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

/* MARKERS */
function showMarkers(props) {
  if (!markersGroup) return;
  markersGroup.clearLayers();
  markerMap = {};
  props.forEach((p, idx) => {
    const customIcon = L.divIcon({
      className: `custom-marker${p.active ? " hovered" : ""}`,
      html: `<div style="
        background:${p.active ? "#111" : "#ffb347"};
        color:#fff; padding:7px 10px;border-radius:16px;
        border:2px solid #fff;box-shadow:0 2px 7px rgba(0,0,0,0.09);
        font-size:1.4rem;line-height:1.1;display:inline-block;
        transition:background 0.14s;">
        🏠
      </div>`,
      iconSize: [40, 36],
      iconAnchor: [20, 18],
    });
    const marker = L.marker([p.lat, p.lng], { icon: customIcon })
      .addTo(markersGroup)
      .on("mouseover", () => highlightProperty(idx))
      .on("mouseout", () => unhighlightProperty(idx))
      .on("click", () => { showMiniCardOnMap(p, [p.lat, p.lng]); });
    markerMap[p.id] = marker;
  });
}

function showMiniCardOnMap(property, latlng) {
  if (popupLayer) { map.closePopup(popupLayer); popupLayer = null; }
  const detailUrl = `bien.html?id=${encodeURIComponent(property.id)}&type=${encodeURIComponent(property.type)}`;
  const content = `
    <a href="${detailUrl}" class="map-mini-card"
       style="display:block;width:240px;background:#fff;border-radius:13px;box-shadow:0 4px 28px rgba(0,0,0,0.16);border:2px solid orange;padding:0;overflow:hidden;cursor:pointer;text-decoration:none;color:inherit">
      <img src="${property.image}" alt="${property.title}" style="width:100%; height:105px; object-fit:cover; border-radius:10px 10px 0 0;"/>
      <div style="padding:0.7rem 0.7rem 0.6rem 0.7rem">
        <div style="font-weight:600;font-size:1.06rem;">${property.title}</div>
        <div style="font-size:0.98rem;color:#666;"><i class="fa fa-map-marker-alt"></i> ${property.location}</div>
        <div style="font-size:0.97rem;margin-top:3px;color:#444;">
          🛏️ ${property.bedrooms} &nbsp; 🛁 ${property.bathrooms} &nbsp; 📐 ${property.size}
        </div>
        <div style="font-weight:bold; color:#ff8800; font-size:1.05rem;margin-top:4px;">${property.price}</div>
      </div>
    </a>
  `;
  popupLayer = L.popup({
    autoClose: true, closeOnClick: false, className: "custom-leaflet-popup",
    offset: [0, 18], minWidth: 240, maxWidth: 260, closeButton: false,
  })
    .setLatLng(latlng)
    .setContent(content)
    .openOn(map);
}


function highlightMarker(id) {
  if (markerMap[id]) {
    const el = markerMap[id]._icon;
    if (el) el.classList.add("hovered");
  }
}
function unhighlightMarker(id) {
  if (markerMap[id]) {
    const el = markerMap[id]._icon;
    if (el) el.classList.remove("hovered");
  }
}
function highlightProperty(idx) {
  const cards = document.querySelectorAll(".property-card");
  if (cards[idx]) cards[idx].classList.add("active");
}
function unhighlightProperty(idx) {
  const cards = document.querySelectorAll(".property-card");
  if (cards[idx]) cards[idx].classList.remove("active");
}

/* ===========================
   BOOTSTRAP
   =========================== */

// Tes listeners (burger, dropdown, mobile deck, autocomplete, prix) restent inchangés.
// On ajoute seulement ce bootstrap pour charger Supabase + géocoder avant rendu.

document.addEventListener("DOMContentLoaded", async () => {
  try {
    initMap();
    await loadPropertiesFromSupabase();   // <-- charge + auto-géocode
    // Desktop search
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
    // Mobile search
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
    // Premier rendu
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
