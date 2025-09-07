// ====== STORAGE (bucket d'images) ======
const STORAGE_BUCKET = "photos_biens";

function sbPublicUrl(key){
  if (!key) return null;
  const { data } = window.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
  return data?.publicUrl || null;
}

// "photo_url"/"developer_photo_url" peuvent être: array JS, "{a,b}", "[...]", lignes, "a,b; c|d", URL complète
function parseCandidates(val){
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  let s = String(val).replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "").trim();
  if (!s) return [];
  if (s[0]==="{" && s[s.length-1]==="}") return s.slice(1,-1).split(",");
  if (s[0]==="[" && s[s.length-1]==="]") { try { return JSON.parse(s); } catch { return [s]; } }
  return s.split(/[\n,;|]/);
}

function normKey(k){
  let key = String(k || "").trim().replace(/^["']+|["']+$/g, "");
  if (!key) return "";
  // si URL publique Supabase -> ne garder que la clé
  key = key.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/[^/]+\//i, "");
  key = key.replace(/^\/+/, "");
  key = key.replace(new RegExp(`^(?:${STORAGE_BUCKET}\\/)+`, "i"), "");
  return key;
}

// PHOTO: priorité au bucket (clé ou URL supabase), sinon 1ère http(s)
function resolvePhotoBucketFirst(val){
  const cand = parseCandidates(val);
  for (const c of cand){ // bucket / url supabase en 1er
    const raw = String(c).trim();
    if (!/^https?:\/\//i.test(raw) || /\/storage\/v1\/object\/public\//i.test(raw)){
      const url = sbPublicUrl(normKey(raw));
      if (url) return url;
    }
  }
  for (const c of cand){ // sinon http(s)
    const s = String(c).trim().replace(/^["']+|["']+$/g, "");
    if (/^https?:\/\//i.test(s)) return s;
  }
  return null;
}

// LOGO: souvent externe → http(s) d'abord, sinon bucket
function resolveLogoHttpFirst(val){
  const cand = parseCandidates(val);
  for (const c of cand){
    const s = String(c).trim().replace(/^["']+|["']+$/g, "");
    if (/^https?:\/\//i.test(s)) return s;
  }
  for (const c of cand){
    const url = sbPublicUrl(normKey(c));
    if (url) return url;
  }
  return null;
}




/* off-plan-click.js — fiche projet reliée à Supabase
   Paramètres supportés :


   - ?id=<uuid>  ✅ recommandé
   - ?project=<titre>  (secours si pas d’id)
*/
(function () {
  /* ============ Utils ============ */
  const qs = new URLSearchParams(location.search);
  const wantedId = qs.get("id");
  const wantedTitle = (qs.get("project") || "").trim();

  const num = (v) => {
    if (v == null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
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
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || ""; };

  /* ============ Détection colonnes (offplan) ============ */
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
      imageUrl:  pick("photo_url","image_url","cover_url"),
      logoUrl:   pick("developer photo_url","developer_logo","logo_url"),
      brochure:  pick("brochure_url"),
      payment:   pick("payment plan","payment_plan"),
      units:     pick("units types","unit_types","unit_type","property_type"),
      desc:      pick("description","summary"),
      lat:       pick("lat","latitude"),
      lon:       pick("lon","lng","longitude"),
    };
  }

  /* ============ Fetch principal (1 projet) ============ */
  async function fetchOffplanRow(){
    const table = "offplan";
    const COL = await detectColumns(table);

    // 1) par ID
    if (wantedId) {
      const { data, error } = await window.supabase.from(table).select("*").eq(COL.id, wantedId).maybeSingle();
      if (error) throw error;
      if (data) return { row: data, COL };
    }

    // 2) par titre (casse ignorée)
    if (wantedTitle) {
      const { data, error } = await window.supabase.from(table).select("*").ilike(COL.title, wantedTitle);
      if (error) throw error;
      if (data && data.length) return { row: data[0], COL };
    }

    // 3) fallback : premier
    const { data, error } = await window.supabase.from(table).select("*").limit(1).maybeSingle();
    if (error) throw error;
    return { row: data, COL };
  }

  /* ============ Fetch extras (table liée "offplan click") ============ */
  async function fetchClickExtras(offplanId){
    const { data, error } = await window.supabase
      .from("offplan click")
      .select("*")
      .eq("offplan id", offplanId)
      .limit(1)
      .maybeSingle();
    if (error) { console.warn("[offplan click]", error.message); return null; }
    return data || null;
  }

  /* ============ Recommended (même développeur, sinon derniers) ============ */
  async function fetchRecommended(devName, currentId, COL){
    // ⚠️ pour éviter les soucis de colonnes avec espaces, on prend "*"
    let q = window.supabase.from("offplan").select("*").neq(COL.id, currentId).limit(12);
    if (devName) q = q.ilike(COL.dev || "developer name", `%${devName}%`);
    let { data, error } = await q;
    if (error) { console.warn("[recommended]", error.message); data = []; }

    if (!data.length) {
      const r = await window.supabase.from("offplan").select("*").order(COL.id, { ascending:false }).limit(6);
      data = r.data || [];
    }
    return data;
  }

async function renderRecommended(list, COL){
  const wrap = document.getElementById("recommendedList");
  if (!wrap) return;
  wrap.innerHTML = "";
  list.slice(0,6).forEach(r => {
    const id    = r[COL.id];
    const title = r[COL.title] || "";
    const loc   = r[COL.location] || "";
    const price = num(r[COL.price]);

    const img = resolvePhotoBucketFirst(r.photo_url ?? r[COL.imageUrl])
             || resolveLogoHttpFirst(r.developer_photo_url ?? r[COL.logoUrl])
             || "styles/photo/dubai-map.jpg";

    const card = document.createElement("div");
    card.className = "recommended-card";
    card.innerHTML = `
      <img src="${img}" alt="${loc}" onerror="this.onerror=null;this.src='styles/photo/dubai-map.jpg'">
      <div class="recommended-info">
        <h3>${price ? `From ${currencyAED(price)}` : ""}</h3>
        <p class="location-text">${title}</p>
        <p class="agency-text">${loc}</p>
      </div>`;
    card.style.cursor = "pointer";
    card.onclick = () => {
      const url = new URL("off-plan-click.html", location.href);
      url.searchParams.set("id", id);
      url.searchParams.set("project", title);
      window.location.href = url.toString();
    };
    wrap.appendChild(card);
  });
}

  /* ============ Tableau des unités (fallback intelligent) ============ */
  function fillUnitsTable(row, COL){
    const tbody = document.getElementById("unitsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const unitsStr  = String(row[COL.units] || "").trim();
    const priceNum  = num(row[COL.price]);
    const priceText = priceNum ? `From ${currencyAED(priceNum)}` : "—";

    if (!unitsStr) {
      // Pas d’info en base → on montre au moins 1 ligne “générique”
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>Units Available</td><td>—</td><td>${priceText}</td><td>Contact us</td>`;
      tbody.appendChild(tr);
      return;
    }

    const tokens = unitsStr.split(/[,;/•\n]+/).map(s=>s.trim()).filter(Boolean);
    const seen = new Set();
    tokens.forEach(t => {
      const k = t.toLowerCase();
      if (seen.has(k)) return; seen.add(k);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${t}</td><td>—</td><td>${priceText}</td><td>Available</td>`;
      tbody.appendChild(tr);
    });
  }

  /* ============ Rendu principal ============ */
  function fillMain(row, COL, extras){
  const title    = row[COL.title]     || "Untitled";
  const location = row[COL.location]  || "";
  const dev      = row[COL.dev]       || "";
  const status   = row[COL.status]    || "";
  const handover = row[COL.handover]  || "";
  const priceNum = num(row[COL.price]);
  const units    = row[COL.units]     || "";
  const pay      = row[COL.payment]   || "";
  const desc     = row[COL.desc]      || extras?.description || "";
  const brochure = row[COL.brochure]  || "#";

  // ===== médias: BUCKET D'ABORD pour la photo principale =====
  const rawPhoto = row.photo_url ?? row[COL.imageUrl];
  const rawLogo  = row.developer_photo_url ?? row[COL.logoUrl];

  const imgMain = resolvePhotoBucketFirst(rawPhoto)
               || resolveLogoHttpFirst(rawLogo)
               || "styles/photo/dubai-map.jpg";

  const imgLogo = resolveLogoHttpFirst(rawLogo)
               || resolvePhotoBucketFirst(rawPhoto);

  // debug utile
  console.log("[click media]", row[COL.id], { rawPhoto, imgMain, rawLogo, imgLogo });

  setText("projectTitle", title);
  setText("projectLocation", location);
  setText("developer", dev);
  setText("status", status);
  setText("handover", handover);
  setText("price", priceNum ? `From ${currencyAED(priceNum)}` : "");
  setText("units", units);
  setText("paymentPlan", pay);
  setText("description", desc);

  const a = document.getElementById("brochureLink");
  if (a){
    if (brochure && brochure !== "#") { a.href = brochure; a.style.display = ""; }
    else { a.style.display = "none"; }
  }

  // --- carrousel (photo + logo si dispo) ---
  const images  = [imgMain, imgLogo].filter(Boolean);
  const mainImg = document.getElementById("mainProjectImage");
  const count   = document.getElementById("photoCount");
  const indWrap = document.getElementById("carousel-indicators");
  let idx = 0;

  function drawIndicators(){
    if (!indWrap) return;
    indWrap.innerHTML = "";
    for (let i=0;i<images.length;i++){
      const dot = document.createElement("div");
      dot.className = "carousel-indicator-dot" + (i===idx ? " active" : "");
      dot.onclick = (e)=>{ e.stopPropagation(); idx = i; update(); };
      indWrap.appendChild(dot);
    }
  }
  function update(){
    if (mainImg){
      mainImg.src = images[idx];
      mainImg.onerror = function(){ this.onerror=null; this.src="styles/photo/dubai-map.jpg"; };
    }
    if (count) count.textContent = String(images.length);
    drawIndicators();
  }
  update();

  // swipe
  let tsX=0, teX=0;
  const wrap = document.getElementById("mainImage");
  if (wrap){
    wrap.addEventListener("touchstart", e=>{ if (e.touches.length===1) tsX = e.touches[0].clientX; });
    wrap.addEventListener("touchmove",  e=>{ if (e.touches.length===1) teX = e.touches[0].clientX; });
    wrap.addEventListener("touchend",   ()=>{ const d=teX-tsX; if (d>50) idx=(idx-1+images.length)%images.length; if (d<-50) idx=(idx+1)%images.length; update(); tsX=teX=0; });
  }

  // lightbox
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  if (mainImg && lb && lbImg){
    mainImg.onclick = ()=>{ lb.style.display="flex"; lbImg.src = images[idx]; };
    document.getElementById("lightboxOverlay").onclick = ()=>{ lb.style.display="none"; };
    document.getElementById("lightbox-prev").onclick   = ()=>{ idx=(idx-1+images.length)%images.length; lbImg.src=images[idx]; update(); };
    document.getElementById("lightbox-next").onclick   = ()=>{ idx=(idx+1)%images.length; lbImg.src=images[idx]; update(); };
  }

  // payment details (si plusieurs lignes)
  const lines = String(pay).split(/[\n•;,;-]+/).map(s=>s.trim()).filter(Boolean);
  const paymentToggle = document.getElementById("paymentToggle");
  const paymentDetail = document.getElementById("paymentDetail");
  if (paymentToggle && paymentDetail){
    paymentToggle.onclick = ()=>{
      const open = paymentDetail.classList.toggle("show");
      paymentDetail.innerHTML = open ? `<h4>Payment Schedule</h4><ul>${lines.map(x=>`<li>${x}</li>`).join("")}</ul>` : "";
    };
  }

  // carte
  const lat = row[COL.lat], lon = row[COL.lon];
  if (lat != null && lon != null){
    const iframe = document.querySelector(".location iframe");
    if (iframe) iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}&z=15&output=embed`;
  }

  // agent (placeholder)
  const agentContact = document.getElementById("agentContact");
  if (agentContact){
    agentContact.innerHTML = `
      <p><i class="fas fa-user"></i> <strong>Agent:</strong> PropInDubai Team</p>
      <p><i class="fab fa-whatsapp"></i> <a href="https://wa.me/971585275834" target="_blank">+971 58 527 5834</a></p>
      <p><i class="fas fa-envelope"></i> <a href="mailto:contact@propindubai.com">contact@propindubai.com</a></p>`;
  }

  // vision / autres projets (table liée)
  setText("developerVision", extras?.["developer vision"] || "");
  const devList = document.getElementById("developerProjects");
  if (devList){
    devList.innerHTML = "";
    String(extras?.["other projects"] || "")
      .split(/[,•;\n]+/)
      .map(s=>s.trim()).filter(Boolean)
      .forEach(p => {
        const li = document.createElement("li");
        li.textContent = p;
        devList.appendChild(li);
      });
  }

  // tableau unités
  fillUnitsTable(row, COL);
}


  /* ============ Boot ============ */
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await waitForSupabase();
      const { row, COL } = await fetchOffplanRow();
      if (!row){ setText("projectTitle", "Project not found"); return; }

      const id = row[COL.id];
      const extras = await fetchClickExtras(id);
      fillMain(row, COL, extras);

      const rec = await fetchRecommended(row[COL.dev] || "", id, COL);
      await renderRecommended(rec, COL);
    } catch (e) {
      console.error(e);
      alert("Unable to load this project right now.");
    }
  });
})();
