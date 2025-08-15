// --------- EXEMPLES DE DONNÉES ---------
const projets = [
  {
    lat: 25.1167, lon: 55.1389,
    status: 'launch',
    titre: 'Ocean House',
    location: 'Palm Jumeirah',
    logo: 'styles/Ellington.png',
    image: 'images/ocean-house.jpg',
    prix: '6,500,000 AED',
    handover: '2025',
    dev: 'Ellington',
    details: ['20% on booking', '80% during construction', '20% on handover'],
    rooms: 2,
    bathrooms: 2,
    type: 'Apartment',
  },
  {
    lat: 25.1852, lon: 55.3578,
    status: 'handover',
    titre: 'Creek Beach Lotus',
    location: 'Creek Beach',
    logo: 'styles/Emaar.png',
    image: 'images/creek-beach.jpg',
    prix: '700,000 AED',
    handover: 'Q4 2024',
    dev: 'Emaar',
    details: ['From 700,000 AED', 'Golf view apartments'],
    rooms: 1,
    bathrooms: 1,
    type: 'Apartment',
  },
  {
    lat: 25.0458, lon: 55.2067,
    status: 'handover',
    titre: 'Sobha Hartland Waves',
    location: 'MBR City',
    logo: 'styles/Sobha.png',
    image: 'images/sobha-waves.jpg',
    prix: '1,300,000 AED',
    handover: '2026',
    dev: 'Sobha',
    details: ['1-2BR Apartments', 'Luxury waterfront'],
    rooms: 2,
    bathrooms: 2,
    type: 'Apartment',
  },
  {
    lat: 25.095, lon: 55.1502,
    status: 'launch',
    titre: 'Beach Mansion',
    location: 'Emaar Beachfront',
    logo: 'styles/Emaar.png',
    image: 'images/beach-mansion.jpg',
    prix: '2,400,000 AED',
    handover: 'Q3 2027',
    dev: 'Emaar',
    details: ['Sea view', 'Smart home tech'],
    rooms: 3,
    bathrooms: 2,
    type: 'Apartment',
  },
  {
    lat: 25.145, lon: 55.2102,
    status: 'handover',
    titre: 'Wilton Park Residences',
    location: 'MBR City',
    logo: 'styles/Ellington.png',
    image: 'images/wilton-park.jpg',
    prix: '950,000 AED',
    handover: '2025',
    dev: 'Ellington',
    details: ['Park view', 'Family community'],
    rooms: 1,
    bathrooms: 1,
    type: 'Apartment',
  },
  {
    lat: 25.125, lon: 55.1352,
    status: 'launch',
    titre: 'Bugatti Residences',
    location: 'Business Bay',
    logo: 'styles/Bugatti.png',
    image: 'images/bugatti.jpg',
    prix: '19,000,000 AED',
    handover: 'Q2 2028',
    dev: 'Binghatti',
    details: ['Luxury branded', 'Private pools'],
    rooms: 4,
    bathrooms: 4,
    type: 'Penthouse',
  },
  // ➕ Ajoute d'autres projets variés pour tester le rendu
];

// --------- FILTRAGE / ÉTATS ---------
let globalMinPrice = 500000, globalMaxPrice = 20000000, PRICE_STEP = 10000;
let windowSelectedMinPrice = globalMinPrice, windowSelectedMaxPrice = globalMaxPrice;
let filteredProjets = projets.slice();
let leafletMarkers = [];
let map; // On va l'init dans le DOMContentLoaded
let priceSlider = null;

// --------- MARKER (minimal, flèche) ---------
function createPromoteurMarker(projet) {
  const badge = projet.status === 'launch'
    ? `<span class="marker-badge launch">Launch</span>`
    : `<span class="marker-badge handover">Handover</span>`;
  return `
    <div class="promoteur-marker">
      <img src="${projet.logo}" class="promoteur-marker-logo" alt="logo"/>
      <div class="promoteur-marker-title small">${projet.dev}</div>
      ${badge}
      <div class="promoteur-marker-arrow">
        <svg width="33" height="14" viewBox="0 0 33 14" fill="none"><polygon points="16.5,14 0,0 33,0" fill="#fff"/></svg>
      </div>
    </div>
  `;
}

// --------- FILTRAGE ET SYNCHRO ---------
function applyAllFilters() {
  const selectedStatus = document.getElementById('handoverFilter')?.value || "";
  const selectedPromoteur = document.getElementById('promoteurFilter')?.value || "";
  const selectedPropertyType = document.getElementById('propertyTypeFilter')?.value || "";
  const selectedRoom = document.getElementById('roomFilter')?.value || "";
  const selectedBathroom = document.getElementById('bathroomFilter')?.value || "";
  let minVal = windowSelectedMinPrice, maxVal = windowSelectedMaxPrice;

  filteredProjets = projets.filter(p => {
    let isOK = true;
    if (selectedStatus && selectedStatus !== "all")
      isOK = isOK && ((selectedStatus === 'handover') ? p.status === 'handover' : p.status === 'launch');
    if (selectedPromoteur && selectedPromoteur !== "all")
      isOK = isOK && (p.dev === selectedPromoteur);
    if (selectedPropertyType)
      isOK = isOK && (p.type === selectedPropertyType);
    if (selectedRoom)
      isOK = isOK && (selectedRoom === "4" ? p.rooms >= 4 : p.rooms == selectedRoom);
    if (selectedBathroom)
      isOK = isOK && (selectedBathroom === "4" ? p.bathrooms >= 4 : p.bathrooms == selectedBathroom);
    let prix = parseInt(String(p.prix).replace(/[^\d]/g,""));
    isOK = isOK && prix >= minVal && prix <= maxVal;
    return isOK;
  });

  updateMapMarkers();
}

// --------- SYNCHRO MARKERS ---------
function updateMapMarkers() {
  leafletMarkers.forEach(m => map.removeLayer(m));
  leafletMarkers = [];
  filteredProjets.forEach(projet => {
    const icon = L.divIcon({
      className: '',
      html: createPromoteurMarker(projet),
      iconSize: [100, 85],
      iconAnchor: [50, 77],
      popupAnchor: [0, -80]
    });
    let marker = L.marker([projet.lat, projet.lon], { icon }).addTo(map);
    marker.on('click', (e) => showProjectPopup(projet, e.latlng));
    leafletMarkers.push(marker);
  });
}

// --------- PRIX POPUP & SLIDER ---------
function fmt(n) { return Number(n).toLocaleString('en-US'); }

function openPricePopup() {
  const popup = document.getElementById("priceFilterPopup");
  popup.classList.add('active');
  updatePriceSliderAndHistogram();
  setTimeout(() => {
    document.getElementById("priceMinInput").focus();
  }, 120);
}

function closePricePopup() {
  document.getElementById("priceFilterPopup").classList.remove('active');
  document.body.classList.remove('price-popup-open');
}

function updatePriceSliderAndHistogram() {
  let minPrice = globalMinPrice, maxPrice = globalMaxPrice;
  let sliderElem = document.getElementById("priceSlider");
  if (priceSlider) { priceSlider.destroy(); priceSlider = null; sliderElem.innerHTML = ""; }
  let currentMin = windowSelectedMinPrice, currentMax = windowSelectedMaxPrice;
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
      from: v => Number(String(v).replace(/[^\d]/g,""))
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
  let prices = [];
  for (let i = 0; i < 30; i++) {
    prices.push(Math.floor(Math.random() * (max - min)) + min);
  }
  let bins = 18, hist = Array(bins).fill(0);
  prices.forEach(price => {
    let idx = Math.floor((price - min) / (max - min) * (bins - 1));
    idx = Math.max(0, Math.min(bins - 1, idx));
    hist[idx]++;
  });
  let maxHist = Math.max(...hist, 2);
  for (let i = 0; i < bins; i++) {
    let x = Math.floor(i * width / bins) + 3;
    let barWidth = Math.floor(width / bins) - 7;
    let y = Math.floor(height - (hist[i] / maxHist) * (height-10));
    let barHeight = height - y;
    ctx.beginPath();
    ctx.fillStyle = (function(){
      let binStart = min + (i / bins) * (max - min);
      let binEnd = min + ((i+1)/bins) * (max - min);
      return (binEnd >= sliderMin && binStart <= sliderMax) ? "#f17100" : "#ffd2a5";
    })();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.roundRect(x, y, barWidth, barHeight, 5);
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

// --------- POPUP LEAFLET ---------
function showProjectPopup(projet, latlng) {
  const popupContent = `
    <div style="width:250px;min-width:180px;padding-bottom:7px;box-shadow:0 4px 18px 0 rgba(32,32,32,0.14);border-radius:14px;background:#fff;overflow:hidden;position:relative;">
      <button class="popup-close" title="Fermer" onclick="closeLeafletPopup()" style="position:absolute;top:7px;left:8px;border:none;background:#fff;font-size:1.13rem;border-radius:8px;width:30px;height:30px;box-shadow:0 1px 8px #0001;cursor:pointer;z-index:3;">&times;</button>
      <div class="popup-clickable" style="cursor:pointer;">
        <div style="height:93px;overflow:hidden;">
          <img src="${projet.image || projet.logo}" style="width:100%;height:93px;object-fit:cover;">
        </div>
        <div style="padding:10px 14px 0 14px;">
          <div style="font-size:1.11rem;font-weight:700;margin-bottom:2px;">${projet.titre}</div>
          <div style="color:#999;font-size:1rem;margin-bottom:5px;">
            <img src="https://img.icons8.com/ios-filled/15/aaaaaa/marker.png" style="margin-bottom:-2px;opacity:.68;">
            ${projet.location}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
            <span style="color:#ff9100;font-weight:700;font-size:1.08rem;">${projet.prix}</span>
            <span style="font-weight:600;border-radius:9px;padding:2.5px 13px;font-size:.98rem;background:${projet.status==='launch'?'#f6efff':'#fff6e0'};color:${projet.status==='launch'?'#8429d3':'#ff9100'};">
              ${projet.status === 'launch' ? 'Launch Soon' : 'Handover Soon'}
            </span>
          </div>
          <div style="color:#757575;font-size:.99rem;margin-bottom:4px;">
            <img src="https://img.icons8.com/ios-glyphs/16/aaaaaa/clock--v1.png" style="margin-bottom:-2px;opacity:.8;"> <b>${projet.handover}</b>
            &nbsp; <img src="https://img.icons8.com/ios-glyphs/16/aaaaaa/worker-male--v2.png" style="margin-bottom:-2px;opacity:.7;"> <b>${projet.dev}</b>
          </div>
          ${projet.details.map(d => `<div style="font-size:.98rem;color:#3d3d3d;">• ${d}</div>`).join('')}
        </div>
      </div>
    </div>
    <div style="left:50%;transform:translateX(-50%);bottom:-20px;position:absolute;">
      <svg width="44" height="22" viewBox="0 0 44 22" fill="none">
        <polygon points="22,22 0,0 44,0" fill="#fff"/>
      </svg>
    </div>
  `;
  if (window._leafletCustomPopup) {
    map.closePopup(window._leafletCustomPopup);
    window._leafletCustomPopup = null;
  }
  const leafletPopup = L.popup({
    maxWidth: 290,
    closeButton: false,
    className: "leaflet-airbnb-popup",
    autoPan: true,
    offset: [0, -70]
  }).setLatLng(latlng).setContent(popupContent).openOn(map);

  window._leafletCustomPopup = leafletPopup;

  // ➜ Ajoute le listener APRÈS l’ouverture du popup (sinon le DOM n’existe pas encore)
  setTimeout(() => {
    const clickable = document.querySelector('.popup-clickable');
    if (clickable) {
      clickable.onclick = function(e) {
        // Pour éviter de fermer si on clique la croix par erreur
        window.location.href = "off-plan-click.html";
      };
    }
  }, 10);
}






function closeLeafletPopup() {
  if (window._leafletCustomPopup) {
    map.closePopup(window._leafletCustomPopup);
    window._leafletCustomPopup = null;
  }
}

// --------- INIT GLOBAL ---------
document.addEventListener('DOMContentLoaded', function () {

  
  // 1. Map
  map = L.map('map').setView([25.2048, 55.2708], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  // 2. Filtres
  document.getElementById('handoverFilter').addEventListener('change', applyAllFilters);
  document.getElementById('promoteurFilter').addEventListener('change', applyAllFilters);
  document.getElementById('propertyTypeFilter').addEventListener('change', applyAllFilters);
  document.getElementById('roomFilter').addEventListener('change', applyAllFilters);
  document.getElementById('bathroomFilter').addEventListener('change', applyAllFilters);
  document.getElementById('resetFilters').addEventListener('click', function () {
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

  // 3. Prix popup
  document.getElementById("openPriceFilter").addEventListener("click", function(e) {
    e.stopPropagation();
    openPricePopup();
  });
  document.getElementById("closePricePopup").addEventListener("click", closePricePopup);
  document.getElementById("validatePriceBtn").addEventListener("click", function () {
    let minVal = Number(String(document.getElementById("priceMinInput").value).replace(/[^\d]/g,"")) || globalMinPrice;
    let maxVal = Number(String(document.getElementById("priceMaxInput").value).replace(/[^\d]/g,"")) || globalMaxPrice;
    minVal = Math.max(globalMinPrice, Math.min(globalMaxPrice, minVal));
    maxVal = Math.max(globalMinPrice, Math.min(globalMaxPrice, maxVal));
    windowSelectedMinPrice = minVal;
    windowSelectedMaxPrice = maxVal;
    document.getElementById('priceLabel').textContent =
      (minVal > globalMinPrice || maxVal < globalMaxPrice)
        ? `${fmt(minVal)} – ${fmt(maxVal)} AED` : 'Price';
    applyAllFilters();
    closePricePopup();
  });

  // 4. Ferme le popup prix si on clique dehors
  document.addEventListener('mousedown', function(e) {
    const popup = document.getElementById('priceFilterPopup');
    if (
      popup.classList.contains('active') &&
      !popup.querySelector('.price-popup-inner').contains(e.target) &&
      e.target.id !== 'openPriceFilter'
    ) {
      closePricePopup();
    }
  });

  // 5. Burger menu
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

  // 6. Tabs navigation (si tu utilises)
  const tabMap = document.getElementById('tab-map');
  const tabListing = document.getElementById('tab-listing');
  const isMapPage = window.location.pathname.includes('off-plan-map');
  if (tabListing && isMapPage) {
    tabListing.addEventListener('click', function () {
      window.location.href = "off-plan-search.html";
    });
  }
  if (tabMap && !isMapPage) {
    tabMap.addEventListener('click', function () {
      window.location.href = "off-plan-map.html";
    });
  }

  // 7. Markers et tout le reste
  applyAllFilters();
});
























document.addEventListener('DOMContentLoaded', function() {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');

  // Ouvre/Ferme le menu au clic
  mainBuyBtn.addEventListener('click', function(e) {
    e.preventDefault();
    buyDropdown.classList.toggle('open');
  });

  // Ferme le menu si clic en dehors
  document.addEventListener('click', function(e) {
    if (!buyDropdown.contains(e.target)) {
      buyDropdown.classList.remove('open');
    }
  });

  // NO MORE preventDefault on dropdown-option!
  // Les liens <a> du menu déroulant ouvrent bien la page maintenant
});
