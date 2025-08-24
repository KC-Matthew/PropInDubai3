/* =========================================================================
   commercial.js — FR (Search persistant + URL sync + Enter + fallback storage)
   ========================================================================= */

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const byId = id => document.getElementById(id);
const fmt = n => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-US') : '0');

let properties = [];
let filtered   = [];
let globalMinPrice = 0, globalMaxPrice = 0;
let priceSlider = null;
const PRICE_STEP = 10000;
const CARDS_PER_PAGE = 18;

/* ---------- outils ---------- */
function parsePlus(val){
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  if (s === 'studio') return 0;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function readURLInit(){
  const p = new URLSearchParams(location.search);
  // accepte 'q' aussi au cas où l’accueil enverrait q=
  const search = (p.get('search') || p.get('q') || '').trim();
  const type   = (p.get('type')   || '').trim();

  const bedsParam  = (p.get('beds')  ?? p.get('bedrooms')  ?? '').trim();
  const bathsParam = (p.get('baths') ?? p.get('bathrooms') ?? '').trim();

  let commercialType = (p.get('commercialType') || p.get('purpose') || '').trim().toLowerCase();
  if (commercialType === 'rent') commercialType = 'Commercial Rent';
  else if (commercialType === 'buy') commercialType = 'Commercial Buy';
  else if (commercialType !== 'Commercial Rent' && commercialType !== 'Commercial Buy') commercialType = '';

  const beds  = parsePlus(bedsParam);
  const baths = parsePlus(bathsParam);

  return { search, type, beds, baths, commercialType };
}

/* ---------- URL sync ---------- */
function syncURLFromFilters(){
  const params = new URLSearchParams(location.search);

  const q = (byId('search')?.value || '').trim();
  if (q) params.set('search', q); else params.delete('search');

  const type = (byId('propertyType')?.value || '').trim();
  if (type && type.toLowerCase() !== 'property type') params.set('type', type); else params.delete('type');

  const bedsVal  = (byId('bedrooms')?.value  || '').trim();
  const bathsVal = (byId('bathrooms')?.value || '').trim();
  const beds  = parsePlus(bedsVal);
  const baths = parsePlus(bathsVal);
  if (beds  != null) params.set('beds',  beds);  else params.delete('beds');
  if (baths != null) params.set('baths', baths); else params.delete('baths');

  const comm = (byId('commercialType')?.value || '').trim();
  if (comm) params.set('commercialType', comm); else params.delete('commercialType');

  const qs = params.toString();
  const newURL = qs ? `${location.pathname}?${qs}` : location.pathname;
  history.replaceState(null, '', newURL);
}

/* ---------- MOCK si BDD vide ---------- */
function mockData(){
  const items = [];
  for (let i=0;i<8;i++){
    items.push({
      _id: `mock-${i}`,
      _created_at: new Date().toISOString(),
      title: ['Office','Retail','Warehouse','Shop'][i%4],
      listingTitle: `Mock ${i} — ${['Office','Retail','Warehouse','Shop'][i%4]}`,
      commercialType: i%2 ? 'Commercial Rent' : 'Commercial Buy',
      licenseType: '',
      price: 100000 + i*25000,
      size: 800 + (i*45)%1600,
      bedrooms: i%3,
      bathrooms: 1 + (i%4),
      location: ['Business Bay','JLT','Deira','Al Quoz'][i%4],
      images: ['styles/photo/office1.jpg','styles/photo/office2.jpg'],
      furnished: i%4===0,
      amenities: ['Central A/C','Parking'].slice(0, 1+(i%2)),
      agent: { name: 'Mock Agent', avatar: '', phone: '', email: '', whatsapp: '' }
    });
  }
  return items;
}

/* ---------- chargement BDD ---------- */
async function loadCommercialFromDB(){
  const sb = window.supabase;
  if (!sb) return [];

  const { data: agents, error: aErr } = await sb
    .from('agent')
    .select('id,name,photo_agent_url,phone,email,whatsapp');
  if (aErr) console.error(aErr);
  const agentsById = Object.fromEntries((agents||[]).map(a=>[a.id,a]));

  const { data: rows, error } = await sb
    .from('commercial')
    .select('id,created_at,title,"rental period","property type",bedrooms,bathrooms,price,sqft,photo_url,agent_id');
  if (error) { console.error(error); return []; }

  let locById = {};
  let locReq = await sb.from('commercial').select('id,"localisation accueil"');
  if (locReq.error) locReq = await sb.from('commercial').select('id,"localisation acceuil"');
  if (!locReq.error && Array.isArray(locReq.data)) {
    locById = Object.fromEntries(locReq.data.map(r => [
      r.id, r['localisation accueil'] || r['localisation acceuil'] || ''
    ]));
  }

  return (rows||[]).map(r=>{
    const ag = agentsById[r.agent_id] || {};
    const commercialType = r['rental period'] ? 'Commercial Rent' : 'Commercial Buy';

    let images=[];
    if (Array.isArray(r.photo_url)) images = r.photo_url.filter(Boolean);
    else if (typeof r.photo_url === 'string') images = r.photo_url.split(',').map(s=>s.trim()).filter(Boolean);

    return {
      _id: r.id,
      _created_at: r.created_at,
      title: r['property type'] || 'Commercial',
      listingTitle: r.title || '',
      commercialType,
      licenseType: '',
      price: Number(r.price)||0,
      size:  Number(r.sqft)||0,
      bedrooms: Number(r.bedrooms)||0,
      bathrooms:Number(r.bathrooms)||0,
      location: locById[r.id] || '',
      images,
      furnished: false,
      amenities: [],
      agent: {
        name: ag.name || '',
        avatar: ag.photo_agent_url || '',
        phone:  ag.phone  || '',
        email:  ag.email  || '',
        whatsapp: ag.whatsapp || ''
      }
    };
  });
}

/* ---------- affichage ---------- */
function paginate(arr, page){
  const total = arr.length;
  const pages = Math.ceil(total / CARDS_PER_PAGE) || 1;
  const start = (page-1)*CARDS_PER_PAGE;
  return { slice: arr.slice(start, start+CARDS_PER_PAGE), pages };
}

function updatePagination(pages, page, arr){
  const div = byId('pagination'); if (!div) return;
  div.innerHTML='';
  if (pages<=1) return;
  const mk = (html, dis, on) => {
    const b=document.createElement('button');
    b.className='page-btn'; b.innerHTML=html; b.disabled=dis; b.addEventListener('click',on);
    return b;
  };
  div.appendChild(mk('&laquo;', page===1, ()=>displayProperties(arr, page-1)));
  for (let i=1;i<=pages;i++){
    const b = mk(String(i), false, ()=>displayProperties(arr, i));
    if (i===page) b.classList.add('active');
    div.appendChild(b);
  }
  div.appendChild(mk('&raquo;', page===pages, ()=>displayProperties(arr, page+1)));
}

function displayPropertyTypesSummary(arr){
  const wrap = byId('propertyTypesSummary'); if (!wrap) return;
  const counts = {};
  arr.forEach(p => { counts[p.title] = (counts[p.title]||0) + 1; });
  const order = ["Office","Retail","Warehouse","Shop","Showroom","Villa","Land","Whole Building"];
  const sorted = Object.keys(counts).sort(
    (a,b)=>(order.indexOf(a)==-1?999:order.indexOf(a))-(order.indexOf(b)==-1?999:order.indexOf(b))
  );
  wrap.innerHTML = `<div class="pts-row">${
    sorted.map(t=>`<span class="pts-type" data-type="${t}" style="cursor:pointer">${t} <span class="pts-count">(${fmt(counts[t])})</span></span>`).join('')
  }</div>`;
  $$('.pts-type', wrap).forEach(el=>{
    el.addEventListener('click', ()=>{
      const sel = byId('propertyType');
      if (sel){
        for (let i=0;i<sel.options.length;i++){
          const v = (sel.options[i].value||sel.options[i].text||'').trim();
          if (v.toLowerCase() === el.dataset.type.toLowerCase()){ sel.selectedIndex=i; break; }
        }
      }
      handleSearchOrFilter(1);
      byId('propertyCount')?.scrollIntoView({behavior:'smooth'});
    });
  });
}

function displayProperties(arr, page=1){
  const container = byId('propertyResults');
  const counter   = byId('propertyCount');
  const { slice, pages } = paginate(arr, page);

  if (counter) counter.textContent = `${fmt(arr.length)} properties found`;
  if (container) container.innerHTML = '';

  slice.forEach(p=>{
    const card = document.createElement('div');
    card.className='property-card';
    const imgs = (p.images||[]).map((src,i)=>`<img src="${src}" class="${i===0?'active':''}" alt="Property">`).join('');
    card.innerHTML = `
      <div class="carousel">
        ${imgs}
        <div class="carousel-btn prev">❮</div>
        <div class="carousel-btn next">❯</div>
        <div class="image-count"><i class="fas fa-camera"></i> ${fmt((p.images||[]).length)}</div>
      </div>
      <div class="property-info">
        <h3>${p.listingTitle || p.title}</h3>
        ${p.location ? `<p><i class="fas fa-map-marker-alt"></i> ${p.location}</p>` : ''}
        <p><i class="fas fa-briefcase"></i> ${p.commercialType}</p>
        <p>
          <i class="fas fa-bed"></i> ${fmt(p.bedrooms)}
          <i class="fas fa-bath"></i> ${fmt(p.bathrooms)}
          <i class="fas fa-ruler-combined"></i> ${fmt(p.size)} sqft
        </p>
        <strong>${fmt(p.price)} AED</strong>
        <div class="agent-info">
          ${p.agent?.avatar ? `<img src="${p.agent.avatar}" alt="Agent">` : `<div class="agent-avatar-fallback"></div>`}
          <span>${p.agent?.name||''}</span>
        </div>
        <div class="property-actions">
          <button class="btn-call"${!p.agent?.phone?' disabled':''}>Call</button>
          <button class="btn-email"${!p.agent?.email?' disabled':''}>Email</button>
          <button class="btn-wa"${!p.agent?.whatsapp?' disabled':''}>WhatsApp</button>
        </div>
      </div>
    `;
    container.appendChild(card);

    card.addEventListener('click', ()=>{
      sessionStorage.setItem('selected_property', JSON.stringify({ id:p._id, type:'commercial' }));
      location.href = `bien.html?id=${encodeURIComponent(p._id)}&type=commercial`;
    });

    const images = card.querySelectorAll('.carousel img');
    let i = 0;
    card.querySelector('.prev')?.addEventListener('click', e=>{ e.stopPropagation(); if(!images.length) return; images[i].classList.remove('active'); i=(i-1+images.length)%images.length; images[i].classList.add('active'); });
    card.querySelector('.next')?.addEventListener('click', e=>{ e.stopPropagation(); if(!images.length) return; images[i].classList.remove('active'); i=(i+1)%images.length; images[i].classList.add('active'); });

    card.querySelector('.btn-call') ?.addEventListener('click',e=>{ if(!p.agent?.phone) return; e.stopPropagation(); location.href=`tel:${String(p.agent.phone).replace(/\s+/g,'')}`; });
    card.querySelector('.btn-email')?.addEventListener('click',e=>{ if(!p.agent?.email) return; e.stopPropagation(); location.href=`mailto:${p.agent.email}`; });
    card.querySelector('.btn-wa')   ?.addEventListener('click',e=>{ if(!p.agent?.whatsapp) return; e.stopPropagation(); window.open(`https://wa.me/${String(p.agent.whatsapp).replace(/[^\d+]/g,'')}`,'_blank'); });
  });

  displayPropertyTypesSummary(arr);
  updatePagination(pages, page, arr);
}

/* ---------- prix ---------- */
function getAllPrices(arr){ return arr.map(p=>Number(p.price)||0).filter(Number.isFinite); }

function drawPriceHistogram(arr,min,max,[smin,smax]=[min,max]){
  const c = byId('priceHistogram'); if (!c) return;
  const ctx = c.getContext('2d'); const w=c.width, h=c.height;
  ctx.clearRect(0,0,w,h);
  const prices = getAllPrices(arr); if(!prices.length) return;

  const bins=18, hist=Array(bins).fill(0);
  prices.forEach(price=>{
    let idx = Math.floor((price-min)/((max-min)||1)*(bins-1));
    idx = Math.max(0, Math.min(bins-1, idx));
    hist[idx]++;
  });
  const maxHist = Math.max(...hist, 2);
  for (let i=0;i<bins;i++){
    const x=Math.floor(i*w/bins)+3, bw=Math.floor(w/bins)-7;
    const y=Math.floor(h-(hist[i]/maxHist)*(h-10)), bh=h-y;
    const b0=min+(i/bins)*(max-min), b1=min+((i+1)/bins)*(max-min);
    ctx.beginPath();
    ctx.fillStyle = (b1>=smin && b0<=smax) ? '#f17100' : '#ffd2a5';
    ctx.strokeStyle='#fff'; ctx.lineWidth=2;
    if (ctx.roundRect) ctx.roundRect(x,y,bw,bh,5); else ctx.rect(x,y,bw,bh);
    ctx.fill(); ctx.stroke();
  }
}

function updatePriceSlider(){
  const slider = byId('priceSlider');
  if (!slider || typeof noUiSlider === 'undefined') return;
  if (priceSlider){ priceSlider.destroy(); priceSlider=null; slider.innerHTML=''; }

  const prices = getAllPrices(properties);
  globalMinPrice = prices.length?Math.min(...prices):0;
  globalMaxPrice = prices.length?Math.max(...prices):0;
  if (globalMinPrice===globalMaxPrice){ globalMinPrice=Math.max(0,globalMinPrice-PRICE_STEP); globalMaxPrice+=PRICE_STEP; }

  const pm = byId('priceMin'), px = byId('priceMax');
  const curMin = Number(pm?.value)||globalMinPrice;
  const curMax = Number(px?.value)||globalMaxPrice;

  priceSlider = noUiSlider.create(slider,{
    start:[curMin,curMax], connect:true, step:PRICE_STEP,
    range:{min:globalMinPrice,max:globalMaxPrice},
    tooltips:[true,true],
    format:{ to:v=>fmt(Math.round(v)), from:v=>Number(String(v).replace(/[^\d]/g,'')) }
  });

  byId('sliderMinLabel') && (byId('sliderMinLabel').textContent = fmt(globalMinPrice)+' AED');
  byId('sliderMaxLabel') && (byId('sliderMaxLabel').textContent = fmt(globalMaxPrice)+' AED');
  byId('selectedPriceRange') && (byId('selectedPriceRange').textContent = fmt(curMin)+' - '+fmt(curMax)+' AED');

  const minInput = byId('priceMinInput'), maxInput = byId('priceMaxInput');
  if (minInput) minInput.value = fmt(curMin);
  if (maxInput) maxInput.value = fmt(curMax);

  drawPriceHistogram(properties, globalMinPrice, globalMaxPrice, [curMin,curMax]);

  priceSlider.on('update', vals=>{
    const v1=Number(String(vals[0]).replace(/[^\d]/g,''))||globalMinPrice;
    const v2=Number(String(vals[1]).replace(/[^\d]/g,''))||globalMaxPrice;
    if (minInput) minInput.value = fmt(v1);
    if (maxInput) maxInput.value = fmt(v2);
    byId('selectedPriceRange') && (byId('selectedPriceRange').textContent = fmt(v1)+' - '+fmt(v2)+' AED');
    drawPriceHistogram(properties, globalMinPrice, globalMaxPrice, [v1,v2]);
  });
  priceSlider.on('change', vals=>{
    const v1=Number(String(vals[0]).replace(/[^\d]/g,''))||globalMinPrice;
    const v2=Number(String(vals[1]).replace(/[^\d]/g,''))||globalMaxPrice;
    if (pm) pm.value=v1; if (px) px.value=v2;
    handleSearchOrFilter(1);
  });
}

/* ---------- filtrage ---------- */
function handleSearchOrFilter(page=1){
  let arr = properties.slice();

  const q = (byId('search')?.value || '').trim().toLowerCase();
  // sauvegarde la recherche pour la conserver même si pas d’URL
  try { localStorage.setItem('commercial.search', (byId('search')?.value || '').trim()); } catch {}

  const commercialType = byId('commercialType')?.value || '';
  const propertyType   = byId('propertyType')  ?.value || '';
  const licenseType    = byId('licenseType')   ?.value || '';
  const bedroomsVal  = byId('bedrooms') ?.value || '';
  const bathroomsVal = byId('bathrooms')?.value || '';
  const priceMin = Number(byId('priceMin')?.value)||globalMinPrice;
  const priceMax = Number(byId('priceMax')?.value)||globalMaxPrice;
  const minArea = Number(byId('minAreaInput')?.value)||0;
  const maxArea = Number(byId('maxAreaInput')?.value)||Infinity;
  const isFurnished = !!byId('furnishingFilter')?.checked;
  const keywords = (byId('keywordInput')?.value||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);

  if (commercialType) arr = arr.filter(p => (p.commercialType||'') === commercialType);
  if (licenseType && licenseType.toLowerCase()!=='licence') arr = arr.filter(p => (p.licenseType||'') === licenseType);
  if (propertyType && propertyType.toLowerCase()!=='property type') arr = arr.filter(p => (p.title||'') === propertyType);
  if (q) arr = arr.filter(p => (p.title||'').toLowerCase().includes(q) || (p.listingTitle||'').toLowerCase().includes(q) || (p.location||'').toLowerCase().includes(q));

  const bedMin  = parsePlus(bedroomsVal);
  const bathMin = parsePlus(bathroomsVal);
  if (bedMin  != null) arr = arr.filter(p => (p.bedrooms || 0)  >= bedMin);
  if (bathMin != null) arr = arr.filter(p => (p.bathrooms || 0) >= bathMin);

  if (minArea>0) arr = arr.filter(p => (p.size||0) >= minArea);
  if (maxArea<Infinity) arr = arr.filter(p => (p.size||0) <= maxArea);
  if (isFurnished) arr = arr.filter(p => !!p.furnished);

  const checkedAmenities = $$('#moreFilterPopup .amenities-list input[type="checkbox"]:checked').map(cb=>cb.value);
  if (checkedAmenities.length) arr = arr.filter(p => (p.amenities||[]).length && checkedAmenities.every(a => p.amenities.includes(a)));

  if (keywords.length) arr = arr.filter(p=>{
    const text=[p.title,p.listingTitle,p.location,...(p.amenities||[])].join(' ').toLowerCase();
    return keywords.every(k => text.includes(k));
  });

  arr = arr.filter(p => (p.price||0) >= priceMin && (p.price||0) <= priceMax);

  filtered = arr;

  // —> garde la recherche dans l’URL
  syncURLFromFilters();

  displayProperties(filtered, page);
  drawPriceHistogram(properties, globalMinPrice, globalMaxPrice, [priceMin, priceMax]);
}

/* ---------- reset ---------- */
function handleClearFilters(){
  ['commercialType','propertyType','licenseType','bedrooms','bathrooms'].forEach(id=>{
    const el = byId(id); if (el) el.selectedIndex = 0;
  });
  const si = byId('search'); if (si) si.value='';
  try { localStorage.removeItem('commercial.search'); } catch {}

  $$('#moreFilterPopup input[type="text"]').forEach(i=>i.value='');
  $$('#moreFilterPopup input[type="checkbox"]').forEach(cb=>{
    cb.checked=false; cb.dispatchEvent(new Event('change',{bubbles:true}));
  });
  if (byId('priceMin')) byId('priceMin').value = globalMinPrice;
  if (byId('priceMax')) byId('priceMax').value = globalMaxPrice;

  syncURLFromFilters(); // nettoie aussi l’URL
  handleSearchOrFilter(1);

  byId('priceFilterPopup')?.classList.remove('active');
  byId('moreFilterPopup')?.classList.remove('active');
  document.body.classList.remove('price-popup-open');
  document.body.style.overflow='';
}
window.handleClearFilters = handleClearFilters;

/* ---------- UI ---------- */
function bindUI(){
  byId('openPriceFilter')?.addEventListener('click',()=>{
    byId('priceFilterPopup')?.classList.add('active');
    document.body.classList.add('price-popup-open');
    setTimeout(()=>byId('priceMinInput')?.focus(),120);
  });
  byId('closePricePopup')?.addEventListener('click',()=>{
    byId('priceFilterPopup')?.classList.remove('active');
    document.body.classList.remove('price-popup-open');
  });
  byId('validatePriceBtn')?.addEventListener('click',()=>{
    const v1=Number(String(byId('priceMinInput')?.value||'').replace(/[^\d]/g,''))||globalMinPrice;
    const v2=Number(String(byId('priceMaxInput')?.value||'').replace(/[^\d]/g,''))||globalMaxPrice;
    if (byId('priceMin')) byId('priceMin').value=v1;
    if (byId('priceMax')) byId('priceMax').value=v2;
    byId('priceFilterPopup')?.classList.remove('active');
    document.body.classList.remove('price-popup-open');
    handleSearchOrFilter(1);
  });

  byId('openMoreFilter')?.addEventListener('click',()=>byId('moreFilterPopup')?.classList.add('active'));
  byId('closeMoreFilter')?.addEventListener('click',()=>byId('moreFilterPopup')?.classList.remove('active'));
  byId('applyMoreFiltersBtn')?.addEventListener('click',()=>{ byId('moreFilterPopup')?.classList.remove('active'); handleSearchOrFilter(1); });

  byId('searchBtn')?.addEventListener('click', ()=>handleSearchOrFilter(1));
  byId('search')?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') { e.preventDefault(); handleSearchOrFilter(1); }
  });

  ['commercialType','propertyType','licenseType','bedrooms','bathrooms']
    .forEach(id => byId(id)?.addEventListener('change', ()=>handleSearchOrFilter(1)));

  byId('clearBtn') ?.addEventListener('click', ()=>handleClearFilters());
}

function bindHeaderDropdown(){
  const dd = byId('buyDropdown');
  const btn = byId('mainBuyBtn');
  if (!dd || !btn) return;
  btn.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); dd.classList.toggle('open'); });
  document.addEventListener('click', e=>{ if(!dd.contains(e.target)) dd.classList.remove('open'); });
}

/* ---------- start ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  bindHeaderDropdown();
  bindUI();

  // attendre supabase 2s max
  if (!(window.supabase && typeof window.supabase.from === 'function')) {
    await new Promise(res=>{
      let ok=false;
      const t=setInterval(()=>{
        if (window.supabase && typeof window.supabase.from==='function'){ clearInterval(t); ok=true; res(); }
      },50);
      setTimeout(()=>{ if(!ok){ clearInterval(t); res(); } },2000);
    });
  }

  const init = readURLInit();

  try { properties = await loadCommercialFromDB(); }
  catch (e) { console.error(e); properties = []; }

  if (!properties.length) properties = mockData();

  filtered = properties.slice();

  const prices = properties.map(p=>Number(p.price)||0).filter(Number.isFinite);
  globalMinPrice = prices.length?Math.min(...prices):0;
  globalMaxPrice = prices.length?Math.max(...prices):0;
  if (byId('priceMin') && !byId('priceMin').value) byId('priceMin').value = globalMinPrice;
  if (byId('priceMax') && !byId('priceMax').value) byId('priceMax').value = globalMaxPrice;

  // --- Préremplissage Search depuis URL, sinon depuis storage
  const storedQ = (()=>{ try { return localStorage.getItem('commercial.search') || ''; } catch { return ''; }})();
  if (init.search && byId('search')) byId('search').value = init.search;
  else if (storedQ && byId('search')) byId('search').value = storedQ;

  // Préremplissage autres filtres
  if (init.type) {
    const sel = byId('propertyType');
    if (sel){
      for (let i=0;i<sel.options.length;i++){
        const v = (sel.options[i].value||sel.options[i].text||'').trim();
        if (v.toLowerCase() === init.type.toLowerCase()){ sel.selectedIndex=i; break; }
      }
    }
  }
  if (init.commercialType && byId('commercialType')) {
    const sel = byId('commercialType');
    for (let i = 0; i < sel.options.length; i++) {
      const v = (sel.options[i].value || sel.options[i].text || '').trim();
      if (v.toLowerCase() === init.commercialType.toLowerCase()) { sel.selectedIndex = i; break; }
    }
  }
  if (init.beds!=null && byId('bedrooms')){
    const sel=byId('bedrooms');
    for (let i=0;i<sel.options.length;i++){
      const t=(sel.options[i].value||sel.options[i].text||'').trim().toLowerCase();
      if (t === `${init.beds}+`) { sel.selectedIndex=i; break; }
      if (init.beds===0 && t==='studio') { sel.selectedIndex=i; break; }
    }
  }
  if (init.baths!=null && byId('bathrooms')){
    const sel=byId('bathrooms');
    for (let i=0;i<sel.options.length;i++){
      const t=(sel.options[i].value||sel.options[i].text||'').trim().toLowerCase();
      if (t === `${init.baths}+`) { sel.selectedIndex=i; break; }
    }
  }

  displayProperties(filtered, 1);
  updatePriceSlider();

  // applique les filtres d’URL si présents
  if (init.search || init.type || init.beds!=null || init.baths!=null || init.commercialType) {
    handleSearchOrFilter(1);
  }
});
