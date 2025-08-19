// javascript/agence.js — Page AGENCE 100% branchée sur Supabase

/* ========= Utils ========= */
const FALLBACK_LOGO = "styles/photo/profil.png";
const FALLBACK_IMG  = "styles/photo/dubai-map.jpg";

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const clean = (v) => (v == null ? "" : String(v).trim());
const toNum = (v, d=0) => {
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g,""));
  return Number.isFinite(n) ? n : d;
};
const onlyDigits = (v) => clean(v).replace(/[^\d+]/g,"");
const AED = (n) => {
  const x = typeof n === "number" ? n : Number(String(n).replace(/[^\d.-]/g,""));
  if (!Number.isFinite(x)) return "—";
  try { return new Intl.NumberFormat("en-AE",{style:"currency",currency:"AED",maximumFractionDigits:0}).format(x); }
  catch { return `AED ${Math.round(x).toLocaleString()}`; }
};

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

/* ========= Détections colonnes (tolérant aux noms avec espaces) ========= */
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
    orn:      pickFrom(s, "orn","RERA","rera_orn"),
    email:    pickFrom(s, "email","contact_email"),
    phone:    pickFrom(s, "phone","contact_phone"),
  };
}
async function detectAgentCols(){
  const { data, error } = await window.supabase.from("agent").select("*").limit(1);
  if (error) throw error;
  const s = data?.[0] || {};
  return {
    id:        pickFrom(s, "id","uuid"),
    name:      pickFrom(s, "name"),
    photo_url: pickFrom(s, "photo agent_url","photo_agent_url","photo_url","avatar_url"),
    email:     pickFrom(s, "email"),
    phone:     pickFrom(s, "phone"),
    whatsapp:  pickFrom(s, "whatsapp","wa"),
    agency_id: pickFrom(s, "agency_id","agency","agence_id"),
    rating:    pickFrom(s, "rating","stars"),
    superagent:pickFrom(s, "superagent","is_superagent","super"),
    languages: pickFrom(s, "languages","language","langs"),
    nationality: pickFrom(s, "nationality","country"),
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

/* ========= Chargements depuis l’URL ========= */
async function loadAgencyFromURL(){
  const params = new URLSearchParams(location.search);
  const idParam = clean(params.get("id"));
  const nameParam = clean(params.get("name"));

  const AC = await detectAgencyCols();

  let agencyRow = null;
  if (idParam){
    const { data } = await window.supabase.from("agency").select("*").eq(AC.id, idParam).limit(1);
    agencyRow = data?.[0] || null;
  }
  if (!agencyRow && nameParam){
    const { data } = await window.supabase.from("agency").select("*").ilike(AC.name, `%${nameParam}%`).limit(1);
    agencyRow = data?.[0] || null;
  }
  if (!agencyRow){
    const { data } = await window.supabase.from("agency").select("*").limit(1);
    agencyRow = data?.[0] || null;
  }
  if (!agencyRow) throw new Error("No agency");

  const agency = {
    id:   agencyRow[AC.id],
    name: clean(agencyRow[AC.name]),
    logo: clean(agencyRow[AC.logo_url]) || FALLBACK_LOGO,
    about: clean(agencyRow[AC.about]),
    address: clean(agencyRow[AC.address]),
    orn: clean(agencyRow[AC.orn]) || "—",
    email: clean(agencyRow[AC.email]),
    phone: clean(agencyRow[AC.phone]),
  };
  return { agency, AC };
}

async function loadAgentsForAgency(agencyId){
  const AG = await detectAgentCols();
  const { data } = await window.supabase.from("agent").select("*").eq(AG.agency_id, agencyId).limit(1000);
  const agents = (data||[]).map(r=>({
    id: r[AG.id],
    name: clean(r[AG.name]),
    photo: clean(r[AG.photo_url]) || FALLBACK_LOGO,
    email: clean(r[AG.email]),
    phone: clean(r[AG.phone]),
    whatsapp: clean(r[AG.whatsapp]) || clean(r[AG.phone]),
    rating: clean(r[AG.rating]) || "—",
    superagent: !!r[AG.superagent],
    languages: clean(r[AG.languages]),
    nationality: clean(r[AG.nationality]),
  }));
  return { agents, agentsById: new Map(agents.map(a=>[a.id,a])) };
}

async function fetchAgencyProperties(agentIds){
  const tables = [
    { name:"rent",       bucket:"rent" },
    { name:"buy",        bucket:"buy" },
    { name:"commercial", bucket:"commercial" },
  ];
  const all = [];

  for (const t of tables){
    try{
      const PC = await detectPropertyCols(t.name);
      if (!PC.agent_id) continue;

      const { data } = await window.supabase.from(t.name).select("*").in(PC.agent_id, agentIds).limit(1000);
      (data||[]).forEach(r=>{
        let bucket = t.bucket;
        if (t.name === "commercial") bucket = clean(r[PC.rental_period]) ? "commercial-rent" : "commercial-buy";

        all.push({
          table: t.name,
          bucket,
          id: r[PC.id],
          title: clean(r[PC.title]) || "—",
          type: clean(r[PC.type]),
          location: clean(r[PC.location]),
          price: r[PC.price],
          bedrooms: toNum(r[PC.bedrooms], null),
          bathrooms: toNum(r[PC.bathrooms], null),
          sqft: toNum(r[PC.sqft], null),
          img: clean(r[PC.photo]) || FALLBACK_IMG,
          rental_period: clean(r[PC.rental_period] || ""),
          agent_id: r[PC.agent_id],
        });
      });
    }catch(e){ console.warn(`Fail fetching ${t.name}:`, e?.message||e); }
  }
  return all;
}

/* ========= Rendus ========= */
function fillHeader(agency, agents, totalListings){
  const logo = $("#agency-logo");
  logo.src = agency.logo || FALLBACK_LOGO;
  logo.onerror = () => { logo.src = FALLBACK_LOGO; };

  $("#agency-name").textContent = agency.name;
  $("#about-agency-name").textContent = agency.name;
  $("#agency-location").textContent = agency.address || "—";
  $("#agency-orn").textContent = agency.orn;
  $("#agent-count").textContent = agents.length;
  $("#listing-count").textContent = totalListings;

  const aboutDiv = $("#about-text");
  const readBtn = $("#read-more-btn");
  aboutDiv.textContent = agency.about || "—";
  let expanded = false;
  const upd = () => {
    if (aboutDiv.scrollHeight > 100 && !expanded) { readBtn.style.display="block"; aboutDiv.classList.remove("expanded"); readBtn.textContent="Read more"; }
    else if (expanded) { aboutDiv.classList.add("expanded"); readBtn.textContent="Show less"; }
    else { readBtn.style.display="none"; }
  };
  readBtn.onclick = ()=>{ expanded=!expanded; upd(); };
  setTimeout(upd, 0);

  // Contact: si pas de contact agence → 1er agent disponible
  let email = agency.email, phone = agency.phone;
  if (!email || !phone){
    const a = agents.find(x => x.email || x.phone);
    email = email || a?.email || "";
    phone = phone || a?.phone || "";
  }
  $("#email-btn").onclick = ()=> email ? location.href=`mailto:${email}` : null;
  $("#call-btn").onclick  = ()=> phone ? location.href=`tel:${onlyDigits(phone)}` : null;
}

function renderAgencyAgents(agents){
  $("#agent-list").innerHTML = agents.map(a => `
    <div class="agent-card">
      <img class="agent-photo" src="${a.photo}" alt="${a.name}" onerror="this.onerror=null;this.src='${FALLBACK_LOGO}'">
      <div class="agent-info">
        <div class="agent-name">${a.name}</div>
        <div class="agent-role">${a.superagent ? "SuperAgent • " : ""}⭐ ${a.rating}</div>
        <div class="agent-meta">${[a.nationality, a.languages && ("Languages: " + a.languages)].filter(Boolean).join(" • ")}</div>
      </div>
      <a href="infoagent.html?id=${encodeURIComponent(a.id)}" class="search-btn">View</a>
    </div>
  `).join("");
}

let ALL_PROPS = [];
let PROPS_BY = { rent:[], buy:[], "commercial-rent":[], "commercial-buy":[] };
let CURRENT_FILTER = "rent";

function regroupProps(){
  PROPS_BY = { rent:[], buy:[], "commercial-rent":[], "commercial-buy":[] };
  ALL_PROPS.forEach(p => { (PROPS_BY[p.bucket] ||= []).push(p); });
}

function renderProperties(filterType, agentsById){
  CURRENT_FILTER = filterType;
  $$(".filter-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.type === filterType));

  const list = PROPS_BY[filterType] || [];
  const box = $("#property-list");

  if (!list.length){
    box.innerHTML = `<div style="padding:40px 0;color:#aaa;font-size:1.1rem;">No properties found for this type.</div>`;
    return;
  }

  box.innerHTML = list.map((p,i)=>{
    const a = agentsById.get(p.agent_id);
    const priceText = (filterType.includes("rent"))
      ? `${AED(p.price)} <span style="font-weight:400;">/ ${p.rental_period || "year"}</span>`
      : AED(p.price);

    const beds  = (p.bedrooms ?? "") !== "" ? `<span class="icon">🛏️</span> ${p.bedrooms}&nbsp;` : "";
    const baths = (p.bathrooms ?? "") !== "" ? `<span class="icon">🛁</span> ${p.bathrooms}&nbsp;` : "";
    const area  = (p.sqft ?? "") !== "" ? `<span class="icon">📐</span> ${Math.round(p.sqft).toLocaleString()} sqft` : "";
    const agentHtml = a ? `
      <div class="property-agent">
        <img src="${a.photo}" alt="${a.name}" class="agent-photo-v2" onerror="this.onerror=null;this.src='${FALLBACK_LOGO}'">
        ${a.name}
      </div>` : "";

    return `
      <div class="property-card-v2" data-index="${i}">
        <div class="property-image-block">
          <img class="property-carousel-img" src="${p.img}" alt="${p.title}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
          <div class="property-img-count"><span class="icon">📷</span> 1</div>
        </div>
        <div class="property-info-block">
          <div class="property-type-title">${p.type || ""}</div>
          <div class="property-location"><span class="icon">📍</span> ${p.location || ""}</div>
          <div class="property-specs">${beds}${baths}${area}</div>
          <div class="property-price">${priceText}</div>
          ${agentHtml}
          <div class="property-action-bar">
            <button class="property-action-btn" ${a?.phone ? `onclick="location.href='tel:${onlyDigits(a.phone)}'"`:"disabled"}>Call</button>
            <button class="property-action-btn" ${a?.email ? `onclick="location.href='mailto:${a.email}'"`:"disabled"}>Email</button>
            <button class="property-action-btn" ${a?.whatsapp ? `onclick="location.href='https://wa.me/${onlyDigits(a.whatsapp)}'"`:"disabled"}>WhatsApp</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* ========= Onglets (comme dans ton HTML) ========= */
window.showTab = function(tab){
  $("#tab-properties").classList.remove("active");
  $("#tab-agents").classList.remove("active");
  $("#properties-tab-content").style.display = "none";
  $("#agents-tab-content").style.display = "none";
  if (tab === "properties"){ $("#tab-properties").classList.add("active"); $("#properties-tab-content").style.display=""; }
  else { $("#tab-agents").classList.add("active"); $("#agents-tab-content").style.display=""; }
};

/* ========= Boot ========= */
document.addEventListener("DOMContentLoaded", async () => {
  try{
    await waitForSupabase();

    // 1) Agence
    const { agency } = await loadAgencyFromURL();

    // 2) Agents
    const { agents, agentsById } = await loadAgentsForAgency(agency.id);

    // 3) Propriétés (buy, rent, commercial) pour tous ces agents
    ALL_PROPS = await fetchAgencyProperties(agents.map(a=>a.id));
    regroupProps();

    // 4) Header + compteurs
    fillHeader(agency, agents, ALL_PROPS.length);

    // 5) Rendus
    renderAgencyAgents(agents);
    renderProperties("rent", agentsById); // filtre par défaut

    // 6) Filtres propriété
    $$(".filter-btn").forEach(btn => btn.onclick = () => renderProperties(btn.dataset.type, agentsById));
  }catch(e){
    console.error(e);
    $("#property-list").innerHTML = `<div style="padding:20px;color:#b00;">Unable to load agency.</div>`;
  }
});
