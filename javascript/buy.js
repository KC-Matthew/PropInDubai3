

// --- Appliquer les filtres de l'URL à l'UI (robuste : alias + "2+" corrigé) ---
function applyURLFiltersToUI() {
  const p = new URLSearchParams(location.search);

  // accepte q|search, bedrooms|beds, bathrooms|baths|ba
  const q         = p.get('q')        ?? p.get('search')   ?? '';
  const type      = p.get('type')     ?? '';
  const bedroomsR = p.get('bedrooms') ?? p.get('beds')     ?? '';
  const bathsR    = p.get('bathrooms')?? p.get('baths')    ?? p.get('ba') ?? '';

  // normalise les valeurs style "2+", "7plus", "2%2B", etc.
  const normPlus = (v) => {
    if (!v) return '';
    let s = String(v).toLowerCase().trim();
    s = s.replace(/%2b/gi, '+').replace(/\s+/g, ''); // "2%2B"->"2+" / "2 "->"2"
    if (s === 'studio' || s === '0') return '1+';    // pas de "0+" dans ton select
    if (s === '7plus') s = '7+';                     // alias
    if (/^\d+$/.test(s)) return s + '+';             // "2" -> "2+"
    return s;
  };

  const bedrooms  = normPlus(bedroomsR);
  const bathrooms = normPlus(bathsR);

  // Champ recherche
  const searchInput = document.getElementById('search')
                    || document.querySelector('.searchbar input, input[type="search"], .search-input');
  if (searchInput && q) searchInput.value = q;

  // Type
  if (type && document.getElementById('propertyType')) {
    document.getElementById('propertyType').value = type;
  }

  // Sélecteurs "1+ / 2+ / …" — prend l’option existante la plus proche
  const setPlusSelect = (id, raw) => {
    const sel = document.getElementById(id);
    if (!sel || !raw) return;

    const wanted = raw; // ex: "2+"
    const options = Array.from(sel.options).map(o => (o.value || o.textContent).trim());

    // exacte ?
    const exact = options.find(v => v.toLowerCase() === wanted.toLowerCase());
    if (exact) { sel.value = exact; return; }

    // sinon, valeur <= demandée la plus proche
    const req = parseInt(wanted, 10);
    const nums = options
      .map(v => parseInt(String(v).toLowerCase(), 10))
      .filter(n => Number.isFinite(n));
    if (Number.isFinite(req) && nums.length) {
      const best = nums.filter(n => n <= req).sort((a,b)=>b-a)[0] ?? nums[0];
      sel.value = `${best}+`;
    }
  };

  setPlusSelect('bedrooms',  bedrooms);
  setPlusSelect('bathrooms', bathrooms);
}






function applyFiltersToQuery(sb, table, filters){
  let q = sb.from(table).select('*').limit(60);

  // Texte : or() pour couvrir plusieurs colonnes
  if (filters.q){
    const like = (v)=>`ilike.%${v}%`;
    // ⚠️ remplace/complète selon tes colonnes réelles
    q = q.or([
      `title.${like(filters.q)}`,
      `"localisation".${like(filters.q)}`,
      `"localisation accueil".${like(filters.q)}`,
      `"localisation acceuil".${like(filters.q)}`,
      `building.${like(filters.q)}`,
      `project.${like(filters.q)}`,
      `community.${like(filters.q)}`
    ].join(','));
  }

  // Type de bien
  if (filters.type){
    // essaie 'property_type', sinon mets 'type' / 'category'
    q = q.eq('property_type', filters.type).or(`type.eq.${filters.type},category.eq.${filters.type}`, { referencedTable: undefined });
  }

  // Bedrooms
  if (filters.bedrooms){
    if (filters.bedrooms === 'studio'){
      q = q.eq('bedrooms', 0);
    } else if (filters.bedrooms === '7plus'){
      q = q.gte('bedrooms', 7);
    } else {
      q = q.eq('bedrooms', Number(filters.bedrooms));
    }
  }

  // Bathrooms
  if (filters.bathrooms){
    if (filters.bathrooms === '7plus'){
      q = q.gte('bathrooms', 7);
    } else {
      q = q.eq('bathrooms', Number(filters.bathrooms));
    }
  }

  return q;
}





// === REAL ESTATE - JS BUY (APPARTEMENTS, VILLAS...) ===
// (c) Prop In Dubai - Version filtrage 100% natif, adaptée au HTML fourni
// ⚠️ Nécessite que supabaseClient.js mette le client sur window.supabase

function fmt(n) {
  const num = Number(n);
  if (!isFinite(num)) return "0";
  return num.toLocaleString('en-US');
}

let properties = [];
let filteredProperties = [];
let priceSlider = null;
let minPrice = 0, maxPrice = 0;
let globalMinPrice = 0, globalMaxPrice = 0;
const PRICE_STEP = 10000;

// ---------- LECTURE 100% BDD ----------
async function loadPropertiesFromDB() {
  const sb = window.supabase;
  if (!sb) {
    console.error("Supabase client is not available on window.supabase");
    return [];
  }

  // 1) Agents
  const { data: agentRows, error: agentErr } = await sb
    .from('agent')
    .select('id,name,photo_agent_url,phone,email,whatsapp,agency_id,rating');
  if (agentErr) { console.error(agentErr); return []; }
  const agentsById = Object.fromEntries((agentRows || []).map(a => [a.id, a]));

  // 2) Agencies (pour récupérer l’address + logo)
  const { data: agencyRows, error: agencyErr } = await sb
    .from('agency')
    .select('id,logo_url,address');
  if (agencyErr) { console.error(agencyErr); }
  const agenciesById = Object.fromEntries((agencyRows || []).map(a => [a.id, a]));

  function getAgencyForAgent(agentId) {
    const ag = agentsById[agentId];
    return ag ? agenciesById[ag.agency_id] : undefined;
  }

// 3) Biens BUY
const { data: buyRows, error: buyErr } = await sb
  .from('buy')
  .select('id,title,property_type,bedrooms,bathrooms,price,sqft,photo_bien_url,agent_id,created_at,"localisation accueil"');

  
  
// 4) Biens RENT
const { data: rentRows, error: rentErr } = await sb
  .from('rent')
  .select('id,title,property_type,bedrooms,bathrooms,price,sqft,photo_url,agent_id,created_at,"localisation accueil"');


  // 5) Biens COMMERCIAL
  const { data: comRows, error: comErr } = await sb
    .from('commercial')
    .select('id,title,rental_period,property_type,"property type",bedrooms,bathrooms,price,sqft,photo_url,agent_id,created_at');
  if (comErr) console.error(comErr);

  const out = [];

  function rowToProperty(row, tableName) {
  const agent = agentsById[row.agent_id] || {};
  const agency = getAgencyForAgent(row.agent_id) || {};
  const ptype = row.property_type ?? row['property type'] ?? 'Unknown';
  const mainPhoto = row.photo_bien_url || row.photo_url || null;

  const images = [];
  if (mainPhoto) images.push(mainPhoto);
  if (agency?.logo_url) images.push(agency.logo_url);

  // 👇 Priorité à "localisation accueil", sinon adresse d’agence
  const localisationAccueil = row['localisation accueil'] || row.localisation_accueil || '';

  return {
    title: ptype,
    price: Number(row.price) || 0,
    location: localisationAccueil || agency?.address || "",   // <-- ici
    bedrooms: Number(row.bedrooms) || 0,
    bathrooms: Number(row.bathrooms) || 0,
    size: Number(row.sqft) || 0,
    furnished: undefined,
    amenities: [],
    images,
    agent: {
      name: agent.name || "",
      avatar: agent.photo_agent_url || "",
      phone: agent.phone || "",
      email: agent.email || "",
      whatsapp: agent.whatsapp || "",
      rating: agent.rating ?? null
    },
    description: row.title || "",
    _id: row.id,
    _table: tableName,
    _created_at: row.created_at
  };
}


  (buyRows || []).forEach(r => out.push(rowToProperty(r, 'buy')));
  (rentRows || []).forEach(r => out.push(rowToProperty(r, 'rent')));
  (comRows || []).forEach(r => out.push(rowToProperty(r, 'commercial')));

  return out;
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

// ---------------- DOM READY ----------------
document.addEventListener('DOMContentLoaded', async function () {
  // 1) Charger les données
  properties = await loadPropertiesFromDB();
  filteredProperties = properties.slice();

  // 2) Bornes prix globales
  const allPrices = properties.map(p => p.price).filter(v => isFinite(v));
  globalMinPrice = allPrices.length ? Math.min(...allPrices) : 0;
  globalMaxPrice = allPrices.length ? Math.max(...allPrices) : 0;

  // 3) Pré-remplir UI depuis l’URL puis afficher
  applyURLFiltersToUI();
  handleSearchOrFilter(1);
  updatePriceSliderAndHistogram(properties);

  // 4) Boutons + filtres
  document.getElementById("searchBtn")?.addEventListener("click", () => handleSearchOrFilter(1));
  document.getElementById("clearBtn")?.addEventListener("click", handleClearFilters);
  document.getElementById("openPriceFilter")?.addEventListener("click", openPricePopup);
  document.getElementById("validatePriceBtn")?.addEventListener("click", function () {
    if (!priceSlider) return;
    let minVal = Number(String(document.getElementById("priceMinInput").value).replace(/[^\d]/g, "")) || globalMinPrice;
    let maxVal = Number(String(document.getElementById("priceMaxInput").value).replace(/[^\d]/g, "")) || globalMaxPrice;
    minVal = Math.max(globalMinPrice, Math.min(globalMaxPrice, minVal));
    maxVal = Math.max(globalMinPrice, Math.min(globalMaxPrice, maxVal));
    document.getElementById('priceMin').value = minVal;
    document.getElementById('priceMax').value = maxVal;
    document.getElementById('selectedPriceRange').textContent = fmt(minVal) + " - " + fmt(maxVal) + " AED";
    closePricePopup();
    handleSearchOrFilter(1);
  });
  document.getElementById("closePricePopup")?.addEventListener("click", closePricePopup);

  // 5) Autocomplete (types, localisations, agents)
// --- Autocomplete (types, localisations, agents) ---
function wireAutocomplete() {
  const searchInput = document.getElementById('search');
  const suggestionsDiv = document.getElementById('searchSuggestions');
  if (!searchInput || !suggestionsDiv) return;

  function getSuggestions(query) {
    if (!query) return [];
    const q = query.trim().toLowerCase();
    const seenT = new Set(), seenL = new Set(), seenA = new Set();
    const out = [];

    (properties || []).forEach(p => {
      const t = (p.title || '').trim();
      if (t && t.toLowerCase().includes(q) && !seenT.has(t)) {
        out.push({ label: t, icon: 'fa-building', type: 'type' });
        seenT.add(t);
      }
      const loc = (p.location || '').split(' - ')[0].trim();
      if (loc && loc.toLowerCase().includes(q) && !seenL.has(loc)) {
        out.push({ label: loc, icon: 'fa-map-marker-alt', type: 'location' });
        seenL.add(loc);
      }
      const ag = (p.agent?.name || '').trim();
      if (ag && ag.toLowerCase().includes(q) && !seenA.has(ag)) {
        out.push({ label: ag, icon: 'fa-user-tie', type: 'agent' });
        seenA.add(ag);
      }
    });

    return out.slice(0, 8);
  }

  function renderSuggestions(items) {
    if (!items.length) {
      suggestionsDiv.classList.remove('visible');
      suggestionsDiv.innerHTML = '';
      return;
    }
    suggestionsDiv.innerHTML = items.map(s => `
      <div class="suggestion" tabindex="0">
        <span class="suggestion-icon"><i class="fa ${s.icon}"></i></span>
        <span class="suggestion-label">${s.label}</span>
      </div>
    `).join('');
    suggestionsDiv.classList.add('visible');
  }

  searchInput.addEventListener('input', function () {
    const val = this.value;
    renderSuggestions(val ? getSuggestions(val) : []);
  });

  suggestionsDiv.addEventListener('mousedown', function (e) {
    const item = e.target.closest('.suggestion');
    if (!item) return;
    searchInput.value = item.querySelector('.suggestion-label').textContent;
    renderSuggestions([]);
    handleSearchOrFilter(1);
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && suggestionsDiv.classList.contains('visible')) {
      const first = suggestionsDiv.querySelector('.suggestion');
      if (first) {
        searchInput.value = first.querySelector('.suggestion-label').textContent;
        renderSuggestions([]);
        handleSearchOrFilter(1);
        e.preventDefault();
      }
    }
  });

  document.addEventListener('mousedown', function (e) {
    if (!suggestionsDiv.contains(e.target) && e.target !== searchInput) {
      renderSuggestions([]);
    }
  });
}







  wireAutocomplete();



  
  // 6) Écouteurs instantanés (inputs/selects)
  document.querySelectorAll(
    '.filter-bar input, .filter-bar select, #moreFilterPopup input, #moreFilterPopup select'
  ).forEach(el => {
    el.addEventListener('input', () => handleSearchOrFilter(1));
    el.addEventListener('change', () => handleSearchOrFilter(1));
  });

  // 7) More filters popup
  document.getElementById("openMoreFilter")?.addEventListener("click", function () {
    document.getElementById("moreFilterPopup").classList.add('active');
    document.body.classList.add('more-filters-open');
  });
  document.getElementById("closeMoreFilter")?.addEventListener("click", function () {
    document.getElementById("moreFilterPopup").classList.remove('active');
    document.body.classList.remove('more-filters-open');
  });
  document.getElementById("applyMoreFiltersBtn")?.addEventListener("click", function () {
    document.getElementById("moreFilterPopup").classList.remove('active');
    document.body.classList.remove('more-filters-open');
    handleSearchOrFilter(1);
  });

  // 8) Popup prix : fermer en dehors / ESC
  document.getElementById("priceFilterPopup")?.addEventListener("mousedown", function (e) {
    if (e.target === this) closePricePopup();
  });
  document.addEventListener("keydown", function (e) {
    if (document.getElementById("priceFilterPopup")?.classList.contains("active") && e.key === "Escape") closePricePopup();
  });

  // 9) Scroll To Top
  const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  if (scrollToTopBtn) {
    window.addEventListener('scroll', () => {
      scrollToTopBtn.style.display = window.scrollY > 250 ? 'block' : 'none';
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
    const imageElements = (property.images || []).map((src, index) =>
      `<img src="${src}" class="${index === 0 ? 'active' : ''}" alt="Property Photo">`
    ).join('');

    card.innerHTML = `
      <div class="carousel">
        ${imageElements}
        <div class="carousel-btn prev">❮</div>
        <div class="carousel-btn next">❯</div>
        <div class="image-count"><i class="fas fa-camera"></i> ${fmt((property.images || []).length)}</div>
      </div>
      <div class="property-info">
        <h3>${property.title}</h3>
        <p><i class="fas fa-map-marker-alt"></i> ${property.location || ""}</p>
        <p><i class="fas fa-bed"></i> ${fmt(property.bedrooms)} 
           <i class="fas fa-bath"></i> ${fmt(property.bathrooms)} 
           <i class="fas fa-ruler-combined"></i> ${fmt(property.size)} sqft</p>
        <strong>${fmt(parseInt(property.price))} AED</strong>
        <div class="agent-info">
          ${property.agent?.avatar ? `<img src="${property.agent.avatar}" alt="Agent">` : `<div class="agent-avatar-fallback"></div>`}
          <span>${property.agent?.name || ""}</span>
        </div>
        <div class="property-actions">
          <button class="btn-call"${!property.agent?.phone ? " disabled" : ""}>Call</button>
          <button class="btn-email"${!property.agent?.email ? " disabled" : ""}>Email</button>
          <button class="btn-wa"${!property.agent?.whatsapp ? " disabled" : ""}>WhatsApp</button>
        </div>
      </div>
    `;


    container.appendChild(card);

    // ►►► Redirection vers bien.html au clic sur la carte (sauf boutons/flèches du carrousel)
    card.addEventListener("click", (e) => {
      if (e.target.closest('.carousel-btn')) return; // ne pas déclencher depuis les flèches
      const detail = { id: property._id, type: property._table || 'buy' };
      sessionStorage.setItem('selected_property', JSON.stringify(detail));
      window.location.href = `bien.html?id=${encodeURIComponent(detail.id)}&type=${encodeURIComponent(detail.type)}`;
    });

    // === CAROUSEL LOGIC ===
    const images = card.querySelectorAll(".carousel img");
    let currentIndex = 0;

    card.querySelector(".prev").addEventListener("click", (e) => {
      e.stopPropagation();
      if (images.length === 0) return;
      images[currentIndex]?.classList.remove("active");
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      images[currentIndex]?.classList.add("active");
    });

    card.querySelector(".next").addEventListener("click", (e) => {
      e.stopPropagation();
      if (images.length === 0) return;
      images[currentIndex]?.classList.remove("active");
      currentIndex = (currentIndex + 1) % images.length;
      images[currentIndex]?.classList.add("active");
    });

    // === ACTIONS (liées BDD) ===
    const callBtn = card.querySelector('.btn-call');
    const mailBtn = card.querySelector('.btn-email');
    const waBtn = card.querySelector('.btn-wa');

    if (callBtn && property.agent?.phone) {
      callBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tel = String(property.agent.phone).replace(/\s+/g, '');
        if (tel) window.location.href = `tel:${tel}`;
      });
    }
    if (mailBtn && property.agent?.email) {
      mailBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `mailto:${property.agent.email}`;
      });
    }
    if (waBtn && property.agent?.whatsapp) {
      waBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wa = String(property.agent.whatsapp).replace(/[^\d+]/g, '');
        window.open(`https://wa.me/${wa}`, '_blank');
      });
    }
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

// Filtrage et résumé des types
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
    elem.addEventListener('click', function () {
      propertyTypeSelect.value = elem.getAttribute('data-type');
      handleSearchOrFilter();
      propertyTypesDiv.querySelectorAll('.pts-type').forEach(span => span.classList.remove('selected'));
      elem.classList.add('selected');
      document.getElementById("propertyCount").scrollIntoView({ behavior: "smooth" });
    });
  });
}

// ----- FILTRAGE PRINCIPAL -----
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
  const minArea = Number(document.getElementById('minAreaInput')?.value) || 0;
  const maxArea = Number(document.getElementById('maxAreaInput')?.value) || Infinity;
  const isFurnished = document.getElementById('furnishingFilter')?.checked;
  const checkedAmenities = Array.from(document.querySelectorAll('.amenities-list input[type="checkbox"]:checked')).map(cb => cb.value);

  if (checkedAmenities.length) {
    arr = arr.filter(p => (p.amenities || []).length && checkedAmenities.every(a => p.amenities.includes(a)));
  }
  if (keywords.length > 0) {
    arr = arr.filter(p => {
      const allText = [
        p.title, p.location, (p.description || ''), ...(p.amenities || [])
      ].join(' ').toLowerCase();
      return keywords.every(k => allText.includes(k));
    });
  }
  if (search) {
    arr = arr.filter(p =>
      (p.title || '').toLowerCase().includes(search) ||
      (p.location || '').toLowerCase().includes(search)
    );
  }
  if (propertyType !== "Property Type") {
    arr = arr.filter(p => p.title === propertyType);
  }
  if (bedrooms !== "Bedrooms") {
    const min = parseInt(bedrooms);
    if (!isNaN(min)) arr = arr.filter(p => p.bedrooms >= min);
  }
  if (bathrooms !== "Bathrooms") {
    const min = parseInt(bathrooms);
    if (!isNaN(min)) arr = arr.filter(p => p.bathrooms >= min);
  }
  if (minArea > 0) arr = arr.filter(p => (p.size || 0) >= minArea);
  if (maxArea < Infinity) arr = arr.filter(p => (p.size || 0) <= maxArea);
  if (isFurnished) arr = arr.filter(p => p.furnished === true);
  arr = arr.filter(p => p.price >= priceMin && p.price <= priceMax);

  filteredProperties = arr;
  displayProperties(filteredProperties, 1);
  updatePriceSliderAndHistogram(properties);
}

function handleClearFilters() {
  document.querySelectorAll(".filter-bar input, .filter-bar select").forEach(el => {
    if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });
  document.querySelectorAll("#moreFilterPopup input[type='text']").forEach(input => input.value = "");
  document.querySelectorAll("#moreFilterPopup input[type='checkbox']").forEach(cb => {
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
  document.getElementById("priceMin").value = globalMinPrice;
  document.getElementById("priceMax").value = globalMaxPrice;
  handleSearchOrFilter();
  document.getElementById("priceFilterPopup")?.classList.remove("active");
  document.getElementById("moreFilterPopup")?.classList.remove("active");
  document.body.classList.remove("price-popup-open");
  document.body.style.overflow = "";
  setTimeout(() => {
    document.querySelectorAll("#moreFilterPopup input[type='checkbox']").forEach(cb => {
      cb.checked = false;
      cb.dispatchEvent(new Event('input', { bubbles: true }));
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }, 10);
}

// Slider
function updatePriceSliderAndHistogram(propsArray) {
  minPrice = globalMinPrice;
  maxPrice = globalMaxPrice;
  let sliderElem = document.getElementById("priceSlider");
  if (!sliderElem) return;
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
      from: v => Number(String(v).replace(/[^\d]/g, ""))
    }
  });
  minInput.value = fmt(currentMin);
  maxInput.value = fmt(currentMax);
  priceSlider.on('update', function (values) {
    minInput.value = values[0];
    maxInput.value = values[1];
    document.getElementById("selectedPriceRange").textContent = values[0] + " - " + values[1] + " AED";
    drawPriceHistogram(propsArray, minPrice, maxPrice, values);
  });
  priceSlider.on('change', function (values) {
    let minVal = Number(String(values[0]).replace(/[^\d]/g, "")) || minPrice;
    let maxVal = Number(String(values[1]).replace(/[^\d]/g, "")) || maxPrice;
    document.getElementById('priceMin').value = minVal;
    document.getElementById('priceMax').value = maxVal;
    handleSearchOrFilter();
  });
  minInput.onchange = function () {
    let minVal = Number(String(minInput.value).replace(/[^\d]/g, "")) || minPrice;
    let maxVal = Number(String(maxInput.value).replace(/[^\d]/g, "")) || maxPrice;
    minVal = Math.max(minPrice, Math.min(maxVal, minVal));
    priceSlider.set([minVal, null]);
  };
  maxInput.onchange = function () {
    let minVal = Number(String(minInput.value).replace(/[^\d]/g, "")) || minPrice;
    let maxVal = Number(String(maxInput.value).replace(/[^\d]/g, "")) || maxPrice;
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
function drawPriceHistogram(propsArray, min, max, [sliderMin, sliderMax] = [min, max]) {
  const canvas = document.getElementById('priceHistogram');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  let prices = propsArray.map(p => p.price).filter(v => isFinite(v));
  if (prices.length === 0 || min === max) return;
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
    let y = Math.floor(height - (hist[i] / maxHist) * (height - 10));
    let barHeight = height - y;
    ctx.beginPath();
    ctx.fillStyle = (function () {
      let binStart = min + (i / bins) * (max - min);
      let binEnd = min + ((i + 1) / bins) * (max - min);
      return (binEnd >= sliderMin && binStart <= sliderMax) ? "#f17100" : "#ffd2a5";
    })();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    if (ctx.roundRect) ctx.roundRect(x, y, barWidth, barHeight, 5);
    else ctx.rect(x, y, barWidth, barHeight);
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



// -------- Dropdown BUY (inchangé) --------
document.addEventListener('DOMContentLoaded', function () {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');
  if (!buyDropdown || !mainBuyBtn) return;

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


