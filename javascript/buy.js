// === REAL ESTATE - JS BUY (APPARTEMENTS, VILLAS...) ===

function fmt(n) { return Number(n).toLocaleString('en-US'); }

let properties = [];
let filteredProperties = [];
let priceSlider = null;
let minPrice = 0, maxPrice = 0;
let globalMinPrice = 0, globalMaxPrice = 0;
const PRICE_STEP = 10000;

// --- DUMMY DATA : APARTMENTS & VILLAS ---
function getDummyProperties() {
  const locations = [
    "JLT", "Jumeirah Village Circle", "Downtown Dubai", "Palm Jumeirah",
    "Dubai Marina", "Business Bay", "Deira", "Dubai Hills Estate", "JVC", "Al Barsha"
  ];
  const types = ["Apartment", "Villa", "Townhouse", "Penthouse", "Compound", "Duplex"];
  let arr = [];
  for (let i = 0; i < 48; i++) {
    arr.push({
      title: types[i % types.length],
      price: 750000 + (i * 115000),
      location: locations[i % locations.length],
      bedrooms: 1 + (i % 5),
      bathrooms: 1 + (i % 4),
      size: 680 + ((i * 28) % 1200),
      furnished: i % 3 === 0,
      amenities: ["Central A/C", "Balcony", "Shared Pool", "View of Water"].slice(0, (i % 4) + 1),
      images: [
        "styles/photo/dubai-map.jpg",
        "styles/photo/fond.jpg"
      ],
      agent: {
        name: ["John Doe", "Jane Smith", "Omar Khalid", "Sara Hamed"][i % 4],
        avatar: `https://randomuser.me/api/portraits/${i % 2 === 0 ? "men" : "women"}/${30 + (i % 40)}.jpg`
      },
      description: `Beautiful ${types[i % types.length]} in ${locations[i % locations.length]} with premium amenities.`
    });
  }
  return arr;
}

// === BURGER MENU MOBILE (header2) ===
const burger = document.getElementById('burgerMenu');
let mobileMenu = null;
function closeMobileMenu() {
  if (mobileMenu && document.body.contains(mobileMenu)) {
    mobileMenu.remove();
    mobileMenu = null;
    document.body.style.overflow = '';
  }
}
if (burger) {
  burger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (mobileMenu && document.body.contains(mobileMenu)) {
      closeMobileMenu();
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
      zIndex: 2200,
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
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      document.addEventListener('click', function escBurger(ev) {
        if (mobileMenu && !mobileMenu.contains(ev.target) && ev.target !== burger) {
          closeMobileMenu();
          document.removeEventListener('click', escBurger);
        }
      });
    }, 10);
    document.addEventListener('keydown', function escClose(ev) {
      if (ev.key === 'Escape' && mobileMenu && document.body.contains(mobileMenu)) {
        closeMobileMenu();
        document.removeEventListener('keydown', escClose);
      }
    });
  });
}
function responsiveHeaderBurger() {
  const isMobile = window.innerWidth < 700;
  if (!isMobile && mobileMenu && document.body.contains(mobileMenu)) {
    closeMobileMenu();
  }
}
window.addEventListener('resize', responsiveHeaderBurger);

// DOM READY
document.addEventListener('DOMContentLoaded', function() {
  properties = getDummyProperties();
  filteredProperties = properties.slice();
  const allPrices = properties.map(p => p.price).filter(v => !isNaN(v));
  globalMinPrice = Math.min(...allPrices);
  globalMaxPrice = Math.max(...allPrices);

  displayProperties(filteredProperties, 1);
  updatePriceSliderAndHistogram(properties);

  document.getElementById("searchBtn")?.addEventListener("click", handleSearchOrFilter);
  document.getElementById("clearBtn")?.addEventListener("click", handleClearFilters);
  document.getElementById("openPriceFilter")?.addEventListener("click", openPricePopup);
  document.getElementById("validatePriceBtn")?.addEventListener("click", function() {
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
  document.getElementById("closePricePopup")?.addEventListener("click", closePricePopup);

  document.getElementById("search")?.addEventListener("input", showSearchSuggestions);
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
  document.addEventListener("click", function(e){
    if (!document.getElementById("searchSuggestions").contains(e.target) &&
        e.target !== document.getElementById("search")) {
      document.getElementById("searchSuggestions").innerHTML = "";
      document.getElementById("searchSuggestions").style.display = "none";
    }
  });

  document.querySelectorAll(
    '.filter-bar input, .filter-bar select, #moreFilterPopup input, #moreFilterPopup select'
  ).forEach(el => {
    el.addEventListener('input', handleSearchOrFilter);
    el.addEventListener('change', handleSearchOrFilter);
  });

  document.getElementById("openMoreFilter")?.addEventListener("click", function(){
    document.getElementById("moreFilterPopup").classList.add('active');
    document.body.classList.add('more-filters-open');
  });
  document.getElementById("closeMoreFilter")?.addEventListener("click", function(){
    document.getElementById("moreFilterPopup").classList.remove('active');
    document.body.classList.remove('more-filters-open');
  });
  document.getElementById("applyMoreFiltersBtn")?.addEventListener("click", function() {
    document.getElementById("moreFilterPopup").classList.remove('active');
    document.body.classList.remove('more-filters-open');
    handleSearchOrFilter();
  });

  document.getElementById("priceFilterPopup")?.addEventListener("mousedown", function(e){
    if (e.target === this) closePricePopup();
  });
  document.addEventListener("keydown", function(e){
    if (document.getElementById("priceFilterPopup")?.classList.contains("active") && e.key === "Escape") closePricePopup();
  });

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
});

// ---- POPUP PRIX
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

// --- AFFICHAGE ET FILTRAGE ---
function displayProperties(propsArray, page) {
  const container = document.getElementById("propertyResults");
  const propertyCountDiv = document.getElementById("propertyCount");
  const propertyTypesDiv = document.getElementById("propertyTypesSummary");
  const propertyTypeSelect = document.getElementById("propertyType");
  const cardsPerPage = 18;
  const total = propsArray.length;
  const pages = Math.ceil(total / cardsPerPage) || 1;
  const start = (page - 1) * cardsPerPage;
  const end = start + cardsPerPage;
  const slice = propsArray.slice(start, end);

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
        <div class="image-count"><i class="fas fa-camera"></i> ${fmt(property.images.length)}</div>
        <div class="carousel-dots"></div>
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

    // -- Carousel dots et swipe sur chaque card
    const carousel = card.querySelector('.carousel');
    const imgs = carousel.querySelectorAll('img');
    const dotsContainer = carousel.querySelector('.carousel-dots');
    let curIdx = 0;
    // Création des dots
    for (let d = 0; d < imgs.length; d++) {
      const dot = document.createElement('div');
      dot.className = 'carousel-dot' + (d === 0 ? ' active' : '');
      dot.addEventListener('click', e => {
        e.stopPropagation();
        imgs[curIdx].classList.remove('active');
        dotsContainer.children[curIdx].classList.remove('active');
        curIdx = d;
        imgs[curIdx].classList.add('active');
        dotsContainer.children[curIdx].classList.add('active');
      });
      dotsContainer.appendChild(dot);
    }
    // Swipe mobile
    let touchStartX = null;
    carousel.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
    });
    carousel.addEventListener('touchend', function(e) {
      if (touchStartX === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 35) {
        imgs[curIdx].classList.remove('active');
        dotsContainer.children[curIdx].classList.remove('active');
        if (deltaX < 0) {
          curIdx = (curIdx + 1) % imgs.length;
        } else {
          curIdx = (curIdx - 1 + imgs.length) % imgs.length;
        }
        imgs[curIdx].classList.add('active');
        dotsContainer.children[curIdx].classList.add('active');
      }
      touchStartX = null;
    });
  });

  displayPropertyTypesSummary(propsArray, propertyTypeSelect.value);
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

function displayPropertyTypesSummary(propsArray, filterType) {
  const propertyTypesDiv = document.getElementById("propertyTypesSummary");
  const propertyTypeSelect = document.getElementById("propertyType");
  const typeCounts = {};
  propsArray.forEach(p => { typeCounts[p.title] = (typeCounts[p.title] || 0) + 1; });
  const typeOrder = ["Apartment", "Villa", "Townhouse", "Compound", "Duplex", "Penthouse"];
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

function handleSearchOrFilter() {
  let arr = properties.slice();

  const search = document.getElementById("search").value.trim().toLowerCase();
  const propertyType = document.getElementById("propertyType").value;
  const bedrooms = document.getElementById("bedrooms").value;
  const bathrooms = document.getElementById("bathrooms").value;
  const priceMin = Number(document.getElementById('priceMin').value) || globalMinPrice;
  const priceMax = Number(document.getElementById('priceMax').value) || globalMaxPrice;
  const keywordInput = document.getElementById('keywordInput');
  const keywords = keywordInput ? keywordInput.value.trim().toLowerCase().split(',').map(k => k.trim()).filter(Boolean) : [];
  const furnished = document.getElementById('furnished').checked;

  if (search) arr = arr.filter(p => p.location && p.location.toLowerCase().includes(search));
  if (propertyType && propertyType !== "All") arr = arr.filter(p => p.title === propertyType);
  if (bedrooms) arr = arr.filter(p => String(p.bedrooms) === bedrooms);
  if (bathrooms) arr = arr.filter(p => String(p.bathrooms) === bathrooms);
  if (furnished) arr = arr.filter(p => p.furnished === true);
  arr = arr.filter(p => p.price >= priceMin && p.price <= priceMax);
  if (keywords.length) {
    arr = arr.filter(p => keywords.some(k =>
      (p.description && p.description.toLowerCase().includes(k)) ||
      (p.amenities && p.amenities.some(a => a.toLowerCase().includes(k)))
    ));
  }

  filteredProperties = arr.slice();
  displayProperties(filteredProperties, 1);
  updatePriceSliderAndHistogram(filteredProperties);
}
function handleClearFilters() {
  document.getElementById("search").value = "";
  document.getElementById("propertyType").value = "All";
  document.getElementById("bedrooms").value = "";
  document.getElementById("bathrooms").value = "";
  document.getElementById("priceMin").value = globalMinPrice;
  document.getElementById("priceMax").value = globalMaxPrice;
  document.getElementById("selectedPriceRange").textContent = fmt(globalMinPrice) + " - " + fmt(globalMaxPrice) + " AED";
  if (document.getElementById('keywordInput')) document.getElementById('keywordInput').value = "";
  if (document.getElementById('furnished')) document.getElementById('furnished').checked = false;
  handleSearchOrFilter();
}

// --------- SLIDER / HISTOGRAMME PRIX ---------
function updatePriceSliderAndHistogram(arr) {
  // ... Ton code pour gérer le slider et histogramme, inchangé
}



// Slider
function updatePriceSliderAndHistogram(propsArray) {
  minPrice = globalMinPrice;
  maxPrice = globalMaxPrice;
  let sliderElem = document.getElementById("priceSlider");
  if (priceSlider) { priceSlider.destroy(); priceSlider = null; sliderElem.innerHTML = ""; }
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
  document.getElementById("sliderMinLabel").textContent = fmt(globalMinPrice) + " AED";
  document.getElementById("sliderMaxLabel").textContent = fmt(globalMaxPrice) + " AED";
  document.getElementById("selectedPriceRange").textContent = fmt(currentMin) + " - " + fmt(currentMax) + " AED";
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
  let prices = propsArray.map(p => p.price).filter(v => !isNaN(v));
  if (prices.length === 0) return;
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
