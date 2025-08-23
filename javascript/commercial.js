/* ============================
   javascript/commercial.js
   ============================ */

function fmt(n){ const x=Number(n); return isFinite(x)?x.toLocaleString('en-US'):'0'; }
const byId=id=>document.getElementById(id);

let properties=[];            // tout depuis la BDD
let filteredProperties=[];    // en cours (après filtres)
let priceSlider=null;
let globalMinPrice=0, globalMaxPrice=0;
const PRICE_STEP=10000;

/* ---------- CHARGEMENT BDD (table: commercial) ---------- */
async function loadCommercialFromDB(){
  const sb = window.supabase;
  if(!sb){ console.error('Supabase client non trouvé.'); return []; }

  // Agents (pour avatar & contacts) — inchangé
  const { data: agents, error: e1 } = await sb
    .from('agent')
    .select('id,name,photo_agent_url,phone,email,whatsapp');
  if(e1){ console.error(e1); }
  const agentsById = Object.fromEntries((agents||[]).map(a=>[a.id,a]));

  // Données principales — SELECT inchangé pour ne rien casser
  const { data: rows, error } = await sb
    .from('commercial')
    .select('id,created_at,title,"rental period","property type",bedrooms,bathrooms,price,sqft,photo_url,agent_id');
  if(error){ console.error(error); return []; }

  // Récupération séparée de la colonne avec espace (safe)
  let locById = {};
  let locReq = await sb.from('commercial').select('id,"localisation accueil"');
  if(locReq.error){
    console.warn('Colonne "localisation accueil" introuvable, essai "localisation acceuil"...');
    locReq = await sb.from('commercial').select('id,"localisation acceuil"');
  }
  if(!locReq.error && Array.isArray(locReq.data)){
    locById = Object.fromEntries(
      locReq.data.map(r => [
        r.id,
        r['localisation accueil'] || r['localisation acceuil'] || ''
      ])
    );
  } else if(locReq.error){
    console.warn('Lecture localisation custom impossible :', locReq.error);
  }

  // Map vers le format UI
  return (rows||[]).map(r=>{
    const ag = agentsById[r.agent_id] || {};
    const listingTitle = r.title || '';
    const typeLabel    = r['property type'] || 'Commercial';
    const rentalPeriod = r['rental period'] || null;
    const commercialType = rentalPeriod ? 'Commercial Rent' : 'Commercial Buy';

    const localisationAccueil = locById[r.id] || '';

    return {
      title: typeLabel,
      listingTitle,
      price: Number(r.price)||0,
      size: Number(r.sqft)||0,
      bedrooms: Number(r.bedrooms)||0,
      bathrooms: Number(r.bathrooms)||0,
      // 👇 affiché à l’icône 📍 si présent
      location: localisationAccueil || '',
      images: r.photo_url ? [r.photo_url] : [],
      commercialType,
      licenseType: '',
      furnished: false,
      amenities: [],
      agent:{
        name: ag.name||'',
        avatar: ag.photo_agent_url||'',
        phone: ag.phone||'',
        email: ag.email||'',
        whatsapp: ag.whatsapp||''
      },
      _id:r.id,
      _created_at:r.created_at
    };
  });
}


/* ---------- PAGINATION & RENDER ---------- */
const CARDS_PER_PAGE=18;
function paginate(arr,page){ const total=arr.length, pages=Math.ceil(total/CARDS_PER_PAGE)||1; const s=(page-1)*CARDS_PER_PAGE, e=s+CARDS_PER_PAGE; return {page,total,pages,slice:arr.slice(s,e)}; }

function updatePagination(pages,page,arr){
  const div=byId('pagination'); if(!div) return; div.innerHTML='';
  if(pages<=1) return;
  const mk=(html,dis,on)=>{ const b=document.createElement('button'); b.className='page-btn'; b.innerHTML=html; b.disabled=dis; b.addEventListener('click',on); return b; };
  div.appendChild(mk('&laquo;',page===1,()=>displayProperties(arr,page-1)));
  for(let i=1;i<=pages;i++){ const b=mk(String(i),false,()=>displayProperties(arr,i)); if(i===page) b.classList.add('active'); div.appendChild(b); }
  div.appendChild(mk('&raquo;',page===pages,()=>displayProperties(arr,page+1)));
}

function displayPropertyTypesSummary(arr, filterType){
  const wrap=byId('propertyTypesSummary'); if(!wrap) return;
  const sel=byId('propertyType');
  const counts={}; arr.forEach(p=>{ counts[p.title]=(counts[p.title]||0)+1; });
  const order=["Office","Retail","Warehouse","Shop","Showroom","Villa","Land","Whole Building"];
  const sorted=Object.keys(counts).sort((a,b)=>(order.indexOf(a)===-1?999:order.indexOf(a))-(order.indexOf(b)===-1?999:order.indexOf(b)));
  wrap.innerHTML=`<div class="pts-row">${
    sorted.map(t=>`<span class="pts-type${(sel?.value===t)?" selected":""}" data-type="${t}" style="cursor:pointer">${t} <span class="pts-count">(${fmt(counts[t])})</span></span>`).join('')
  }</div>`;
  wrap.querySelectorAll('.pts-type').forEach(el=>{
    el.addEventListener('click',()=>{
      if(sel) sel.value=el.getAttribute('data-type');
      handleSearchOrFilter(1);
      wrap.querySelectorAll('.pts-type').forEach(s=>s.classList.remove('selected'));
      el.classList.add('selected');
      byId('propertyCount')?.scrollIntoView({behavior:'smooth'});
    });
  });
}

function displayProperties(arr,page){
  const {slice,pages}=paginate(arr,page);
  const container=byId('propertyResults'); const countDiv=byId('propertyCount'); const typeSel=byId('propertyType');
  if(countDiv) countDiv.textContent=`${fmt(arr.length)} properties found`;
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
        <h3>${p.listingTitle || p.title}</h3>
        ${p.location ? `<p><i class="fas fa-map-marker-alt"></i> ${p.location}</p>` : ''}
        <p>
          <i class="fas fa-briefcase"></i> ${p.commercialType}
          ${p.licenseType ? `&nbsp; <i class="fas fa-id-card"></i> ${p.licenseType}` : ''}
        </p>
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
      </div>`;
    container.appendChild(card);


card.addEventListener('click', () => {
  const detail = { id: p._id, type: 'commercial' };
  sessionStorage.setItem('selected_property', JSON.stringify(detail));
  window.location.href = `bien.html?id=${encodeURIComponent(detail.id)}&type=${encodeURIComponent(detail.type)}`;
});



    const images=card.querySelectorAll('.carousel img'); let idx=0;
    card.querySelector('.prev').addEventListener('click',e=>{ e.stopPropagation(); if(!images.length) return; images[idx].classList.remove('active'); idx=(idx-1+images.length)%images.length; images[idx].classList.add('active'); });
    card.querySelector('.next').addEventListener('click',e=>{ e.stopPropagation(); if(!images.length) return; images[idx].classList.remove('active'); idx=(idx+1)%images.length; images[idx].classList.add('active'); });

    card.querySelector('.btn-call') ?.addEventListener('click',e=>{ if(!p.agent?.phone) return; e.stopPropagation(); window.location.href=`tel:${String(p.agent.phone).replace(/\s+/g,'')}`; });
    card.querySelector('.btn-email')?.addEventListener('click',e=>{ if(!p.agent?.email) return; e.stopPropagation(); window.location.href=`mailto:${p.agent.email}`; });
    card.querySelector('.btn-wa')   ?.addEventListener('click',e=>{ if(!p.agent?.whatsapp) return; e.stopPropagation(); window.open(`https://wa.me/${String(p.agent.whatsapp).replace(/[^\d+]/g,'')}`,'_blank'); });
  });

  displayPropertyTypesSummary(arr, typeSel?.value);
  updatePagination(pages, page, arr);
}

/* ---------- SLIDER + HISTO ---------- */
function getAllPrices(arr){ return arr.map(p=>Number(p.price)||0).filter(v=>isFinite(v)); }

function updatePriceSliderAndHistogram(){
  const slider=byId('priceSlider'); if(!slider) return;
  if(priceSlider){ priceSlider.destroy(); priceSlider=null; slider.innerHTML=''; }

  const prices=getAllPrices(properties);
  globalMinPrice = prices.length?Math.min(...prices):0;
  globalMaxPrice = prices.length?Math.max(...prices):0;
  if(globalMinPrice===globalMaxPrice){ globalMinPrice=Math.max(0,globalMinPrice-PRICE_STEP); globalMaxPrice+=PRICE_STEP; }

  const pm=byId('priceMin'), px=byId('priceMax');
  const curMin=Number(pm?.value)||globalMinPrice;
  const curMax=Number(px?.value)||globalMaxPrice;

  priceSlider = noUiSlider.create(slider,{
    start:[curMin,curMax], connect:true, step:PRICE_STEP,
    range:{min:globalMinPrice,max:globalMaxPrice},
    tooltips:[true,true],
    format:{to:v=>fmt(Math.round(v)), from:v=>Number(String(v).replace(/[^\d]/g,''))}
  });

  byId('sliderMinLabel').textContent = fmt(globalMinPrice)+' AED';
  byId('sliderMaxLabel').textContent = fmt(globalMaxPrice)+' AED';
  byId('selectedPriceRange').textContent = fmt(curMin)+' - '+fmt(curMax)+' AED';

  const minInput=byId('priceMinInput'), maxInput=byId('priceMaxInput');
  if(minInput) minInput.value=fmt(curMin);
  if(maxInput) maxInput.value=fmt(curMax);

  drawPriceHistogram(properties, globalMinPrice, globalMaxPrice, [curMin,curMax]);

  priceSlider.on('update', vals=>{
    const v1=Number(String(vals[0]).replace(/[^\d]/g,''))||globalMinPrice;
    const v2=Number(String(vals[1]).replace(/[^\d]/g,''))||globalMaxPrice;
    if(minInput) minInput.value=fmt(v1); if(maxInput) maxInput.value=fmt(v2);
    byId('selectedPriceRange').textContent = fmt(v1)+' - '+fmt(v2)+' AED';
    drawPriceHistogram(properties, globalMinPrice, globalMaxPrice, [v1,v2]);
  });
  priceSlider.on('change', vals=>{
    const v1=Number(String(vals[0]).replace(/[^\d]/g,''))||globalMinPrice;
    const v2=Number(String(vals[1]).replace(/[^\d]/g,''))||globalMaxPrice;
    if(pm) pm.value=v1; if(px) px.value=v2;
    handleSearchOrFilter(1);
  });

  minInput?.addEventListener('change', ()=>{ const v1=Number(String(minInput.value).replace(/[^\d]/g,''))||globalMinPrice; priceSlider.set([Math.max(globalMinPrice, Math.min(v1, (Number(px?.value)||globalMaxPrice))), null]); });
  maxInput?.addEventListener('change', ()=>{ const v2=Number(String(maxInput.value).replace(/[^\d]/g,''))||globalMaxPrice; priceSlider.set([null, Math.min(globalMaxPrice, Math.max(v2, (Number(pm?.value)||globalMinPrice))) ]); });

  if(pm && !pm.value) pm.value=curMin;
  if(px && !px.value) px.value=curMax;
}

function drawPriceHistogram(arr,min,max,[smin,smax]=[min,max]){
  const canvas=byId('priceHistogram'); if(!canvas) return;
  const ctx=canvas.getContext('2d'); const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const prices=getAllPrices(arr); if(!prices.length) return;
  const bins=18, hist=Array(bins).fill(0);
  prices.forEach(p=>{ let i=Math.floor((p-min)/((max-min)||1)*(bins-1)); i=Math.max(0,Math.min(bins-1,i)); hist[i]++; });
  const maxHist=Math.max(...hist,2);
  for(let i=0;i<bins;i++){
    const x=Math.floor(i*w/bins)+3, bw=Math.floor(w/bins)-7;
    const y=Math.floor(h-(hist[i]/maxHist)*(h-10)), bh=h-y;
    const b0=min+(i/bins)*(max-min), b1=min+((i+1)/bins)*(max-min);
    ctx.beginPath();
    ctx.fillStyle = (b1>=smin && b0<=smax) ? '#f17100' : '#ffd2a5';
    ctx.strokeStyle='#fff'; ctx.lineWidth=2;
    roundRect(ctx,x,y,bw,bh,5); ctx.fill(); ctx.stroke();
  }
  ctx.save(); ctx.globalAlpha=.78;
  prices.forEach(p=>{ let px=Math.floor((p-min)/((max-min)||1)*w); px=Math.max(4,Math.min(w-4,px)); ctx.beginPath(); ctx.arc(px,h-8,2.2,0,2*Math.PI); ctx.fillStyle='#ff8300'; ctx.fill(); });
  ctx.restore();
}
function roundRect(ctx,x,y,w,h,r){ if(w<2*r) r=w/2; if(h<2*r) r=h/2; ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

/* ---------- FILTRES ---------- */
function handleSearchOrFilter(page=1){
  let arr=properties.slice();

  const q=(byId('search')?.value||'').trim().toLowerCase();
  const commercialType = byId('commercialType')?.value || '';        // "Commercial Rent"/"Commercial Buy"
  const propertyType   = byId('propertyType')?.value || 'Property Type';
  const licenseType    = byId('licenseType')?.value || 'Licence';    // pas de donnée → ignoré
  const bedrooms = byId('bedrooms')?.value || 'Bedrooms';
  const bathrooms= byId('bathrooms')?.value || 'Bathrooms';
  const priceMin = Number(byId('priceMin')?.value)||globalMinPrice;
  const priceMax = Number(byId('priceMax')?.value)||globalMaxPrice;

  const minArea = Number(byId('minAreaInput')?.value)||0;
  const maxArea = Number(byId('maxAreaInput')?.value)||Infinity;
  const isFurnished = !!byId('furnishingFilter')?.checked;
  const keywords=(byId('keywordInput')?.value||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);

  // purpose
  if(commercialType==='Commercial Rent' || commercialType==='Commercial Buy'){
    arr=arr.filter(p=>(p.commercialType||'')===commercialType);
  }
  // license — rien dans la table -> ignorer sauf si l'utilisateur force une valeur ≠ "Licence"
  if(licenseType && licenseType!=='Licence'){
    arr=arr.filter(p=>(p.licenseType||'')===licenseType);
  }
  // type
  if(propertyType && propertyType!=='Property Type'){
    arr=arr.filter(p=>(p.title||'')===propertyType);
  }
  // recherche (type + titre d’annonce + location si jamais dispo)
  if(q){
    arr=arr.filter(p=>(p.title||'').toLowerCase().includes(q)
                || (p.listingTitle||'').toLowerCase().includes(q)
                || (p.location||'').toLowerCase().includes(q));
  }
  // chambres / sdb
  if(bedrooms!=='Bedrooms'){ const min=parseInt(bedrooms); if(!isNaN(min)) arr=arr.filter(p=>(p.bedrooms||0)>=min); }
  if(bathrooms!=='Bathrooms'){ const min=parseInt(bathrooms); if(!isNaN(min)) arr=arr.filter(p=>(p.bathrooms||0)>=min); }

  // surfaces
  if(minArea>0) arr=arr.filter(p=>(p.size||0)>=minArea);
  if(maxArea<Infinity) arr=arr.filter(p=>(p.size||0)<=maxArea);

  // meublé / amenities (pas dans le schéma ⇒ ignorés si vides)
  if(isFurnished) arr=arr.filter(p=>!!p.furnished);
  const checkedAmenities=[...document.querySelectorAll('.amenities-list input[type="checkbox"]:checked')].map(cb=>cb.value);
  if(checkedAmenities.length){ arr=arr.filter(p=>(p.amenities||[]).length && checkedAmenities.every(a=>p.amenities.includes(a))); }

  if(keywords.length){
    arr=arr.filter(p=>{
      const text=[p.title,p.listingTitle,p.location,...(p.amenities||[])].join(' ').toLowerCase();
      return keywords.every(k=>text.includes(k));
    });
  }

  // prix
  arr=arr.filter(p=>(p.price||0)>=priceMin && (p.price||0)<=priceMax);

  filteredProperties=arr;
  displayProperties(filteredProperties,page);
  drawPriceHistogram(properties, globalMinPrice, globalMaxPrice, [priceMin, priceMax]);
}

function handleClearFilters(){
  document.querySelectorAll('.filter-bar input, .filter-bar select').forEach(el=>{
    if(el.tagName==='SELECT') el.selectedIndex=0; else el.value='';
  });
  document.querySelectorAll('#moreFilterPopup input[type="text"]').forEach(i=>i.value='');
  document.querySelectorAll('#moreFilterPopup input[type="checkbox"]').forEach(cb=>{
    cb.checked=false; cb.dispatchEvent(new Event('change',{bubbles:true}));
  });
  byId('priceMin').value=globalMinPrice;
  byId('priceMax').value=globalMaxPrice;
  handleSearchOrFilter(1);
  byId('priceFilterPopup')?.classList.remove('active');
  byId('moreFilterPopup')?.classList.remove('active');
  document.body.classList.remove('price-popup-open');
  document.body.style.overflow='';
  setTimeout(()=>{ document.querySelectorAll('#moreFilterPopup input[type="checkbox"]').forEach(cb=>{
    cb.checked=false; cb.dispatchEvent(new Event('input',{bubbles:true})); cb.dispatchEvent(new Event('change',{bubbles:true}));
  }); },10);
}

/* ---------- POPUPS / SUGGESTIONS / BURGER ---------- */
function bindOpenableFilters(){
  // Price
  byId('openPriceFilter')?.addEventListener('click',()=>{ byId('priceFilterPopup').classList.add('active'); document.body.classList.add('price-popup-open'); setTimeout(()=>byId('priceMinInput')?.focus(),120); });
  byId('closePricePopup')?.addEventListener('click',()=>{ byId('priceFilterPopup').classList.remove('active'); document.body.classList.remove('price-popup-open'); });
  byId('priceFilterPopup')?.addEventListener('mousedown',e=>{ if(e.target===byId('priceFilterPopup')){ byId('priceFilterPopup').classList.remove('active'); document.body.classList.remove('price-popup-open'); }});
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && byId('priceFilterPopup')?.classList.contains('active')){ byId('priceFilterPopup').classList.remove('active'); document.body.classList.remove('price-popup-open'); }});
  byId('validatePriceBtn')?.addEventListener('click',()=>{ const v1=Number(String(byId('priceMinInput')?.value||'').replace(/[^\d]/g,''))||globalMinPrice; const v2=Number(String(byId('priceMaxInput')?.value||'').replace(/[^\d]/g,''))||globalMaxPrice; byId('priceMin').value=v1; byId('priceMax').value=v2; byId('priceFilterPopup').classList.remove('active'); document.body.classList.remove('price-popup-open'); handleSearchOrFilter(1); });

  // More filters
  byId('openMoreFilter')?.addEventListener('click',()=>{ byId('moreFilterPopup').classList.add('active'); document.body.classList.add('more-filters-open'); });
  byId('closeMoreFilter')?.addEventListener('click',()=>{ byId('moreFilterPopup').classList.remove('active'); document.body.classList.remove('more-filters-open'); });
  byId('moreFilterPopup')?.addEventListener('mousedown',function(e){ if(e.target===this){ this.classList.remove('active'); document.body.classList.remove('more-filters-open'); }});
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && byId('moreFilterPopup')?.classList.contains('active')){ byId('moreFilterPopup').classList.remove('active'); document.body.classList.remove('more-filters-open'); }});
  byId('applyMoreFiltersBtn')?.addEventListener('click',()=>{ byId('moreFilterPopup').classList.remove('active'); document.body.classList.remove('more-filters-open'); handleSearchOrFilter(1); });

  // Suggestions (pas de location en BDD → on propose types + titres)
  const input=byId('search'), sug=byId('searchSuggestions');
  input?.addEventListener('input',e=>{
    const val=e.target.value.trim().toLowerCase();
    if(!val){ sug.innerHTML=''; sug.style.display='none'; return; }
    const terms = properties.flatMap(p=>[p.listingTitle||'', p.title||'']).map(s=>s.trim()).filter(s=>s && s.toLowerCase().includes(val));
    const uniq=[...new Set(terms)].slice(0,8);
    if(!uniq.length){ sug.innerHTML=''; sug.style.display='none'; return; }
    sug.innerHTML=uniq.map(t=>{ const reg=new RegExp(`(${val})`,'i'); const label=t.replace(reg,'<strong>$1</strong>'); return `<div class="suggestion-pf-item"><span class="suggestion-pf-icon"><i class="fa-solid fa-location-dot"></i></span><span class="suggestion-pf-label">${label}</span></div>`; }).join('');
    sug.style.display='block';
    [...sug.children].forEach((d,i)=>d.addEventListener('click',()=>{ input.value=uniq[i]; sug.innerHTML=''; sug.style.display='none'; handleSearchOrFilter(1); }));
  });
  document.addEventListener('click',e=>{ if(!sug?.contains(e.target) && e.target!==input){ sug.innerHTML=''; sug.style.display='none'; }});

  // Burger
  const burger=byId('burgerMenu'), nav=document.querySelector('.all-button');
  burger?.addEventListener('click',()=>{
    nav.classList.toggle('mobile-open');
    if(nav.classList.contains('mobile-open')){
      document.body.style.overflow='hidden';
      setTimeout(()=>document.addEventListener('click',function closeOnce(ev){ if(!nav.contains(ev.target) && !burger.contains(ev.target)){ nav.classList.remove('mobile-open'); document.body.style.overflow=''; }},{once:true}),0);
    }else document.body.style.overflow='';
  });
}

/* ---------- DOM READY ---------- */
document.addEventListener('DOMContentLoaded',async()=>{

   

  // 1) charge BDD
  properties = await loadCommercialFromDB();
  filteredProperties = properties.slice();
    bindHeaderDropdown();   

  // 2) bornes prix & premier rendu
  const allPrices=getAllPrices(properties);
  globalMinPrice=allPrices.length?Math.min(...allPrices):0;
  globalMaxPrice=allPrices.length?Math.max(...allPrices):0;
  if(byId('priceMin') && !byId('priceMin').value) byId('priceMin').value=globalMinPrice;
  if(byId('priceMax') && !byId('priceMax').value) byId('priceMax').value=globalMaxPrice;

  displayProperties(filteredProperties,1);
  updatePriceSliderAndHistogram();

  // 3) bindings filtres
  ['search','propertyType','bedrooms','bathrooms','commercialType','licenseType'].forEach(id=>byId(id)?.addEventListener('change',()=>handleSearchOrFilter(1)));
  byId('search')?.addEventListener('input',()=>handleSearchOrFilter(1));
  byId('searchBtn')?.addEventListener('click',()=>handleSearchOrFilter(1));
  byId('clearBtn')?.addEventListener('click',handleClearFilters);

  bindOpenableFilters();

  // back to top
  const top=byId('scrollToTopBtn');
  if(top){
    window.addEventListener('scroll',()=>{ top.style.display=window.scrollY>250?'block':'none'; });
    top.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  }
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



