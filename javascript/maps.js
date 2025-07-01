const allProperties = [];
for (let i = 1; i <= 24; i++) {
  allProperties.push({
    id: i,
    title: ["Luxury Apt", "Modern Villa", "Townhouse", "Loft"][i % 4] + " " + i,
    location: ["Downtown", "JVC", "Dubai Marina", "Palm Jumeirah"][i % 4],
    price: `${1_400_000 + i * 25_000} AED`,
    priceNum: 1_400_000 + i * 25_000,
    bedrooms: 1 + (i % 4),
    bathrooms: 1 + (i % 3),
    size: (950 + i * 8) + " sqft",
    image: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"][i % 2],
    lat: 25.22 + 0.025 * (i % 3) + Math.random() * 0.008,
    lng: 55.28 + 0.025 * (i % 4) + Math.random() * 0.009,
  });
}

const grid = document.getElementById("propertyGrid");
const pagination = document.getElementById("pagination");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const minPriceInput = document.getElementById("minPriceInput");
const maxPriceInput = document.getElementById("maxPriceInput");
const cardsPerPage = 6;
let currentPage = 1;
let filteredProperties = allProperties.slice();
let visibleProperties = filteredProperties.slice();

let map, markersGroup, markerMap = {};

function filterProperties() {
  const value = searchInput.value.trim().toLowerCase();
  const minPrice = parseInt(minPriceInput.value, 10) || 0;
  const maxPrice = parseInt(maxPriceInput.value, 10) || Number.MAX_SAFE_INTEGER;

  filteredProperties = allProperties.filter(p =>
    (p.title.toLowerCase().includes(value) ||
    p.location.toLowerCase().includes(value)) &&
    p.priceNum >= minPrice && p.priceNum <= maxPrice
  );
  updateVisibleProperties();
}

function updateVisibleProperties() {
  if (!map) return;
  // Filtre sur la map (bounds)
  const bounds = map.getBounds();
  visibleProperties = filteredProperties.filter(p => bounds.contains([p.lat, p.lng]));
  currentPage = 1;
  renderProperties(currentPage);
}

function initMap() {
  map = L.map('leafletMap', {
    center: [25.23, 55.3],
    zoom: 12,
    zoomControl: true
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markersGroup = L.layerGroup().addTo(map);

  // On recalcule les biens à chaque changement de vue
  map.on('moveend zoomend', updateVisibleProperties);
}

function showMarkers(props) {
  markersGroup.clearLayers();
  markerMap = {};
  props.forEach((p, idx) => {
    const customIcon = L.divIcon({
      className: `custom-marker${p.active ? " hovered" : ""}`,
      html: `<div style="
        background:${p.active ? "#111" : "#ffb347"};
        color:#fff;
        padding:7px 10px;border-radius:16px;
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
      .on('mouseover', () => highlightProperty(idx))
      .on('mouseout', () => unhighlightProperty(idx))
      .on('click', (e) => {
        showMiniCardOnMap(p, [p.lat, p.lng]);
      });
    markerMap[p.id] = marker;
  });
}

function renderProperties(page = 1) {
  currentPage = page;
  const start = (page - 1) * cardsPerPage;
  const slice = visibleProperties.slice(start, start + cardsPerPage);

  // highlight field pour survol
  slice.forEach(p => p.active = false);

  grid.innerHTML = "";
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
    card.onmouseenter = () => {
      p.active = true;
      highlightMarker(p.id);
      card.classList.add("active");
    };
    card.onmouseleave = () => {
      p.active = false;
      unhighlightMarker(p.id);
      card.classList.remove("active");
    };
    card.onclick = () => { window.location.href = "bien.html"; };
    grid.appendChild(card);
  });

  showMarkers(slice);
  renderPagination();
}

function renderPagination() {
  const pages = Math.ceil(visibleProperties.length / cardsPerPage);
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

// Highlight survol carte → marker map (et inversement)
function highlightMarker(id) {
  if (markerMap[id]) {
    const markerElem = markerMap[id]._icon;
    if (markerElem) markerElem.classList.add("hovered");
  }
}
function unhighlightMarker(id) {
  if (markerMap[id]) {
    const markerElem = markerMap[id]._icon;
    if (markerElem) markerElem.classList.remove("hovered");
  }
}
// Highlight marker → card
function highlightProperty(idx) {
  const cards = grid.querySelectorAll(".property-card");
  if (cards[idx]) cards[idx].classList.add("active");
}
function unhighlightProperty(idx) {
  const cards = grid.querySelectorAll(".property-card");
  if (cards[idx]) cards[idx].classList.remove("active");
}

// Event barre de recherche
searchInput.addEventListener('input', filterProperties);
searchBtn.addEventListener('click', filterProperties);
minPriceInput.addEventListener('input', filterProperties);
maxPriceInput.addEventListener('input', filterProperties);

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  filterProperties(); // Démarre avec la vue map filtrée
});

let popupLayer = null;

// Mini-card popup custom sur la carte
function showMiniCardOnMap(property, latlng) {
  if (popupLayer) {
    map.removeLayer(popupLayer);
    popupLayer = null;
  }
  const content = `
    <div class="map-mini-card" style="width:240px; background:#fff; border-radius:13px; box-shadow:0 4px 28px rgba(0,0,0,0.16); border:2px solid orange; padding:0; overflow:hidden; cursor:pointer;">
      <img src="${property.image}" alt="${property.title}" style="width:100%; height:105px; object-fit:cover; border-radius:10px 10px 0 0;"/>
      <div style="padding:0.7rem 0.7rem 0.6rem 0.7rem">
        <div style="font-weight:600;font-size:1.06rem;">${property.title}</div>
        <div style="font-size:0.98rem;color:#666;"><i class="fa fa-map-marker-alt"></i> ${property.location}</div>
        <div style="font-size:0.97rem;margin-top:3px;color:#444;">
          🛏️ ${property.bedrooms} &nbsp; 🛁 ${property.bathrooms} &nbsp; 📐 ${property.size}
        </div>
        <div style="font-weight:bold; color:#ff8800; font-size:1.05rem;margin-top:4px;">${property.price}</div>
      </div>
    </div>
  `;
  popupLayer = L.popup({
    autoClose: true,
    closeOnClick: false,
    className: 'custom-leaflet-popup',
    offset: [0, 18],
    minWidth: 240,
    maxWidth: 260,
    closeButton: false,
  })
    .setLatLng(latlng)
    .setContent(content)
    .openOn(map);

  setTimeout(() => {
    const popupDiv = document.querySelector('.custom-leaflet-popup .map-mini-card');
    if (popupDiv) {
      popupDiv.onclick = () => window.location.href = "bien.html";
    }
  }, 50);
}

map && map.on('click', function (e) {
  if (popupLayer) {
    map.closePopup(popupLayer);
    popupLayer = null;
  }
});
