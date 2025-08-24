// === REAL ESTATE - JS RENT ===
// (c) Prop In Dubai
// ⚠️ Nécessite que supabaseClient.js mette le client sur window.supabase

function fmt(n) {
  const num = Number(n);
  if (!isFinite(num)) return "0";
  return num.toLocaleString('en-US');
}

// ---- Helpers URL & parsing ----
function readFiltersFromURL() {
  const p = new URLSearchParams(location.search);
  return {
    q: (p.get('q') || '').trim(),
    type: (p.get('type') || '').trim(),          // ex: "Apartment"
    bedrooms: (p.get('bedrooms') || '').trim(),  // "studio" | "1".."6" | "7plus"
    bathrooms: (p.get('bathrooms') || '').trim() // "1".."6" | "7plus"
  };
}

// Convertit "studio"/"7plus" en contrainte exploitable pour Supabase
function applyBedBathToQuery(qb, col, rawVal, { allowStudio = false } = {}) {
  if (!rawVal) return qb;
  const v = rawVal.toLowerCase();
  if (allowStudio && v === 'studio') return qb.eq(col, 0); // convention: studio = 0
  if (v === '7plus') return qb.gte(col, 7);
  const n = Number(v);
  if (Number.isFinite(n)) return qb.eq(col, n);
  return qb;
}

// --- Etat global ---
let properties = [];
let filteredProperties = [];
let currentPage = 1;
const cardsPerPage = 18;
let globalMinPrice = 0, globalMaxPrice = 0;

// -------------------- BDD --------------------
async function loadPropertiesFromDB(initialFilters = {}) {
  const sb = window.supabase;
  if (!sb) {
    console.error("Supabase client missing on window.supabase");
    return [];
  }

  // Agents (pour enrichir)
  const { data: agentRows, error: agentErr } = await sb
    .from('agent')
    .select('id,name,photo_agent_url,phone,email,whatsapp,agency_id,rating');
  if (agentErr) { console.error(agentErr); }

  const agentsById = Object.fromEntries((agentRows || []).map(a => [a.id, a]));

  // Agencies (adresse/logo)
  const { data: agencyRows, error: agencyErr } = await sb
    .from('agency')
    .select('id,logo_url,address');
  if (agencyErr) { console.error(agencyErr); }

  const agenciesById = Object.fromEntries((agencyRows || []).map(a => [a.id, a]));
  function getAgencyForAgent(agentId) {
    const ag = agentsById[agentId];
    return ag ? agenciesById[ag.agency_id] : undefined;
  }

  // Requête RENT avec filtres BDD (type/bed/bath)
  let rentQuery = sb
    .from('rent')
    // ⚠️ IMPORTANT: ne PAS sélectionner photo_bien_url (n'existe pas dans rent)
    .select('id,title,property_type,bedrooms,bathrooms,price,sqft,photo_url,agent_id,created_at');

  if (initialFilters.type) rentQuery = rentQuery.eq('property_type', initialFilters.type);
  rentQuery = applyBedBathToQuery(rentQuery, 'bedrooms', initialFilters.bedrooms, { allowStudio: true });
  rentQuery = applyBedBathToQuery(rentQuery, 'bathrooms', initialFilters.bathrooms);

  // Tri sûr par id
  rentQuery = rentQuery.order('id', { ascending: false });

  const { data: rentRows, error: rentErr } = await rentQuery;
  if (rentErr) { console.error(rentErr); return []; }

  // Normalisation
  const out = [];
  (rentRows || []).forEach(row => {
    const agent = agentsById[row.agent_id] || {};
    const agency = getAgencyForAgent(row.agent_id) || {};

    const ptype = row.property_type ?? 'Unknown';

    // photo_url peut être un champ texte (CSV) ou un seul lien
    let images = [];
    if (Array.isArray(row.photo_url)) {
      images = row.photo_url.filter(Boolean);
    } else if (typeof row.photo_url === 'string' && row.photo_url.trim()) {
      images = row.photo_url.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (agency.logo_url) images.push(agency.logo_url);

    out.push({
      _id: row.id,
      title: ptype,
      price: Number(row.price) || 0,    // numeric pour filtrage
      location: agency.address || "Dubai",
      lat: 25.2048,
      lng: 55.2708,
      bedrooms: Number(row.bedrooms) || 0,
      bathrooms: Number(row.bathrooms) || 0,
      size: Number(row.sqft) || 0,
      images,
      agent: {
        name: agent.name || "Unknown",
        avatar: agent.photo_agent_url || "styles/photo/default-agent.jpg",
        phone: agent.phone || "",
        email: agent.email || "",
        whatsapp: agent.whatsapp || "",
        rating: agent.rating ?? null
      },
      description: row.title || "",
      _created_at: row.created_at
    });
  });

  return out;
}

// -------------------- UI helpers --------------------
function paginate(arr, page) {
  const total = arr.length;
  const pages = Math.ceil(total / cardsPerPage) || 1;
  const start = (page - 1) * cardsPerPage;
  const end = start + cardsPerPage;
  return { page, total, pages, slice: arr.slice(start, end) };
}

function updatePagination(pages, page) {
  const paginationDiv = document.getElementById("pagination");
  if (!paginationDiv) return;
  paginationDiv.innerHTML = '';
  if (pages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '&laquo;';
  prevBtn.className = 'page-btn';
  prevBtn.disabled = page === 1;
  prevBtn.addEventListener('click', () => { filterProperties(page - 1); });
  paginationDiv.appendChild(prevBtn);

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === page ? ' active' : '');
    btn.textContent = i;
    btn.addEventListener('click', () => { filterProperties(i); });
    paginationDiv.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '&raquo;';
  nextBtn.className = 'page-btn';
  nextBtn.disabled = page === pages;
  nextBtn.addEventListener('click', () => { filterProperties(page + 1); });
  paginationDiv.appendChild(nextBtn);
}

function displayPropertyTypesSummary(propsArray, filterType) {
  const propertyTypesDiv = document.getElementById("propertyTypesSummary");
  const propertyTypeSelect = document.getElementById("propertyType");
  if (!propertyTypesDiv || !propertyTypeSelect) return;

  const typeCounts = {};
  propsArray.forEach(p => { typeCounts[p.title] = (typeCounts[p.title] || 0) + 1; });

  const typeOrder = ["Apartment", "Villa", "Townhouse", "Land", "Duplex", "Penthouse", "Compound", "Whole Building"];
  const sortedTypes = Object.keys(typeCounts).sort((a, b) => {
    const idxA = typeOrder.indexOf(a);
    const idxB = typeOrder.indexOf(b);
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
      filterProperties(1);
      propertyTypesDiv.querySelectorAll('.pts-type').forEach(span => span.classList.remove('selected'));
      elem.classList.add('selected');
      document.getElementById("propertyCount")?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

function renderCards(propsArray, page) {
  const container = document.getElementById("propertyResults");
  const propertyCountDiv = document.getElementById("propertyCount");
  const propertyTypeSelect = document.getElementById("propertyType");
  if (!container || !propertyCountDiv) return;

  const { slice, pages } = paginate(propsArray, page);
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

    // Redirection fiche bien
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains('prev') || e.target.classList.contains('next')) return;
      if (property?._id) {
        window.location.href = `bien.html?id=${encodeURIComponent(property._id)}`;
      } else {
        window.location.href = "bien.html";
      }
    });

    container.appendChild(card);

    // Carousel
    const imgs = card.querySelectorAll(".carousel img");
    let currentIndex = 0;
    card.querySelector(".next")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!imgs.length) return;
      imgs[currentIndex]?.classList.remove("active");
      currentIndex = (currentIndex + 1) % imgs.length;
      imgs[currentIndex]?.classList.add("active");
    });
    card.querySelector(".prev")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!imgs.length) return;
      imgs[currentIndex]?.classList.remove("active");
      currentIndex = (currentIndex - 1 + imgs.length) % imgs.length;
      imgs[currentIndex]?.classList.add("active");
    });

    // Actions
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

  displayPropertyTypesSummary(propsArray, propertyTypeSelect?.value || "");
  updatePagination(pages, page);

  // Mini-carte si présente
  if (typeof updateMiniMap === 'function') {
    updateMiniMap(slice);
  }
}

// -------------------- Filtrage client --------------------
function filterProperties(page = 1) {
  currentPage = page;
  let filtered = properties.slice();

  const searchInput = document.getElementById("search");
  const propertyTypeSelect = document.getElementById("propertyType");
  const bedroomsSelect = document.getElementById("bedrooms");
  const bathroomsSelect = document.getElementById("bathrooms");
  const priceMinEl = document.getElementById("priceMin");
  const priceMaxEl = document.getElementById("priceMax");

  const search = (searchInput?.value || '').trim().toLowerCase();
  const propertyType = propertyTypeSelect?.value || "Property Type";
  const bedrooms = bedroomsSelect?.value || "Bedrooms";
  const bathrooms = bathroomsSelect?.value || "Bathrooms";
  const priceMin = parseInt(priceMinEl?.value || '', 10) || globalMinPrice || 0;
  const priceMax = parseInt(priceMaxEl?.value || '', 10) || globalMaxPrice || Infinity;

  if (search) {
    filtered = filtered.filter(p =>
      (p.title || '').toLowerCase().includes(search) ||
      (p.location || '').toLowerCase().includes(search) ||
      (p.description || '').toLowerCase().includes(search)
    );
  }
  if (propertyType !== "Property Type") {
    filtered = filtered.filter(p => p.title === propertyType);
  }
  if (bedrooms !== "Bedrooms") {
    const min = parseInt(bedrooms, 10);
    if (!isNaN(min)) filtered = filtered.filter(p => p.bedrooms >= min);
  }
  if (bathrooms !== "Bathrooms") {
    const min = parseInt(bathrooms, 10);
    if (!isNaN(min)) filtered = filtered.filter(p => p.bathrooms >= min);
  }
  filtered = filtered.filter(p => p.price >= priceMin && p.price <= priceMax);

  // Met à jour bornes globales si besoin
  const allPrices = filtered.map(p => p.price).filter(v => isFinite(v));
  if (allPrices.length) {
    globalMinPrice = Math.min(...allPrices);
    globalMaxPrice = Math.max(...allPrices);
  }

  filteredProperties = filtered;
  renderCards(filteredProperties, page);
}

// -------------------- Boot --------------------
document.addEventListener("DOMContentLoaded", async () => {
  // 1) lire filtres URL
  const initialFilters = readFiltersFromURL();

  // 2) attendre supabase si besoin
  async function ensureSupabaseReady() {
    if (window.supabase) return;
    await new Promise(res => {
      window.addEventListener("supabase:ready", res, { once: true });
    });
  }
  await ensureSupabaseReady();

  // 3) charger depuis BDD (avec filtres type/bed/bath)
  properties = await loadPropertiesFromDB(initialFilters);

  // 4) filtre 'q' côté client
  if (initialFilters.q) {
    const ql = initialFilters.q.toLowerCase();
    properties = properties.filter(p => {
      const blob = [p.title || '', p.location || '', p.description || ''].join(' ').toLowerCase();
      return blob.includes(ql);
    });
  }

  // 5) bornes prix globales
  const allPrices = properties.map(p => p.price).filter(v => isFinite(v));
  globalMinPrice = allPrices.length ? Math.min(...allPrices) : 0;
  globalMaxPrice = allPrices.length ? Math.max(...allPrices) : 0;

  // 6) pré-remplir barre de filtres depuis URL
  (function prefillFilterBarFromURL() {
    const searchInput = document.getElementById("search");
    const typeSelect = document.getElementById("propertyType");
    const bedsSelect = document.getElementById("bedrooms");
    const bathsSelect = document.getElementById("bathrooms");

    if (initialFilters.q && searchInput) searchInput.value = initialFilters.q;

    if (initialFilters.type && typeSelect) {
      let matched = false;
      for (const opt of typeSelect.options) {
        if ((opt.value || "").trim().toLowerCase() === initialFilters.type.toLowerCase()) {
          typeSelect.value = opt.value; matched = true; break;
        }
      }
      if (!matched) {
        for (const opt of typeSelect.options) {
          if ((opt.text || "").trim().toLowerCase() === initialFilters.type.toLowerCase()) {
            typeSelect.value = opt.value; break;
          }
        }
      }
    }

    if (bedsSelect && initialFilters.bedrooms) {
      let val = initialFilters.bedrooms.toLowerCase();
      if (val === 'studio') val = '0';
      else if (val === '7plus') val = '7';
      for (const opt of bedsSelect.options) {
        if ((opt.value || "").toLowerCase() === String(val)) { bedsSelect.value = opt.value; break; }
      }
    }

    if (bathsSelect && initialFilters.bathrooms) {
      let val = initialFilters.bathrooms.toLowerCase();
      if (val === '7plus') val = '7';
      for (const opt of bathsSelect.options) {
        if ((opt.value || "").toLowerCase() === String(val)) { bathsSelect.value = opt.value; break; }
      }
    }
  })();

  // 7) rendu initial
  filteredProperties = properties.slice();
  renderCards(filteredProperties, 1);

  // 8) bind boutons/événements
  document.getElementById("searchBtn")?.addEventListener("click", () => filterProperties(1));
  document.getElementById("clearBtn")?.addEventListener("click", () => {
    document.querySelectorAll(".filter-bar input, .filter-bar select").forEach(el => {
      if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    });
    filterProperties(1);
  });

  document.querySelectorAll('.filter-bar input, .filter-bar select').forEach(el => {
    el.addEventListener('input', () => filterProperties(1));
    el.addEventListener('change', () => filterProperties(1));
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
