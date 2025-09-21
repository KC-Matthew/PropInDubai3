
// -- helpers pour citer les colonnes avec espaces + formater le prix
function q(name){ if(!name) return ""; return /[\s()\-]/.test(name) ? `"${String(name).replace(/"/g,'""')}"` : name; }
function formatAED(v){
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toLocaleString()} AED` : (v ?? "");
}



/* ===== Helper prix — EN uniquement pour CETTE page ===== */
function formatAED_EN(value){
  // si value est numérique (ou string numérique) -> "250,000 AED"
  const n = Number(value);
  if (Number.isFinite(n)) {
    return `${new Intl.NumberFormat('en-US').format(n)} AED`;
  }
  // sinon, on renvoie tel quel (ex: "From 250,000 AED")
  return value ?? "";
}


// Quote un nom de colonne s'il contient des espaces  , parenthèses, tirets…
function qq(name){
  if(!name) return null;
  return /[\s()\-]/.test(name) ? `"${String(name).replace(/"/g,'""')}"` : name;
}



async function detectColumns(table) {
  const { data, error } = await window.supabase.from(table).select("*").limit(1);
  if (error) throw error;
  const sample = (data && data[0]) || {};
  const has  = (k) => Object.prototype.hasOwnProperty.call(sample, k);
  const pick = (...c) => c.find(has);

  return {
    id:           pick("id","uuid"),
    title:        pick("title","titre","name"),
    propertyType: pick("property_type","property type"),
    bedrooms:     pick("bedrooms","rooms"),
    bathrooms:    pick("bathrooms"),
    price:        pick("price"),
    sqft:         pick("sqft","sqft (m²)"),
    photo:        pick("photo_bien_url","photo_url","image_url","image"),
    created_at:   pick("created_at"),

    // 👉 NOUVEAU : on détecte explicitement la bonne localisation
    localisationAccueil: pick("localisation accueil","localisation acceuil","localisation_accueil")
  };
}




/* ===== FETCH PROPERTIES (bucket-aware + Offplan) ===== */
async function fetchProperties({ type = "all", limit = 30 } = {}) {
  // cite un nom de colonne si besoin (différent de ton qq() global)
  const qcol = (name) => {
    if (!name) return null;
    const s = String(name);
    return /[^a-zA-Z0-9_]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  // transforme raw (array, JSON string, lignes/virgules/;|) -> [str, ...]
  const toList = (raw) => {
    if (!raw && raw !== 0) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
    const s = String(raw).trim();
    if (!s) return [];
    if ((s.startsWith('[') && s.endsWith(']'))) {
      try { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr.filter(Boolean).map(String); } catch {}
    }
    return s.replace(/^\[|\]$/g,'').split(/[\n,;|]+/).map(x=>x.trim()).filter(Boolean);
  };

  // résout une liste de clés/URLs vers des URLs publiques via Supabase Storage
  const toPublicUrls = (raw, defaultBucket) => {
    const FALLBACK = "https://via.placeholder.com/400x300";
    const list = toList(raw);
    const out = [];
    const allowed = new Set(["buy","rent","commercial","offplan","photos_biens","agents","agency","images","uploads"]);

    for (let item of list) {
      if (!item) continue;
      let v = String(item).replace(/^["']+|["']+$/g, "").trim();

      // déjà une URL publique -> garder
      if (/^https?:\/\//i.test(v) || /\/storage\/v1\/object\/public\//i.test(v)) { out.push(v); continue; }

      // sinon, construire via bucket
      let bucket = String(defaultBucket || "buy").toLowerCase();
      let key = v.replace(/^\/+/, "");

      // si la clé commence par "bucket/..."
      const m = /^([^/]+)\/(.+)$/.exec(key);
      if (m && allowed.has(m[1].toLowerCase())) { bucket = m[1].toLowerCase(); key = m[2]; }
      if (key.toLowerCase().startsWith(bucket + "/")) key = key.slice(bucket.length + 1);

      try {
        const { data } = window.supabase?.storage?.from(bucket)?.getPublicUrl(key) || {};
        if (data?.publicUrl) out.push(data.publicUrl);
      } catch {}
    }

    const uniq = Array.from(new Set(out));
    return uniq.length ? uniq : [FALLBACK];
  };

  // ---- OFF PLAN ----
  const fetchOffplan = async () => {
    const selectOffplan = [
      "id",
      `"titre"`,
      `"localisation"`,
      `"price starting"`,
      `"units types"`,
      `"project status"`,
      "photo_url",
      `"developer photo_url"`,
      "description",
      "lat",
      "lon",
      "created_at"
    ].join(",");

    const { data, error } = await window.supabase
      .from("offplan")
      .select(selectOffplan)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) { console.error("Error fetching offplan", error); return []; }

    return (data || []).map(p => {
      const imgs = toPublicUrls([p.photo_url, p["developer photo_url"]], "offplan");
      return {
        id: p.id,
        title: p["titre"] || "",
        location: p["localisation"] || "Dubai",
        bedrooms: p["units types"] || "",
        bathrooms: p["project status"] || "",
        size: "",
        price: (p["price starting"] != null) ? `From ${formatAED_EN(p["price starting"])}` : "",
        images: imgs,
        description: p.description || "",
        brochure_url: "", // colonne absente dans ton schéma actuel
        lat: p.lat ?? null,
        lon: p.lon ?? null,
        source: "offplan"
      };
    });
  };

  // ---- 1 table standard (rent/buy/commercial) ----
  const fetchOneTable = async (tableName) => {
    try {
      const c = await detectColumns(tableName);

      const base = [c.id, c.title, c.bedrooms, c.bathrooms, c.price, c.sqft, c.photo, c.created_at]
        .filter(Boolean)
        .map(qcol);

      if (c.localisationAccueil) base.push(`localisation_accueil:${qcol(c.localisationAccueil)}`);
      if (c.propertyType)        base.push(`ptype:${qcol(c.propertyType)}`);

      const { data: rows, error } = await window.supabase
        .from(tableName)
        .select(base.join(","))
        .order(c.created_at || c.id, { ascending: false })
        .limit(limit);

      if (error) { console.error(`Error fetching from ${tableName}`, error); return []; }

      return (rows || []).map(r => ({
        id:        r[c.id],
        title:     r[c.title] || "",
        location:  r.localisation_accueil || "",
        typeLabel: r.ptype || "",
        bedrooms:  r[c.bedrooms] ?? "",
        bathrooms: r[c.bathrooms] ?? "",
        size:      r[c.sqft] ?? "",
        images:    toPublicUrls(r[c.photo], tableName), // ← bucket en fonction de la table
        price:     r[c.price],                          // format à l’affichage via formatAED_EN
        _table:    tableName
      }));
    } catch (e) {
      console.error(`Failed to detect columns for ${tableName}`, e);
      return [];
    }
  };

  // ---- router ----
  if (type === "offplan") return await fetchOffplan();
  if (type === "all") {
    const parts = await Promise.all([
      fetchOneTable("rent"),
      fetchOneTable("buy"),
      fetchOneTable("commercial")
    ]);
    return parts.flat();
  }
  if (["rent", "buy", "commercial"].includes(type)) {
    return await fetchOneTable(type);
  }
  return [];
}





// ========= UTILS & LOCAL STORAGE =========
function uuid() { return '_' + Math.random().toString(36).substr(2, 9); }
function getChats() { return JSON.parse(localStorage.getItem('multiChatHistory') || '[]'); }
function saveChats(chats) { localStorage.setItem('multiChatHistory', JSON.stringify(chats)); }
function getFavs() { return JSON.parse(localStorage.getItem('favorites') || '[]'); }
function saveFavs(arr) { localStorage.setItem('favorites', JSON.stringify(arr)); }






/* ===== RENDU DES BIENS (prix affiché en "250,000 AED") ===== */
/* === STYLES CARROUSEL — ne change PAS la taille de l’image === */
function ensurePropertyCarouselStyles() {
  if (document.getElementById('prop-carousel-styles')) return;
  const css = `
  .prop-slider{ position:relative; overflow:hidden; }              /* pas de width/height ici */
  .prop-slider .nav{
    position:absolute; top:50%; transform:translateY(-50%);
    width:36px; height:36px; border:none; border-radius:50%;
    background:#fff; box-shadow:0 4px 14px rgba(0,0,0,.18);
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    font-size:20px; line-height:1; opacity:.95
  }
  .prop-slider .nav.prev{ left:10px }
  .prop-slider .nav.next{ right:10px }
  .prop-slider .nav:active{ transform:translateY(-50%) scale(.97) }
  .prop-slider .count-badge{
    position:absolute; left:10px; bottom:10px; padding:6px 9px; border-radius:12px;
    background:rgba(0,0,0,.55); color:#fff; font:600 12px/1.1 system-ui;
    display:flex; gap:6px; align-items:center
  }
  .prop-slider .count-badge i{ font-size:13px }
  `;
  const tag = document.createElement('style');
  tag.id = 'prop-carousel-styles';
  tag.textContent = css;
  document.head.appendChild(tag);
}

/* === INIT CARROUSEL — remplace juste la src, sans toucher aux dimensions === */
function initCardSlider(rootEl, images) {
  const pics = (Array.isArray(images) && images.length ? images : ["https://via.placeholder.com/800x500"]);
  const imgEl = rootEl.querySelector('img.property-img-v2') || rootEl.querySelector('img');
  const prev  = rootEl.querySelector('.nav.prev');
  const next  = rootEl.querySelector('.nav.next');
  const nSpan = rootEl.querySelector('.img-total');
  const isMobile = window.matchMedia('(max-width:800px)').matches;

  let i = 0;

  // copy radius de l'image pour que tout clippe pareil
  if (imgEl) {
    const br = getComputedStyle(imgEl).borderRadius;
    if (br) rootEl.style.borderRadius = br;
  }

  // ----- pager à points (mobile) -----
  let dotsWrap = null;
  let dots = [];
  if (isMobile) {
    dotsWrap = document.createElement('div');
    dotsWrap.className = 'prop-dots';
    dots = pics.map((_, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'prop-dot';
      b.setAttribute('aria-label', `Image ${idx + 1}`);
      b.addEventListener('click', (e) => { e.stopPropagation(); show(idx); });
      dotsWrap.appendChild(b);
      return b;
    });
    rootEl.appendChild(dotsWrap);
  }

  // ----- flèches / compteur (desktop) -----
  if (nSpan) nSpan.textContent = pics.length;
  const showNav = !isMobile && pics.length > 1;
  if (prev) prev.style.display = showNav ? '' : 'none';
  if (next) next.style.display = showNav ? '' : 'none';

  function alignNavToImage() {
    if (!imgEl || !prev || !next) return;
    const sr = rootEl.getBoundingClientRect();
    const ir = imgEl.getBoundingClientRect();
    const leftGap  = Math.max(0, ir.left  - sr.left);
    const rightGap = Math.max(0, sr.right - ir.right);
    prev.style.left  = `${10 + leftGap}px`;
    next.style.right = `${10 + rightGap}px`;
  }

  function updateDots() {
    if (!isMobile || !dots.length) return;
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
  }

  function show(k) {
    i = (k + pics.length) % pics.length;
    if (imgEl) imgEl.src = pics[i];
    updateDots();
    if (!isMobile) requestAnimationFrame(alignNavToImage);
  }

  if (prev) prev.addEventListener('click', (e)=>{ e.stopPropagation(); show(i-1); });
  if (next) next.addEventListener('click', (e)=>{ e.stopPropagation(); show(i+1); });

  // swipe mobile
  let sx = null;
  rootEl.addEventListener('touchstart', (e)=>{ sx = e.touches[0].clientX; }, {passive:true});
  rootEl.addEventListener('touchend',   (e)=>{
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    sx = null;
  }, {passive:true});

  // resize: recaler les flèches sur desktop
  if (!isMobile) {
    const ro = new ResizeObserver(()=> alignNavToImage());
    if (imgEl) ro.observe(imgEl);
    window.addEventListener('resize', alignNavToImage);
  }

  show(0);
  if (!isMobile) alignNavToImage();
}







  




/* ===== RENDU DES BIENS (carrousel par-dessus l’image existante) ===== */
function renderProperties(list) {
  ensurePropertyCarouselStyles();

  const container = document.getElementById("property-cards-container");
  container.innerHTML = "";
  const favs = getFavs();

  list.forEach((property, idx) => {
    const sliderId = `ps-${property.id || idx}-${Math.random().toString(36).slice(2,7)}`;
    const card = document.createElement("div");
    card.className = "property-card-ui-v2";
    card.style.cursor = "pointer";
    card.style.position = "relative";

    const isFav = favs.includes(property.id);
    const favBtn = `
      <button class="fav-btn${isFav ? " fav-active" : ""}" data-id="${property.id}" aria-label="Ajouter aux favoris">
        <i class="fa fa-heart"></i>
      </button>
    `;

    card.innerHTML = `
      ${favBtn}

      <!-- on garde TA taille via .property-img-v2, on ne la touche pas -->
      <div class="prop-slider" id="${sliderId}">
        <img src="${(property.images && property.images[0]) || ''}" class="property-img-v2" alt="${property.title}" loading="lazy" decoding="async">
        <button class="nav prev"  aria-label="Previous image" onclick="event.stopPropagation()">‹</button>
        <button class="nav next"  aria-label="Next image"     onclick="event.stopPropagation()">›</button>
        <div class="count-badge"><i class="fa fa-camera"></i><span class="img-total">1</span></div>
      </div>

      <div class="property-title-ui-v2">${property.title}</div>
      <div class="property-loc-ui-v2"><i class="fas fa-map-marker-alt"></i> ${property.location || ""}</div>
      <div class="property-features-ui-v2">
        <span><i class="fas fa-bed"></i> ${property.bedrooms ?? ""}</span>
        <span><i class="fas fa-bath"></i> ${property.bathrooms ?? ""}</span>
        <span><i class="fas fa-ruler-combined"></i> ${property.size ?? ""} sqft</span>
      </div>
      <div class="property-desc-ui-v2">${property.description || ''}</div>
      <div class="property-price-ui-v2">${formatAED_EN(property.price)}</div>

      <div class="property-actions-ui-v2">
        <button type="button" onclick="event.stopPropagation();window.location.href='tel:+000000000';">Call</button>
        <button type="button" onclick="event.stopPropagation();window.location.href='mailto:info@propindubai.com';">Email</button>
        <button type="button" onclick="event.stopPropagation();window.open('https://wa.me/', '_blank');">WhatsApp</button>
      </div>
    `;

    // clic carte -> détail
    card.addEventListener("click", () => {
      if (property.source === 'offplan') {
        sessionStorage.setItem('selected_offplan', JSON.stringify({ id: property.id, type: 'offplan' }));
        window.location.href = `off-plan-click.html?id=${encodeURIComponent(property.id)}`;
        return;
      }
      const type = property._table || 'buy';
      sessionStorage.setItem('selected_property', JSON.stringify({ id: property.id, type }));
      window.location.href = `bien.html?id=${encodeURIComponent(property.id)}&type=${encodeURIComponent(type)}`;
    });

    container.appendChild(card);

    // init carrousel (ne modifie PAS les dimensions)
    const sliderEl = document.getElementById(sliderId);
    initCardSlider(sliderEl, property.images);
  });

  setupFavBtns();
}







function setupFavBtns() {
  document.querySelectorAll('.fav-btn').forEach(btn => {
    const id = btn.dataset.id;
    btn.onclick = (e) => {
      e.stopPropagation();
      let favs = getFavs();
      if (favs.includes(id)) {
        favs = favs.filter(x => x !== id);
        btn.classList.remove('fav-active');
      } else {
        favs.push(id);
        btn.classList.add('fav-active');
      }
      saveFavs(favs);
    };
  });
}

// ========= RENDU CHAT =========
function renderChatList(selectedId) {
  const list = document.getElementById('chat-list');
  const chats = getChats();
  list.innerHTML = '';
  chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = 'multi-chat-list-item' + (chat.id === selectedId ? ' active' : '');
    let chatName = chat.title || "New chat";
    if (chatName.length > 30) chatName = chatName.slice(0, 30) + '…';
    item.innerHTML = `
      <i class="fa fa-comments"></i>
      <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:150px;">${chatName}</span>
      <button class="delete-chat-btn" title="Delete chat" data-id="${chat.id}">
        <i class="fa fa-trash"></i>
      </button>
    `;
    item.onclick = (e) => {
      if (e.target.closest('.delete-chat-btn')) return;
      selectChat(chat.id);
    };
    list.appendChild(item);
  });
  list.querySelectorAll('.delete-chat-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      deleteChat(btn.dataset.id);
    };
  });
}

function renderChat(chat) {
  const container = document.getElementById('chat-messages-container');
  const scroll = document.getElementById('chat-messages-scroll');
  container.innerHTML = '';
  if (!chat) return;
  document.getElementById('current-chat-title').textContent = chat.title || 'Chat';
  chat.messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = (msg.type === 'user') ? 'chat-message-user' : 'chat-message-bot';
    div.textContent = msg.text;
    container.appendChild(div);
  });
  setTimeout(() => { scroll.scrollTop = scroll.scrollHeight; }, 50);
  function closeAllMobileLayers() {
  // Overlay de la sidebar
  document.querySelectorAll('.mobile-sidebar-overlay').forEach(ov => ov.classList.remove('active'));
  // Overlay de la nav du header
  const navOverlay = document.getElementById('navOverlay');
  if (navOverlay) navOverlay.style.display = 'none';

  // Fermer la sidebar si ouverte
  const sidebar = document.querySelector('.multi-sidebar');
  if (sidebar) sidebar.classList.remove('open');

  // Fermer le menu header si ouvert
  const nav = document.querySelector('.all-button');
  if (nav) nav.classList.remove('menu-open');

  // Nettoyer le body (scroll + state)
  document.body.style.overflow = '';
  document.body.classList.remove('drawer-open');
}

}



function closeAllMobileLayers() {
  // Overlay de la sidebar
  document.querySelectorAll('.mobile-sidebar-overlay').forEach(ov => ov.classList.remove('active'));
  // Overlay de la nav du header
  const navOverlay = document.getElementById('navOverlay');
  if (navOverlay) navOverlay.style.display = 'none';

  // Fermer la sidebar si ouverte
  const sidebar = document.querySelector('.multi-sidebar');
  if (sidebar) sidebar.classList.remove('open');

  // Fermer le menu header si ouvert
  const nav = document.querySelector('.all-button');
  if (nav) nav.classList.remove('menu-open');

  // Nettoyer le body (scroll + state)
  document.body.style.overflow = '';
  document.body.classList.remove('drawer-open');
}



async function renderAll() {
  let chats = getChats();
  let current = getCurrentChat();
  if (!chats.length) { addNewChat(); chats = getChats(); current = getCurrentChat(); }
  renderChatList(current ? current.id : null);
  renderChat(current);

  const data = await fetchProperties({ type: "all", limit: 30 });
  renderProperties(data);
}

function selectChat(id) {
  localStorage.setItem('multiCurrentChatId', id);
  closeAllMobileLayers();
  renderAll();
}


function addNewChat(selectIt = true) {
  let chats = getChats();
  const newId = uuid();
  const chat = {
    id: newId,
    title: "New chat",
    messages: [{ type: 'bot', text: "Hi there! How can I help you today?" }]
  };
  chats.push(chat);
  saveChats(chats);
  if (selectIt) localStorage.setItem('multiCurrentChatId', newId);
  closeAllMobileLayers();   // ← indispensable sur mobile
  renderAll();
}






function getCurrentChat() {
  const chats = getChats();
  const id = localStorage.getItem('multiCurrentChatId');
  return chats.find(chat => chat.id === id);
}
function addMessageToCurrentChat(type, text) {
  let chats = getChats();
  const id = localStorage.getItem('multiCurrentChatId');
  let chat = chats.find(chat => chat.id === id);
  if (!chat) return;
  chat.messages.push({ type, text });
  if (type === 'user' && chat.messages.filter(m => m.type === 'user').length === 1) {
    let title = text.trim().split(/\s+/).slice(0, 7).join(' ');
    if (title.length > 34) title = title.slice(0, 34) + '...';
    chat.title = title || "New chat";
  }
  saveChats(chats);
  renderChat(chat);
  renderChatList(chat.id);
}
function resetCurrentChat() {
  let chats = getChats();
  const id = localStorage.getItem('multiCurrentChatId');
  let chat = chats.find(chat => chat.id === id);
  if (!chat) return;
  chat.messages = [{ type: 'bot', text: "Hi there! How can I help you today?" }];
  chat.title = "New chat";
  saveChats(chats);
  renderChat(chat);
  renderChatList(chat.id);
}



function deleteChat(chatId) {
  let chats = getChats();
  const idx = chats.findIndex(c => c.id === chatId);
  if (idx === -1) return;
  chats.splice(idx, 1);
  saveChats(chats);
  let newId = (chats[idx] && chats[idx].id) || (chats[idx - 1] && chats[idx - 1].id) || (chats[0] && chats[0].id);
  if (!newId) { addNewChat(true); return; }
  localStorage.setItem('multiCurrentChatId', newId);
  renderAll();
}


// ========= FILTRES =========
function setupFilters() {
  document.querySelectorAll('.chat-pick-btn-v2').forEach(btn => {
    btn.addEventListener('click', async function () {
      document.querySelectorAll('.chat-pick-btn-v2').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // normalize dataset values like "Off Plan", "off-plan", "OFFPLAN"
      const raw = (this.dataset.type || '').trim().toLowerCase();
      const norm = raw.replace(/[\s_-]+/g, '');  // "off plan" → "offplan"

      const map = {
        offplan: 'offplan',
        off: 'offplan',
        new: 'offplan',
        buy: 'buy',
        rent: 'rent',
        commercial: 'commercial',
        all: 'all'
      };

      const type = map[norm] || 'all';

      const data = await fetchProperties({ type });
      renderProperties(data);
    });
  });
}



// ========= DOM READY =========
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-btn').forEach((btn, i) => {
    if (i === 0) btn.onclick = () => { window.location.href = "accueil.html"; };
    btn.addEventListener('click', function () {
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  document.getElementById('new-chat-btn').onclick = () => addNewChat(true);

  document.getElementById('chat-form').onsubmit = function (e) {
    e.preventDefault();
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (!msg) return;
    addMessageToCurrentChat('user', msg);
    input.value = '';
    setTimeout(() => {
      addMessageToCurrentChat('bot', "Thanks for your message! We will check properties accordingly.");
    }, 700);
  };

  document.getElementById('reset-chat-btn').onclick = () => resetCurrentChat();

  setupFilters();
  renderAll();
});

// ========= DROPDOWN =========
document.addEventListener('DOMContentLoaded', function () {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');
  mainBuyBtn.addEventListener('click', function (e) {
    e.preventDefault();
    buyDropdown.classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    if (!buyDropdown.contains(e.target)) {
      buyDropdown.classList.remove('open');
    }
  });
});


/* ====== BURGER MOBILE (header) — AreaForYou ====== */
(function () {
  const burger = document.getElementById('burgerMenu');
  const nav = document.querySelector('.all-button');
  if (!burger || !nav) return;

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
  let overlay;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'navOverlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'transparent',
      zIndex: '2000',   // <<< au-dessus du header + du menu
      display: 'none'
    });
    document.body.appendChild(overlay);
    return overlay;
  }


function openMenu() {
  nav.classList.add('menu-open');
  nav.classList.add('mobile-open');   // <<< pour compat rétro si CSS attend "mobile-open"
  document.body.style.overflow = 'hidden';
  ensureOverlay().style.display = 'block';
}

function closeMenu() {
  nav.classList.remove('menu-open');
  nav.classList.remove('mobile-open'); // <<<
  document.body.style.overflow = '';
  if (overlay) overlay.style.display = 'none';
}


  burger.addEventListener('click', (e) => {
    if (!isMobile()) return;
    e.preventDefault();
    e.stopPropagation();
    nav.classList.contains('menu-open') ? closeMenu() : openMenu();
  });

  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (!isMobile()) closeMenu(); });
})();

// --- Fermer le menu si clic en dehors ou touche Échap
(function () {
  const burger = document.getElementById('burgerMenu');
  const nav = document.querySelector('.all-button');
  if (!burger || !nav) return;

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  function fallbackClose() {
    nav.classList.remove('menu-open', 'mobile-open');
    document.body.style.overflow = '';
    const overlay = document.getElementById('navOverlay');
    if (overlay) overlay.style.display = 'none';
  }


  function handleOutside(target) {
    return !nav.contains(target) && !burger.contains(target);
  }

  // Clic / tap n'importe où → fermer si ouvert et clic hors menu
  const closeOnDoc = (e) => {
    if (!isMobile()) return;
    if (nav.classList.contains('menu-open') && handleOutside(e.target)) {
      // si closeMenu n'est pas accessible (scopé dans l'IIFE), on fait le fallback
      if (typeof closeMenu === 'function') closeMenu(); else fallbackClose();
    }
  };
  document.addEventListener('click', closeOnDoc, true);
  document.addEventListener('touchstart', closeOnDoc, { passive: true, capture: true });

  // Échap → fermer
  window.addEventListener('keydown', (e) => {
    if (!isMobile()) return;
    if (e.key === 'Escape' && nav.classList.contains('menu-open')) {
      if (typeof closeMenu === 'function') closeMenu(); else fallbackClose();
    }
  });
})();


/* ====== MOBILE SPLITTER v2 — 3 états (closed / half / open) + snap + click toggle ====== */
/* ====== MOBILE SPLITTER v2.1 — mêmes API, mais bornes haut/bas + stop milieu fiable ====== */
(function () {
  const mq = window.matchMedia('(max-width: 800px)');
  const chat = document.getElementById('chat-col-v2');
  const props = document.getElementById('properties-col');
  const bar = document.getElementById('splitterBar');
  const container = document.getElementById('split-mobile-container');
  if (!chat || !props || !bar || !container) return;

  /* Réglages ARRÊTS (part de hauteur occupée par le chat)
     - MIN_R → arrêt du BAS (empêche la poignée de “tomber” sous la barre iOS)
     - MAX_R → arrêt du HAUT (empêche la poignée de passer sous le notch / toolbar)
     Ajuste les 2 lignes ci-dessous pour “commencer plus haut / s’arrêter plus bas” */
  const MIN_R = 0.13;  // 10%  (monte-le à 0.12/0.15 si tu veux que le bas reste plus haut)
  const MAX_R = 0.88;  // 88%  (baisse-le à 0.85/0.82 si tu veux que le haut s’arrête plus bas)

  const RATIOS = { closed: MIN_R, half: 0.52, open: MAX_R };
  const STATES = ['half', 'open', 'closed'];   // ordre au clic sur la barre
  let state = 'half';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function enableSmooth() {
    chat.style.transition = 'height .22s';
    props.style.transition = 'height .22s';
  }
  function disableSmooth() {
    chat.style.transition = '';
    props.style.transition = '';
  }
  function overrideMins(zeroForChat, zeroForProps) {
    if (zeroForChat) chat.style.setProperty('min-height', '0', 'important');
    else chat.style.removeProperty('min-height');
    if (zeroForProps) props.style.setProperty('min-height', '0', 'important');
    else props.style.removeProperty('min-height');
  }
  function totalH() {
    return container.getBoundingClientRect().height - bar.offsetHeight;
  }
  function applyRatio(r) {
    const t = totalH();
    const rr = clamp(r, MIN_R, MAX_R);
    const chatH = Math.round(t * rr);
    chat.style.height = chatH + 'px';
    props.style.height = (t - chatH) + 'px';
  }

  function snapTo(newState, animate = true) {
    state = newState;
    if (animate) enableSmooth(); else disableSmooth();

    if (state === 'closed') {
      overrideMins(true, true);
      applyRatio(RATIOS.closed);
    } else if (state === 'open') {
      overrideMins(true, true);
      applyRatio(RATIOS.open);
    } else {
      overrideMins(false, false);
      applyRatio(RATIOS.half);
    }
    setTimeout(disableSmooth, 260);
  }

  // init mobile: semi-ouvert
  function init() {
    if (!mq.matches) return;
    snapTo('half', false);
  }
  init();

  // resize: nettoyage desktop / re-application mobile
  window.addEventListener('resize', () => {
    if (!mq.matches) {
      disableSmooth();
      chat.style.height = '';
      chat.style.removeProperty('min-height');
      props.style.height = '';
      props.style.removeProperty('min-height');
    } else {
      snapTo(state, false);
    }
  });

  // Drag avec bornes + snap au plus proche (bas / milieu / haut)
  let dragging = false, startY = 0, startChatH = 0, moved = 0;

  bar.addEventListener('mousedown', (e) => {
    if (!mq.matches) return;
    dragging = true; moved = 0;
    startY = e.clientY;
    startChatH = chat.getBoundingClientRect().height;
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    moved = Math.max(moved, Math.abs(dy));
    overrideMins(true, true);
    disableSmooth();

    const t = totalH();
    const minH = Math.round(MIN_R * t);
    const maxH = Math.round(MAX_R * t);

    const h = clamp(startChatH + dy, minH, maxH);  // ← clampé entre MIN/MAX
    chat.style.height = h + 'px';
    props.style.height = (t - h) + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';

    const t = totalH();
    const h = parseFloat(chat.style.height) || 0;
    const ratio = clamp(h / t, MIN_R, MAX_R);

    // choisir l'état le plus proche
    let best = 'half', bestDist = Infinity;
    ['closed', 'half', 'open'].forEach(s => {
      const d = Math.abs(ratio - RATIOS[s]);
      if (d < bestDist) { bestDist = d; best = s; }
    });
    snapTo(best, true);
  });

  // Touch
  bar.addEventListener('touchstart', (e) => {
    if (!mq.matches) return;
    const t = e.touches[0];
    dragging = true; moved = 0;
    startY = t.clientY;
    startChatH = chat.getBoundingClientRect().height;
    document.body.style.userSelect = 'none';
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    const dy = t.clientY - startY;
    moved = Math.max(moved, Math.abs(dy));
    overrideMins(true, true);
    disableSmooth();

    const tot = totalH();
    const minH = Math.round(MIN_R * tot);
    const maxH = Math.round(MAX_R * tot);

    const h = clamp(startChatH + dy, minH, maxH);  // ← clampé
    chat.style.height = h + 'px';
    props.style.height = (tot - h) + 'px';
  }, { passive: true });
  function endTouch() {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    const t = totalH();
    const h = parseFloat(chat.style.height) || 0;
    const ratio = clamp(h / t, MIN_R, MAX_R);
    let best = 'half', bestDist = Infinity;
    ['closed', 'half', 'open'].forEach(s => {
      const d = Math.abs(ratio - RATIOS[s]);
      if (d < bestDist) { bestDist = d; best = s; }
    });
    snapTo(best, true);
  }
  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);

  // Clic sur la barre → cycle entre half → open → closed → half…
  bar.addEventListener('click', () => {
    if (!mq.matches || moved > 3) return; // ignore si c’était un drag
    const i = STATES.indexOf(state);
    const next = STATES[(i + 1) % STATES.length];
    snapTo(next, true);
  });
})();



/* ===== MOBILE EDGE TAB → ouvre/ferme la sidebar (mobile only) ===== */
(function () {

    

  const mq = window.matchMedia('(max-width: 800px)');
  if (!mq.matches) return;

  const sidebar = document.querySelector('.multi-sidebar');
  if (!sidebar) return;

  // overlay (réutilise ta classe .mobile-sidebar-overlay)
  let overlay = document.getElementById('mobileSidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobileSidebarOverlay';
    overlay.className = 'mobile-sidebar-overlay';
    document.body.appendChild(overlay);
  }

  // onglet collé à gauche
  let tab = document.getElementById('mobileSidebarTab');
  if (!tab) {
    tab = document.createElement('button');
    tab.id = 'mobileSidebarTab';
    tab.className = 'mobile-sidebar-tab';
    tab.setAttribute('aria-label', 'Open menu');
    tab.innerHTML = '<span class="tab-arrow">❯</span>'; // chevron
    document.body.appendChild(tab);
  }

  // style injecté (mobile only)
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width:800px){
      .mobile-sidebar-tab{
        position: fixed;
        left: 0;
        top: 42vh;                   /* ajuste si tu veux plus haut/bas */
        transform: translateX(-4px);
        width: 28px; height: 56px;
        border-radius: 0 14px 14px 0;
        border: none; background: #ff9100; color:#fff;
        box-shadow: 0 4px 16px rgba(0,0,0,.18);
        z-index: 2050; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
      }
      .mobile-sidebar-tab .tab-arrow{ font-size:20px; line-height:1; transform: translateX(1px); }
      .mobile-sidebar-tab.hidden{ display:none !important; }
    }`;
  document.head.appendChild(style);

  function openSidebar(){
    sidebar.classList.add('open');
    overlay.classList.add('active');
    tab.classList.add('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar(){
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    tab.classList.remove('hidden');
    document.body.style.overflow = '';
  }
  function toggleSidebar(){
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  }

  // actions
  tab.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', closeSidebar);

  

  // fermer après clic dans le menu
  sidebar.querySelectorAll('a, button').forEach(el => el.addEventListener('click', closeSidebar));

  // si on repasse desktop, on nettoie
  window.addEventListener('resize', () => {
    if (!mq.matches) {
      closeSidebar();
      tab && tab.remove();
      overlay && overlay.classList.remove('active');
    }
  });
})();




/* === Mobile: “chat list” opener left to the title (no side tab) === */
(function mobileChatDrawer(){
  const mq = window.matchMedia('(max-width: 800px)');
  if (!mq.matches) return;

  // Nettoyage: enlève toute ancienne poignée/flèche latérale si présente
  document.querySelectorAll('#mobileSidebarTab, .mobile-sidebar-tab, .chat-prompt-tab, .side-tab, .drawer-handle, .chat-side-handle')
    .forEach(el => el.remove());

  const header  = document.querySelector('.multi-header');
  const title   = document.getElementById('current-chat-title');
  const sidebar = document.querySelector('.multi-sidebar');
  if (!header || !title || !sidebar) return;

  // Overlay (créé si absent)
  let overlay = document.querySelector('.mobile-sidebar-overlay');
  if (!overlay){
    overlay = document.createElement('div');
    overlay.className = 'mobile-sidebar-overlay';
    document.body.appendChild(overlay);
  }

  // Bouton d’ouverture (icône chat), à gauche du titre
  let trigger = header.querySelector('.chat-toggle-btn-mobile');
  if (!trigger){
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'chat-toggle-btn-mobile';
    trigger.setAttribute('aria-label','Open chat list');
    trigger.innerHTML = '<i class="fa fa-comments"></i>'; // icône chat (≠ burger)
    header.insertBefore(trigger, title);
  }

  const openDrawer = ()=>{
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.classList.add('drawer-open');  // cache le bouton via CSS
    document.body.style.overflow = 'hidden';
  };
  const closeDrawer = ()=>{
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.classList.remove('drawer-open');
    document.body.style.overflow = '';
  };
  const toggleDrawer = ()=> (sidebar.classList.contains('open') ? closeDrawer() : openDrawer());

  trigger.addEventListener('click', (e)=>{ e.preventDefault(); toggleDrawer(); });
  overlay.addEventListener('click', closeDrawer);
  window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeDrawer(); });

  // Si on repasse desktop, on ferme proprement
  window.addEventListener('resize', ()=>{ if(!window.matchMedia('(max-width:800px)').matches) closeDrawer(); });
})();
