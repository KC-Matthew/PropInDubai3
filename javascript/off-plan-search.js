const projects = [
  {
    title: "330 Riverside Crescent",
    location: "Sobha Hartand II - SOBHA",
    developer: "SOBHA",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 3,
    badge: { label: "Best ROI", color: "red" },
    price: 1490000,
    priceLabel: "From AED 1,490,000",
    tag: "1% monthly",
    img: "styles/photo/330riverside.jpg",
    action: "Affordable Projects",
    actionColor: "orange",
    delivery: "Q3 2025"
  },
  {
    title: "The Sanctuary",
    location: "Mohammed Bin Rash City - ELLINGTON",
    developer: "ELLINGTON",
    type: "Villa",
    bedrooms: 4,
    bathrooms: 5,
    badge: { label: "Handover Soon", color: "orange" },
    price: 4100000,
    priceLabel: "From AED 4,100,000",
    tag: "Gated community",
    img: "styles/photo/sanctuary.jpg",
    action: "Gaper project",
    actionColor: "orange",
    delivery: "2026"
  },
  {
    title: "Emaar Beachfront",
    location: "Dubai Marina – EMAAR",
    developer: "EMAAR",
    type: "Apartment",
    bedrooms: 3,
    bathrooms: 3,
    badge: { label: "Sea View", color: "green" },
    price: 2200000,
    priceLabel: "From AED 2,200,000",
    tag: "Sea View",
    img: "styles/photo/beachfront.jpg",
    action: "View Project",
    actionColor: "orange",
    delivery: "2027"
  },
  {
    title: "Sobha One",
    location: "Ras Al Khor - SOBHA",
    developer: "SOBHA",
    type: "Apartment",
    bedrooms: 1,
    bathrooms: 2,
    badge: { label: "Investor Deal", color: "blue" },
    price: 980000,
    priceLabel: "From AED 980,000",
    tag: "Golf Course View",
    img: "styles/photo/sobhaone.jpg",
    action: "Invest Now",
    actionColor: "blue",
    delivery: "Q4 2026"
  },
  {
    title: "Ellington House",
    location: "Dubai Hills - ELLINGTON",
    developer: "ELLINGTON",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    badge: { label: "Best Seller", color: "red" },
    price: 1950000,
    priceLabel: "From AED 1,950,000",
    tag: "Park View",
    img: "styles/photo/ellingtonhouse.jpg",
    action: "Discover Project",
    actionColor: "red",
    delivery: "Q2 2025"
  },
  {
    title: "Waves Grande",
    location: "Sobha Hartland - SOBHA",
    developer: "SOBHA",
    type: "Apartment",
    bedrooms: 3,
    bathrooms: 4,
    badge: { label: "Ready Soon", color: "orange" },
    price: 2450000,
    priceLabel: "From AED 2,450,000",
    tag: "Corner Unit",
    img: "styles/photo/wavesgrande.jpg",
    action: "Limited Offer",
    actionColor: "orange",
    delivery: "Q1 2025"
  },
  {
    title: "Creek Vista",
    location: "MBR City - SOBHA",
    developer: "SOBHA",
    type: "Apartment",
    bedrooms: 1,
    bathrooms: 1,
    badge: { label: "Hot", color: "red" },
    price: 850000,
    priceLabel: "From AED 850,000",
    tag: "Canal View",
    img: "styles/photo/creekvista.jpg",
    action: "See More",
    actionColor: "red",
    delivery: "Q4 2025"
  },
  {
    title: "Wilton Park Residences",
    location: "MBR City - ELLINGTON",
    developer: "ELLINGTON",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    badge: { label: "Limited", color: "blue" },
    price: 1200000,
    priceLabel: "From AED 1,200,000",
    tag: "Green Area",
    img: "styles/photo/wiltonpark.jpg",
    action: "See Details",
    actionColor: "blue",
    delivery: "2025"
  },
  {
    title: "Villa Lux",
    location: "Meydan - EMAAR",
    developer: "EMAAR",
    type: "Villa",
    bedrooms: 5,
    bathrooms: 6,
    badge: { label: "Luxury", color: "green" },
    price: 5200000,
    priceLabel: "From AED 5,200,000",
    tag: "Private Pool",
    img: "styles/photo/villalux.jpg",
    action: "Book Now",
    actionColor: "green",
    delivery: "2027"
  },
  {
    title: "Palm Jumeirah Mansion",
    location: "Palm Jumeirah - EMAAR",
    developer: "EMAAR",
    type: "Villa",
    bedrooms: 6,
    bathrooms: 8,
    badge: { label: "Exclusive", color: "red" },
    price: 27000000,
    priceLabel: "From AED 27,000,000",
    tag: "Palm View",
    img: "styles/photo/palmmansion.jpg",
    action: "Ultra Luxury",
    actionColor: "red",
    delivery: "2025"
  },
  {
    title: "Upper House",
    location: "JLT - ELLINGTON",
    developer: "ELLINGTON",
    type: "Apartment",
    bedrooms: 3,
    bathrooms: 3,
    badge: { label: "New", color: "blue" },
    price: 2350000,
    priceLabel: "From AED 2,350,000",
    tag: "Skyline View",
    img: "styles/photo/upperhouse.jpg",
    action: "Explore",
    actionColor: "blue",
    delivery: "2026"
  },
  {
    title: "The Quayside",
    location: "Business Bay - ELLINGTON",
    developer: "ELLINGTON",
    type: "Apartment",
    bedrooms: 1,
    bathrooms: 1,
    badge: { label: "New Launch", color: "green" },
    price: 1300000,
    priceLabel: "From AED 1,300,000",
    tag: "Canal View",
    img: "styles/photo/quayside.jpg",
    action: "Explore Now",
    actionColor: "green",
    delivery: "2027"
  },
  {
    title: "Nima",
    location: "The Valley - EMAAR",
    developer: "EMAAR",
    type: "Townhouse",
    bedrooms: 3,
    bathrooms: 4,
    badge: { label: "Family", color: "blue" },
    price: 1950000,
    priceLabel: "From AED 1,950,000",
    tag: "Community Park",
    img: "styles/photo/nima.jpg",
    action: "View Offer",
    actionColor: "blue",
    delivery: "2026"
  },
  {
    title: "Elitz 3",
    location: "JVC - DANUBE",
    developer: "DANUBE",
    type: "Apartment",
    bedrooms: 1,
    bathrooms: 2,
    badge: { label: "Installment", color: "orange" },
    price: 700000,
    priceLabel: "From AED 700,000",
    tag: "1% Monthly",
    img: "styles/photo/elitz3.jpg",
    action: "See Plan",
    actionColor: "orange",
    delivery: "Q2 2026"
  },
  {
    title: "Hamilton Residence",
    location: "Business Bay - SOBHA",
    developer: "SOBHA",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 3,
    badge: { label: "Brand New", color: "blue" },
    price: 1600000,
    priceLabel: "From AED 1,600,000",
    tag: "Downtown View",
    img: "styles/photo/hamilton.jpg",
    action: "Details",
    actionColor: "blue",
    delivery: "Q4 2025"
  },
  {
    title: "Peninsula Five",
    location: "Business Bay - SELECT GROUP",
    developer: "SELECT GROUP",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    badge: { label: "Waterfront", color: "green" },
    price: 2350000,
    priceLabel: "From AED 2,350,000",
    tag: "Burj View",
    img: "styles/photo/peninsulafive.jpg",
    action: "Show Units",
    actionColor: "green",
    delivery: "2025"
  },
  {
    title: "Hillside Villas",
    location: "Dubai Hills - EMAAR",
    developer: "EMAAR",
    type: "Villa",
    bedrooms: 4,
    bathrooms: 5,
    badge: { label: "Premium", color: "orange" },
    price: 4300000,
    priceLabel: "From AED 4,300,000",
    tag: "Park Side",
    img: "styles/photo/hillsidevillas.jpg",
    action: "See Villas",
    actionColor: "orange",
    delivery: "2026"
  },
  {
    title: "Creek Palace",
    location: "Dubai Creek Harbour - EMAAR",
    developer: "EMAAR",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    badge: { label: "View", color: "blue" },
    price: 2100000,
    priceLabel: "From AED 2,100,000",
    tag: "Creek View",
    img: "styles/photo/creekpalace.jpg",
    action: "See Apartments",
    actionColor: "blue",
    delivery: "2027"
  }
];
let selectedDeliveryDates = [];
let currentPage = 1;

// ===================== AFFICHAGE =====================
function displayFlatProjects(array) {
  const container = document.getElementById("propertyResults");
  container.innerHTML = "";
  if (array.length === 0) {
    container.innerHTML = `<div style="margin:40px auto;font-size:1.2em;color:#c44;text-align:center;">No project found</div>`;
    return;
  }
  array.forEach((p, i) => {
    let badgeClass = "card-badge";
    if (p.badge?.color === "orange") badgeClass += " orange";
    else if (p.badge?.color === "green") badgeClass += " green";
    else if (p.badge?.color === "blue") badgeClass += " blue";
    const card = document.createElement("div");
    card.className = "property-card-flat";
    card.tabIndex = 0;
    card.innerHTML = `
      <div style="position:relative;">
        <img src="${p.img}" alt="${p.title}" class="card-image-flat" />
        ${p.badge ? `<span class="${badgeClass}">${p.badge.label}</span>` : ""}
      </div>
      <div class="card-body-flat">
        <div class="card-title-flat">${p.title}</div>
        <div class="card-sub-flat">${p.location}</div>
        <div class="card-price-flat">${p.priceLabel || (p.price ? `From AED ${p.price.toLocaleString()}` : "")}</div>
        <div class="card-icons-row">${p.tag ? `<span><i class="fa fa-check"></i> ${p.tag}</span>` : ""}</div>
        <button class="card-action-btn">${p.action}</button>
      </div>
    `;
    card.addEventListener("click", () => {
      window.location = 'off-plan-click.html?project=' + encodeURIComponent(p.title);
    });
    container.appendChild(card);
  });
}

// ===================== FILTRAGE + PAGINATION =====================
// ===================== FILTRAGE + PAGINATION =====================
function filterAndDisplayProjects(page = 1) {
  const query = document.getElementById('search')?.value.trim().toLowerCase() || '';
  const propertyType = document.getElementById('propertyType')?.value || '';
  const bedroomsVal = document.getElementById('bedrooms')?.value || '';
  const bathroomsVal = document.getElementById('bathrooms')?.value || '';
  const bedrooms = bedroomsVal && bedroomsVal !== "Bedrooms" ? parseInt(bedroomsVal) : null;
  const bathrooms = bathroomsVal && bathroomsVal !== "Bathrooms" ? parseInt(bathroomsVal) : null;
  const deliveryDates = selectedDeliveryDates.length ? selectedDeliveryDates : [];

  // AUTRES FILTRES
  const priceMin = parseInt(document.getElementById('priceMin')?.value) || 0;
  const priceMax = parseInt(document.getElementById('priceMax')?.value) || Infinity;
  const keywordInput = document.getElementById('keywordInput');
  const keywords = keywordInput ? keywordInput.value.trim().toLowerCase().split(',').map(k => k.trim()).filter(Boolean) : [];
  const minArea = parseInt(document.getElementById('minAreaInput')?.value) || 0;
  const maxArea = parseInt(document.getElementById('maxAreaInput')?.value) || Infinity;
  const isFurnished = document.getElementById('furnishingFilter')?.checked;
  const checkedAmenities = Array.from(document.querySelectorAll('.amenities-list input[type="checkbox"]:checked')).map(cb => cb.value);

  // FILTRAGE PRINCIPAL
  let arr = projects.filter(p => {
    let match = (
      p.title.toLowerCase().includes(query) ||
      p.location.toLowerCase().includes(query) ||
      (p.developer && p.developer.toLowerCase().includes(query))
    );
    if (propertyType && propertyType !== "Property Type" && p.type !== propertyType) return false;
    if (bedrooms && (!p.bedrooms || Number(p.bedrooms) < bedrooms)) return false;
    if (bathrooms && (!p.bathrooms || Number(p.bathrooms) < bathrooms)) return false;
    if (deliveryDates.length > 0 && !deliveryDates.includes(String(p.delivery).toLowerCase())) return false;
    if (p.price < priceMin || p.price > priceMax) return false;
    if (minArea && (p.size || 0) < minArea) return false;
    if (maxArea !== Infinity && (p.size || 0) > maxArea) return false;
    if (isFurnished && !p.furnished) return false;
    if (checkedAmenities.length && (!p.amenities || !checkedAmenities.every(a => p.amenities.includes(a)))) return false;
    if (keywords.length) {
      const allText = [
        p.title, p.location, (p.developer || ''), (p.description || ''), ...(p.amenities || [])
      ].join(' ').toLowerCase();
      if (!keywords.every(k => allText.includes(k))) return false;
    }
    return match;
  });

  displayPaginatedProjects(arr, page);
}

// ============== PAGINATION UTILS ===================
function displayPaginatedProjects(arr, page = 1) {
  const {slice, total, pages} = paginate(arr, page);
  displayFlatProjects(slice);
  updatePagination(pages, page, arr);
  if (document.getElementById('propertyCount')) document.getElementById('propertyCount').textContent = `${total} projects found`;
  currentPage = page;

  // --------- SCROLL EN HAUT POUR TOUS LES APPAREILS ---------
  setTimeout(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    // // !!! NE PAS blur() : sinon perte focus searchbar
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, 80);
}

// ===================== INIT PATCHÉ =====================
document.addEventListener('DOMContentLoaded', function() {
  setupDeliveryDateButtons();
  setupPriceFilter(projects);

  // Les filtres déroulants filtrent en 'change'
  ["propertyType", "bedrooms", "bathrooms"].forEach(id => {
    if (document.getElementById(id)) {
      document.getElementById(id).addEventListener('change', () => filterAndDisplayProjects(1));
    }
  });

  // Searchbar : PAS de filtre sur 'input' !!
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === "Enter") filterAndDisplayProjects(1);
    });
  }

  if (document.getElementById("searchBtn"))
    document.getElementById("searchBtn").addEventListener('click', () => filterAndDisplayProjects(1));

  if (document.getElementById("clearBtn"))
    document.getElementById("clearBtn").addEventListener('click', function() {
      document.querySelectorAll("input, select").forEach(el => {
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
      });
      document.querySelectorAll("#moreFilterPopup input[type='checkbox']").forEach(cb => { cb.checked = false; });
      if (document.getElementById("priceMin")) document.getElementById("priceMin").value = globalMinPrice;
      if (document.getElementById("priceMax")) document.getElementById("priceMax").value = globalMaxPrice;
      selectedDeliveryDates = [];
      document.querySelectorAll('.delivery-date-btn').forEach(b => b.classList.remove('selected'));
      if (document.querySelector('.delivery-date-btn[data-value="all"]')) document.querySelector('.delivery-date-btn[data-value="all"]').classList.add('selected');
      filterAndDisplayProjects(1);
      closePricePopup();
      closeMoreFilterPopup();
    });

  // Appel initial
  filterAndDisplayProjects(1);
});


// ============== PAGINATION UTILS ===================
function paginate(arr, page) {
  const cardsPerPage = 9; // Change as needed
  const total = arr.length;
  const pages = Math.ceil(total / cardsPerPage) || 1;
  const start = (page - 1) * cardsPerPage;
  const end = start + cardsPerPage;
  return { page, total, pages, slice: arr.slice(start, end) };
}


function displayPaginatedProjects(arr, page = 1) {
  const {slice, total, pages} = paginate(arr, page);
  displayFlatProjects(slice);
  updatePagination(pages, page, arr);
  if (document.getElementById('propertyCount')) document.getElementById('propertyCount').textContent = `${total} projects found`;
  currentPage = page;

  // --------- SCROLL EN HAUT POUR TOUS LES APPAREILS ---------
  setTimeout(() => {
    // Astuce pour Safari iOS et tous les mobiles : remet vraiment tout en haut
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    // Si jamais le clavier virtuel était ouvert (focus input), on l'enlève :
    if (document.activeElement) document.activeElement.blur();
    // Forçage extrême si jamais un navigateur "bloque" le scrollTo
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, 80);
}





function updatePagination(pages, page, arr) {
  const paginationDiv = document.getElementById("pagination");
  paginationDiv.innerHTML = '';
  if (pages <= 1) return;
  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '&laquo;';
  prevBtn.className = 'page-btn';
  prevBtn.disabled = page === 1;
  prevBtn.onclick = () => filterAndDisplayProjects(page - 1);
  paginationDiv.appendChild(prevBtn);

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === page ? ' active' : '');
    btn.textContent = i;
    btn.onclick = () => filterAndDisplayProjects(i);
    paginationDiv.appendChild(btn);
  }
  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '&raquo;';
  nextBtn.className = 'page-btn';
  nextBtn.disabled = page === pages;
  nextBtn.onclick = () => filterAndDisplayProjects(page + 1);
  paginationDiv.appendChild(nextBtn);
}

// ===================== DELIVERY BTN =====================
function setupDeliveryDateButtons() {
  const btns = document.querySelectorAll('.delivery-date-btn');
  const allBtn = document.querySelector('.delivery-date-btn[data-value="all"]');
  if (allBtn) allBtn.classList.add('selected');
  selectedDeliveryDates = [];
  btns.forEach(btn => {
    btn.addEventListener('click', function() {
      const val = this.dataset.value;
      if (val === "all") {
        selectedDeliveryDates = [];
        btns.forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
      } else {
        allBtn.classList.remove('selected');
        this.classList.toggle('selected');
        if (this.classList.contains('selected')) {
          if (!selectedDeliveryDates.includes(val)) selectedDeliveryDates.push(val);
        } else {
          selectedDeliveryDates = selectedDeliveryDates.filter(d => d !== val);
        }
      }
      if (selectedDeliveryDates.length === 0) {
        allBtn.classList.add('selected');
      }
      filterAndDisplayProjects(1);
    });
  });
}

// ============= PRICE SLIDER + HISTOGRAMME ==============
let priceSlider = null;
const PRICE_STEP = 10000;
let globalMinPrice = 0, globalMaxPrice = 0;

function getAllPrices(arr) {
  return arr.map(p => parseInt(p.price)).filter(n => !isNaN(n));
}
function setupPriceFilter(projects) {
  const allPrices = getAllPrices(projects);
  globalMinPrice = Math.min(...allPrices);
  globalMaxPrice = Math.max(...allPrices);
  document.getElementById("priceMin").value = globalMinPrice;
  document.getElementById("priceMax").value = globalMaxPrice;
  updatePriceSliderAndHistogram(projects);
}
function updatePriceSliderAndHistogram(arr) {
  let sliderElem = document.getElementById("priceSlider");
  if (!sliderElem) return;
  if (priceSlider) { priceSlider.destroy(); priceSlider = null; sliderElem.innerHTML = ""; }
  let currentMin = parseInt(document.getElementById("priceMin").value) || globalMinPrice;
  let currentMax = parseInt(document.getElementById("priceMax").value) || globalMaxPrice;
  const minInput = document.getElementById("priceMinInput");
  const maxInput = document.getElementById("priceMaxInput");
  priceSlider = noUiSlider.create(sliderElem, {
    start: [currentMin, currentMax],
    connect: true,
    step: PRICE_STEP,
    range: { min: globalMinPrice, max: globalMaxPrice },
    tooltips: [true, true],
    format: {
      to: v => Number(v).toLocaleString('en-US'),
      from: v => Number(String(v).replace(/[^\d]/g,""))
    }
  });
  minInput.value = currentMin.toLocaleString('en-US');
  maxInput.value = currentMax.toLocaleString('en-US');
  priceSlider.on('update', function(values){
    minInput.value = values[0];
    maxInput.value = values[1];
    document.getElementById("selectedPriceRange").textContent = values[0] + " - " + values[1] + " AED";
    drawPriceHistogram(arr, globalMinPrice, globalMaxPrice, values);
  });
  priceSlider.on('change', function(values){
    let minVal = Number(String(values[0]).replace(/[^\d]/g,"")) || globalMinPrice;
    let maxVal = Number(String(values[1]).replace(/[^\d]/g,"")) || globalMaxPrice;
    document.getElementById('priceMin').value = minVal;
    document.getElementById('priceMax').value = maxVal;
    filterAndDisplayProjects(1);
  });
  minInput.onchange = function() {
    let minVal = Number(String(minInput.value).replace(/[^\d]/g,"")) || globalMinPrice;
    let maxVal = Number(String(maxInput.value).replace(/[^\d]/g,"")) || globalMaxPrice;
    minVal = Math.max(globalMinPrice, Math.min(maxVal, minVal));
    priceSlider.set([minVal, null]);
  };
  maxInput.onchange = function() {
    let minVal = Number(String(minInput.value).replace(/[^\d]/g,"")) || globalMinPrice;
    let maxVal = Number(String(maxInput.value).replace(/[^\d]/g,"")) || globalMaxPrice;
    maxVal = Math.min(globalMaxPrice, Math.max(minVal, maxVal));
    priceSlider.set([null, maxVal]);
  };
  document.getElementById("sliderMinLabel").textContent = globalMinPrice.toLocaleString('en-US') + " AED";
  document.getElementById("sliderMaxLabel").textContent = globalMaxPrice.toLocaleString('en-US') + " AED";
  document.getElementById("selectedPriceRange").textContent = currentMin.toLocaleString('en-US') + " - " + currentMax.toLocaleString('en-US') + " AED";
  document.getElementById("priceMin").value = currentMin;
  document.getElementById("priceMax").value = currentMax;
  drawPriceHistogram(arr, globalMinPrice, globalMaxPrice, [currentMin, currentMax]);
}
function drawPriceHistogram(arr, min, max, [sliderMin, sliderMax]=[min,max]) {
  const canvas = document.getElementById('priceHistogram');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  let prices = getAllPrices(arr);
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

// ====== POPUPS (Price & More) =======
function openMoreFilterPopup() {
  const popup = document.getElementById("moreFilterPopup");
  const inner = popup.querySelector(".more-filter-inner");
  popup.classList.add('active');
  document.body.classList.add('more-filters-open');
  if(window.innerWidth < 700) {
    inner.style.transform = "translateX(-50%)";
    inner.style.top = "170px";
    inner.style.left = "50%";
  } else {
    inner.style.transform = "translate(-50%, -50%)";
    inner.style.top = "50%";
    inner.style.left = "50%";
  }
}
function closeMoreFilterPopup() {
  document.getElementById("moreFilterPopup").classList.remove('active');
  document.body.classList.remove('more-filters-open');
}
function openPricePopup() {
  const popup = document.getElementById("priceFilterPopup");
  popup.classList.add('active');
  document.body.classList.add('price-popup-open');
  setTimeout(() => { document.getElementById("priceMinInput")?.focus(); }, 120);
}
function closePricePopup() {
  const popup = document.getElementById("priceFilterPopup");
  popup.classList.remove('active');
  document.body.classList.remove('price-popup-open');
}





// ------ AUTOCOMPLETE SUGGESTIONS (version corrigée sans doublons, logos cohérents) ------
document.addEventListener('DOMContentLoaded', function () { 
  const searchInput = document.getElementById('search');
  const suggestionsDiv = document.getElementById('searchSuggestions');

  if (!searchInput || !suggestionsDiv) return;

  // Suggestions list
  function getSuggestions(query) {
    if (!query) return [];
    const q = query.trim().toLowerCase();

    const projectSet = new Set();
    const locationSet = new Set();
    const developerSet = new Set();
    let matches = [];

    projects.forEach(p => {
      // Projets (immeuble)
      if (p.title.toLowerCase().includes(q) && !projectSet.has(p.title)) {
        matches.push({ label: p.title, icon: "fa-building", type: "project" });
        projectSet.add(p.title);
      }
      // Quartiers/lieux (carte)
      let locationName = p.location.split(" - ")[0].trim();
      if (locationName.toLowerCase().includes(q) && !locationSet.has(locationName)) {
        matches.push({ label: locationName, icon: "fa-map-marker-alt", type: "location" });
        locationSet.add(locationName);
      }
      // Promoteur (business)
      if (p.developer && p.developer.toLowerCase().includes(q) && !developerSet.has(p.developer)) {
        matches.push({ label: p.developer, icon: "fa-user-tie", type: "developer" });
        developerSet.add(p.developer);
      }
    });

    return matches.slice(0, 8);
  }

  function renderSuggestions(suggestions) {
    if (!suggestions.length) {
      suggestionsDiv.classList.remove("visible");
      suggestionsDiv.innerHTML = "";
      return;
    }
    suggestionsDiv.innerHTML = suggestions.map(s =>
      `<div class="suggestion" tabindex="0">
        <span class="suggestion-icon"><i class="fa ${s.icon}"></i></span>
        <span class="suggestion-label">${s.label}</span>
      </div>`
    ).join("");
    suggestionsDiv.classList.add("visible");
  }

  // --- Saisie dans l'input : suggestions affichées, PAS DE MODIF DOM sur l'input lui-même
  searchInput.addEventListener('input', function () {
    const val = this.value;
    if (!val) {
      suggestionsDiv.classList.remove("visible");
      suggestionsDiv.innerHTML = "";
      return;
    }
    const sugg = getSuggestions(val);
    renderSuggestions(sugg);
  });

  // --- Sélection d'une suggestion à la souris
  suggestionsDiv.addEventListener('mousedown', function (e) {
    const item = e.target.closest('.suggestion');
    if (!item) return;
    const label = item.querySelector('.suggestion-label').textContent;
    searchInput.value = label;
    suggestionsDiv.classList.remove("visible");
    filterAndDisplayProjects(1);
    // Attention : pas de blur ici !
  });

  // --- Sélection via Enter quand suggestions visibles
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === "Enter" && suggestionsDiv.classList.contains("visible")) {
      const first = suggestionsDiv.querySelector('.suggestion');
      if (first) {
        searchInput.value = first.querySelector('.suggestion-label').textContent;
        suggestionsDiv.classList.remove("visible");
        filterAndDisplayProjects(1);
        e.preventDefault();
      }
    }
  });

  // --- Disparition des suggestions si clic en dehors
  document.addEventListener('mousedown', function(e) {
    if (!suggestionsDiv.contains(e.target) && e.target !== searchInput) {
      suggestionsDiv.classList.remove("visible");
    }
  });
});









// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', function() {
  setupDeliveryDateButtons();
  setupPriceFilter(projects);


// La recherche ne déclenche le filtre QUE sur 'Enter' ou sur bouton.
["propertyType", "bedrooms", "bathrooms"].forEach(id => {
  if (document.getElementById(id)) {
    document.getElementById(id).addEventListener('change', () => filterAndDisplayProjects(1));
  }
});
// PAS D'ÉCOUTEUR 'input' sur search ! (ça bug sinon)

  if (document.getElementById("searchBtn"))
    document.getElementById("searchBtn").addEventListener('click', () => filterAndDisplayProjects(1));

  if (document.getElementById("clearBtn"))
    document.getElementById("clearBtn").addEventListener('click', function() {
      document.querySelectorAll("input, select").forEach(el => {
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
      });
      document.querySelectorAll("#moreFilterPopup input[type='checkbox']").forEach(cb => { cb.checked = false; });
      if (document.getElementById("priceMin")) document.getElementById("priceMin").value = globalMinPrice;
      if (document.getElementById("priceMax")) document.getElementById("priceMax").value = globalMaxPrice;
      selectedDeliveryDates = [];
      document.querySelectorAll('.delivery-date-btn').forEach(b => b.classList.remove('selected'));
      if (document.querySelector('.delivery-date-btn[data-value="all"]')) document.querySelector('.delivery-date-btn[data-value="all"]').classList.add('selected');
      filterAndDisplayProjects(1);
      closePricePopup();
      closeMoreFilterPopup();
    });

  // --- POPUPS ---
  if (document.getElementById("openPriceFilter"))
    document.getElementById("openPriceFilter").addEventListener("click", openPricePopup);
  if (document.getElementById("closePricePopup"))
    document.getElementById("closePricePopup").addEventListener("click", closePricePopup);
  if (document.getElementById("validatePriceBtn"))
    document.getElementById("validatePriceBtn").addEventListener("click", function() {
      let minVal = Number(String(document.getElementById("priceMinInput").value).replace(/[^\d]/g,"")) || globalMinPrice;
      let maxVal = Number(String(document.getElementById("priceMaxInput").value).replace(/[^\d]/g,"")) || globalMaxPrice;
      document.getElementById('priceMin').value = minVal;
      document.getElementById('priceMax').value = maxVal;
      closePricePopup();
      filterAndDisplayProjects(1);
    });
  if (document.getElementById("priceFilterPopup"))
    document.getElementById("priceFilterPopup").addEventListener("mousedown", function(e){
      if (e.target === this) closePricePopup();
    });

  document.addEventListener("keydown", function(e){
    if (document.getElementById("priceFilterPopup")?.classList.contains("active") && e.key === "Escape") closePricePopup();
    if (document.getElementById("moreFilterPopup")?.classList.contains("active") && e.key === "Escape") closeMoreFilterPopup();
  });
  if (document.getElementById("openMoreFilter"))
    document.getElementById("openMoreFilter").addEventListener("click", openMoreFilterPopup);
  if (document.getElementById("closeMoreFilter"))
    document.getElementById("closeMoreFilter").addEventListener("click", closeMoreFilterPopup);
  if (document.getElementById("moreFilterPopup"))
    document.getElementById("moreFilterPopup").addEventListener("mousedown", function(e){
      if (e.target === this) closeMoreFilterPopup();
    });
  if (document.getElementById("applyMoreFiltersBtn"))
    document.getElementById("applyMoreFiltersBtn").addEventListener("click", function() {
      closeMoreFilterPopup();
      filterAndDisplayProjects(1);
    });

  // Appel initial
  filterAndDisplayProjects(1);
});




document.addEventListener('DOMContentLoaded', function() {
  // ... tout ton code existant ...

  // Active Map tab redirection
  const tabMap = document.getElementById('tab-map');
  if(tabMap) {
    tabMap.addEventListener('click', function() {
      window.location.href = "off-plan-map.html";
    });
  }
});















(function() {
  // Fonction pour gérer le scroll
  var lastScrollY = window.scrollY;
  var tabsHeight = 48; // hauteur tabs mobile (ajuste selon ton design)
  var headerHeight = 54; // hauteur header mobile

  function checkStickyTabs() {
    var tabs = document.querySelector('.top-tabs-filters');
    var threshold = 0;
    if (tabs) {
      // Position verticale de tabs relative au viewport
      var rect = tabs.getBoundingClientRect();
      threshold = rect.bottom;
    }
    // Si tabs sont sortis du viewport vers le haut, on colle
    if (threshold < headerHeight + 2) {
      document.body.classList.add('tabs-gone');
    } else {
      document.body.classList.remove('tabs-gone');
    }
  }

  window.addEventListener('scroll', checkStickyTabs, { passive: true });
  window.addEventListener('resize', checkStickyTabs);

  // Appel initial au chargement
  document.addEventListener('DOMContentLoaded', checkStickyTabs);
})();

