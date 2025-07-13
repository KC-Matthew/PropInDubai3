// --- FONCTION D'AFFICHAGE UNIFIÉE ---
function fmt(n) {
  // Formate tout nombre avec des virgules (US)
  return Number(n).toLocaleString('en-US');
}

// --- VARIABLES GLOBALES ---
let properties = []; // Liste complète (vient de ta BDD)
let filteredProperties = []; // Liste filtrée courante
let priceSlider = null;
let minPrice = 0, maxPrice = 0;
let globalMinPrice = 0, globalMaxPrice = 0;
const PRICE_STEP = 10000;

document.addEventListener("DOMContentLoaded", () => {
  // --- 0. Sticky Header + Filter Bar (MOBILE) ---
  if (window.innerWidth < 700) {
    const header = document.querySelector('.header2');
    const filter = document.querySelector('.filter-bar');
    if (header && filter && !document.querySelector('.sticky-top-wrapper')) {
      const sticky = document.createElement('div');
      sticky.className = 'sticky-top-wrapper';
      header.parentNode.insertBefore(sticky, header);
      sticky.appendChild(header);
      sticky.appendChild(filter);
      // console.log('[WRAP MOBILE] sticky-top-wrapper appliqué');
    }
  }

  // --- MENU MOBILE BURGER (unique, pas de doublon) ---
  const burger = document.getElementById('burgerMenu');
let mobileMenu = null;

burger?.addEventListener('click', function (e) {
  e.stopPropagation();
  if (mobileMenu && document.body.contains(mobileMenu)) {
    // Déjà ouvert → ferme !
    mobileMenu.remove();
    mobileMenu = null;
    return;
  }
  const allButton = document.querySelector('.all-button');
  mobileMenu = document.createElement('nav');
  mobileMenu.className = 'burger-menu';
  mobileMenu.innerHTML = allButton?.innerHTML || "";
  Object.assign(mobileMenu.style, {
    position: 'fixed',
    top: '54px',
    left: 0, right: 0,
    zIndex: 2000,
    width: '100vw',
    background: '#fff',
    boxShadow: '0 4px 24px 2px rgba(0,0,0,0.11)',
    padding: '14px 0 18px 0',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    animation: 'popupAppear .22s cubic-bezier(.61,.01,.74,1.05)'
  });
  document.body.appendChild(mobileMenu);

  function closeMenu() {
    if (mobileMenu) {
      mobileMenu.remove();
      mobileMenu = null;
    }
  }
  // Ferme au clic dehors
  setTimeout(() => {
    document.addEventListener('click', function escBurger(ev) {
      if (ev.target === mobileMenu) {
        closeMenu();
        document.removeEventListener('click', escBurger);
      }
    });
  }, 10);
  // Ferme ESC
  document.addEventListener('keydown', function escClose(ev) {
    if (ev.key === 'Escape' && mobileMenu && document.body.contains(mobileMenu)) {
      closeMenu();
      document.removeEventListener('keydown', escClose);
    }
  });
});




  // --- Responsive : affiche/cacher boutons header selon largeur
  function responsiveHeader() {
    const isMobile = window.innerWidth < 700;
    document.querySelector('.all-button').style.display = isMobile ? 'none' : '';
    document.querySelector('.profil-block').style.display = isMobile ? 'flex' : '';
    // Ferme menu si on repasse en desktop
    if (!isMobile && mobileMenu && document.body.contains(mobileMenu)) {
      mobileMenu.remove();
      document.body.style.overflow = '';
    }
  }
  window.addEventListener('resize', responsiveHeader);
  responsiveHeader();

  // --- 1. Charge les propriétés
  properties = getDummyProperties(); // À remplacer par ta vraie data
  filteredProperties = properties.slice();

  // --- 2. Calcule le min et max global
  const allPrices = getAllPrices(properties);
  globalMinPrice = Math.min(...allPrices);
  globalMaxPrice = Math.max(...allPrices);

  // --- 3. Premier affichage
  displayProperties(filteredProperties, 1);
  updatePriceSliderAndHistogram(properties);

  // --- 4. Events filtres principaux
  document.getElementById("searchBtn").addEventListener("click", handleSearchOrFilter);
  document.getElementById("clearBtn").addEventListener("click", handleClearFilters);
  document.getElementById("openPriceFilter").addEventListener("click", openPricePopup);

  document.getElementById("validatePriceBtn").addEventListener("click", function() {
    if (!priceSlider) return;
    let minVal = Number(String(document.getElementById("priceMinInput").value).replace(/[^\d]/g,"")) || globalMinPrice;
    let maxVal = Number(String(document.getElementById("priceMaxInput").value).replace(/[^\d]/g,"")) || globalMaxPrice;
    minVal = Math.max(globalMinPrice, Math.min(globalMaxPrice, minVal));
    maxVal = Math.max(globalMinPrice, Math.min(globalMaxPrice, maxVal));
    document.getElementById('priceMin').value = minVal;
    document.getElementById('priceMax').value = maxVal;
    document.getElementById('selectedPriceRange').textContent = fmt(minVal) + " - " + fmt(maxVal) + " AED";
    closePricePopup();
    handleSearchOrFilter();
  });
  document.getElementById("closePricePopup").addEventListener("click", closePricePopup);

  // Suggestions dynamiques
  document.getElementById("search").addEventListener("input", showSearchSuggestions);

  function showSearchSuggestions(e) {
    const val = e.target.value.trim().toLowerCase();
    const suggestionDiv = document.getElementById("searchSuggestions");
    if (!val) {
      suggestionDiv.innerHTML = "";
      suggestionDiv.style.display = "none";
      return;
    }
    const locations = properties
      .map(p => p.location && p.location.trim())
      .filter(loc => loc && loc.toLowerCase().includes(val));
    const uniqueLocations = Array.from(new Set(locations)).slice(0, 8);

    if (uniqueLocations.length === 0) {
      suggestionDiv.innerHTML = "";
      suggestionDiv.style.display = "none";
      return;
    }

    suggestionDiv.innerHTML = uniqueLocations.map(location => {
      const reg = new RegExp(`(${val})`, "i");
      const label = location.replace(reg, '<strong>$1</strong>');
      return `
        <div class="suggestion-pf-item">
          <span class="suggestion-pf-icon"><i class="fa-solid fa-location-dot"></i></span>
          <span class="suggestion-pf-label">${label}</span>
        </div>
      `;
    }).join("");

    suggestionDiv.style.display = "block";
    Array.from(suggestionDiv.children).forEach((div, idx) => {
      div.addEventListener('click', () => {
        document.getElementById("search").value = uniqueLocations[idx];
        suggestionDiv.innerHTML = "";
        suggestionDiv.style.display = "none";
        handleSearchOrFilter();
      });
    });
  }

  // Ferme suggestions si clic ailleurs
  document.addEventListener("click", function(e){
    if (!document.getElementById("searchSuggestions").contains(e.target) &&
        e.target !== document.getElementById("search")) {
      document.getElementById("searchSuggestions").innerHTML = "";
      document.getElementById("searchSuggestions").style.display = "none";
    }
  });

  // Ferme popup prix si clic dehors ou ESC
  document.getElementById("priceFilterPopup").addEventListener("mousedown", function(e){
    if (e.target === this) closePricePopup();
  });
  document.addEventListener("keydown", function(e){
    if (document.getElementById("priceFilterPopup").classList.contains("active") && e.key === "Escape") closePricePopup();
  });

  // Filtrage live :
  document.getElementById("search").addEventListener("input", handleSearchOrFilter);
  document.getElementById("propertyType").addEventListener("change", handleSearchOrFilter);
  document.getElementById("bedrooms").addEventListener("change", handleSearchOrFilter);
  document.getElementById("bathrooms").addEventListener("change", handleSearchOrFilter);

  // --- Scroll To Top BTN ---
  const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  if (scrollToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 250) scrollToTopBtn.style.display = 'block';
      else scrollToTopBtn.style.display = 'none';
    });
    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  autoPrefillFromParams();

});






// --- FONCTIONS PRIX POPUP ---
function openPricePopup() {
  document.getElementById("priceFilterPopup").classList.add('active');
  document.body.classList.add('price-popup-open');
  setTimeout(() => {
    document.getElementById("priceMinInput").focus();
  }, 120);
}
function closePricePopup() {
  document.getElementById("priceFilterPopup").classList.remove('active');
  document.body.classList.remove('price-popup-open');
}

// --- DUMMY DATA À VIRER/REMPLACER PAR TES DATA BDD ---
function getDummyProperties() {
  let arr = [];
  for (let i = 0; i < 47; i++) {
    arr.push({
      title: ["Apartment", "Villa", "Townhouse", "Penthouse"][i % 4],
      price: `${2_000_000 + i * 120_000} AED`,
      location: ["Downtown Dubai", "Palm Jumeirah", "Dubai South", "JVC"][i % 4],
      bedrooms: 2 + (i % 5),
      bathrooms: 1 + (i % 4),
      size: 1100 + (i * 13) % 900,
      amenities: ["Central A/C", "Balcony", "Shared Pool", "View of Water"],
      images: [
        "styles/photo/dubai-map.jpg",
        "styles/photo/fond.jpg"
      ],
      agent: {
        name: ["John Doe", "Jane Smith", "Omar Khalid", "Sara Hamed"][i % 4],
        avatar: `https://randomuser.me/api/portraits/${i % 2 === 0 ? "men" : "women"}/${30 + i % 40}.jpg`
      }
    });
  }
  return arr;
}

// --- AFFICHAGE DES PROPRIÉTÉS + PAGINATION ---
function paginate(arr, page) {
  const cardsPerPage = 18;
  const total = arr.length;
  const pages = Math.ceil(total / cardsPerPage) || 1;
  const start = (page - 1) * cardsPerPage;
  const end = start + cardsPerPage;
  return { page, total, pages, slice: arr.slice(start, end) };
}



function displayProperties(propsArray, page) {
  const container = document.getElementById("propertyResults");
  const propertyCountDiv = document.getElementById("propertyCount");
  const propertyTypesDiv = document.getElementById("propertyTypesSummary");
  const propertyTypeSelect = document.getElementById("propertyType");
  const paginationDiv = document.getElementById("pagination");

  const {slice, total, pages} = paginate(propsArray, page);
  container.innerHTML = "";
  propertyCountDiv.textContent = `${fmt(propsArray.length)} properties found`;
  slice.forEach(property => {
    const card = document.createElement("div");
    card.className = "property-card";
    const imageElements = property.images.map((src, index) =>
      `<img src="${src}" class="${index === 0 ? 'active' : ''}" alt="Property Photo">`
    ).join('');
    card.innerHTML = `
      <div class="carousel">
        ${imageElements}
        <div class="carousel-btn prev">❮</div>
        <div class="carousel-btn next">❯</div>
        <div class="image-count"><i class="fas fa-camera"></i> ${fmt(property.images.length)}</div>
      </div>
      <div class="property-info">
        <h3>${property.title}</h3>
        <p><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
        <p><i class="fas fa-bed"></i> ${fmt(property.bedrooms)} 
           <i class="fas fa-bath"></i> ${fmt(property.bathrooms)} 
           <i class="fas fa-ruler-combined"></i> ${fmt(property.size)} sqft</p>
        <strong>${fmt(parseInt(property.price))} AED</strong>
        <div class="agent-info">
          <img src="${property.agent.avatar}" alt="Agent">
          <span>${property.agent.name}</span>
        </div>
        <div class="property-actions">
          <button>Call</button>
          <button>Email</button>
          <button>WhatsApp</button>
        </div>
      </div>
    `;
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      window.location.href = "bien.html";
    });

    container.appendChild(card);

    // Carousel logic
    const carousel = card.querySelector(".carousel");
    const imgs = carousel.querySelectorAll("img");
    let currentIndex = 0;

    // Affichage desktop : flèches visibles et fonctionnelles
    const prevBtn = carousel.querySelector('.prev');
    const nextBtn = carousel.querySelector('.next');
    if (window.innerWidth >= 700) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        imgs[currentIndex].classList.remove("active");
        currentIndex = (currentIndex - 1 + imgs.length) % imgs.length;
        imgs[currentIndex].classList.add("active");
      });
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        imgs[currentIndex].classList.remove("active");
        currentIndex = (currentIndex + 1) % imgs.length;
        imgs[currentIndex].classList.add("active");
      });
    } else {
      // Mobile : flèches cachées + swipe tactile
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
      let startX = null;
      carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      });
      carousel.addEventListener('touchend', (e) => {
        if (startX === null) return;
        let endX = e.changedTouches[0].clientX;
        let dx = endX - startX;
        if (Math.abs(dx) > 35) { // Seuil swipe
          imgs[currentIndex].classList.remove("active");
          if (dx < 0) { // swipe gauche : image suivante
            currentIndex = (currentIndex + 1) % imgs.length;
          } else { // swipe droite : image précédente
            currentIndex = (currentIndex - 1 + imgs.length) % imgs.length;
          }
          imgs[currentIndex].classList.add("active");
        }
        startX = null;
      });
    }
  });
  displayPropertyTypesSummary(propsArray, document.getElementById("propertyType").value);
  updatePagination(pages, page, propsArray);
}





function updatePagination(pages, page, propsArray) {
  const paginationDiv = document.getElementById("pagination");
  paginationDiv.innerHTML = '';
  if (pages <= 1) return;
  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '&laquo;';
  prevBtn.className = 'page-btn';
  prevBtn.disabled = page === 1;
  prevBtn.addEventListener('click', () => { displayProperties(propsArray, page - 1); });
  paginationDiv.appendChild(prevBtn);
  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === page ? ' active' : '');
    btn.textContent = fmt(i);
    btn.addEventListener('click', () => { displayProperties(propsArray, i); });
    paginationDiv.appendChild(btn);
  }
  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '&raquo;';
  nextBtn.className = 'page-btn';
  nextBtn.disabled = page === pages;
  nextBtn.addEventListener('click', () => { displayProperties(propsArray, page + 1); });
  paginationDiv.appendChild(nextBtn);
}

// --- Résumé types de biens (affichage au-dessus listings) ---
function displayPropertyTypesSummary(propsArray, filterType) {
  const propertyTypesDiv = document.getElementById("propertyTypesSummary");
  const propertyTypeSelect = document.getElementById("propertyType");
  const typeCounts = {};
  propsArray.forEach(p => { typeCounts[p.title] = (typeCounts[p.title] || 0) + 1; });
  const typeOrder = [
    "Apartment", "Villa", "Townhouse", "Land", "Duplex", "Penthouse", "Compound", "Whole Building"
  ];
  const sortedTypes = Object.keys(typeCounts).sort((a, b) => {
    const idxA = typeOrder.indexOf(a); const idxB = typeOrder.indexOf(b);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });
  let html = `<div class="pts-row">`;
  sortedTypes.forEach(type => {
    html += `<span class="pts-type${filterType === type ? " selected" : ""}" data-type="${type}" style="cursor:pointer">${type} <span class="pts-count">(${fmt(typeCounts[type])})</span></span>`;
  });
  html += `</div>`;
  propertyTypesDiv.innerHTML = html;
  propertyTypesDiv.querySelectorAll('.pts-type').forEach(elem => {
    elem.addEventListener('click', function() {
      propertyTypeSelect.value = elem.getAttribute('data-type');
      handleSearchOrFilter();
      propertyTypesDiv.querySelectorAll('.pts-type').forEach(span => span.classList.remove('selected'));
      elem.classList.add('selected');
      document.getElementById("propertyCount").scrollIntoView({behavior: "smooth"});
    });
  });
}

// --- FILTRE (recherche + sliders + autres selects) ---
function handleSearchOrFilter() {
  let arr = properties.slice();
  const search = document.getElementById("search").value.trim().toLowerCase();
  const propertyType = document.getElementById("propertyType").value;
  const bedrooms = document.getElementById("bedrooms").value;
  const bathrooms = document.getElementById("bathrooms").value;
  const priceMin = parseInt(document.getElementById('priceMin').value) || 0;
  const priceMax = parseInt(document.getElementById('priceMax').value) || Infinity;
  const keywordInput = document.getElementById('keywordInput');
  const keywords = keywordInput ? keywordInput.value.trim().toLowerCase().split(',').map(k => k.trim()).filter(Boolean) : [];
  
  // --- Ajout filtres avancés More Filters ---
  // Area filters
  const minArea = parseInt(document.getElementById('minAreaInput')?.value) || 0;
  const maxArea = parseInt(document.getElementById('maxAreaInput')?.value) || Infinity;
  // Furnished filter
  const isFurnished = document.getElementById('furnishingFilter')?.checked;
  
  // Récupérer les amenities sélectionnés
  const checkedAmenities = Array.from(document.querySelectorAll('.amenities-list input[type="checkbox"]:checked')).map(cb => cb.value);

  // -- Filtre par amenities --
  if (checkedAmenities.length) {
    arr = arr.filter(p => {
      if (!p.amenities) return false;
      // Il faut que chaque amenity choisie soit présente dans la propriété (tous cochés)
      return checkedAmenities.every(a => p.amenities.includes(a));
    });
  }

  // -- Filtre par mots-clés (déjà dans ton code) --
  if (keywords.length > 0) {
    arr = arr.filter(p => {
      const allText = [
        p.title, p.location, (p.description || ''), 
        ...(p.amenities || []) // si tu ajoutes un champ amenities (array)
      ].join(' ').toLowerCase();
      return keywords.every(k => allText.includes(k));
    });
  }

  // -- Filtre recherche générale (search) --
  if (search) {
    arr = arr.filter(p =>
      p.title.toLowerCase().includes(search) ||
      p.location.toLowerCase().includes(search)
    );
  }

  // -- Filtre par type de propriété --
  if (propertyType !== "Property Type") {
    arr = arr.filter(p => p.title === propertyType);
  }

  // -- Filtre par nombre de chambres --
  if (bedrooms !== "Bedrooms") {
    const min = parseInt(bedrooms);
    arr = arr.filter(p => p.bedrooms >= min);
  }

  // -- Filtre par nombre de salles de bains --
  if (bathrooms !== "Bathrooms") {
    const min = parseInt(bathrooms);
    arr = arr.filter(p => p.bathrooms >= min);
  }

  // -- Filtre par surface (area) --
  if (minArea > 0) {
    arr = arr.filter(p => (p.size || 0) >= minArea);
  }
  if (maxArea < Infinity) {
    arr = arr.filter(p => (p.size || 0) <= maxArea);
  }

  // -- Filtre furnished --
  if (isFurnished) {
    arr = arr.filter(p => p.furnished === true);
  }

  // -- Filtre par prix --
  arr = arr.filter(p => {
    const price = parseInt(String(p.price).replace(/[^\d]/g, ""));
    return price >= priceMin && price <= priceMax;
  });

  filteredProperties = arr;
  displayProperties(filteredProperties, 1);
  updatePriceSliderAndHistogram(properties); // <= TOUJOURS TOUTES LES PROPRIÉTÉS
}

function handleClearFilters() {
  // 1. Réinitialise la filter-bar
  document.querySelectorAll(".filter-bar input, .filter-bar select").forEach(el => {
    if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else {
      el.value = "";
    }
  });

  // 2. Réinitialise tous les champs du More Filter Popup
  document.querySelectorAll("#moreFilterPopup input[type='text']").forEach(input => {
    input.value = "";
  });

  // --- PATCH ULTRA FIABLE (première fois) ---
  document.querySelectorAll("#moreFilterPopup input[type='checkbox']").forEach(cb => {
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // 3. Réinitialise les prix
  document.getElementById("priceMin").value = globalMinPrice;
  document.getElementById("priceMax").value = globalMaxPrice;

  // 4. Relance la logique de filtrage proprement
  handleSearchOrFilter();

  // 5. Ferme les popups (bonus UX)
  document.getElementById("priceFilterPopup")?.classList.remove("active");
  document.getElementById("moreFilterPopup")?.classList.remove("active");
  document.body.classList.remove("price-popup-open");
  document.body.style.overflow = "";

  // --- PATCH ULTRA FIABLE (en dernier, après tous les updates) ---
setTimeout(() => {
  console.log("Force unreset checkboxes");
  document.querySelectorAll("#moreFilterPopup input[type='checkbox']").forEach(cb => {
    cb.checked = false;
    cb.dispatchEvent(new Event('input', { bubbles: true }));
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
}, 10);

}



// --- PRICE SLIDER + HISTO (track toujours globale) ---
function getAllPrices(propsArray) {
  return propsArray
    .map(p => parseInt(String(p.price).replace(/[^\d]/g, "")))
    .filter(v => !isNaN(v));
}
function updatePriceSliderAndHistogram(propsArray) {
  // Les bornes restent sur global min/max
  minPrice = globalMinPrice;
  maxPrice = globalMaxPrice;
  let sliderElem = document.getElementById("priceSlider");
  if (priceSlider) { priceSlider.destroy(); priceSlider = null; sliderElem.innerHTML = ""; }

  // Valeurs actuelles sélectionnées (si jamais déjà filtrées)
  let currentMin = parseInt(document.getElementById("priceMin").value) || minPrice;
  let currentMax = parseInt(document.getElementById("priceMax").value) || maxPrice;

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
    drawPriceHistogram(propsArray, minPrice, maxPrice, values);
  });

  priceSlider.on('change', function(values){
    let minVal = Number(String(values[0]).replace(/[^\d]/g,"")) || minPrice;
    let maxVal = Number(String(values[1]).replace(/[^\d]/g,"")) || maxPrice;
    document.getElementById('priceMin').value = minVal;
    document.getElementById('priceMax').value = maxVal;
    handleSearchOrFilter();
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

// Affiche TOUJOURS les bornes globales, pas les bornes du filtre
document.getElementById("sliderMinLabel").textContent = fmt(globalMinPrice) + " AED";
document.getElementById("sliderMaxLabel").textContent = fmt(globalMaxPrice) + " AED";
document.getElementById("selectedPriceRange").textContent = 
    fmt(currentMin) + " - " + fmt(currentMax) + " AED";

// Mets aussi les inputs hidden avec les chiffres bruts (pour les filtres)
document.getElementById("priceMin").value = currentMin;
document.getElementById("priceMax").value = currentMax;

  drawPriceHistogram(propsArray, minPrice, maxPrice, [currentMin, currentMax]);
}

function drawPriceHistogram(propsArray, min, max, [sliderMin, sliderMax]=[min,max]) {
  const canvas = document.getElementById('priceHistogram');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  let prices = getAllPrices(propsArray);
  if (prices.length === 0) return;
  let bins = 18, hist = Array(bins).fill(0);
  prices.forEach(price => {
    let idx = Math.floor((price - min) / (max - min) * (bins - 1));
    idx = Math.max(0, Math.min(bins - 1, idx));
    hist[idx]++;
  });
  let maxHist = Math.max(...hist, 2);

  // Dessine les barres fines et arrondies
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

  // Petits points orange (sur le centre de chaque bar) pour “finesse” (optionnel)
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

// --- FONCTION NECESSAIRE (autoPrefill) : à adapter si tu utilises des params URL
function autoPrefillFromParams() {
  // Placeholder
}

// --- FONCTION NECESSAIRE (applyPriceFilter) : juste pour cohérence avec bouton validatePriceBtn
function applyPriceFilter() {
  document.getElementById("validatePriceBtn").click();
}


// --- Open / close more filter popup (nouvelle version, scroll bloqué propre) ---
document.getElementById("openMoreFilter").addEventListener("click", function(){
  document.getElementById("moreFilterPopup").classList.add('active');
  document.body.classList.add('more-filters-open');
});

document.getElementById("closeMoreFilter").addEventListener("click", function(){
  document.getElementById("moreFilterPopup").classList.remove('active');
  document.body.classList.remove('more-filters-open');
});

document.getElementById("moreFilterPopup").addEventListener("mousedown", function(e){
  if (e.target === this) {
    this.classList.remove('active');
    document.body.classList.remove('more-filters-open');
  }
});

document.addEventListener("keydown", function(e){
  if (
    document.getElementById("moreFilterPopup").classList.contains("active")
    && e.key === "Escape"
  ) {
    document.getElementById("closeMoreFilter").click();
  }
});

// Quand on applique les filtres
document.getElementById("applyMoreFiltersBtn").addEventListener("click", function() {
  document.getElementById("moreFilterPopup").classList.remove('active');
  document.body.classList.remove('more-filters-open');
  // Ici tu récupères les valeurs pour tes filtres JS :
  const isFurnished = document.getElementById("furnishingFilter").checked;
  const minArea = document.getElementById("minAreaInput").value;
  const maxArea = document.getElementById("maxAreaInput").value;
  const keywords = document.getElementById("keywordInput").value;
  // --> Ajoute ici la logique pour filtrer tes propriétés avec ces valeurs
  handleSearchOrFilter(); // Si tu veux relancer le filtrage après changement
});
