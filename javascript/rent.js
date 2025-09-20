// ========= Helpers Bucket (communs) =========
const STORAGE_BUCKET = window.STORAGE_BUCKET || "photos_biens";

function normKey(s){
  if (!s) return "";
  let k = String(s).trim().replace(/^["']+|["']+$/g, "");
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
  if (s[0]==="[" && s[s.length-1]==="]") { try { return JSON.parse(s); } catch { return [s]; } }
  return s.split(/[\n,;|]+/); // CSV / multi-lignes
}

function resolveAllPhotosFromBucket(raw){
  const out = [];
  for (const c of parseCandidates(raw)){
    if (c == null) continue;
    const t = String(c).trim().replace(/^["']+|["']+$/g, "");
    if (!t) continue;
    // URL http externe -> garder tel quel
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

/* Petit helper pratique : si le bien a des photos on les prend,
   sinon on retombe sur le logo d’agence, sinon un fallback. */
function pickImagesForListing(rawPropertyPhotos, rawLogo){
  const photos = resolveAllPhotosFromBucket(rawPropertyPhotos);
  const logo   = resolveLogoAny(rawLogo);
  if (photos.length) return photos;
  if (logo) return [logo];
  return ['styles/photo/dubai-map.jpg'];
}



// --- Appliquer les filtres de l'URL à l'UI ---
function applyURLFiltersToUI() {
  const p = new URLSearchParams(location.search);
  const q        = p.get('q') || '';
  const type     = p.get('type') || '';
  const bedrooms = p.get('bedrooms') || '';
  const bathrooms= p.get('bathrooms') || '';

  // champ recherche (adapte l'ID si besoin)
  const searchInput = document.getElementById('search')
                   || document.querySelector('.searchbar input, input[type="search"], .search-input');
  if (searchInput && q) searchInput.value = q;

  if (type && document.getElementById('propertyType')) {
    document.getElementById('propertyType').value = type;
  }
  if (bedrooms && document.getElementById('bedrooms')) {
    document.getElementById('bedrooms').value =
      (bedrooms === 'studio') ? '0' : (bedrooms === '7plus' ? '7' : bedrooms);
  }
  if (bathrooms && document.getElementById('bathrooms')) {
    document.getElementById('bathrooms').value =
      (bathrooms === '7plus' ? '7' : bathrooms);
  }
}

// ====== Supabase query avec filtres ======
/*
  sb = ton client Supabase (import de supabaseClient.js)
  table = 'buy' | 'rent' | 'commercial' | 'offplan'
  Adapte les colonnes si nécessaire :
    - property_type (ou 'type' chez toi)
    - bedrooms (0 pour studio)
    - bathrooms
    - colonnes de recherche plein-texte: title/localisation/building/project...
*/
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









// === REAL ESTATE - JS RENT (Appartements/Villas à louer) ===
// Datas 100% depuis Supabase (rent/agent/agency) + histogramme prix.

function fmt(n){ const x=Number(n); return isFinite(x)?x.toLocaleString('en-US'):"0"; }

let properties=[], filteredProperties=[];
let globalMinPrice=0, globalMaxPrice=0;
const PRICE_STEP=10000;
let priceSlider=null;



// Utils
const telLink = v => `tel:${String(v||"").replace(/\s+/g,"")}`;
const waLink  = v => `https://wa.me/${String(v||"").replace(/[^\d+]/g,"")}`;

/* =========================
   LOAD FROM DB (table: rent)
   ========================= */
// ===========================
// LOAD FROM DB (RENT + BUCKET)
// ===========================
async function loadRentFromDB(){
  const sb = window.supabase;
  if (!sb) { console.error("Supabase client introuvable (window.supabase)"); return []; }

  // -- Agents
  const { data: agentRows, error: agentErr } = await sb
    .from('agent')
    .select('id,name,photo_agent_url,phone,email,whatsapp,agency_id,rating');
  if (agentErr) console.error(agentErr);

  // -- Agencies
  const { data: agencyRows, error: agencyErr } = await sb
    .from('agency')
    .select('id,logo_url,address');
  if (agencyErr) console.error(agencyErr);

  // Résolution via bucket
  const agentsById = Object.fromEntries(
    (agentRows || []).map(a => [a.id, {
      ...a,
      photo_agent_url_resolved: resolveOneFromBucket(a.photo_agent_url) || a.photo_agent_url || ""
    }])
  );
  const agenciesById = Object.fromEntries(
    (agencyRows || []).map(a => [a.id, {
      ...a,
      logo_url_resolved: resolveLogoAny(a.logo_url) || ""
    }])
  );
  const getAgencyForAgent = (agentId) => {
    const ag = agentsById[agentId];
    return ag ? agenciesById[ag.agency_id] : undefined;
  };

  // -- Biens à louer (sélection robuste de la localisation personnalisée)
  let rows = [];
  let req = await sb.from('rent')
    .select('id,created_at,title,property_type,bedrooms,bathrooms,price,sqft,photo_url,agent_id,"localisation accueil"');

  if (req.error) {
    // essai avec l’orthographe "acceuil"
    req = await sb.from('rent')
      .select('id,created_at,title,property_type,bedrooms,bathrooms,price,sqft,photo_url,agent_id,"localisation acceuil"');

    if (req.error) {
      console.warn('Localisation personnalisée introuvable, lecture sans cette colonne :', req.error);
      const fallback = await sb.from('rent')
        .select('id,created_at,title,property_type,bedrooms,bathrooms,price,sqft,photo_url,agent_id');
      if (fallback.error) { console.error(fallback.error); return []; }
      rows = fallback.data || [];
    } else {
      rows = req.data || [];
    }
  } else {
    rows = req.data || [];
  }

  // -- Mapping vers format UI
  return rows.map(r => {
    const ag     = agentsById[r.agent_id] || {};
    const agency = getAgencyForAgent(r.agent_id) || {};
    const ptype  = r.property_type || 'Unknown';

    // Photos du bien depuis le bucket (CSV / JSON / text[] / URL publique supabase acceptés)
    const propertyPhotos = resolveAllPhotosFromBucket(r.photo_url);
    const logo           = agency?.logo_url_resolved || "";

    // 👉 si on a des photos du bien, on les garde seules; sinon on tombe sur le logo; sinon fallback
    const images = propertyPhotos.length
      ? propertyPhotos
      : (logo ? [logo] : ['styles/photo/dubai-map.jpg']);

    // Avatar agent via bucket (ou http), sinon vide
    const avatar = ag.photo_agent_url_resolved || resolveOneFromBucket(ag.photo_agent_url) || "";

    // Localisation perso prioritaire (deux orthographes supportées)
    const localisationAccueil = r['localisation accueil'] || r['localisation acceuil'] || '';

    return {
      title: ptype,                 // (type: Apartment / Villa…)
      listingTitle: r.title || "",  // titre d’annonce
      price: Number(r.price) || 0,
      location: localisationAccueil || agency?.address || "",
      bedrooms: Number(r.bedrooms) || 0,
      bathrooms: Number(r.bathrooms) || 0,
      size: Number(r.sqft) || 0,
      images,                       // ← tableau prêt pour le carrousel (1..n)
      agent: {
        name: ag.name || "",
        avatar,
        phone: ag.phone || "",
        email: ag.email || "",
        whatsapp: ag.whatsapp || "",
        rating: ag.rating ?? null
      },
      _id: r.id,
      _table: 'rent',
      _created_at: r.created_at
    };
  });
}



/* ================
   Pagination & UI
   ================ */
const cardsPerPage=18;
function paginate(arr, page){
  const total=arr.length, pages=Math.ceil(total/cardsPerPage)||1;
  const start=(page-1)*cardsPerPage, end=start+cardsPerPage;
  return { page, total, pages, slice: arr.slice(start,end) };
}
function updatePagination(pages, page, arr){
  const paginationDiv=document.getElementById('pagination'); if(!paginationDiv) return;
  paginationDiv.innerHTML=''; if(pages<=1) return;
  const mk=(html,disabled,on)=>{ const b=document.createElement('button'); b.className='page-btn'; b.innerHTML=html; b.disabled=disabled; b.addEventListener('click',on); return b; };
  paginationDiv.appendChild(mk('&laquo;', page===1, ()=>displayProperties(arr,page-1)));
  for(let i=1;i<=pages;i++){ const b=mk(String(i), false, ()=>displayProperties(arr,i)); if(i===page) b.classList.add('active'); paginationDiv.appendChild(b); }
  paginationDiv.appendChild(mk('&raquo;', page===pages, ()=>displayProperties(arr,page+1)));
}

function displayPropertyTypesSummary(arr, filterType){
  const propertyTypesDiv=document.getElementById('propertyTypesSummary');
  const propertyTypeSelect=document.getElementById('propertyType');
  if(!propertyTypesDiv) return;
  const counts={}; arr.forEach(p=>{ counts[p.title]=(counts[p.title]||0)+1; });
  const order=["Apartment","Villa","Townhouse","Compound","Duplex","Penthouse","Land","Whole Building"];
  const sorted=Object.keys(counts).sort((a,b)=>(order.indexOf(a)===-1?999:order.indexOf(a))-(order.indexOf(b)===-1?999:order.indexOf(b)));
  propertyTypesDiv.innerHTML = `<div class="pts-row">${
    sorted.map(t=>`<span class="pts-type${filterType===t?" selected":""}" data-type="${t}" style="cursor:pointer">${t} <span class="pts-count">(${fmt(counts[t])})</span></span>`).join('')
  }</div>`;
  propertyTypesDiv.querySelectorAll('.pts-type').forEach(el=>{
    el.addEventListener('click',()=>{
      if(propertyTypeSelect) propertyTypeSelect.value = el.getAttribute('data-type');
      handleSearchOrFilter();
      propertyTypesDiv.querySelectorAll('.pts-type').forEach(s=>s.classList.remove('selected'));
      el.classList.add('selected');
      document.getElementById('propertyCount')?.scrollIntoView({behavior:'smooth'});
    });
  });
}

function displayProperties(arr, page = 1) {
  // --- pagination & containers ---
  const { slice, pages } = paginate(arr, page);
  const container = document.getElementById('propertyResults');
  const propertyCountDiv = document.getElementById('propertyCount');
  const propertyTypeSelect = document.getElementById('propertyType');

  if (propertyCountDiv) propertyCountDiv.textContent = `${fmt(arr.length)} properties found`;
  if (container) container.innerHTML = '';

  // --- cartes ---
  slice.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'property-card';

    const imgsHTML = (p.images || [])
      .map((src, i) => `<img src="${src}" class="${i === 0 ? 'active' : ''}" alt="Property Photo">`)
      .join('');

    card.innerHTML = `
      <div class="carousel">
        ${imgsHTML}
        <button class="carousel-btn prev" type="button" aria-label="Previous image">❮</button>
        <button class="carousel-btn next" type="button" aria-label="Next image">❯</button>
        <div class="image-count"><i class="fas fa-camera"></i> ${fmt((p.images || []).length)}</div>
      </div>

      <div class="property-info">
        <h3>${p.listingTitle || p.title || ''}</h3>
        <p><i class="fas fa-map-marker-alt"></i> ${p.location || ''}</p>
        <p>
          <i class="fas fa-bed"></i> ${fmt(p.bedrooms)}
          <i class="fas fa-bath"></i> ${fmt(p.bathrooms)}
          <i class="fas fa-ruler-combined"></i> ${fmt(p.size)} sqft
        </p>
        <strong>${fmt(p.price)} AED</strong>

        <div class="agent-info">
          ${
            p.agent?.avatar
              ? `<img src="${p.agent.avatar}" alt="Agent">`
              : `<div class="agent-avatar-fallback"></div>`
          }
          <span>${p.agent?.name || ''}</span>
        </div>

        <div class="property-actions">
          <button class="btn-call"${!p.agent?.phone ? ' disabled' : ''}>Call</button>
          <button class="btn-email"${!p.agent?.email ? ' disabled' : ''}>Email</button>
          <button class="btn-wa"${!p.agent?.whatsapp ? ' disabled' : ''}>WhatsApp</button>
        </div>
      </div>
    `;

    container.appendChild(card);

    // --- navigation vers page détail au clic sur la carte ---
    card.addEventListener('click', () => {
      const detail = { id: p._id, type: 'rent' };
      sessionStorage.setItem('selected_property', JSON.stringify(detail));
      window.location.href = `bien.html?id=${encodeURIComponent(detail.id)}&type=${encodeURIComponent(detail.type)}`;
    });

    // --- carrousel (flèches desktop + dots/swap mobile) ---
    const carouselEl = card.querySelector('.carousel');
    const images = carouselEl.querySelectorAll('img');
    let idx = 0;

    // flèches (cachées par CSS en mobile)
    const prevBtn = carouselEl.querySelector('.prev');
    const nextBtn = carouselEl.querySelector('.next');

    function show(n) {
      if (!images.length) return;
      images[idx].classList.remove('active');
      idx = (n + images.length) % images.length;
      images[idx].classList.add('active');
      updateDots();
    }

    prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      show(idx - 1);
    });
    nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      show(idx + 1);
    });

    // ---- dots (affichés seulement si >1 image) + clic dot
    function renderDots() {
      carouselEl.querySelector('.carousel-dots')?.remove();
      if (images.length <= 1) return;

      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'carousel-dots';
      for (let i = 0; i < images.length; i++) {
        const dot = document.createElement('span');
        dot.className = 'carousel-dot' + (i === idx ? ' active' : '');
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          show(i);
        });
        dotsWrap.appendChild(dot);
      }
      carouselEl.appendChild(dotsWrap);
    }
    function updateDots() {
      const dots = carouselEl.querySelectorAll('.carousel-dot');
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }
    renderDots();

    // ---- swipe mobile
    let touchStartX = 0;
    carouselEl.addEventListener(
      'touchstart',
      (e) => {
        touchStartX = e.changedTouches[0].clientX;
      },
      { passive: true }
    );
    carouselEl.addEventListener(
      'touchend',
      (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) < 30) return; // seuil
        if (dx < 0) show(idx + 1);
        else show(idx - 1);
      },
      { passive: true }
    );

    // --- actions agent (sans déclencher le clic carte) ---
    const telLink = (v) => `tel:${String(v || '').replace(/\s+/g, '')}`;
    const waLink = (v) => `https://wa.me/${String(v || '').replace(/[^\d+]/g, '')}`;

    card.querySelector('.btn-call')?.addEventListener('click', (e) => {
      if (!p.agent?.phone) return;
      e.stopPropagation();
      window.location.href = telLink(p.agent.phone);
    });
    card.querySelector('.btn-email')?.addEventListener('click', (e) => {
      if (!p.agent?.email) return;
      e.stopPropagation();
      window.location.href = `mailto:${p.agent.email}`;
    });
    card.querySelector('.btn-wa')?.addEventListener('click', (e) => {
      if (!p.agent?.whatsapp) return;
      e.stopPropagation();
      window.open(waLink(p.agent.whatsapp), '_blank');
    });
  });

  // --- résumé types + pagination + mini-map ---
  displayPropertyTypesSummary(arr, propertyTypeSelect?.value);
  updatePagination(pages, page, arr);
  if (typeof updateMiniMap === 'function') {
    try { updateMiniMap(slice); } catch (e) { /* ignore */ }
  }
}


/* =========================
   SLIDER + HISTOGRAMME
   ========================= */
function roundRect(ctx, x, y, w, h, r){
  if(w<2*r) r=w/2; if(h<2*r) r=h/2;
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}
function drawPriceHistogram(propsArray, min, max, [sliderMin, sliderMax]=[min,max]){
  const canvas = document.getElementById('priceHistogram');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  ctx.clearRect(0,0,width,height);

  const prices = propsArray.map(p=>p.price).filter(v=>isFinite(v));
  if(!prices.length) return;

  const bins = 18, hist = Array(bins).fill(0);
  prices.forEach(price=>{
    let idx = Math.floor((price - min) / (max - min || 1) * (bins - 1));
    idx = Math.max(0, Math.min(bins-1, idx));
    hist[idx]++;
  });
  const maxHist = Math.max(...hist, 2);

  for(let i=0;i<bins;i++){
    const x = Math.floor(i*width/bins) + 3;
    const barW = Math.floor(width/bins) - 7;
    const y = Math.floor(height - (hist[i]/maxHist) * (height-10));
    const barH = height - y;
    const binStart = min + (i/bins)*(max-min);
    const binEnd   = min + ((i+1)/bins)*(max-min);
    const inRange = binEnd >= sliderMin && binStart <= sliderMax;

    ctx.beginPath();
    ctx.fillStyle = inRange ? "#f17100" : "#ffd2a5";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, barW, barH, 5);
    ctx.fill(); ctx.stroke();
  }

  ctx.save();
  ctx.globalAlpha = 0.78;
  prices.forEach(price=>{
    let px = Math.floor((price - min) / (max - min || 1) * width);
    px = Math.max(4, Math.min(width-4, px));
    ctx.beginPath();
    ctx.arc(px, height-8, 2.2, 0, Math.PI*2);
    ctx.fillStyle = "#ff8300";
    ctx.fill();
  });
  ctx.restore();
}


function updatePriceSliderAndHistogram(){
  const sliderElem=document.getElementById('priceSlider'); if(!sliderElem) return;
  if(priceSlider){ priceSlider.destroy(); priceSlider=null; sliderElem.innerHTML=""; }

  const prices = properties.map(p=>p.price).filter(v=>isFinite(v));
  const minDB = prices.length ? Math.min(...prices) : 0;
  const maxDB = prices.length ? Math.max(...prices) : 0;
  globalMinPrice = minDB; globalMaxPrice = maxDB;

  const pm=document.getElementById('priceMin'), px=document.getElementById('priceMax');
  const curMin = Number(pm?.value)||globalMinPrice;
  const curMax = Number(px?.value)||globalMaxPrice;

  priceSlider = noUiSlider.create(sliderElem,{
    start:[curMin,curMax], connect:true, step:PRICE_STEP,
    range:{min:globalMinPrice, max:globalMaxPrice},
    tooltips:[true,true],
    format:{ to:v=>fmt(Math.round(v)), from:v=>Number(String(v).replace(/[^\d]/g,'')) }
  });

  const minLbl=document.getElementById("sliderMinLabel");
  const maxLbl=document.getElementById("sliderMaxLabel");
  const selLbl=document.getElementById("selectedPriceRange");
  if(minLbl) minLbl.textContent = fmt(globalMinPrice)+" AED";
  if(maxLbl) maxLbl.textContent = fmt(globalMaxPrice)+" AED";
  if(selLbl) selLbl.textContent = fmt(curMin)+" - "+fmt(curMax)+" AED";

  const minInput=document.getElementById("priceMinInput");
  const maxInput=document.getElementById("priceMaxInput");
  if(minInput) minInput.value = fmt(curMin);
  if(maxInput) maxInput.value = fmt(curMax);

  drawPriceHistogram(properties, globalMinPrice, globalMaxPrice, [curMin, curMax]);

  priceSlider.on('update', (vals)=>{
    const v1=Number(String(vals[0]).replace(/[^\d]/g,''))||globalMinPrice;
    const v2=Number(String(vals[1]).replace(/[^\d]/g,''))||globalMaxPrice;
    if(minInput) minInput.value = fmt(v1);
    if(maxInput) maxInput.value = fmt(v2);
    if(selLbl) selLbl.textContent = fmt(v1)+" - "+fmt(v2)+" AED";
    drawPriceHistogram(properties, globalMinPrice, globalMaxPrice, [v1, v2]);
  });
  priceSlider.on('change', (vals)=>{
    const v1=Number(String(vals[0]).replace(/[^\d]/g,''))||globalMinPrice;
    const v2=Number(String(vals[1]).replace(/[^\d]/g,''))||globalMaxPrice;
    if(pm) pm.value = v1;
    if(px) px.value = v2;
    handleSearchOrFilter();
  });

  // saisie manuelle
  minInput?.addEventListener('change', ()=>{
    const v1=Number(String(minInput.value).replace(/[^\d]/g,''))||globalMinPrice;
    priceSlider.set([Math.max(globalMinPrice, Math.min(v1, (Number(px?.value)||globalMaxPrice))), null]);
  });
  maxInput?.addEventListener('change', ()=>{
    const v2=Number(String(maxInput.value).replace(/[^\d]/g,''))||globalMaxPrice;
    priceSlider.set([null, Math.min(globalMaxPrice, Math.max(v2, (Number(pm?.value)||globalMinPrice)))]);
  });
}

/* ==============
   Filtering
   ============== */
function handleSearchOrFilter(page=1){
  let arr = properties.slice();

  const search = (document.getElementById("search")?.value || "").trim().toLowerCase();
  const propertyType = (document.getElementById("propertyType")?.value || "Property Type").trim().toLowerCase();
  const bedrooms = document.getElementById("bedrooms")?.value || "Bedrooms";
  const bathrooms = document.getElementById("bathrooms")?.value || "Bathrooms";
  const priceMin = Number(document.getElementById('priceMin')?.value) || globalMinPrice;
  const priceMax = Number(document.getElementById('priceMax')?.value) || globalMaxPrice;

  if(search){
    arr = arr.filter(p => (p.title||"").toLowerCase().includes(search)
                       || (p.location||"").toLowerCase().includes(search)
                       || (p.listingTitle||"").toLowerCase().includes(search));
  }
  if(propertyType !== "property type"){
    arr = arr.filter(p => (p.title||"").toLowerCase() === propertyType);
  }
  if(bedrooms !== "Bedrooms"){ const min=parseInt(bedrooms); if(!isNaN(min)) arr = arr.filter(p=>p.bedrooms>=min); }
  if(bathrooms !== "Bathrooms"){ const min=parseInt(bathrooms); if(!isNaN(min)) arr = arr.filter(p=>p.bathrooms>=min); }
  arr = arr.filter(p => p.price >= priceMin && p.price <= priceMax);

  filteredProperties = arr;
  displayProperties(filteredProperties, page);
  drawPriceHistogram(properties, globalMinPrice, globalMaxPrice, [priceMin, priceMax]);
}

function handleClearFilters(){
  document.querySelectorAll(".filter-bar input, .filter-bar select").forEach(el=>{
    if(el.tagName==="SELECT") el.selectedIndex=0; else el.value="";
  });
  const pm=document.getElementById('priceMin'), px=document.getElementById('priceMax');
  if(pm) pm.value = globalMinPrice;
  if(px) px.value = globalMaxPrice;
  handleSearchOrFilter(1);
}

/* ===========
   Popups etc.
   =========== */
function bindOpenableFilters(){
  const moreBtn=document.getElementById("openMoreFilter");
  const morePopup=document.getElementById("moreFilterPopup");
  if(moreBtn && morePopup){
    moreBtn.addEventListener("click", ()=>{ morePopup.classList.add('active'); document.body.classList.add('more-filters-open'); });
    document.getElementById("closeMoreFilter")?.addEventListener("click", ()=>{ morePopup.classList.remove('active'); document.body.classList.remove('more-filters-open'); });
    document.getElementById("applyMoreFiltersBtn")?.addEventListener("click", ()=>{ morePopup.classList.remove('active'); document.body.classList.remove('more-filters-open'); handleSearchOrFilter(); });
  }
  const priceBtn=document.getElementById("openPriceFilter");
  const pricePopup=document.getElementById("priceFilterPopup");
  if(priceBtn && pricePopup){
    priceBtn.addEventListener("click", ()=>{ pricePopup.classList.add('active'); document.body.classList.add('price-popup-open'); setTimeout(()=>document.getElementById("priceMinInput")?.focus(),120); });
    document.getElementById("closePricePopup")?.addEventListener("click", ()=>{ pricePopup.classList.remove('active'); document.body.classList.remove('price-popup-open'); });
    pricePopup.addEventListener("mousedown", (e)=>{ if(e.target===pricePopup){ pricePopup.classList.remove('active'); document.body.classList.remove('price-popup-open'); } });
    document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && pricePopup.classList.contains("active")){ pricePopup.classList.remove('active'); document.body.classList.remove('price-popup-open'); }});
    document.getElementById("validatePriceBtn")?.addEventListener("click", ()=>{
      const minInp=document.getElementById("priceMinInput"), maxInp=document.getElementById("priceMaxInput");
      const mi=Number(String(minInp?.value||"").replace(/[^\d]/g,''))||globalMinPrice;
      const ma=Number(String(maxInp?.value||"").replace(/[^\d]/g,''))||globalMaxPrice;
      document.getElementById('priceMin').value=mi;
      document.getElementById('priceMax').value=ma;
      pricePopup.classList.remove('active'); document.body.classList.remove('price-popup-open');
      handleSearchOrFilter();
    });
  }
}

/* ========
   Burger + Dropdown
   ======== */
function bindBurger(){
  const burger=document.getElementById('burgerMenu');
  const nav=document.querySelector('.all-button');
  burger?.addEventListener('click', ()=>{
    nav.classList.toggle('mobile-open');
    if(nav.classList.contains('mobile-open')){
      document.body.style.overflow='hidden';
      setTimeout(()=>document.addEventListener('click', closeOnce, {once:true}),0);
    } else document.body.style.overflow='';
    function closeOnce(e){ if(!nav.contains(e.target) && !burger.contains(e.target)){ nav.classList.remove('mobile-open'); document.body.style.overflow=''; } }
  });
}
// Même correctif que commercial pour le bouton du menu
function bindHeaderDropdown() {
  const dd = document.getElementById('buyDropdown');
  const btn = document.getElementById('mainBuyBtn');
  if (!dd || !btn) return;
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); dd.classList.toggle('open'); });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dd.classList.toggle('open'); }
    if (e.key === 'Escape') dd.classList.remove('open');
  });
  document.addEventListener('click', (e) => { if (!dd.contains(e.target)) dd.classList.remove('open'); });
}


// ------ AUTOCOMPLETE SUGGESTIONS (RENT) ------
function setupRentAutocomplete() {
  const searchInput = document.getElementById('search');
  const suggestionsDiv = document.getElementById('searchSuggestions');
  if (!searchInput || !suggestionsDiv) return;

  function getSuggestions(query) {
    if (!query) return [];
    const q = query.trim().toLowerCase();

    const seen = new Set();
    const matches = [];

    (properties || []).forEach(p => {
      // Titre d'annonce (listingTitle) ou titre "type" (title = Apartment/Villa...)
      const listing = (p.listingTitle || "").trim();
      const type    = (p.title || "").trim();
      const loc     = (p.location || "").trim();
      const agent   = (p.agent?.name || "").trim();

      if (listing && listing.toLowerCase().includes(q) && !seen.has(listing)) {
        seen.add(listing);
        matches.push({ label: listing, icon: "fa-building", type: "listing" });
      }
      if (type && type.toLowerCase().includes(q) && !seen.has(type)) {
        seen.add(type);
        matches.push({ label: type, icon: "fa-home", type: "type" });
      }
      if (loc && loc.toLowerCase().includes(q)) {
        // On peut “nettoyer” le libellé (évite doublons exacts)
        const baseLoc = loc.split(" - ")[0].trim();
        if (!seen.has(baseLoc)) {
          seen.add(baseLoc);
          matches.push({ label: baseLoc, icon: "fa-map-marker-alt", type: "location" });
        }
      }
      if (agent && agent.toLowerCase().includes(q) && !seen.has(agent)) {
        seen.add(agent);
        matches.push({ label: agent, icon: "fa-user-tie", type: "agent" });
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
    suggestionsDiv.innerHTML = suggestions.map(s => `
      <div class="suggestion" tabindex="0">
        <span class="suggestion-icon"><i class="fa ${s.icon}"></i></span>
        <span class="suggestion-label">${s.label}</span>
      </div>
    `).join("");
    suggestionsDiv.classList.add("visible");
  }

  // Tape au clavier → affiche les suggestions (n’applique pas le filtre tout de suite)
  searchInput.addEventListener('input', function () {
    const val = this.value;
    if (!val) {
      suggestionsDiv.classList.remove("visible");
      suggestionsDiv.innerHTML = "";
      return;
    }
    renderSuggestions(getSuggestions(val));
  });

  // Click sur une suggestion
  suggestionsDiv.addEventListener('mousedown', function (e) {
    const item = e.target.closest('.suggestion');
    if (!item) return;
    const label = item.querySelector('.suggestion-label').textContent;
    searchInput.value = label;
    suggestionsDiv.classList.remove("visible");
    handleSearchOrFilter(1);
  });

  // Enter quand la liste est ouverte → prend la 1re suggestion
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === "Enter" && suggestionsDiv.classList.contains("visible")) {
      const first = suggestionsDiv.querySelector('.suggestion');
      if (first) {
        searchInput.value = first.querySelector('.suggestion-label').textContent;
        suggestionsDiv.classList.remove("visible");
        handleSearchOrFilter(1);
        e.preventDefault();
      }
    }
  });

  // Clic en dehors → on ferme
  document.addEventListener('mousedown', function (e) {
    if (!suggestionsDiv.contains(e.target) && e.target !== searchInput) {
      suggestionsDiv.classList.remove("visible");
    }
  });
}



// === DROPDOWN HEADER (identique au menu qui marche) ===
function initHeaderDropdown(){
  const dd    = document.getElementById('buyDropdown');      // conteneur du dropdown
  const btn   = document.getElementById('mainBuyBtn');       // bouton/lien Buy
  const panel = document.getElementById('dropdownContent');  // contenu déroulant
  if (!dd || !btn || !panel) return;

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  // Empêcher la nav
  btn.setAttribute('href', '#');
  btn.setAttribute('role', 'button');
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');

  const open  = () => { dd.classList.add('open');  btn.setAttribute('aria-expanded','true'); };
  const close = () => { dd.classList.remove('open'); btn.setAttribute('aria-expanded','false'); };

  // Toggle à l’appui sur le bouton (desktop uniquement)
  btn.addEventListener('click', (e) => {
    if (isMobile()) return;                // en mobile, pas de dropdown desktop
    e.preventDefault();
    e.stopPropagation();
    dd.classList.toggle('open');
    btn.setAttribute('aria-expanded', dd.classList.contains('open') ? 'true' : 'false');
  });

  // Les clics DANS le panneau ne ferment pas
  panel.addEventListener('click', (e) => e.stopPropagation());

  // Fermer si clic en dehors (ignorer le bouton)
  document.addEventListener('click', (e) => {
    if (!dd.classList.contains('open')) return;
    const t = e.target;
    if (!dd.contains(t) && !btn.contains(t)) close();
  });

  // Clavier
  btn.addEventListener('keydown', (e)=>{
    if (isMobile()) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    if (e.key === 'Escape') close();
  });
}


/* ==========
   DOM READY
   ========== */
document.addEventListener('DOMContentLoaded', async ()=>{
  properties = await loadRentFromDB();
  filteredProperties = properties.slice();
    initHeaderDropdown(); 

  // ⬇️ AJOUTE CET APPEL ICI
  setupRentAutocomplete();
  

  const allPrices = properties.map(p=>p.price).filter(v=>isFinite(v));
  // ... le reste de ton code inchangé ...


  globalMinPrice = allPrices.length ? Math.min(...allPrices) : 0;
  globalMaxPrice = allPrices.length ? Math.max(...allPrices) : 0;

  const pm=document.getElementById('priceMin'), px=document.getElementById('priceMax');
  if(pm && !pm.value) pm.value = globalMinPrice;
  if(px && !px.value) px.value = globalMaxPrice;

applyURLFiltersToUI();      // préremplit l’UI depuis l’URL
handleSearchOrFilter(1);    // lance ton filtrage/affichage
updatePriceSliderAndHistogram(properties); // garde l'histo/slider


  document.querySelectorAll('.filter-bar input, .filter-bar select')
    .forEach(el=>{ el.addEventListener('input', ()=>handleSearchOrFilter(1)); el.addEventListener('change', ()=>handleSearchOrFilter(1)); });

  document.getElementById("searchBtn")?.addEventListener("click", ()=>handleSearchOrFilter(1));
  document.getElementById("clearBtn")?.addEventListener("click", handleClearFilters);

  bindOpenableFilters();
  bindHeaderDropdown();
  bindBurger();

  // Back to top
  const btnTop=document.getElementById('scrollToTopBtn');
  if(btnTop){
    window.addEventListener('scroll', ()=>{ btnTop.style.display = window.scrollY>250 ? 'block' : 'none'; });
    btnTop.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
  }
});


// --- Dropdown BUY/RENT/COMMERCIAL (desktop) ---
const buyDropdown   = document.getElementById('buyDropdown');
const mainBuyBtn    = document.getElementById('mainBuyBtn');
const dropdownPanel = document.getElementById('dropdownContent');
// ...

// Empêche la navigation et toggle l'ouverture
if (mainBuyBtn && buyDropdown) {
  mainBuyBtn.addEventListener('click', (e) => {
    // Si on est en mobile (<900px), on laisse le design mobile (pas de dropdown)
    if (window.matchMedia('(max-width: 900px)').matches) return;

    e.preventDefault(); // évite d'aller sur buy.html
    buyDropdown.classList.toggle('open');
  });

  // Fermer si on clique en dehors
  document.addEventListener('click', (e) => {
    if (!buyDropdown.contains(e.target)) {
      buyDropdown.classList.remove('open');
    }
  });

  // Fermer avec Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') buyDropdown.classList.remove('open');
  });
}


function initCarousels() {
  const carousels = document.querySelectorAll('.carousel');

  carousels.forEach(carousel => {
    const images = carousel.querySelectorAll('img');
    const prevBtn = carousel.querySelector('.carousel-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-btn.next');

    let currentIndex = 0;
    let startX = 0;
    let isDragging = false;

    // Création des dots UNIQUEMENT mobile
    let dotsContainer = carousel.querySelector('.carousel-dots');
    if (!dotsContainer) {
      dotsContainer = document.createElement('div');
      dotsContainer.classList.add('carousel-dots');
      images.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.classList.add('carousel-dot');
        if (idx === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
          currentIndex = idx;
          updateCarousel();
        });
        dotsContainer.appendChild(dot);
      });
      carousel.appendChild(dotsContainer);
    }

    const dots = dotsContainer.querySelectorAll('.carousel-dot');

    function updateCarousel() {
      images.forEach((img, idx) => {
        img.classList.toggle('active', idx === currentIndex);
      });
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentIndex);
      });
    }

    // Boutons (desktop)
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateCarousel();
      });

      nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % images.length;
        updateCarousel();
      });
    }

    // Gestes tactiles (mobile)
    carousel.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      isDragging = true;
    });

    carousel.addEventListener('touchend', e => {
      if (!isDragging) return;
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - startX;

      if (deltaX > 50) {
        // swipe droite
        currentIndex = (currentIndex - 1 + images.length) % images.length;
      } else if (deltaX < -50) {
        // swipe gauche
        currentIndex = (currentIndex + 1) % images.length;
      }

      updateCarousel();
      isDragging = false;
    });

    // Init affichage
    updateCarousel();
  });
}

// Lancer quand la page est prête
document.addEventListener('DOMContentLoaded', initCarousels);








