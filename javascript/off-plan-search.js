// ========= Données depuis Supabase (remplace l'ancien tableau en dur) =========
let projects = []; // alimenté par Supabase

// Helpers communs
const num = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = typeof v === "number" ? v : Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const currencyAED = (n) => {
  if (n == null) return "";
  try { return new Intl.NumberFormat("en-AE",{style:"currency",currency:"AED",maximumFractionDigits:0}).format(n); }
  catch { return `AED ${Number(n).toLocaleString()}`; }
};
async function waitForSupabase(timeout=8000){
  if (window.supabase) return;
  await new Promise((resolve, reject) => {
    const t = setTimeout(()=>reject(new Error("Supabase not ready (timeout)")), timeout);
    const onReady = () => { clearTimeout(t); window.removeEventListener("supabase:ready", onReady); resolve(); };
    window.addEventListener("supabase:ready", onReady);
  });
}

// Détection des noms de colonnes (basé sur tes captures)
async function detectColumns(table){
  const { data, error } = await window.supabase.from(table).select("*").limit(1);
  if (error) throw error;
  const sample = data?.[0] || {};
  const has  = (k) => k && Object.prototype.hasOwnProperty.call(sample, k);
  const pick = (...c) => c.find(has);

  return {
    id:        pick("id","uuid"),
    title:     pick("titre","title","name"),
    location:  pick("localisation","location"),
    status:    pick("project status","project_status","status"),
    handover:  pick("handover estimated","handover"),
    price:     pick("price starting","price"),
    dev:       pick("developer name","developer"),
    logoUrl:   pick("developer photo_url","developer_logo","logo_url"),
    imageUrl:  pick("photo_url","image_url","cover_url"),
    payment:   pick("payment plan","payment_plan"),
    desc:      pick("description","summary"),
    type:      pick("units types","unit_types","unit_type","property_type"),
    rooms:     pick("rooms","bedrooms","br"),
    baths:     pick("bathrooms","baths","ba")
  };
}

// Map 1 ligne DB -> format des cartes de listing
function mapRowToCard(row, COL){
  const priceNum   = num(row[COL.price]);
  const statusRaw  = String(row[COL.status] ?? "").trim();
  const handover   = String(row[COL.handover] ?? "").trim();

  // phase + badge
  const phase = /handover|ready|complete/i.test(statusRaw) || /\bQ[1-4]\s*20\d{2}\b/i.test(handover)
               ? "handover" : "launch";
  const badge = {
    label: statusRaw || (phase === "handover" ? "Handover Soon" : "Launch Soon"),
    color: phase === "handover" ? "orange" : "blue"
  };

  // petit tag (prend 1er bout du payment plan ou le type)
  let tag = "";
  if (row[COL.payment]) {
    tag = String(row[COL.payment]).split(/[\n•;,;-]+/).map(s=>s.trim()).filter(Boolean)[0] || "";
  }
  if (!tag && row[COL.type]) tag = String(row[COL.type]);

  return {
    title:      row[COL.title]     || "Untitled",
    location:   row[COL.location]  || "",
    developer:  row[COL.dev]       || "",
    type:       row[COL.type]      || "",
    bedrooms:   row[COL.rooms]     ?? null,
    bathrooms:  row[COL.baths]     ?? null,
    badge,
    price:      priceNum ?? 0,
    priceLabel: priceNum ? `From ${currencyAED(priceNum)}` : "",
    tag,
    img:        row[COL.imageUrl] || row[COL.logoUrl] || "styles/photo/dubai-map.jpg",
    action:     "View Project",
    actionColor: badge.color,
    delivery:   handover
  };
}

// Récupération Supabase
async function fetchOffplanForListing(){
  const table = "offplan";
  const COL = await detectColumns(table);
  const { data, error } = await window.supabase.from(table).select("*").limit(500);
  if (error) { console.warn("[Supabase] offplan:", error.message); return []; }
  return (data || []).map(r => mapRowToCard(r, COL));
}







let selectedDeliveryDates = [];
let currentPage = 1;

// ===================== AFFICHAGE =====================
// Remplace ENTIEREMENT ta fonction displayFlatProjects par ceci
function displayFlatProjects(array) {
  const container = document.getElementById("propertyResults");
  container.innerHTML = "";
  if (!array.length) {
    container.innerHTML = '<div style="margin:40px auto;font-size:1.2em;color:#c44;text-align:center;">No project found</div>';
    return;
  }

  array.forEach((p) => {
    // dev peut venir de la DB (p.dev) ou de l'ancien mock (p.developer)
    const devName = p.dev || p.developer || "";
    const sub = [p.location, devName].filter(Boolean).join(" - ");

    // badge couleur
    let badgeClass = "card-badge";
    if (p.badge?.color === "orange") badgeClass += " orange";
    else if (p.badge?.color === "green") badgeClass += " green";
    else if (p.badge?.color === "blue") badgeClass += " blue";
    else if (p.badge?.color === "red") badgeClass += " red";

    const priceLabel = p.priceLabel || (p.price ? `From AED ${Number(p.price).toLocaleString()}` : "");

    // image: essaye d'abord l'image projet, sinon le logo, sinon fallback
    const imgSrc = p.image || p.img || p.logo || p.logoUrl || "styles/photo/dubai-map.jpg";

    const html = `
      <div style="position:relative;">
        ${p.statusLabel ? `<span class="card-badge orange">${p.statusLabel}</span>` : (p.badge ? `<span class="${badgeClass}">${p.badge.label}</span>` : "")}
        <img src="${imgSrc}" alt="${p.title}" class="card-image-flat"
             onerror="this.onerror=null;this.src='styles/photo/dubai-map.jpg';"/>
      </div>
      <div class="card-body-flat">
        <div class="card-title-flat">${p.title || p.titre || "Untitled"}</div>
        <div class="card-sub-flat">${sub}</div>
        <div class="card-price-flat">${priceLabel}</div>
        <div class="card-icons-row">${p.tag ? `<span><i class="fa fa-check"></i> ${p.tag}</span>` : ""}</div>
        <button class="card-action-btn">${p.action || "View Project"}</button>
      </div>
    `;

    const card = document.createElement("div");
    card.className = "property-card-flat";
    card.tabIndex = 0;
    card.innerHTML = html;
    card.addEventListener("click", () => {
      window.location = 'off-plan-click.html?project=' + encodeURIComponent(p.title || p.titre || "");
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
    
    // ----------- FILTRE DATES DE LIVRAISON (correction ici) -------------
    if (deliveryDates.length > 0) {
      const matchDelivery = deliveryDates.some(val => {
        val = val.toLowerCase();
        // Si année seule, match tous les "QX YEAR" ou "YEAR"
        if (/^\d{4}$/.test(val)) return String(p.delivery).toLowerCase().includes(val);
        // Si quarter précis (Q3 2025 etc.), match strictement
        return String(p.delivery).toLowerCase() === val;
      });
      if (!matchDelivery) return false;
    }
    // ------------------------------------------------------
    
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
  const btns = document.querySelectorAll('.delivery-date-options .delivery-date-btn');
  const allBtn = document.querySelector('.delivery-date-options .delivery-date-btn[data-value="all"]');

  selectedDeliveryDates = [];

  // Toujours commencer avec "All" sélectionné
  if (allBtn) allBtn.classList.add('selected');

  btns.forEach(btn => {
    btn.addEventListener('click', function() {
      const val = this.dataset.value;

      if (val === "all") {
        // Si "All" => on désactive tout, puis on active All
        selectedDeliveryDates = [];
        btns.forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
      } else {
        // On désactive "All"
        allBtn.classList.remove('selected');
        this.classList.toggle('selected');

        if (this.classList.contains('selected')) {
          // Ajoute si pas déjà dans la sélection
          if (!selectedDeliveryDates.includes(val)) selectedDeliveryDates.push(val);
        } else {
          // Retire de la sélection
          selectedDeliveryDates = selectedDeliveryDates.filter(d => d !== val);
        }

        // Si plus aucun bouton sélectionné, réactive "All"
        if (selectedDeliveryDates.length === 0) {
          allBtn.classList.add('selected');
        }
      }

      // Met à jour l'affichage filtré
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


// ========= BOOT =========
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await waitForSupabase();
    projects = await fetchOffplanForListing();

    // si aucune donnée, on évite de casser le slider
    if (!projects.length) {
      document.getElementById("propertyResults").innerHTML =
        '<div style="margin:40px auto;font-size:1.2em;color:#c44;text-align:center;">No project found</div>';
      return;
    }

    // init filtres dépendants des prix
    setupDeliveryDateButtons();
    setupPriceFilter(projects);
    filterAndDisplayProjects(1);
  } catch (e) {
    console.error(e);
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

document.querySelector('.delivery-date-options').addEventListener('click', function(e) {
  const btn = e.target.closest('.delivery-date-btn');
  if (!btn) return;

  const val = btn.dataset.value;
  const allBtn = this.querySelector('.delivery-date-btn[data-value="all"]');
  const btns = this.querySelectorAll('.delivery-date-btn');

  if (val === "all") {
    selectedDeliveryDates = [];
    btns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  } else {
    allBtn.classList.remove('selected');
    btn.classList.toggle('selected');
    if (btn.classList.contains('selected')) {
      if (!selectedDeliveryDates.includes(val)) selectedDeliveryDates.push(val);
    } else {
      selectedDeliveryDates = selectedDeliveryDates.filter(d => d !== val);
    }
    if (selectedDeliveryDates.length === 0) {
      allBtn.classList.add('selected');
    }
  }
  filterAndDisplayProjects(1);
});
















document.addEventListener('DOMContentLoaded', function () {
  const burger = document.getElementById('burgerMenu');
  const allButtons = document.querySelector('.all-button');
  const mobileBuyMenu = document.querySelector('.mobile-buy-menu');

  burger?.addEventListener('click', () => {
    const isOpen = allButtons.classList.toggle('mobile-open');

    // Activer / désactiver aussi le menu déroulant si nécessaire
    if (mobileBuyMenu) {
      mobileBuyMenu.style.display = isOpen ? 'block' : 'none';
    }

    // Désactiver le scroll quand le menu est ouvert
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Fermer si clic en dehors
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (
      !burger.contains(target) &&
      !allButtons.contains(target) &&
      !mobileBuyMenu.contains(target)
    ) {
      allButtons.classList.remove('mobile-open');
      if (mobileBuyMenu) mobileBuyMenu.style.display = 'none';
      document.body.style.overflow = '';
    }
  });
});

