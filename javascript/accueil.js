
// === Router: onglet -> page
function scopeToPage(scope){
  switch(scope){
    case 'buy':         return 'buy.html';
    case 'rent':        return 'rent.html';
    case 'commercial':  return 'commercial.html';
    case 'new projects':return 'off-plan-search.html'; // ou 'off-plan-map.html' si c’est le tien
    default:            return 'buy.html';
  }
}

function getActiveScope(){
  // On préfère le bloc mobile visible, sinon desktop
  const visibleMobile = Array.from(document.querySelectorAll('.mobile-hero-bottom'))
    .find(el => el && el.offsetParent !== null);
  const container = visibleMobile || document.querySelector('.overlay');
  const active = container?.querySelector('.tab.active') || document.querySelector('.tab.active');
  return (active?.textContent || 'buy').trim().toLowerCase();
}




// === Lecture des filtres visibles dans l’overlay OU mobile
function readFiltersFromUI(){
  // input mobile visible si présent, sinon input desktop
  const mobileInputs = Array.from(document.querySelectorAll('.mobile-searchbar .search-input'))
    .filter(el => el && el.offsetParent !== null); // visible
  const input = mobileInputs[0] || document.querySelector('.overlay .search-input');

  const q = (input?.value || '').trim();

  const typeDrop = document.getElementById('propertyTypeDropdown');
  const type = (typeDrop?.dataset.selectedType || '').trim();

  const bbDrop = document.getElementById('bedsBathsDropdown');
  const bedrooms = (bbDrop?.dataset.bedroomsVal || '').trim();   // 'studio'|'1'..'7plus'
  const bathrooms = (bbDrop?.dataset.bathroomsVal || '').trim(); // '1'..'7plus'

  return { q, type, bedrooms, bathrooms };
}


// === Construire l'URL
function buildSearchURL(){
  const scope = getActiveScope();                 // onglet actif
  const page  = scopeToPage(scope);               // page cible
  const { q, type, bedrooms, bathrooms } = readFiltersFromUI();

  const params = new URLSearchParams();
  params.set('scope', scope);                     // utile côté cible
  if (q)         params.set('q', q);
  if (type)      params.set('type', type);
  if (bedrooms)  params.set('bedrooms', bedrooms);
  if (bathrooms) params.set('bathrooms', bathrooms);

  // Exemple: buy.html?scope=buy&q=Al%20Wasl&type=Villa&bedrooms=2&bathrooms=2
  return `${page}?${params.toString()}`;
}

// === Brancher les 2 boutons Search (desktop + mobile) à la même action

(function wireSearchButtons(){
  const go = (e)=>{
    if (e) e.preventDefault();
    const url = buildSearchURL();
    window.location.assign(url);
  };

  // Desktop
  document.querySelector('.overlay .search-btn')?.addEventListener('click', go);

  // Mobile → il y a 2 boutons : on les prend TOUS
  document.querySelectorAll('.mobile-searchbar .search-btn').forEach(btn=>{
    btn.addEventListener('click', go);
  });

  // Entrée clavier sur TOUS les inputs
  document.querySelectorAll('.search-input').forEach(inp=>{
    inp.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); go(); }
    });
  });
})();





// Onglets (tabs)
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// --- Custom Dropdown Property Type ---
(function () {
  const drop = document.getElementById('propertyTypeDropdown');
  if (!drop) return;
  const btn = drop.querySelector('.dropdown-btn');
  const label = btn.querySelector('.dropdown-label');
  const menu = drop.querySelector('.dropdown-menu');

  let selectedType = '';
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => { if (d !== drop) d.classList.remove('open'); });
    drop.classList.toggle('open');
  });

  menu.addEventListener('click', function (e) {
    if (!e.target.classList.contains('dropdown-item')) return;
    [...menu.querySelectorAll('.dropdown-item')].forEach(x => x.classList.remove('selected'));
    e.target.classList.add('selected');
    selectedType = e.target.textContent.trim();
    label.textContent = selectedType || 'Property type';
    drop.classList.remove('open');
  });

  drop.dataset.selectedType = '';
  const observer = new MutationObserver(() => { drop.dataset.selectedType = selectedType; });
  observer.observe(menu, { attributes: true, subtree: true });
  document.addEventListener('click', () => drop.classList.remove('open'));
})();

// --- Custom Dropdown Beds & Baths ---
(function () {
  const drop = document.getElementById('bedsBathsDropdown');
  if (!drop) return;
  const btn = drop.querySelector('.dropdown-btn');
  const label = btn.querySelector('.dropdown-label');
  const menu = drop.querySelector('.dropdown-menu');

  let bedroomsVal = '';
  let bathroomsVal = '';

  function setSelected(container, target) {
    [...container.children].forEach(x => x.classList.remove('selected'));
    target.classList.add('selected');
  }
  function prettyFromVal(val, isBed) {
    if (!val) return '';
    if (val === 'studio') return 'Studio';
    if (val === '7plus') return '7+ ' + (isBed ? 'Bed' : 'Bath');
    return `${val} ${isBed ? 'Bed' : 'Bath'}`;
  }
  function updateLabel() {
    if (!bedroomsVal && !bathroomsVal) { label.textContent = 'Beds & Baths'; return; }
    const bedTxt = prettyFromVal(bedroomsVal, true);
    const bathTxt = prettyFromVal(bathroomsVal, false);
    label.textContent = [bedTxt, bathTxt].filter(Boolean).join(', ');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => { if (d !== drop) d.classList.remove('open'); });
    drop.classList.toggle('open');
  });

  const bedsBox = menu.querySelector('[data-type="bedrooms"]');
  bedsBox.addEventListener('click', function (e) {
    if (!e.target.classList.contains('dropdown-item')) return;
    const text = e.target.textContent.trim().toLowerCase();
    setSelected(this, e.target);
    bedroomsVal = (text === 'studio') ? 'studio' : (text === '7+' ? '7plus' : text);
    updateLabel();
  });

  const bathsBox = menu.querySelector('[data-type="bathrooms"]');
  bathsBox.addEventListener('click', function (e) {
    if (!e.target.classList.contains('dropdown-item')) return;
    const text = e.target.textContent.trim().toLowerCase();
    setSelected(this, e.target);
    bathroomsVal = (text === '7+' ? '7plus' : text);
    updateLabel();
  });

  drop.dataset.bedroomsVal = '';
  drop.dataset.bathroomsVal = '';
  const observer = new MutationObserver(() => {
    drop.dataset.bedroomsVal = bedroomsVal;
    drop.dataset.bathroomsVal = bathroomsVal;
  });
  observer.observe(menu, { attributes: true, subtree: true });
  document.addEventListener('click', () => drop.classList.remove('open'));
})();



// Reveal
document.addEventListener('DOMContentLoaded', function () {
  if (window.ScrollReveal) {
    ScrollReveal().reveal('.ai-section, .offplan-section, .roi-section, .map-section', {
      duration: 1000, distance: '50px', origin: 'bottom', easing: 'ease-in-out', reset: false, interval: 200
    });
  }
});

// Mobile burger menu
/* ====== BURGER (mobile only, toggle fiable au re-clic) ====== */
(function(){
  if (!window.matchMedia('(max-width:700px)').matches) return;

  const burger = document.getElementById('burgerMenu');
  const nav = document.querySelector('.all-button');
  if (!burger || !nav) return;

  // styles d'ouverture (on ne touche pas à la disposition globale)
  const openStyles = {
    display: ['flex','important'],
    position: ['fixed','important'],
    top: ['54px','important'],
    left: ['0','important'],
    right: ['0','important'],
    width: ['100vw','important'],
    'flex-direction': ['column','important'],
    background: ['#fff','important'],
    'box-shadow': ['0 2px 20px rgba(0,0,0,.11)','important'],
    'z-index': ['10001','important'],
    padding: ['16px 0','important'],
    gap: ['0','important'],
    'max-height': ['calc(100vh - 54px)','important'],
    overflow: ['auto','important']
  };
  const apply = s => Object.entries(s).forEach(([k,[v,p]])=> nav.style.setProperty(k, v, p));

  // garantir que le burger reste cliquable pour refermer

  burger.style.setProperty('z-index','10002','important');
  nav.style.setProperty('z-index','10001','important');

  let isOpen = false;
  let justToggled = false; // évite qu'un event "outside" mange le re-clic sur burger

  function setOpen(v){
    isOpen = v;
    if (isOpen){
      apply(openStyles);
      nav.classList.add('mobile-open');
      document.body.style.overflow = 'hidden';
      burger.setAttribute('aria-expanded','true');
    }else{
      nav.classList.remove('mobile-open');
      nav.style.setProperty('display','none','important'); // repli réel
      document.body.style.overflow = '';
      burger.setAttribute('aria-expanded','false');
    }
  }
  function toggle(){ setOpen(!isOpen); }

  // 👉 re-clic sur le burger = toggle (ferme si ouvert)
  burger.addEventListener('pointerup', (e)=>{
    e.preventDefault(); e.stopPropagation();
    justToggled = true;
    toggle();
    setTimeout(()=>{ justToggled = false; }, 80);
  });

  // fermer quand on clique un lien du menu
  nav.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=> setOpen(false)));

  // tap "dehors" : ferme ET réexpédie le clic à l'élément dessous (Search reste OK)
  const onOutsidePointerDown = (e)=>{
    if (!isOpen || justToggled) return;
    const inside = nav.contains(e.target) || burger.contains(e.target);
    if (inside) return;

    e.preventDefault(); e.stopPropagation();

    const pt = e.touches?.[0] || e;
    const x = pt.clientX || 0, y = pt.clientY || 0;

    setOpen(false);

    const underEl = document.elementFromPoint(x, y);
    if (underEl && !nav.contains(underEl) && !burger.contains(underEl)){
      underEl.click?.();
    }
  };
  document.addEventListener('pointerdown', onOutsidePointerDown, true);
  document.addEventListener('touchstart', onOutsidePointerDown, { capture:true, passive:false });

  // sécurité: si on repasse en >700px on ferme
  window.addEventListener('resize', ()=> {
    if (!window.matchMedia('(max-width:700px)').matches) setOpen(false);
  });
})();




// Menu Buy (header) : clic sur la flèche seulement
document.addEventListener('DOMContentLoaded', function () {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn  = document.getElementById('mainBuyBtn');
  const arrow       = mainBuyBtn?.querySelector('.arrow');
  arrow?.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    buyDropdown?.classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    if (!buyDropdown?.contains(e.target)) buyDropdown?.classList.remove('open');
  });
});

/* ========= AUTOCOMPLETE → Supabase ========= */
const TAB_CONF = {
  "rent":        { table: "rent",        cols: ['title', 'localisation', 'localisation accueil', 'localisation acceuil'] },
  "buy":         { table: "buy",         cols: ['title', 'localisation', 'localisation accueil', 'localisation acceuil'] },
  "commercial":  { table: "commercial",  cols: ['title', 'localisation', 'localisation accueil', 'localisation acceuil'] },
  "new projects":{ table: "offplan",     cols: ['titre', 'localisation', 'developer name'] }
};
const PIN_SVG = `<svg class="sugg-pin" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M12 22s7-5.33 7-12a7 7 0 10-14 0c0 6.67 7 12 7 12z"/><circle cx="12" cy="10" r="3"/></svg>`;
const debounce = (fn, wait=120)=>{ let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a),wait);} };
const getTabKey = ()=> (document.querySelector('.tab.active')?.textContent.trim().toLowerCase() || "buy");
const normColName = c => c.includes(' ') ? `"${c}"` : c;

async function querySupabaseSafe(sb, table, cols, q){
  const results = new Map();
  for (const colRaw of cols){
    const col = normColName(colRaw);
    try{
      const { data, error } = await sb.from(table).select('*').ilike(col, `%${q}%`).limit(5);
      if (error){ console.warn(`[autocomplete] ${table}.${colRaw}:`, error.code, error.message); continue; }
      (data || []).forEach(row => results.set(row.id || JSON.stringify(row), row));
    }catch(e){ console.warn(`[autocomplete] catch ${table}.${colRaw}:`, e); }
  }
  return Array.from(results.values()).slice(0, 8);
}

function buildLabel(row){
  const buildingKeys = ['building','building_name','buildingName','building name','project','project_name','project name','tower','tower_name','tower name','community','community_name','community name'];
  const locationKeys = ['localisation','localisation accueil','localisation acceuil','location','city','area','neighborhood','community','district'];
  const pick = (obj, keys) => { for (const k of keys){ if (obj[k] && String(obj[k]).trim()) return String(obj[k]).trim(); } return ''; };
  const building = pick(row, buildingKeys);
  const location = pick(row, locationKeys);
  return { main: building || location || '', sub: '' };
}

function placeMobileDropdown(input, listEl){
  const rect = input.getBoundingClientRect();
  Object.assign(listEl.style, { position:'fixed', left: rect.left+'px', width: rect.width+'px', top: (rect.bottom+8)+'px', zIndex: 99999 });
}

function hi(text, q){
  if(!text) return "";
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? text : `${text.slice(0,i)}<span class="match">${text.slice(i,i+q.length)}</span>${text.slice(i+q.length)}`;
}

function renderList(listEl, rows, q, tabKey, inputForMobile){
  listEl.innerHTML = "";
  if (!rows.length){ listEl.style.display = "none"; return; }

  rows.forEach(r=>{
    const { main, sub } = buildLabel(r, tabKey);
    const li = document.createElement('li');
    li.innerHTML = `${PIN_SVG}<span>${hi(main,q)}${sub ? ` <small style="color:#6b7280">(${hi(sub,q)})</small>` : ""}</span>`;
    li.addEventListener('click', ()=>{
      const input = listEl.closest('.search-bar, .mobile-searchbar')?.querySelector('.search-input') || inputForMobile;
      if (input) input.value = main || "";
      listEl.style.display = "none";
      listEl.innerHTML = "";
      input?.focus();
    });
    listEl.appendChild(li);
  });

  listEl.style.display = "block";
  if (listEl.id === 'suggestionsMobile' && inputForMobile){
    if (listEl.parentElement !== document.body) document.body.appendChild(listEl);
    placeMobileDropdown(inputForMobile, listEl);
  }
}

function attachOne(sb, input, listEl){
  if (!input || !listEl) return;
  const isMobile = listEl.id === 'suggestionsMobile';

  let activeIndex = -1;
  function focusItem(idx){
    const items = Array.from(listEl.querySelectorAll('li'));
    items.forEach((el,i)=> el.style.background = i===idx ? '#f3f4f6' : '');
    activeIndex = idx;
  }

  input.addEventListener('keydown', (e)=>{
    const items = Array.from(listEl.querySelectorAll('li'));
    if (!items.length) return;
    if (e.key === 'ArrowDown'){ e.preventDefault(); focusItem(Math.min(activeIndex+1, items.length-1)); }
    if (e.key === 'ArrowUp'){ e.preventDefault(); focusItem(Math.max(activeIndex-1, 0)); }
    if (e.key === 'Enter' && activeIndex >= 0){ e.preventDefault(); items[activeIndex].click(); }
  });

  const reflowMobile = ()=>{ if (isMobile && listEl.style.display === 'block') placeMobileDropdown(input, listEl); };
  window.addEventListener('resize', reflowMobile, true);
  window.addEventListener('scroll', reflowMobile, true);
  input.addEventListener('focus', reflowMobile);

  input.addEventListener('input', debounce(async (ev)=>{
    const val = ev.target.value.trim();
    if (val.length < 2){ listEl.style.display="none"; listEl.innerHTML=""; return; }
    const tabKey = getTabKey();
    const conf = TAB_CONF[tabKey] || TAB_CONF["buy"];
    const data = await querySupabaseSafe(sb, conf.table, conf.cols, val);
    renderList(listEl, data, val, tabKey, isMobile ? input : null);
  }, 140));

  listEl.addEventListener('touchstart', ()=>{}, {passive:true});

  document.addEventListener('click', (e)=>{
    if (!listEl.contains(e.target) && e.target !== input){
      listEl.innerHTML = ""; listEl.style.display = "none";
    }
  });
}

// --- INIT UNIQUE ---
(function initAutocompleteWrapper(){
  const start = ()=>{
    const sb = window.sb || window.supabase;
    if (!sb){ console.error("Supabase non initialisé"); return; }

    // Desktop
    attachOne(
      sb,
      document.querySelector('.overlay .search-bar .search-input'),
      document.getElementById('suggestionsDesktop')
    );

    // Mobile: attacher à TOUS les inputs .mobile-searchbar (visible ou pas)
    const mobileList = document.getElementById('suggestionsMobile');
    if (mobileList && mobileList.parentElement !== document.body) {
      document.body.appendChild(mobileList); // sortir du conteneur, évite overflow/pointer-events
    }

    const mobileInputs = Array.from(document.querySelectorAll('.mobile-searchbar .search-input'));
    mobileInputs.forEach(inp => attachOne(sb, inp, mobileList));
  };

  if (window.sb || window.supabase) start();
  else window.addEventListener('supabase:ready', start, { once:true });
})();
