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


  // Retourne TOUTES les photos (bucket d'abord, accepte aussi http)
  function resolveAllPhotosFromBucket(val){
    const cand = parseCandidates(val);     // déjà défini plus haut
    const out = [];

    for (const c of cand){
      const raw = String(c || "").trim().replace(/^["']+|["']+$/g, "");
      if (!raw) continue;

      let url = null;

      // Si c'est une clé/URL Supabase -> construit l'URL publique depuis la clé normalisée
      if (!/^https?:\/\//i.test(raw) || /\/storage\/v1\/object\/public\//i.test(raw)){
        url = sbPublicUrl(normKey(raw));   // sbPublicUrl + normKey déjà définis
      } else {
        url = raw; // http(s) externe
      }

      if (url && !out.includes(url)) out.push(url);
    }

    return out;
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
  function pickFirstValue(objs, fields){
    for (const name of fields){
      for (const obj of objs){
        if (!obj) continue;
        if (Object.prototype.hasOwnProperty.call(obj, name) && obj[name] != null && String(obj[name]).trim() !== "") {
          return obj[name];
        }
      }
    }
    return "";
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
      let firstPriceShown = false;
      let firstAvailShown = false;

      if (!unitsStr) {
        // Pas d’info en base → on montre au moins 1 ligne “générique”
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>Units Available</td><td>—</td><td>${priceText}</td><td>Contact us</td>`;
        firstPriceShown = true;
        firstAvailShown = true;
        tbody.appendChild(tr);
        return;
      }

      const tokens = unitsStr.split(/[,;/•\n]+/).map(s=>s.trim()).filter(Boolean);
      const seen = new Set();
      tokens.forEach(t => {
        const k = t.toLowerCase();
        if (seen.has(k)) return; seen.add(k);
        const tr = document.createElement("tr");
        const priceCell = firstPriceShown ? "—" : priceText;
        const availCell = firstAvailShown ? "—" : "Available";
        tr.innerHTML = `<td>${t}</td><td>—</td><td>${priceCell}</td><td>${availCell}</td>`;
        firstPriceShown = true;
        firstAvailShown = true;
        tbody.appendChild(tr);
      });
    }

    /* ============ Rendu principal ============ */
  function fillMain(row, COL, extras){
    // ========= Helpers (bucket -> URL publique) =========
    const STORAGE_BUCKET = window.STORAGE_BUCKET || "photos_biens";


  function drawIndicators(){
    if (!indWrap) return;
    indWrap.innerHTML = "";
    images.forEach((_, i) => {
      const dot = document.createElement("div");
      // IMPORTANT : classe "dot" pour matcher le CSS existant (.carousel-indicators .dot)
      dot.className = "dot" + (i === idx ? " active" : "");
      dot.onclick = (e)=>{ e.stopPropagation(); idx = i; updateImage(); };
      indWrap.appendChild(dot);
    });
  }




    function normKey(s){
      if (!s) return "";
      let k = String(s).trim().replace(/^["']+|["']+$/g, "");
      k = k.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/[^/]+\//i, "");
      k = k.replace(/^\/+/, "");
      k = k.replace(new RegExp(`^(?:${STORAGE_BUCKET}\\/)+`, "i"), "");
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
      if (s[0]==="{" && s[s.length-1]==="}") return s.slice(1,-1).split(",").map(x=>x.trim());
      if (s[0]==="[" && s[s.length-1]==="]") {
        try { return JSON.parse(s); } catch { return [s]; }
      }
      return s.split(/[\n,;|]+/).map(x=>x.trim());
    }
    function resolveAllPhotosFromBucket(raw){
      const out = [];
      const seen = new Set();
      for (const c of parseCandidates(raw)){
        if (c == null) continue;
        let t = String(c).trim().replace(/^["']+|["']+$/g, "");
        if (!t) continue;
        if (/^https?:\/\//i.test(t) && !/\/storage\/v1\/object\/public\//i.test(t)) {
          if (!seen.has(t)) { out.push(t); seen.add(t); }
          continue;
        }
        const key = normKey(t);
        const url = key ? sbPublicUrl(key) : null;
        if (url && !seen.has(url)) { out.push(url); seen.add(url); }
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

    // ========= Champs de base =========
    const title    = row[COL.title]     || "Untitled";
    const location = row[COL.location]  || "";
    const dev      = row[COL.dev]       || "";
    const status   = row[COL.status]    || "";
    const handover = row[COL.handover]  || "";
    const priceNum = (()=>{
      const v = row[COL.price];
      const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.]/g,""));
      return Number.isFinite(n) ? n : null;
    })();
    const units    = row[COL.units]     || "";
    const pay      = row[COL.payment]   || "";
    const desc     = row[COL.desc]      || extras?.description || "";
    const devVision= (COL.devVision && row[COL.devVision])
      || pickFirstValue([row, extras], [
          "developer vision","developer_vision","vision","vision developer",
          "developer statement","developer_message","developer story","developervision"
        ]);

    // Brochure
    let brochure = row[COL.brochure] || "";
    if (brochure && !/^https?:\/\//i.test(brochure)) {
      const k = normKey(brochure);
      const u = sbPublicUrl(k);
      brochure = u || "";
    }

    // ========= Médias =========
    const photosMain = resolveAllPhotosFromBucket(row[COL.imageUrl]);
    const extraFields = ["photos","images","gallery","galerie","image_urls","photos_urls"];
    const photosExtra = [];
    extraFields.forEach(f => { if (extras?.[f]) photosExtra.push(...resolveAllPhotosFromBucket(extras[f])); });
    const logo = resolveLogoAny(row[COL.logoUrl]);

    const all = [...photosMain, ...photosExtra];
    const seenAll = new Set();
    let images = all.filter(u => !!u && !seenAll.has(u) && seenAll.add(u));
    if (!images.length && logo) images = [logo];
    if (!images.length) images = ["styles/photo/dubai-map.jpg"];
    else if (logo && !seenAll.has(logo)) images.push(logo);

    // ========= Injection textes =========
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || ""; };
    const currencyAED = (n) => {
      if (n == null) return "";
      try { return new Intl.NumberFormat("en-AE",{ style:"currency", currency:"AED", maximumFractionDigits:0 }).format(n); }
      catch { return `AED ${Number(n).toLocaleString()}`; }
    };

    setText("projectTitle", title);
    setText("projectLocation", location);
    setText("developer", dev);
    setText("status", status);
    setText("handover", handover);
    setText("price", priceNum ? `From ${currencyAED(priceNum)}` : "");
    setText("units", units);
    setText("paymentPlan", pay);
    setText("description", desc);
    const descEl = document.getElementById("description");
    const descWrapper = document.getElementById("descriptionWrapper");
    const descToggle = document.getElementById("descToggle");
    if (descEl && descWrapper && descToggle) {
      const clampPx = 140;
      const refreshClamp = () => {
        const needsClamp = descEl.scrollHeight > clampPx;
        if (!needsClamp) descWrapper.classList.remove("collapsed");
        descToggle.style.display = needsClamp ? "" : "none";
        const isCollapsed = descWrapper.classList.contains("collapsed");
        descWrapper.style.maxHeight = needsClamp && isCollapsed ? clampPx + "px" : "none";
        descToggle.textContent = isCollapsed ? "View more" : "View less";
      };
      descWrapper.classList.add("collapsed");
      descToggle.onclick = () => {
        descWrapper.classList.toggle("collapsed");
        refreshClamp();
      };
      requestAnimationFrame(refreshClamp);
      window.addEventListener("resize", refreshClamp, { passive: true });
    }

    const brochureLink = document.getElementById("brochureLink");
    if (brochureLink){
      if (brochure) { brochureLink.href = brochure; brochureLink.style.display = ""; }
      else { brochureLink.style.display = "none"; }
    }

    // ========= Carrousel / Image principale =========
    const mainImg  = document.getElementById("mainProjectImage");
    const count    = document.getElementById("photoCount");
    const indWrap  = document.getElementById("carousel-indicators");
    const mainWrap = document.getElementById("mainImage");
    const prevBtn  = document.getElementById("prevImage");
    const nextBtn  = document.getElementById("nextImage");
    let idx = 0;

    function drawIndicators(){
      if (!indWrap) return;
      indWrap.innerHTML = "";
      images.forEach((_, i) => {
        const dot = document.createElement("div");
        dot.className = "carousel-indicator-dot" + (i===idx ? " active" : "");
        dot.onclick = (e)=>{ e.stopPropagation(); idx = i; updateImage(); };
        indWrap.appendChild(dot);
      });
    }
    function updateImage(){
      if (mainImg){
        mainImg.src = images[idx];
        mainImg.onerror = function(){ this.onerror=null; this.src="styles/photo/dubai-map.jpg"; };
      }
      if (count) count.textContent = String(images.length);
      drawIndicators();
    }
    function showPrev(){
      idx = (idx - 1 + images.length) % images.length;
      updateImage();
    }
    function showNext(){
      idx = (idx + 1) % images.length;
      updateImage();
    }
    updateImage();

    if (prevBtn) prevBtn.addEventListener("click", (e)=>{ e.stopPropagation(); showPrev(); });
    if (nextBtn) nextBtn.addEventListener("click", (e)=>{ e.stopPropagation(); showNext(); });

    // Swipe (mobile)
    if (mainWrap){
      let tsX=0, teX=0;
      mainWrap.addEventListener("touchstart", e=>{ if (e.touches.length===1) tsX = e.touches[0].clientX; }, { passive:true });
      mainWrap.addEventListener("touchmove",  e=>{ if (e.touches.length===1) teX = e.touches[0].clientX; }, { passive:true });
      mainWrap.addEventListener("touchend",   ()=>{
        const d = teX - tsX;
        if (d > 50)  showPrev();
        if (d < -50) showNext();
        tsX=teX=0;
      }, { passive:true });
    }

    // ========= Lightbox =========
    const lb        = document.getElementById("lightbox");
    const lbImg     = document.getElementById("lightbox-img");
    const lbPrev    = document.getElementById("lightbox-prev");
    const lbNext    = document.getElementById("lightbox-next");
    const lbOverlay = document.getElementById("lightboxOverlay");
    const lbContent = document.getElementById("lightboxContent")
                    || (lbImg ? lbImg.closest(".lightbox-content, .lightbox-inner, .content") : null)
                    || (lbImg ? lbImg.parentElement : null);

    function openLightbox(){
      if (!lb || !lbImg) return;
      lb.style.display = "flex";
      lbImg.src = images[idx];
    }
    function closeLightbox(){
      if (lb) lb.style.display = "none";
    }

    if (mainImg && lb && lbImg){
      mainImg.onclick = openLightbox;
      lbPrev?.addEventListener("click", (e)=>{ e.stopPropagation(); showPrev(); if (lbImg) lbImg.src = images[idx]; });
      lbNext?.addEventListener("click", (e)=>{ e.stopPropagation(); showNext(); if (lbImg) lbImg.src = images[idx]; });
      [lbImg, lbPrev, lbNext, lbContent].forEach(el => { el && el.addEventListener("click", (e)=> e.stopPropagation()); });
      lbOverlay && lbOverlay.addEventListener("click", closeLightbox);
      lb.addEventListener("click", (e) => { if (lbContent && !lbContent.contains(e.target)) closeLightbox(); else if (e.target === lb) closeLightbox(); });
      document.addEventListener("keydown", (e)=>{ if (e.key==="Escape" && lb.style.display!=="none") closeLightbox(); }, { passive:true });
      let lsX=0, leX=0;
      lb.addEventListener("touchstart", e=>{ if (e.touches.length===1) lsX = e.touches[0].clientX; }, { passive:true });
      lb.addEventListener("touchmove",  e=>{ if (e.touches.length===1) leX = e.touches[0].clientX; }, { passive:true });
      lb.addEventListener("touchend",   ()=>{ const d = leX - lsX; if (d > 50) showPrev(); if (d < -50) showNext(); lsX=leX=0; }, { passive:true });
    }

    // ========= Payment details =========
    const lines = String(pay).split(/[\n•;,;-]+/).map(s=>s.trim()).filter(Boolean);
    const paymentToggle = document.getElementById("paymentToggle");
    const paymentDetail = document.getElementById("paymentDetail");
    if (paymentToggle && paymentDetail){
      paymentToggle.onclick = ()=>{
        const open = paymentDetail.classList.toggle("show");
        paymentDetail.innerHTML = open ? `<h4>Payment Schedule</h4><ul>${lines.map(x=>`<li>${x}</li>`).join("")}</ul>` : "";
      };
    }

    // ========= Carte =========
    const lat = row[COL.lat], lon = row[COL.lon];
    if (lat != null && lon != null){
      const iframe = document.querySelector(".location iframe");
      if (iframe) iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}&z=15&output=embed`;
    }

    // ========= Agent =========
    const agentContact = document.getElementById("agentContact");
    if (agentContact){
      agentContact.innerHTML = `
        <p><i class="fas fa-user"></i> <strong>Agent:</strong> PropInDubai Team</p>
        <p><i class="fab fa-whatsapp"></i> <a href="https://wa.me/971585275834" target="_blank">+971 58 527 5834</a></p>
        <p><i class="fas fa-envelope"></i> <a href="mailto:contact@propindubai.com">contact@propindubai.com</a></p>`;
    }

    // ========= Vision =========
    const setVision = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || ""; };
    setVision("developerVision", devVision);
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

    // ========= Tableau unités =========
    fillUnitsTable(row, COL);

    // debug
    console.log("[click media]", row[COL.id], { photosMain, photosExtra, logo, imagesCount: images.length, images });
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

  // ========== Burger mobile : ouverture/fermeture ==========
  (function () {
    const burger = document.getElementById('burgerMenu');
    const panel  = document.querySelector('.all-button');
    if (!burger || !panel) return;

    // accessibilité
    burger.setAttribute('role', 'button');
    burger.setAttribute('tabindex', '0');
    burger.setAttribute('aria-controls', 'main-nav-panel');
    panel.id = panel.id || 'main-nav-panel';

    const mq = window.matchMedia('(max-width: 900px)');

    function openMenu() {
      panel.classList.add('menu-open');
      document.body.style.overflow = 'hidden';      // bloque le scroll derrière
      burger.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
      panel.classList.remove('menu-open');
      document.body.style.overflow = '';
      burger.setAttribute('aria-expanded', 'false');
    }
    function toggleMenu() {
      if (!mq.matches) return;                      // ne fait rien en desktop
      panel.classList.contains('menu-open') ? closeMenu() : openMenu();
    }

    // clic sur le burger
    burger.addEventListener('click', toggleMenu);
    burger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); }
    });

    // clic hors menu → ferme
    document.addEventListener('click', (e) => {
      if (!panel.classList.contains('menu-open')) return;
      const clickInsideMenu   = panel.contains(e.target);
      const clickOnBurger     = burger.contains(e.target);
      if (!clickInsideMenu && !clickOnBurger) closeMenu();
    });

    // Échap → ferme
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('menu-open')) closeMenu();
    });

    // on repasse en desktop → on nettoie l’état
    window.addEventListener('resize', () => {
      if (!mq.matches) closeMenu();
    });
  })();

  
