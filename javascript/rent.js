// === REAL ESTATE - JS BUY (APPARTEMENTS, VILLAS...) ===
// Datas 100% depuis Supabase (buy/agent/agency). Histogramme prix rétabli.

function fmt(n){ const x=Number(n); return isFinite(x)?x.toLocaleString('en-US'):"0"; }

let properties=[], filteredProperties=[];
let globalMinPrice=0, globalMaxPrice=0;
const PRICE_STEP=10000;
let priceSlider=null;

// --- Utils
const telLink = v => `tel:${String(v||"").replace(/\s+/g,"")}`;
const waLink  = v => `https://wa.me/${String(v||"").replace(/[^\d+]/g,"")}`;

// --- Charge depuis BDD
async function loadBuyFromDB(){
  const sb = window.supabase;
  if(!sb){ console.error("Supabase client introuvable (supabaseClient.js)"); return []; }

  const { data: agents, error: e1 } = await sb
    .from('agent')
    .select('id,name,photo_agent_url,phone,email,whatsapp,agency_id,rating');
  if(e1){ console.error(e1); return []; }
  const agentsById = Object.fromEntries(agents.map(a=>[a.id,a]));

  const { data: agencies, error: e2 } = await sb
    .from('agency')
    .select('id,logo_url,address');
  if(e2){ console.error(e2); }
  const agenciesById = Object.fromEntries((agencies||[]).map(a=>[a.id,a]));
  const getAgencyForAgent = (agentId)=>{
    const ag = agentsById[agentId];
    return ag ? agenciesById[ag.agency_id] : undefined;
  };

  const { data: rows, error: e3 } = await sb
    .from('buy')
    .select('id,created_at,title,property_type,bedrooms,bathrooms,price,sqft,photo_bien_url,agent_id');
  if(e3){ console.error(e3); return []; }

  return rows.map(r=>{
    const ag = agentsById[r.agent_id] || {};
    const agency = getAgencyForAgent(r.agent_id) || {};
    const images = [];
    if(r.photo_bien_url) images.push(r.photo_bien_url);
    if(agency?.logo_url) images.push(agency.logo_url);

    return {
      title: r.property_type || "Unknown",     // utilisé comme "Property Type"
      listingTitle: r.title || "",
      price: Number(r.price)||0,
      location: agency?.address || "",
      bedrooms: Number(r.bedrooms)||0,
      bathrooms: Number(r.bathrooms)||0,
      size: Number(r.sqft)||0,
      images,
      agent: {
        name: ag.name || "",
        avatar: ag.photo_agent_url || "",
        phone: ag.phone || "",
        email: ag.email || "",
        whatsapp: ag.whatsapp || "",
        rating: ag.rating ?? null
      },
      _id: r.id,
      _created_at: r.created_at
    };
  });
}

// --- Pagination
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

// --- Résumé des types cliquables
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

// --- Affichage cartes
function displayProperties(arr, page){
  const {slice, pages}=paginate(arr,page);
  const container=document.getElementById('propertyResults');
  const propertyCountDiv=document.getElementById('propertyCount');
  const propertyTypeSelect=document.getElementById('propertyType');
  if(propertyCountDiv) propertyCountDiv.textContent = `${fmt(arr.length)} properties found`;
  if(container) container.innerHTML='';

  slice.forEach(p=>{
    const card=document.createElement('div'); card.className='property-card';
    const imgs=(p.images||[]).map((src,i)=>`<img src="${src}" class="${i===0?'active':''}" alt="Property Photo">`).join('');
    card.innerHTML=`
      <div class="carousel">
        ${imgs}
        <div class="carousel-btn prev">❮</div>
        <div class="carousel-btn next">❯</div>
        <div class="image-count"><i class="fas fa-camera"></i> ${fmt((p.images||[]).length)}</div>
      </div>
      <div class="property-info">
        <h3>${p.title}</h3>
        <p><i class="fas fa-map-marker-alt"></i> ${p.location||""}</p>
        <p><i class="fas fa-bed"></i> ${fmt(p.bedrooms)}
           <i class="fas fa-bath"></i> ${fmt(p.bathrooms)}
           <i class="fas fa-ruler-combined"></i> ${fmt(p.size)} sqft</p>
        <strong>${fmt(p.price)} AED</strong>
        <div class="agent-info">
          ${p.agent?.avatar ? `<img src="${p.agent.avatar}" alt="Agent">` : `<div class="agent-avatar-fallback"></div>`}
          <span>${p.agent?.name||""}</span>
        </div>
        <div class="property-actions">
          <button class="btn-call"${!p.agent?.phone?" disabled":""}>Call</button>
          <button class="btn-email"${!p.agent?.email?" disabled":""}>Email</button>
          <button class="btn-wa"${!p.agent?.whatsapp?" disabled":""}>WhatsApp</button>
        </div>
      </div>
    `;
    container.appendChild(card);

    // Carousel
    const images=card.querySelectorAll(".carousel img"); let idx=0;
    card.querySelector(".prev").addEventListener("click",e=>{
      e.stopPropagation(); if(!images.length) return;
      images[idx].classList.remove("active"); idx=(idx-1+images.length)%images.length; images[idx].classList.add("active");
    });
    card.querySelector(".next").addEventListener("click",e=>{
      e.stopPropagation(); if(!images.length) return;
      images[idx].classList.remove("active"); idx=(idx+1)%images.length; images[idx].classList.add("active");
    });

    // Actions agent
    card.querySelector('.btn-call')?.addEventListener('click',e=>{ if(!p.agent?.phone) return; e.stopPropagation(); window.location.href=telLink(p.agent.phone); });
    card.querySelector('.btn-email')?.addEventListener('click',e=>{ if(!p.agent?.email) return; e.stopPropagation(); window.location.href=`mailto:${p.agent.email}`; });
    card.querySelector('.btn-wa')?.addEventListener('click',e=>{ if(!p.agent?.whatsapp) return; e.stopPropagation(); window.open(waLink(p.agent.whatsapp),'_blank'); });
  });

  displayPropertyTypesSummary(arr, propertyTypeSelect?.value);
  updatePagination(pages, page, arr);
  if(typeof updateMiniMap === 'function') updateMiniMap(slice);
}

/* =========================
   SLIDER + HISTOGRAMME
   ========================= */
function drawPriceHistogram(propsArray, min, max, [sliderMin, sliderMax]=[min,max]){
  const canvas = document.getElementById('priceHistogram');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  ctx.clearRect(0,0,width,height);

  const prices = propsArray.map(p=>p.price).filter(v=>isFinite(v));
  if(!prices.length) return;

  const bins = 18;
  const hist = Array(bins).fill(0);
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

  // Scatter de points en bas
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
function roundRect(ctx, x, y, w, h, r){
  if(w<2*r) r=w/2; if(h<2*r) r=h/2;
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
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

  // Labels (si présents)
  const minLbl=document.getElementById("sliderMinLabel");
  const maxLbl=document.getElementById("sliderMaxLabel");
  const selLbl=document.getElementById("selectedPriceRange");
  if(minLbl) minLbl.textContent = fmt(globalMinPrice)+" AED";
  if(maxLbl) maxLbl.textContent = fmt(globalMaxPrice)+" AED";
  if(selLbl) selLbl.textContent = fmt(curMin)+" - "+fmt(curMax)+" AED";

  // Inputs popup (si présents)
  const minInput=document.getElementById("priceMinInput");
  const maxInput=document.getElementById("priceMaxInput");
  if(minInput) minInput.value = fmt(curMin);
  if(maxInput) maxInput.value = fmt(curMax);

  // 1ère peinture histogramme
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

  // Saisie manuelle dans le popup => bouge le slider
  minInput?.addEventListener('change', ()=>{
    const v1=Number(String(minInput.value).replace(/[^\d]/g,''))||globalMinPrice;
    priceSlider.set([Math.max(globalMinPrice, Math.min(v1, (Number(px?.value)||globalMaxPrice))), null]);
  });
  maxInput?.addEventListener('change', ()=>{
    const v2=Number(String(maxInput.value).replace(/[^\d]/g,''))||globalMaxPrice;
    priceSlider.set([null, Math.min(globalMaxPrice, Math.max(v2, (Number(pm?.value)||globalMinPrice)))]);
  });
}

// --- Filtrage principal
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
  // histogramme global (non filtré) reste basé sur toutes les annonces
  drawPriceHistogram(properties, globalMinPrice, globalMaxPrice, [priceMin, priceMax]);
}

// --- Reset filtres
function handleClearFilters(){
  document.querySelectorAll(".filter-bar input, .filter-bar select").forEach(el=>{
    if(el.tagName==="SELECT") el.selectedIndex=0; else el.value="";
  });
  const pm=document.getElementById('priceMin'), px=document.getElementById('priceMax');
  if(pm) pm.value = globalMinPrice;
  if(px) px.value = globalMaxPrice;
  handleSearchOrFilter(1);
}

// --- Popups
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

// --- Pré-remplissage via query params
function applyQueryParamsAndSearch(){
  const params=new URLSearchParams(window.location.search);
  const q=params.get('search')||'', type=params.get('type')||'', beds=params.get('beds')||'';
  if(q) document.getElementById('search') && (document.getElementById('search').value=q);
  if(type){
    const sel=document.getElementById('propertyType');
    if(sel){ Array.from(sel.options).forEach(o=>{ if([o.value,o.text].includes(type)) o.selected=true; }); }
  }
  if(beds){
    const sel=document.getElementById('bedrooms');
    if(sel){ Array.from(sel.options).forEach(o=>{ if([o.value,o.text].includes(beds)) o.selected=true; }); }
  }
  if(q||type||beds) setTimeout(()=>handleSearchOrFilter(1), 80);
}

// --- Burger mobile
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

// --- DOM READY
document.addEventListener('DOMContentLoaded', async ()=>{
  properties = await loadBuyFromDB();
  filteredProperties = properties.slice();
    bindHeaderDropdown();   

  const allPrices = properties.map(p=>p.price).filter(v=>isFinite(v));
  globalMinPrice = allPrices.length ? Math.min(...allPrices) : 0;
  globalMaxPrice = allPrices.length ? Math.max(...allPrices) : 0;

  const pm=document.getElementById('priceMin'), px=document.getElementById('priceMax');
  if(pm && !pm.value) pm.value = globalMinPrice;
  if(px && !px.value) px.value = globalMaxPrice;

  displayProperties(filteredProperties, 1);
  updatePriceSliderAndHistogram();

  document.querySelectorAll('.filter-bar input, .filter-bar select')
    .forEach(el=>{ el.addEventListener('input', ()=>handleSearchOrFilter(1)); el.addEventListener('change', ()=>handleSearchOrFilter(1)); });

  document.getElementById("searchBtn")?.addEventListener("click", ()=>handleSearchOrFilter(1));
  document.getElementById("clearBtn")?.addEventListener("click", handleClearFilters);

  bindOpenableFilters();

  const btnTop=document.getElementById('scrollToTopBtn');
  if(btnTop){ window.addEventListener('scroll', ()=>{ btnTop.style.display = window.scrollY>250 ? 'block' : 'none'; }); btnTop.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'})); }

  applyQueryParamsAndSearch();
  bindBurger();
});





// --- Header dropdown "Commercial" ---
function bindHeaderDropdown() {
  const dd = document.getElementById('buyDropdown');
  const btn = document.getElementById('mainBuyBtn');
  if (!dd || !btn) return;

  // Toggle au clic sur le bouton principal (pas de navigation)
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dd.classList.toggle('open');
  });

  // Accessibilité clavier
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dd.classList.toggle('open');
    }
    if (e.key === 'Escape') dd.classList.remove('open');
  });

  // Fermer quand on clique en dehors
  document.addEventListener('click', (e) => {
    if (!dd.contains(e.target)) dd.classList.remove('open');
  });
}
