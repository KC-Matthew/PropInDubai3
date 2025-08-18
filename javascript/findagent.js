// javascript/findagent.js — même rendu que la démo, via Supabase (tables: agent, agency)

/* ========== Utils ========== */
const FALLBACK_IMG = "styles/photo/dubai-map.jpg";
const CARDS_PER_PAGE = 18;
const $id = (id) => document.getElementById(id);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const clean = (v) => (v == null ? "" : String(v).trim());
const toNum = (v, d=0) => {
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g,""));
  return Number.isFinite(n) ? n : d;
};
const toBool = (v) => {
  if (typeof v === "boolean") return v;
  const s = clean(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
};
const parseList = (v) => clean(v).split(/[,;/•\n]+/).map(s=>s.trim()).filter(Boolean);

// 38_500  -> "38K" | 1_120_000 -> "1.1M"
function usdShort(n){
  const x = toNum(n, NaN);
  if (!Number.isFinite(x)) return "—";
  if (x >= 1_000_000) return `${(x/1_000_000).toFixed(x >= 100_000_000 ? 0 : 1)}M`;
  if (x >= 1_000)     return `${Math.round(x/1_000)}K`;
  return String(Math.round(x));
}

function waitForSupabase(timeout=8000){
  if (window.supabase) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t = setTimeout(()=>reject(new Error("Supabase not ready (timeout)")), timeout);
    const onReady = () => { clearTimeout(t); window.removeEventListener("supabase:ready", onReady); resolve(); };
    window.addEventListener("supabase:ready", onReady);
  });
}

function pickFrom(sample, ...cands){
  const has = (k) => k && Object.prototype.hasOwnProperty.call(sample, k);
  return cands.find(has);
}

/* ========== Détection colonnes (robuste) ========== */
async function detectAgentCols(){
  const { data, error } = await window.supabase.from("agent").select("*").limit(1);
  if (error) throw error;
  const s = data?.[0] || {};
  return {
    id:           pickFrom(s, "id","uuid"),
    name:         pickFrom(s, "name"),
    email:        pickFrom(s, "email"),
    phone:        pickFrom(s, "phone"),
    whatsapp:     pickFrom(s, "whatsapp","wa"),
    photo_url:    pickFrom(s, "photo agent_url","photo_agent_url","photo_url","avatar_url"),
    agency_id:    pickFrom(s, "agency_id","agency","agence_id"),
    about:        pickFrom(s, "about agent","about_agent","about"),

    // Champs "démo" (optionnels)
    price_range:  pickFrom(s, "priceRange","price_range","price range"),
    price_min:    pickFrom(s, "price_min","min_price","price min"),
    price_max:    pickFrom(s, "price_max","max_price","price max"),
    sales12m:     pickFrom(s, "sales12m","sales_12m","sales 12m"),
    total_sales:  pickFrom(s, "totalSales","total_sales","total sales"),
    rating:       pickFrom(s, "rating","stars"),
    superagent:   pickFrom(s, "superagent","is_superagent","super"),
    languages:    pickFrom(s, "languages","language","langs"),
    nationality:  pickFrom(s, "nationality","country"),
    services:     pickFrom(s, "services","service","expertise")
  };
}

async function detectAgencyCols(){
  const { data, error } = await window.supabase.from("agency").select("*").limit(1);
  if (error) throw error;
  const s = data?.[0] || {};
  return {
    id:       pickFrom(s, "id","uuid"),
    name:     pickFrom(s, "name agency","name","company_name"),
    logo_url: pickFrom(s, "logo_url","logo","photo_url"),
    about:    pickFrom(s, "about the agency","about","description"),
    address:  pickFrom(s, "address","addr","location"),
    total_sales: pickFrom(s, "totalSales","total_sales","total sales"), // optionnel
  };
}

/* ========== Fetch + mapping ========== */
async function fetchData(){
  const AGCOL = await detectAgentCols();
  const ACCOL = await detectAgencyCols();

  // Agents
  let { data: aRows, error: e1 } = await window.supabase.from("agent").select("*").limit(1000);
  if (e1) throw e1;
  aRows = aRows || [];

  // Agencies (celles référencées + un peu de rab pour l’onglet companies)
  const agencyIds = [...new Set(aRows.map(a => a[AGCOL.agency_id]).filter(Boolean))];
  let { data: cRows, error: e2 } = agencyIds.length
    ? await window.supabase.from("agency").select("*").in(ACCOL.id || "id", agencyIds)
    : await window.supabase.from("agency").select("*").limit(200);
  if (e2) throw e2;
  cRows = cRows || [];

  const agencyById = new Map(cRows.map(r => [r[ACCOL.id], r]));

  const AGENTS = aRows.map(r => {
    const agency = agencyById.get(r[AGCOL.agency_id]) || {};
    const langs = AGCOL.languages ? parseList(r[AGCOL.languages]) : [];
    const servs = AGCOL.services ? parseList(r[AGCOL.services]) : [];
    // price range: priorité à la chaîne, sinon min/max
    let priceRange = clean(AGCOL.price_range ? r[AGCOL.price_range] : "");
    if (!priceRange && (AGCOL.price_min || AGCOL.price_max)) {
      const lo = AGCOL.price_min ? toNum(r[AGCOL.price_min], NaN) : NaN;
      const hi = AGCOL.price_max ? toNum(r[AGCOL.price_max], NaN) : NaN;
      if (Number.isFinite(lo) && Number.isFinite(hi)) priceRange = `${usdShort(lo)} - ${usdShort(hi)}`;
      else if (Number.isFinite(lo)) priceRange = `${usdShort(lo)}+`;
      else if (Number.isFinite(hi)) priceRange = `Up to ${usdShort(hi)}`;
    }
    priceRange = priceRange || "—";

    const ratingVal = AGCOL.rating ? toNum(r[AGCOL.rating], NaN) : NaN;

    return {
      // rendu démo
      name: clean(r[AGCOL.name]),
      company: clean(agency?.[ACCOL.name] || ""),
      priceRange,
      sales12m: toNum(AGCOL.sales12m ? r[AGCOL.sales12m] : null, 0),
      totalSales: toNum(AGCOL.total_sales ? r[AGCOL.total_sales] : null, 0),
      photo: clean(r[AGCOL.photo_url]) || clean(agency?.[ACCOL.logo_url]) || FALLBACK_IMG,
      nationality: clean(AGCOL.nationality ? r[AGCOL.nationality] : ""),
      languages: langs,
      rating: Number.isFinite(ratingVal) ? (Math.round(ratingVal*10)/10) : "—",
      superagent: AGCOL.superagent ? toBool(r[AGCOL.superagent]) : false,
      services: servs,

      // navigation
      _id: r[AGCOL.id],
      _agency_id: r[AGCOL.agency_id] || null,
    };
  });

  // Compter le nb d’agents par agence
  const countByAgency = {};
  AGENTS.forEach(a => {
    if (!a._agency_id) return;
    countByAgency[a._agency_id] = (countByAgency[a._agency_id] || 0) + 1;
  });

  const COMPANIES = cRows.map(r => ({
    name: clean(r[ACCOL.name]),
    agents: countByAgency[r[ACCOL.id]] || 0,
    totalSales: toNum(ACCOL.total_sales ? r[ACCOL.total_sales] : null, 0),
    photo: clean(r[ACCOL.logo_url]) || FALLBACK_IMG,
    _id: r[ACCOL.id],
  }));

  return { AGENTS, COMPANIES };
}

/* ========== État & DOM ========== */
let MODE = "agent";
let CURRENT_PAGE = 1;
let DATA = { AGENTS: [], COMPANIES: [] };

const sectionAgent = $id('super-section-agent');
const sectionCompany = $id('super-section-company'); // peut ne pas exister
const tabs = $$('.super-tab');
const input = $id('searchInput');
const serviceSelect = $id('serviceSelect');
const langSelect = $id('langSelect');
const natSelect = $id('nationalitySelect');
const container = $id('agents-container');
const pagination = $id('pagination');

/* ========== Rendu cartes ========== */
function renderCards(list){
  container.innerHTML = '';
  const start = (CURRENT_PAGE - 1) * CARDS_PER_PAGE;
  const end   = start + CARDS_PER_PAGE;
  const pageData = list.slice(start, end);

  if (MODE === "agent") {
    pageData.forEach(agent => {
      const card = document.createElement('div');
      card.className = "agent-card";
      card.innerHTML = `
        <img src="${agent.photo}" alt="${agent.name}" class="agent-photo"
             onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
        <div class="agent-info">
          <h3>
            ${agent.name}
            ${agent.superagent ? `<span class="label-superagent">SUPERAGENT</span>` : ""}
            <span class="star-rating">★ ${agent.rating}</span>
          </h3>
          <p class="agency">${agent.company}</p>
          <p><strong>${agent.priceRange}</strong> team price range</p>
          <p><strong>${agent.sales12m}</strong> sales last 12 months</p>
          <p><strong>${agent.totalSales}</strong> total sales in Dubai</p>
          ${agent.nationality ? `<p>Nationality: ${agent.nationality}</p>` : ""}
          ${agent.languages?.length ? `<p>Languages: ${agent.languages.join(', ')}</p>` : ""}
        </div>
      `;
      card.style.cursor = "pointer";
      card.onclick = () => {
        const url = new URL("infoagent.html", location.href);
        if (agent._id) url.searchParams.set("id", agent._id);
        if (agent._agency_id) url.searchParams.set("agency_id", agent._agency_id);
        url.searchParams.set("name", agent.name || "");
        window.location.href = url.toString();
      };
      container.appendChild(card);
    });
  } else {
    pageData.forEach(company => {
      const card = document.createElement('div');
      card.className = "agent-card";
      card.innerHTML = `
        <img src="${company.photo}" alt="${company.name}" class="agent-photo"
             onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
        <div class="agent-info">
          <h3>${company.name}</h3>
          <p><strong>${company.agents}</strong> agents</p>
          <p><strong>${company.totalSales}</strong> total sales in Dubai</p>
        </div>
      `;
      card.style.cursor = "pointer";
      card.onclick = () => {
        const url = new URL("agence.html", location.href);
        if (company._id) url.searchParams.set("id", company._id);
        url.searchParams.set("name", company.name || "");
        window.location.href = url.toString();
      };
      container.appendChild(card);
    });
  }
}

/* ========== Pagination ========== */
function renderPagination(list){
  pagination.innerHTML = '';
  const totalPages = Math.ceil(list.length / CARDS_PER_PAGE);
  if (totalPages <= 1) return;

  const mkBtn = (html, disabled, onClick) => {
    const b = document.createElement('button');
    b.className = "page-btn";
    b.disabled = !!disabled;
    b.innerHTML = html;
    b.onclick = onClick;
    return b;
  };

  pagination.appendChild(mkBtn("&laquo;", CURRENT_PAGE===1, () => { if (CURRENT_PAGE>1){ CURRENT_PAGE--; update(); } }));

  for (let i=1;i<=totalPages;i++){
    const btn = mkBtn(String(i), false, () => { CURRENT_PAGE = i; update(); });
    if (i === CURRENT_PAGE) btn.classList.add('active');
    pagination.appendChild(btn);
  }

  pagination.appendChild(mkBtn("&raquo;", CURRENT_PAGE===totalPages, () => { if (CURRENT_PAGE<totalPages){ CURRENT_PAGE++; update(); } }));
}

/* ========== Filtres + Update ========== */
function update(){
  const q = clean(input.value).toLowerCase();
  const fLang = clean(langSelect.value);
  const fNat  = clean(natSelect.value);
  const fService = clean(serviceSelect.value).toLowerCase(); // si tu ajoutes une colonne "services"

  let data = [];
  if (MODE === "agent") {
    data = DATA.AGENTS.filter(a => {
      if (q && !(a.name.toLowerCase().includes(q) || a.company.toLowerCase().includes(q))) return false;
      if (fLang && !(a.languages || []).includes(fLang)) return false;
      if (fNat && a.nationality !== fNat) return false;
      if (fService) {
        if (!a.services) return false;
        if (!a.services.map(s=>s.toLowerCase()).includes(fService)) return false;
      }
      return true;
    });
  } else {
    data = DATA.COMPANIES.filter(c => !q || c.name.toLowerCase().includes(q));
  }

  const totalPages = Math.ceil(data.length / CARDS_PER_PAGE) || 1;
  if (CURRENT_PAGE > totalPages) CURRENT_PAGE = 1;

  renderCards(data);
  renderPagination(data);
}

/* ========== Boot ========== */
document.addEventListener('DOMContentLoaded', async function () {
  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      MODE = tab.getAttribute('data-type');
      input.placeholder = MODE === "agent" ? "Enter location or agent name" : "Enter company name";
      CURRENT_PAGE = 1;

      if (MODE === "agent") {
        sectionAgent.style.display = "";
        sectionCompany && (sectionCompany.style.display = "none");
        langSelect.style.display = "";
        natSelect.style.display = "";
      } else {
        sectionAgent.style.display = "none";
        sectionCompany && (sectionCompany.style.display = "none");
        langSelect.style.display = "none";
        natSelect.style.display = "none";
      }
      update();
    });
  });

  // Inputs
  input.addEventListener('input', ()=>{ CURRENT_PAGE=1; update(); });
  serviceSelect.addEventListener('change', ()=>{ CURRENT_PAGE=1; update(); });
  langSelect.addEventListener('change', ()=>{ CURRENT_PAGE=1; update(); });
  natSelect.addEventListener('change', ()=>{ CURRENT_PAGE=1; update(); });
  document.querySelector('.super-search-bar').onsubmit = (e) => { e.preventDefault(); CURRENT_PAGE=1; update(); };

  // Chargement Supabase
  try {
    await waitForSupabase();
    DATA = await fetchData();

    // si aucune langue/nationalité présente → masquer les selects
    const anyLang = DATA.AGENTS.some(a => a.languages?.length);
    const anyNat  = DATA.AGENTS.some(a => a.nationality);
    if (!anyLang) langSelect.style.display = "none";
    if (!anyNat)  natSelect.style.display = "none";

    update();
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="margin:40px auto;font-size:1.1rem;color:#c44;text-align:center;">Unable to load agents right now.</div>`;
  }
});

/* ========== Burger & dropdown (identique) ========== */
document.addEventListener('DOMContentLoaded', function () {
  const burger = $id('burgerMenu');
  const nav = document.querySelector('.all-button');
  burger?.addEventListener('click', () => {
    nav.classList.toggle('mobile-open');
    if (nav.classList.contains('mobile-open')) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => { document.addEventListener('click', closeMenu, { once: true }); }, 0);
    } else {
      document.body.style.overflow = '';
    }
    function closeMenu(e) {
      if (!nav.contains(e.target) && !burger.contains(e.target)) {
        nav.classList.remove('mobile-open');
        document.body.style.overflow = '';
      }
    }
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const buyDropdown = $id('buyDropdown');
  const mainBuyBtn  = $id('mainBuyBtn');
  mainBuyBtn?.addEventListener('click', function(e) {
    e.preventDefault();
    buyDropdown.classList.toggle('open');
  });
  document.addEventListener('click', function(e) {
    if (!buyDropdown.contains(e.target)) buyDropdown.classList.remove('open');
  });
});

