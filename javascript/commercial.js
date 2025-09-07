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
    if (/^https?:\/\//i.test(t) && !/\/storage\/v1\/object\/public\//i.test(t)){ // http externe
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

  
  
  
  // --- Appliquer les filtres de l'URL à l'UI ---
// --- Appliquer les filtres de l'URL à l'UI (robuste) ---
function applyURLFiltersToUI() {
  const p = new URLSearchParams(location.search);

  const q         = p.get('q')        ?? p.get('search')   ?? '';
  const type      = p.get('type')     ?? '';
  const bedroomsR = p.get('bedrooms') ?? p.get('beds')     ?? '';
  const bathsR    = p.get('bathrooms')?? p.get('baths')    ?? p.get('ba') ?? '';

  // normalize "2+", "7plus", "2%2B", "studio" -> "1+"
  const normPlus = (v) => {
    if (!v) return '';
    let s = String(v).toLowerCase().trim();
    s = s.replace(/%2b/gi, '+').replace(/\s+/g, '');
    if (s === 'studio' || s === '0') return '1+';
    if (s === '7plus') s = '7+';
    if (/^\d+$/.test(s)) return s + '+';
    return s;
  };
  const bedrooms  = normPlus(bedroomsR);
  const bathrooms = normPlus(bathsR);

  const searchInput = document.getElementById('search')
                   || document.querySelector('.searchbar input, input[type="search"], .search-input');
  if (searchInput && q) searchInput.value = q;

  if (type && document.getElementById('propertyType')) {
    document.getElementById('propertyType').value = type;
  }

  const setPlusSelect = (id, raw) => {
    const sel = document.getElementById(id);
    if (!sel || !raw) return;
    const wanted = raw; // ex: "2+"
    const opts = Array.from(sel.options).map(o => (o.value || o.textContent).trim());
    const exact = opts.find(v => v.toLowerCase() === wanted.toLowerCase());
    if (exact) { sel.value = exact; return; }
    const req = parseInt(wanted, 10);
    const nums = opts.map(v => parseInt(String(v).toLowerCase(), 10)).filter(Number.isFinite);
    if (Number.isFinite(req) && nums.length) {
      const best = nums.filter(n => n <= req).sort((a,b)=>b-a)[0] ?? nums[0];
      sel.value = `${best}+`;
    }
  };
  setPlusSelect('bedrooms',  bedrooms);
  setPlusSelect('bathrooms', bathrooms);
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

  // ====== Boot de page (ex: dans buy.js) ======
  (async function bootResults(){
    // 1) Quelle table pour cette page ?
    // (on force avec la page pour éviter les confusions)
    const table = (()=>{
      if (location.pathname.includes('buy'))        return 'buy';
      if (location.pathname.includes('rent'))       return 'rent';
      if (location.pathname.includes('commercial')) return 'commercial';
      return 'offplan';
    })();

    // 2) Lire les filtres & pré-remplir l’UI
    const filters = getURLFilters();
    prefillUIFromParams(filters);

    // 3) Requête Supabase + rendu
    const q = applyFiltersToQuery(window.sb || window.supabase, table, filters);
    const { data, error } = await q;
    if (error){ console.error('Search error:', error); return; }

    // 4) TODO: remplace par ton renderer
    //    Ici, juste un exemple minimal d’injection.
    const list = document.querySelector('#results, .results, .cards');
    if (list){
      list.innerHTML = (data || []).map(row => `
        <article class="card">
          <h3>${row.title ?? 'Property'}</h3>
          <p>${row['localisation'] ?? ''}</p>
        </article>
      `).join('');
    }
  })();



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
/* ---------- CHARGEMENT BDD (table: commercial) ---------- */
async function loadCommercialFromDB() {
  const sb = window.supabase;
  if (!sb) { console.error('Supabase client non trouvé.'); return []; }

  // Agents (+ photo bucket)
  const { data: agentRows, error: e1 } = await sb
    .from('agent')
    .select('id,name,photo_agent_url,phone,email,whatsapp,agency_id,rating');
  if (e1) console.error(e1);

  // Agencies (+ logo bucket)
  const { data: agencyRows, error: e2 } = await sb
    .from('agency')
    .select('id,logo_url,address');
  if (e2) console.error(e2);

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

  // ✅ Alias corrects (colonnes avec espaces)
  const { data: rows, error } = await sb
    .from('commercial')
    .select(`
      id, created_at, title,
      rental_period:"rental period",
      property_type:"property type",
      bedrooms, bathrooms, price, sqft,
      photo_url, agent_id,
      localisation_accueil:"localisation accueil"
    `);
  if (error) { console.error('[commercial select error]', error); return []; }

  return (rows || []).map(r => {
    const ag     = agentsById[r.agent_id] || {};
    const agency = getAgencyForAgent(r.agent_id) || {};

    // Images du bien (0..n) + logo agence en dernier
    const allPhotos = resolveAllPhotosFromBucket(r.photo_url);
    const logo      = agency?.logo_url_resolved || "";
    const images    = [...new Set([ ...(allPhotos.length ? allPhotos : []), ...(logo ? [logo] : []) ])];
    if (!images.length) images.push('styles/photo/dubai-map.jpg');

    const avatar = ag.photo_agent_url_resolved || resolveOneFromBucket(ag.photo_agent_url) || "";

    const rentalRaw = (r.rental_period ?? '').toString().trim();
    const commercialType = rentalRaw ? 'Commercial Rent' : 'Commercial Buy';

    return {
      title: r.property_type || 'Commercial',
      listingTitle: r.title || '',
      price: Number(r.price) || 0,
      size: Number(r.sqft) || 0,
      bedrooms: Number(r.bedrooms) || 0,
      bathrooms: Number(r.bathrooms) || 0,
      location: r.localisation_accueil || agency?.address || '',
      images,
      commercialType,
      licenseType: '',            // (pas dans le schéma actuel)
      furnished: false,           // idem
      amenities: [],              // idem
      agent: {
        name: ag.name || '',
        avatar,
        phone: ag.phone || '',
        email: ag.email || '',
        whatsapp: ag.whatsapp || '',
        rating: ag.rating ?? null
      },
      _id: r.id,
      _created_at: r.created_at
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
function bindSearchSuggestionsUniversal() {
  const input = document.getElementById('search');
  const box   = document.getElementById('searchSuggestions');
  if (!input || !box) return;

  // 👉 Empêche d'ajouter les listeners deux fois
  if (input.dataset.suggestBound === '1') return;
  input.dataset.suggestBound = '1';

  const norm = s => (s||'').toString().toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/\s+/g,' ').trim();

  function getSuggestions(qRaw) {
    const q = norm(qRaw);
    if (!q) return [];
    const seen = new Set();
    const out  = [];

    for (const p of (properties || [])) {
      const type = (p.title||'').trim();
      const loc  = ((p.location||'').split(' - ')[0]).trim(); // ← localisation accueil
      const ag   = (p.agent?.name||'').trim();
      const ttl  = (p.listingTitle||'').trim();               // titre d’annonce

      if (type && norm(type).includes(q) && !seen.has('t:'+type)) { out.push({label:type, icon:'fa-building'});       seen.add('t:'+type); }
      if (loc  && norm(loc ).includes(q) && !seen.has('l:'+loc )) { out.push({label:loc , icon:'fa-map-marker-alt'}); seen.add('l:'+loc ); }
      if (ag   && norm(ag  ).includes(q) && !seen.has('a:'+ag  )) { out.push({label:ag  , icon:'fa-user-tie'});       seen.add('a:'+ag  ); }
      if (ttl  && norm(ttl ).includes(q) && !seen.has('h:'+ttl )) { out.push({label:ttl , icon:'fa-map-marker-alt'}); seen.add('h:'+ttl ); }
    }
    return out.slice(0, 8);
  }

  function render(items) {
    if (!items.length) { box.innerHTML=''; box.classList.remove('visible'); return; }
    box.innerHTML = items.map(s => `
      <div class="suggestion" tabindex="0">
        <span class="suggestion-icon"><i class="fa-solid ${s.icon}"></i></span>
        <span class="suggestion-label">${s.label}</span>
      </div>
    `).join('');
    box.classList.add('visible');

    [...box.querySelectorAll('.suggestion')].forEach((el, i) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = items[i].label;
        box.innerHTML = '';
        box.classList.remove('visible');
        handleSearchOrFilter(1);
      });
    });
  }

  input.addEventListener('input', () => render(getSuggestions(input.value)));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && box.classList.contains('visible')) {
      const first = box.querySelector('.suggestion .suggestion-label');
      if (first) { input.value = first.textContent; box.innerHTML=''; box.classList.remove('visible'); handleSearchOrFilter(1); e.preventDefault(); }
    }
  });
  document.addEventListener('mousedown', (e) => {
    if (!box.contains(e.target) && e.target !== input) { box.innerHTML=''; box.classList.remove('visible'); }
  });
}





// ---- util pour fermer la box de suggestions
function hideSuggestionsBox() {
  const box = document.getElementById('searchSuggestions');
  if (box) { box.innerHTML = ''; box.classList.remove('visible'); }
}

/* ---------- POPUPS / SUGGESTIONS / BURGER ---------- */
function bindOpenableFilters(){
  // Price
  document.getElementById('openPriceFilter')?.addEventListener('click',()=>{
    hideSuggestionsBox();
    document.getElementById('priceFilterPopup').classList.add('active');
    document.body.classList.add('price-popup-open');
    setTimeout(()=>document.getElementById('priceMinInput')?.focus(),120);
  });
  document.getElementById('closePricePopup')?.addEventListener('click',()=>{
    document.getElementById('priceFilterPopup').classList.remove('active');
    document.body.classList.remove('price-popup-open');
  });
  document.getElementById('priceFilterPopup')?.addEventListener('mousedown',e=>{
    if (e.target === document.getElementById('priceFilterPopup')){
      document.getElementById('priceFilterPopup').classList.remove('active');
      document.body.classList.remove('price-popup-open');
    }
  });
  document.addEventListener('keydown',e=>{
    if (e.key === 'Escape' && document.getElementById('priceFilterPopup')?.classList.contains('active')){
      document.getElementById('priceFilterPopup').classList.remove('active');
      document.body.classList.remove('price-popup-open');
    }
  });
  document.getElementById('validatePriceBtn')?.addEventListener('click',()=>{
    const v1 = Number(String(document.getElementById('priceMinInput')?.value||'').replace(/[^\d]/g,'')) || globalMinPrice;
    const v2 = Number(String(document.getElementById('priceMaxInput')?.value||'').replace(/[^\d]/g,'')) || globalMaxPrice;
    document.getElementById('priceMin').value = v1;
    document.getElementById('priceMax').value = v2;
    document.getElementById('priceFilterPopup').classList.remove('active');
    document.body.classList.remove('price-popup-open');
    handleSearchOrFilter(1);
  });

  // More filters
  document.getElementById('openMoreFilter')?.addEventListener('click',()=>{
    hideSuggestionsBox();
    document.getElementById('moreFilterPopup').classList.add('active');
    document.body.classList.add('more-filters-open');
  });
  document.getElementById('closeMoreFilter')?.addEventListener('click',()=>{
    document.getElementById('moreFilterPopup').classList.remove('active');
    document.body.classList.remove('more-filters-open');
  });
  document.getElementById('moreFilterPopup')?.addEventListener('mousedown',function(e){
    if (e.target === this){
      this.classList.remove('active');
      document.body.classList.remove('more-filters-open');
    }
  });
  document.addEventListener('keydown',e=>{
    if (e.key === 'Escape' && document.getElementById('moreFilterPopup')?.classList.contains('active')){
      document.getElementById('moreFilterPopup').classList.remove('active');
      document.body.classList.remove('more-filters-open');
    }
  });
  document.getElementById('applyMoreFiltersBtn')?.addEventListener('click',()=>{
    document.getElementById('moreFilterPopup').classList.remove('active');
    document.body.classList.remove('more-filters-open');
    handleSearchOrFilter(1);
  });

  // Burger
  const burger = document.getElementById('burgerMenu');
  const nav = document.querySelector('.all-button');
  burger?.addEventListener('click',()=>{
    nav.classList.toggle('mobile-open');
    if (nav.classList.contains('mobile-open')){
      document.body.style.overflow='hidden';
      setTimeout(()=>document.addEventListener('click',function closeOnce(ev){
        if (!nav.contains(ev.target) && !burger.contains(ev.target)){
          nav.classList.remove('mobile-open'); document.body.style.overflow='';
        }
      },{once:true}),0);
    } else {
      document.body.style.overflow='';
    }
  });
}




// Icônes: fa-building / fa-map-marker-alt / fa-user-tie

function bindSearchSuggestionsUniversal() {
  const input = document.getElementById('search');
  const box   = document.getElementById('searchSuggestions');
  if (!input || !box) return;

  // 👉 Empêche d'ajouter les listeners deux fois
  if (input.dataset.suggestBound === '1') return;
  input.dataset.suggestBound = '1';

  const norm = s => (s||'').toString().toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/\s+/g,' ').trim();

  function getSuggestions(qRaw) {
    const q = norm(qRaw);
    if (!q) return [];
    const seen = new Set();
    const out  = [];

    for (const p of (properties || [])) {
      const type = (p.title||'').trim();
      const loc  = ((p.location||'').split(' - ')[0]).trim(); // ← localisation accueil
      const ag   = (p.agent?.name||'').trim();
      const ttl  = (p.listingTitle||'').trim();               // titre d’annonce

      if (type && norm(type).includes(q) && !seen.has('t:'+type)) { out.push({label:type, icon:'fa-building'});       seen.add('t:'+type); }
      if (loc  && norm(loc ).includes(q) && !seen.has('l:'+loc )) { out.push({label:loc , icon:'fa-map-marker-alt'}); seen.add('l:'+loc ); }
      if (ag   && norm(ag  ).includes(q) && !seen.has('a:'+ag  )) { out.push({label:ag  , icon:'fa-user-tie'});       seen.add('a:'+ag  ); }
      if (ttl  && norm(ttl ).includes(q) && !seen.has('h:'+ttl )) { out.push({label:ttl , icon:'fa-map-marker-alt'}); seen.add('h:'+ttl ); }
    }
    return out.slice(0, 8);
  }

  function render(items) {
    if (!items.length) { box.innerHTML=''; box.classList.remove('visible'); return; }
    box.innerHTML = items.map(s => `
      <div class="suggestion" tabindex="0">
        <span class="suggestion-icon"><i class="fa-solid ${s.icon}"></i></span>
        <span class="suggestion-label">${s.label}</span>
      </div>
    `).join('');
    box.classList.add('visible');

    [...box.querySelectorAll('.suggestion')].forEach((el, i) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = items[i].label;
        box.innerHTML = '';
        box.classList.remove('visible');
        handleSearchOrFilter(1);
      });
    });
  }

  input.addEventListener('input', () => render(getSuggestions(input.value)));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && box.classList.contains('visible')) {
      const first = box.querySelector('.suggestion .suggestion-label');
      if (first) { input.value = first.textContent; box.innerHTML=''; box.classList.remove('visible'); handleSearchOrFilter(1); e.preventDefault(); }
    }
  });
  document.addEventListener('mousedown', (e) => {
    if (!box.contains(e.target) && e.target !== input) { box.innerHTML=''; box.classList.remove('visible'); }
  });
}






// ---------- DOM READY (remplace entièrement ton ancien bloc) ----------
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 0) Header dropdown (statique)
    bindHeaderDropdown();

    // 1) Charger les données depuis Supabase
    properties = await loadCommercialFromDB();
    filteredProperties = properties.slice();

    // 2) Calculer les bornes de prix et initialiser les champs cachés
    const prices = getAllPrices(properties);
    globalMinPrice = prices.length ? Math.min(...prices) : 0;
    globalMaxPrice = prices.length ? Math.max(...prices) : 0;
    const pm = byId('priceMin');
    const px = byId('priceMax');
    if (pm && !pm.value) pm.value = globalMinPrice;
    if (px && !px.value) px.value = globalMaxPrice;

    // 3) Suggestions de recherche (type / localisation / agent)
    bindSearchSuggestionsUniversal();

    // 4) Appliquer les filtres passés dans l’URL (q, type, bedrooms, bathrooms)
    applyURLFiltersToUI();

    // 5) Premier rendu + slider/histogramme
    handleSearchOrFilter(1);
    updatePriceSliderAndHistogram(properties);

    // 6) Listeners des filtres
    ['search','propertyType','bedrooms','bathrooms','commercialType','licenseType']
      .forEach(id => byId(id)?.addEventListener('change', () => handleSearchOrFilter(1)));
    byId('search')?.addEventListener('input',  () => handleSearchOrFilter(1));
    byId('searchBtn')?.addEventListener('click', () => handleSearchOrFilter(1));
    byId('clearBtn')?.addEventListener('click',  handleClearFilters);

    // 7) Popups (Price / More filters), burger, etc.
    bindOpenableFilters();

    // 8) Back to top
    const top = byId('scrollToTopBtn');
    if (top) {
      window.addEventListener('scroll', () => {
        top.style.display = window.scrollY > 250 ? 'block' : 'none';
      });
      top.addEventListener('click', () =>
        window.scrollTo({ top: 0, behavior: 'smooth' })
      );
    }
  } catch (err) {
    console.error('Boot error:', err);
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





