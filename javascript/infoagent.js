// ========= Helpers Bucket (communs) =========
const STORAGE_BUCKET = window.STORAGE_BUCKET || "photos_biens";

function normKey(s){
  if (!s) return "";
  let k = String(s).trim().replace(/^["']+|["']+$/g, "");
  // si URL publique Supabase -> ne garder que la clé objet
  k = k.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/[^/]+\//i, "");
  k = k.replace(/^\/+/, "");
  const re = new RegExp(`^(?:${STORAGE_BUCKET}\\/)+`, "i");
  k = k.replace(re, "");
  return k;
}
function sbPublicUrl(key){
  if (!key) return null;
  const { data } = window.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
  return data?.publicUrl || null;
}
function parseCandidates(val){
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  let s = String(val).replace(/\u200B|\u200C|\u200D|\uFEFF/g, "").trim();
  if (!s) return [];
  if (s[0]==="{" && s[s.length-1]==="}") return s.slice(1,-1).split(","); // postgres text[]
  if (s[0]==="[" && s[s.length-1]==="]") {
    try { return JSON.parse(s); } catch { return [s]; }
  }
  return s.split(/[\n,;|]+/);
}
function resolveAllPhotosFromBucket(raw){
  const out = [];
  for (const c of parseCandidates(raw)){
    if (c == null) continue;
    const t = String(c).trim().replace(/^["']+|["']+$/g, "");
    if (!t) continue;
    // http externe (WordPress, etc.) -> garder tel quel
    if (/^https?:\/\//i.test(t) && !/\/storage\/v1\/object\/public\//i.test(t)){
      if (!out.includes(t)) out.push(t);
      continue;
    }
    const key = normKey(t);
    const url = key ? sbPublicUrl(key) : null;
    if (url && !out.includes(url)) out.push(url);
  }
  return out;
}
function resolveOneFromBucket(raw){
  const arr = resolveAllPhotosFromBucket(raw);
  return arr[0] || null;
}
function resolveLogoAny(rawLogo){
  const fromBucket = resolveOneFromBucket(rawLogo);
  if (fromBucket) return fromBucket;
  const s = String(rawLogo || "").trim();
  return /^https?:\/\//i.test(s) ? s : null;
}




// javascript/infoagent.js — FICHE AGENT 100% Supabase (agent, agency, commercial, buy, rent)


/* ========= Utils ========= */
const FALLBACK_AGENT_IMG = "styles/photo/profil.png";
const FALLBACK_PROP_IMG  = "styles/photo/dubai-map.jpg";
const CARDS_PER_PAGE = 3;

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const clean = (v) => (v == null ? "" : String(v).trim());
const toNum = (v, d=0) => {
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g,""));
  return Number.isFinite(n) ? n : d;
};
const parseList = (v) => clean(v).split(/[,;/•\n]+/).map(s=>s.trim()).filter(Boolean);
const onlyDigits = (v) => clean(v).replace(/[^\d+]/g,"");
const firstName = (full) => clean(full).split(/\s+/)[0] || clean(full);
const daysBetween = (d) => {
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? (Date.now() - t) / 86400000 : Infinity;
};
const AED = (n) => {
  if (n == null || n === "") return "—";
  const x = typeof n === "number" ? n : Number(String(n).replace(/[^\d.-]/g,""));
  if (!Number.isFinite(x)) return "—";
  try { return new Intl.NumberFormat("en-AE", { style:"currency", currency:"AED", maximumFractionDigits:0 }).format(x); }
  catch { return `AED ${Math.round(x).toLocaleString()}`; }
};

/* attendre Supabase */
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

/* ========= Détection colonnes ========= */
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
    languages:    pickFrom(s, "languages","language","langs"),
    nationality:  pickFrom(s, "nationality","country"),
    rating:       pickFrom(s, "rating","stars"),
    superagent:   pickFrom(s, "superagent","is_superagent","super"),
    price_range:  pickFrom(s, "priceRange","price_range","price range"),
    price_min:    pickFrom(s, "price_min","min_price"),
    price_max:    pickFrom(s, "price_max","max_price"),
    sales12m:     pickFrom(s, "sales12m","sales_12m","sales 12m"),
    total_sales:  pickFrom(s, "totalSales","total_sales","total sales"),
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
  };
}
async function detectPropertyCols(table){
  const { data, error } = await window.supabase.from(table).select("*").limit(1);
  if (error) throw error;
  const s = data?.[0] || {};
  return {
    id:        pickFrom(s, "id","uuid"),
    created_at:pickFrom(s, "created_at"),
    title:     pickFrom(s, "title","name"),
    type:      pickFrom(s, "property type","property_type","type"),
    bedrooms:  pickFrom(s, "bedrooms","br"),
    bathrooms: pickFrom(s, "bathrooms","ba"),
    price:     pickFrom(s, "price"),
    sqft:      pickFrom(s, "sqft","area_sqft"),
    photo:     pickFrom(s, "photo bien_url","photo_bien_url","photo_url","image_url","cover_url"),
    agent_id:  pickFrom(s, "agent_id","agent"),
    location:  pickFrom(s, "localisation","location","community","area"),
    rental_period: pickFrom(s, "rental period","rental_period"),
  };
}

/* ========= Chargement AGENT + AGENCE ========= */
function makePriceRange(min, max, direct){
  if (direct) return direct;
  const nmin = toNum(min, NaN), nmax = toNum(max, NaN);
  const fmt = (n) => Number.isFinite(n)
    ? (n>=1_000_000 ? `AED ${Math.round(n/1_000_000)}M` : (n>=1_000 ? `AED ${Math.round(n/1_000)}K` : `AED ${Math.round(n)}`))
    : "";
  if (Number.isFinite(nmin) && Number.isFinite(nmax)) return `${fmt(nmin)} - ${fmt(nmax)}`;
  if (Number.isFinite(nmin)) return fmt(nmin);
  if (Number.isFinite(nmax)) return fmt(nmax);
  return "—";
}

async function loadAgentFromURL(){
  const params = new URLSearchParams(location.search);
  const idParam   = (params.get("id")||"").trim();
  const nameParam = (params.get("name")||"").trim();

  const AG = await detectAgentCols();
  const AC = await detectAgencyCols();

  // ---- Agent
  let agentRow = null;
  if (idParam){
    const { data } = await window.supabase.from("agent").select("*").eq(AG.id, idParam).limit(1);
    agentRow = data?.[0] || null;
  }
  if (!agentRow && nameParam){
    const { data } = await window.supabase.from("agent").select("*").ilike(AG.name, `%${nameParam}%`).limit(1);
    agentRow = data?.[0] || null;
  }
  if (!agentRow){
    const { data } = await window.supabase.from("agent").select("*").limit(1);
    agentRow = data?.[0] || null;
  }
  if (!agentRow) throw new Error("No agent found");

  // ---- Agency
  let agencyRow = null;
  const agencyId = agentRow?.[AG.agency_id] || null;
  if (agencyId){
    const { data } = await window.supabase.from("agency").select("*").eq(AC.id, agencyId).limit(1);
    agencyRow = data?.[0] || null;
  }

  // ---- Mapping + IMAGES via Bucket
  const langs = AG.languages ? parseList(agentRow?.[AG.languages]) : [];
  const priceRange = makePriceRange(
    agentRow?.[AG.price_min],
    agentRow?.[AG.price_max],
    (AG.price_range ? (agentRow?.[AG.price_range]||"").trim() : "")
  );

  const agent = {
    id:         agentRow?.[AG.id],
    name:       (agentRow?.[AG.name]||"").trim() || "Agent",
    email:      (agentRow?.[AG.email]||"").trim(),
    phone:      (agentRow?.[AG.phone]||"").trim(),
    whatsapp:   (agentRow?.[AG.whatsapp] || agentRow?.[AG.phone] || "").toString().trim(),
    photo:      resolveOneFromBucket(agentRow?.[AG.photo_url]) || FALLBACK_AGENT_IMG, // ✅ Bucket
    about:      (agentRow?.[AG.about]||"").trim(),
    rating:     AG.rating ? ((agentRow?.[AG.rating] ?? "—").toString().trim() || "—") : "—",
    superagent: AG.superagent ? Boolean(agentRow?.[AG.superagent]) : false,
    languages:  langs,
    nationality:(agentRow?.[AG.nationality]||"").toString().trim(),
    priceRange,
    sales12m:   toNum(agentRow?.[AG.sales12m], 0),
    totalSales: toNum(agentRow?.[AG.total_sales], 0),
    agency_id:  agencyId || null
  };

  const agency = agencyRow ? {
    id:   agencyRow?.[AC.id],
    name: (agencyRow?.[AC.name]||"").trim(),
    logo: resolveLogoAny(agencyRow?.[AC.logo_url]) || FALLBACK_AGENT_IMG, // ✅ Bucket
  } : { id:null, name:"", logo:FALLBACK_AGENT_IMG };

  return { agent, agency };
}


/* ========= Propriétés par agent (commercial + buy + rent) ========= */
async function fetchAgentProperties(agentId){
  const tables = [
    { name:"commercial", bucket:"sale" },
    { name:"buy",        bucket:"sale" },
    { name:"rent",       bucket:"rent" },
  ];
  const props = [];

  for (const t of tables){
    try{
      const PC = await detectPropertyCols(t.name);
      if (!PC.agent_id) continue;

      const { data, error } = await window.supabase
        .from(t.name)
        .select("*")
        .eq(PC.agent_id, agentId)
        .limit(500);

      if (error) { console.warn(`[${t.name}]`, error.message); continue; }

      (data||[]).forEach(r=>{
        // ✅ Résolution IMAGES : accepte clé, array JSON, text[] Postgres, ou URL publique Supabase
        const imgs = resolveAllPhotosFromBucket(r[PC.photo]);
        const firstImg = imgs[0] || FALLBACK_PROP_IMG;

        props.push({
          bucket: t.bucket,                  // sale | rent (logique existante)
          created_at: r[PC.created_at],
          title:  (r[PC.title]||"—").trim(),
          type:   (r[PC.type] ||"").trim(),
          location: (r[PC.location]||"").trim(),
          price:  r[PC.price],
          priceText: AED(r[PC.price]),
          bedrooms: toNum(r[PC.bedrooms], null),
          bathrooms: toNum(r[PC.bathrooms], null),
          sqft: toNum(r[PC.sqft], null),
          img: firstImg,                     // ✅ 1ère photo pour la carte
          images: imgs,                      // (optionnel) toutes les photos si tu veux un carrousel
          rental_period: (r[PC.rental_period]||"").toString().trim(),
        });
      });
    }catch(e){
      console.warn(`Fail on ${t.name}:`, e?.message||e);
    }
  }
  return props;
}


/* ========= Remplir le header ========= */
function fillHeader({ agent, agency }){
  const img = $(".agent-photo-rect img");
  if (img){
    img.src = agent.photo || FALLBACK_AGENT_IMG;
    img.onerror = () => { img.src = FALLBACK_AGENT_IMG; };
    img.alt = agent.name;
  }

  const nameEl = $(".agent-name");
  if (nameEl){
    nameEl.innerHTML = `
      ${agent.name}
      ${agent.superagent ? `<span class="label-superagent" style="display:inline-block;margin-left:.5rem;padding:.2rem .6rem;border-radius:8px;background:#ff9a1a;color:#fff;font-weight:700;font-size:.8rem;">SUPERAGENT</span>` : ""}
      <span class="star-rating" style="color:#f1b501;font-weight:700;margin-left:.4rem;">★ ${agent.rating}</span>
    `;
  }

  $$(".agent-company-link").forEach(a => {
    a.textContent = agency?.name || "";
    a.href = agency?.id ? new URL("agence.html?id="+agency.id, location.href).href : "#";
  });

  const agencyLogo = $(".agency-logo img");
  if (agencyLogo){
    agencyLogo.src = agency?.logo || FALLBACK_AGENT_IMG;
    agencyLogo.onerror = () => { agencyLogo.src = FALLBACK_AGENT_IMG; };
    agencyLogo.alt = agency?.name || "Agency";
  }

  const h2 = $(".agent-info-block h2");
  if (h2) h2.textContent = `About ${firstName(agent.name)}`;
  const about = $("#agent-about");
  if (about) about.textContent = agent.about || `${agent.name} is a real estate agent in Dubai.`;

  const lang = $(".agent-language");
  if (lang){
    const langs = agent.languages?.length ? agent.languages.join(", ") : "—";
    lang.innerHTML = `<i class="fas fa-language"></i> Speaks ${langs}`;
  }

  const stats = $(".agent-stats");
  if (stats){
    stats.innerHTML = `
      <span><b id="agent-active-count">0</b> Active Properties</span>
      <span style="margin-left:14px;"><b>${agent.priceRange || "—"}</b> team price range</span>
      <span style="margin-left:14px;"><b>${agent.sales12m}</b> sales last 12 months</span>
      <span style="margin-left:14px;"><b>${agent.totalSales}</b> total sales in Dubai</span>
    `;
  }

  const emailBtn = $(".contact-btn.email");
  if (emailBtn) emailBtn.href = agent.email ? `mailto:${agent.email}` : "#";
  const callBtn = $(".contact-btn.call");
  if (callBtn)  callBtn.href  = agent.phone ? `tel:${onlyDigits(agent.phone)}` : "#";
  const waBtn = $(".contact-btn.whatsapp");
  if (waBtn) {
    const wa = agent.whatsapp || agent.phone;
    waBtn.href = wa ? `https://wa.me/${onlyDigits(wa)}` : "#";
  }
}

/* ========= Rendu des propriétés ========= */
let ALL_PROPS = [];
let CURRENT_PAGE = 1;

function renderAgentProperties(page=1){
  const typeFilter  = $("#prop-type")?.value || "";
  const searchValue = $("#prop-search")?.value?.trim().toLowerCase() || "";
  const sort        = $("#prop-sort")?.value || "popular";

  let filtered = ALL_PROPS.filter(p =>
    (!typeFilter || p.type === typeFilter) &&
    (!searchValue || (p.location||"").toLowerCase().includes(searchValue))
  );

  if (sort === "price"){
    filtered.sort((a,b)=> toNum(a.price, Infinity) - toNum(b.price, Infinity));
  } else if (sort === "priceDesc"){
    filtered.sort((a,b)=> toNum(b.price, -Infinity) - toNum(a.price, -Infinity));
  } else {
    // Popular = récents en premier
    filtered.sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
  }

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / CARDS_PER_PAGE));
  CURRENT_PAGE = Math.min(Math.max(1, page), pages);
  const start = (CURRENT_PAGE - 1) * CARDS_PER_PAGE;
  const slice = filtered.slice(start, start + CARDS_PER_PAGE);

  const list = $("#agentPropList");
  list.innerHTML = "";
  slice.forEach(p=>{
    const isNew = daysBetween(p.created_at) <= 14;
    const badge = isNew ? "NEW" : "";
    const beds  = (p.bedrooms ?? "") !== "" ? `<span><i class="fa fa-bed"></i> ${p.bedrooms}</span>` : "";
    const baths = (p.bathrooms ?? "") !== "" ? `<span><i class="fa fa-bath"></i> ${p.bathrooms}</span>` : "";
    const area  = (p.sqft ?? "") !== "" ? `<span><i class="fa fa-ruler-combined"></i> ${Math.round(p.sqft).toLocaleString()} sqft</span>` : "";
    const loc   = p.location ? `<div class="agent-property-location"><i class="fa fa-map-marker-alt"></i> ${p.location}</div>` : "";
    const priceText = p.bucket === "rent" && p.rental_period ? `${AED(p.price)} / ${p.rental_period}` : AED(p.price);

    const card = document.createElement("div");
    card.className = "agent-property-card";
    card.innerHTML = `
      <img src="${p.img}" alt="${p.title}" class="agent-property-img" onerror="this.onerror=null;this.src='${FALLBACK_PROP_IMG}'">
      <div class="agent-property-info">
        <div class="agent-property-title">${p.title}</div>
        <div class="agent-property-details">${beds} &nbsp; ${baths} &nbsp; ${area}</div>
        ${loc}
        <div class="agent-property-price">${priceText}</div>
        <div class="agent-property-badges">
          ${badge ? `<span class="badge badge-main">${badge}</span>` : ""}
          ${p.type ? `<span class="badge">${p.type}</span>` : ""}
          ${p.bucket ? `<span class="badge">${p.bucket.toUpperCase()}</span>` : ""}
        </div>
      </div>
    `;
    card.addEventListener('click', () => window.location.href = "bien.html");
    list.appendChild(card);
  });

  // Pagination
  const pag = $("#agentPropPagination");
  pag.innerHTML = "";
  for (let i=1;i<=pages;i++){
    const b = document.createElement("button");
    b.textContent = i;
    if (i === CURRENT_PAGE) b.className = "active";
    b.onclick = ()=>renderAgentProperties(i);
    pag.appendChild(b);
  }

  // Compteurs
  $("#agent-active-count") && ($("#agent-active-count").textContent = total);
  const saleCount = ALL_PROPS.filter(p=>p.bucket==="sale").length;
  const rentCount = ALL_PROPS.filter(p=>p.bucket==="rent").length;
  $("#agent-sale-count") && ($("#agent-sale-count").textContent = `${saleCount} For Sale`);
  $("#agent-rent-count") && ($("#agent-rent-count").textContent = `${rentCount} For Rent`);
}

/* ========= Boot ========= */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await waitForSupabase();

    // 1) Agent + agence
    const payload = await loadAgentFromURL();
    fillHeader(payload);

    // 2) Propriétés du même agent (commercial + buy + rent)
    ALL_PROPS = await fetchAgentProperties(payload.agent.id);

    // Si rien en base, on n’affiche pas “vide” sans explication
    if (!ALL_PROPS.length) {
      $("#agentPropList").innerHTML = `<div style="padding:18px;color:#666;">No active properties for this agent yet.</div>`;
      $("#agent-active-count").textContent = "0";
      $("#agent-sale-count").textContent = "0 For Sale";
      $("#agent-rent-count").textContent = "0 For Rent";
    } else {
      renderAgentProperties(1);
    }

    // 3) Filtres propriétés
    $("#prop-type")?.addEventListener("change", ()=> renderAgentProperties(1));
    $("#prop-search")?.addEventListener("input", ()=> renderAgentProperties(1));
    $("#prop-sort")?.addEventListener("change", ()=> renderAgentProperties(CURRENT_PAGE));

  } catch (e) {
    console.error(e);
    const nameEl = $(".agent-name");
    if (nameEl) nameEl.textContent = "Agent";
    $("#agentPropList").innerHTML = `<div style="padding:18px;color:#b00;">Unable to load agent or properties.</div>`;
  }
});

/* ========= Burger & dropdown ========= */
document.addEventListener('DOMContentLoaded', function() {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');
  mainBuyBtn?.addEventListener('click', function(e) {
    e.preventDefault();
    buyDropdown.classList.toggle('open');
  });
  document.addEventListener('click', function(e) {
    if (!buyDropdown.contains(e.target)) buyDropdown.classList.remove('open');
  });

  const burger = document.getElementById('burgerMenu');
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
