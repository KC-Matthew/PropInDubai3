// ----- DATA DÉMO -----
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

let map, markersGroup, markerMap = {};
let currentPage = 1;
const cardsPerPage = 6;
let filteredProperties = allProperties.slice();
let visibleProperties = filteredProperties.slice();
let popupLayer = null;

// ----------------- BURGER MENU MOBILE -----------------
document.addEventListener('DOMContentLoaded', function() {
  const burger = document.getElementById('burgerMenu');
  const allButton = document.querySelector('.all-button');
  burger.addEventListener('click', function(e) {
    e.stopPropagation();
    allButton.classList.toggle('menu-open');
  });
  document.body.addEventListener('click', function(e) {
    if (!allButton.contains(e.target) && !burger.contains(e.target)) {
      allButton.classList.remove('menu-open');
    }
  });
});

// --------- MENU DÉROULANT "BUY" (desktop) ----------
document.addEventListener('DOMContentLoaded', function() {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');
  if (mainBuyBtn && buyDropdown) {
    mainBuyBtn.addEventListener('click', function(e) {
      e.preventDefault();
      buyDropdown.classList.toggle('open');
    });
    document.addEventListener('click', function(e) {
      if (!buyDropdown.contains(e.target)) {
        buyDropdown.classList.remove('open');
      }
    });
  }
});

// ----------- INIT MAP ---------
function initMap() {
  if (window.innerWidth < 701) {
    map = L.map('leafletMapMobile', { center: [25.23, 55.3], zoom: 12, zoomControl: true });
  } else {
    map = L.map('leafletMap', { center: [25.23, 55.3], zoom: 12, zoomControl: true });
  }
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markersGroup = L.layerGroup().addTo(map);
  map.on('moveend zoomend', updateVisibleProperties);

  // Fermer popup maison si clic sur la carte
  map.on('click', function() {
    if (popupLayer) {
      map.closePopup(popupLayer);
      popupLayer = null;
    }
  });
}

// ---------- PROPERTIES AFFICHÉES (SUR LA VUE CARTE) ----------
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

// ----------- SEARCH DESKTOP -----------
function filterProperties() {
  const searchInput = document.getElementById("searchInput");
  const minPriceInput = document.getElementById("minPriceInput");
  const maxPriceInput = document.getElementById("maxPriceInput");
  const value = searchInput.value.trim().toLowerCase();
  const minPrice = parseInt(minPriceInput.value, 10) || 0;
  const maxPrice = parseInt(maxPriceInput.value, 10) || Number.MAX_SAFE_INTEGER;
  filteredProperties = allProperties.filter(p =>
    (p.title.toLowerCase().includes(value) || p.location.toLowerCase().includes(value)) &&
    p.priceNum >= minPrice && p.priceNum <= maxPrice
  );
  updateVisibleProperties();
}

// ---------- SEARCH MOBILE ----------
function filterMobileProperties() {
  const mobileSearchInput = document.getElementById("mobileSearchInput");
  const mobileMinPriceInput = document.getElementById("mobileMinPriceInput");
  const mobileMaxPriceInput = document.getElementById("mobileMaxPriceInput");
  const value = mobileSearchInput.value.trim().toLowerCase();
  const minPrice = parseInt(mobileMinPriceInput.value, 10) || 0;
  const maxPrice = parseInt(mobileMaxPriceInput.value, 10) || Number.MAX_SAFE_INTEGER;
  filteredProperties = allProperties.filter(p =>
    (p.title.toLowerCase().includes(value) || p.location.toLowerCase().includes(value)) &&
    p.priceNum >= minPrice && p.priceNum <= maxPrice
  );
  updateVisibleProperties();
}

// ---------- AFFICHAGE PROPERTIES DESKTOP ----------
function renderProperties(page = 1) {
  currentPage = page;
  const grid = document.getElementById("propertyGrid");
  const pagination = document.getElementById("pagination");
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

// ---------- AFFICHAGE PROPERTIES MOBILE ----------
function renderMobileProperties(props) {
  const list = document.getElementById("propertyListMobile");
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

// ---------- MARKERS ----------
function showMarkers(props) {
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
      .on('mouseover', () => highlightProperty(idx))
      .on('mouseout', () => unhighlightProperty(idx))
      .on('click', (e) => { showMiniCardOnMap(p, [p.lat, p.lng]); });
    markerMap[p.id] = marker;
  });
}

// ---------- MINI POPUP ----------
function showMiniCardOnMap(property, latlng) {
  if (popupLayer) { map.closePopup(popupLayer); popupLayer = null; }
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
    if (popupDiv) popupDiv.onclick = () => window.location.href = "bien.html";
  }, 50);
}

// --------- HIGHLIGHT MARKERS & CARDS -----------
function highlightMarker(id) { if (markerMap[id]) { const markerElem = markerMap[id]._icon; if (markerElem) markerElem.classList.add("hovered"); } }
function unhighlightMarker(id) { if (markerMap[id]) { const markerElem = markerMap[id]._icon; if (markerElem) markerElem.classList.remove("hovered"); } }
function highlightProperty(idx) { const cards = document.querySelectorAll(".property-card"); if (cards[idx]) cards[idx].classList.add("active"); }
function unhighlightProperty(idx) { const cards = document.querySelectorAll(".property-card"); if (cards[idx]) cards[idx].classList.remove("active"); }

// ---------- EVENTS ----------
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  // Desktop search events
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const minPriceInput = document.getElementById("minPriceInput");
  const maxPriceInput = document.getElementById("maxPriceInput");
  if (searchInput && searchBtn && minPriceInput && maxPriceInput) {
    searchInput.addEventListener('input', filterProperties);
    searchBtn.addEventListener('click', filterProperties);
    minPriceInput.addEventListener('input', filterProperties);
    maxPriceInput.addEventListener('input', filterProperties);
  }

  // Mobile search events
  const mobileSearchInput = document.getElementById("mobileSearchInput");
  const mobileSearchBtn = document.getElementById("mobileSearchBtn");
  const mobileMinPriceInput = document.getElementById("mobileMinPriceInput");
  const mobileMaxPriceInput = document.getElementById("mobileMaxPriceInput");
  if (mobileSearchInput && mobileSearchBtn && mobileMinPriceInput && mobileMaxPriceInput) {
    mobileSearchInput.addEventListener('input', filterMobileProperties);
    mobileSearchBtn.addEventListener('click', filterMobileProperties);
    mobileMinPriceInput.addEventListener('input', filterMobileProperties);
    mobileMaxPriceInput.addEventListener('input', filterMobileProperties);
  }



  

  // Lance le 1er affichage selon le support
  if (window.innerWidth < 701) {
    filterMobileProperties();
  } else {
    filterProperties();
  }
});

// ----------- MOBILE DECK (swipe, click) -----------
document.addEventListener('DOMContentLoaded', function() {
  const deck = document.querySelector('.mobile-cards-deck');
  if (!deck) return;
  const handle = deck.querySelector('.deck-handle');
  let states = ['collapsed', 'half', 'full'];
  let index = 0; // Start collapsed

  handle.addEventListener('click', function() {
    index = (index + 1) % 3;
    deck.className = 'mobile-cards-deck ' + states[index];
  });

  // Glisser le deck
  let startY = null, startTop = null;
  handle.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    startTop = deck.getBoundingClientRect().top;
    deck.style.transition = 'none';
  });
  handle.addEventListener('touchmove', e => {
    if (startY === null) return;
    let diff = e.touches[0].clientY - startY;
    let newTop = Math.max(0, startTop + diff);
    deck.style.top = newTop + 'px';
  });
  handle.addEventListener('touchend', e => {
    deck.style.transition = '';
    let currentTop = deck.getBoundingClientRect().top;
    let vh = window.innerHeight;
    let dists = [0.67*vh, 0.38*vh, 0];
    let best = 0, minDist = Math.abs(currentTop - dists[0]);
    for (let i=1;i<dists.length;i++) {
      if (Math.abs(currentTop - dists[i]) < minDist) {
        minDist = Math.abs(currentTop - dists[i]);
        best = i;
      }
    }
    index = best;
    deck.className = 'mobile-cards-deck ' + states[index];
    deck.style.top = '';
    startY = null;
  });
});






















// AUTOCOMPLETE SEARCHBAR
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById("searchInput");
  const autocompleteDiv = document.getElementById("searchAutocomplete");

  // Protection : si l'un des éléments n'est pas trouvé
  if (!searchInput || !autocompleteDiv) return;

  // Fonction suggestions (titre + location, sans doublons)
  function getSuggestions(query) {
    if (!query) return [];
    query = query.trim().toLowerCase();
    const seen = new Set();
    let matches = [];
    allProperties.forEach(p => {
      if (p.title.toLowerCase().includes(query) && !seen.has(p.title.toLowerCase())) {
        matches.push(p.title);
        seen.add(p.title.toLowerCase());
      }
      if (p.location.toLowerCase().includes(query) && !seen.has(p.location.toLowerCase())) {
        matches.push(p.location);
        seen.add(p.location.toLowerCase());
      }
    });
    return matches.slice(0, 8);
  }

  // Afficher les suggestions
  function showSuggestions() {
    const val = searchInput.value;
    const suggestions = getSuggestions(val);
    if (!val || suggestions.length === 0) {
      autocompleteDiv.style.display = "none";
      autocompleteDiv.innerHTML = "";
      return;
    }
    autocompleteDiv.innerHTML = "";
    suggestions.forEach(sugg => {
      const div = document.createElement("div");
      div.className = "suggestion";
      div.textContent = sugg;
      div.onclick = function(e) {
        e.stopPropagation();
        searchInput.value = sugg;
        autocompleteDiv.style.display = "none";
        filterProperties(); // relance le filtre
      };
      autocompleteDiv.appendChild(div);
    });
    autocompleteDiv.style.display = "block";
  }

  // Cache suggestions si on clique ailleurs
  document.addEventListener('click', function(e) {
    if (!autocompleteDiv.contains(e.target) && e.target !== searchInput) {
      autocompleteDiv.style.display = "none";
    }
  });

  // Affiche suggestions à chaque saisie/focus
  searchInput.addEventListener('input', showSuggestions);
  searchInput.addEventListener('focus', showSuggestions);
});












// OPTIONS EXACTES de prix comme demandé
const priceOptions = [
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

// Affiche les suggestions sous l’input concerné
function showPriceSuggestions(input, suggestionsDiv) {
  suggestionsDiv.innerHTML = '';
  priceOptions.forEach(val => {
    const div = document.createElement('div');
    div.className = 'suggestion';
    div.textContent = formatPrice(val);
    div.onclick = () => {
      input.value = val;
      suggestionsDiv.style.display = 'none';
      input.dispatchEvent(new Event('input')); // Trigger le filtre live
    };
    suggestionsDiv.appendChild(div);
  });
  suggestionsDiv.style.display = 'block';
}

// Initialisation à placer dans ton DOMContentLoaded (après avoir généré le HTML)
document.addEventListener('DOMContentLoaded', () => {
  // -------- MIN PRICE --------
  const minInput = document.getElementById('minPriceInput');
  const minSuggestions = document.getElementById('minPriceSuggestions');
  minInput.addEventListener('focus', () => showPriceSuggestions(minInput, minSuggestions));
  minInput.addEventListener('click', () => showPriceSuggestions(minInput, minSuggestions));
  document.addEventListener('click', (e) => {
    if (!minSuggestions.contains(e.target) && e.target !== minInput) {
      minSuggestions.style.display = 'none';
    }
  });

  // -------- MAX PRICE --------
  const maxInput = document.getElementById('maxPriceInput');
  const maxSuggestions = document.getElementById('maxPriceSuggestions');
  maxInput.addEventListener('focus', () => showPriceSuggestions(maxInput, maxSuggestions));
  maxInput.addEventListener('click', () => showPriceSuggestions(maxInput, maxSuggestions));
  document.addEventListener('click', (e) => {
    if (!maxSuggestions.contains(e.target) && e.target !== maxInput) {
      maxSuggestions.style.display = 'none';
    }
  });

  // Optionnel : Masque la dropdown si on sort du champ
  minInput.addEventListener('blur', () => setTimeout(() => minSuggestions.style.display = 'none', 150));
  maxInput.addEventListener('blur', () => setTimeout(() => maxSuggestions.style.display = 'none', 150));
});
