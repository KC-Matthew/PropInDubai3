// ========= SUPABASE - FETCH PROPERTIES =========
// ========= DETECTION DES COLONNES =========
async function detectColumns(table) {
  const { data, error } = await window.supabase.from(table).select("*").limit(1);
  if (error) throw error;
  const sample = (data && data[0]) || {};
  const has = (k) => Object.prototype.hasOwnProperty.call(sample, k);
  const pick = (...c) => c.find(has);
  return {
    id: pick("id", "uuid"),
    title: pick("title", "titre", "name"),
    location: pick("property_type", "location", "community"),
    bedrooms: pick("bedrooms", "rooms"),
    bathrooms: pick("bathrooms"),
    price: pick("price"),
    sqft: pick("sqft", "sqft (m²)"),
    photo: pick("photo_bien_url", "photo_url", "image_url", "image"),
    created_at: pick("created_at")
  };
}

// ========= FETCH PROPERTIES =========
async function fetchProperties({ type = "all", limit = 30 } = {}) {
  let data = [];

  const sources = {
    rent: (type === "rent" || type === "all"),
    buy: (type === "buy" || type === "all"),
    commercial: (type === "commercial" || type === "all")
  };

  for (const [tableName, shouldFetch] of Object.entries(sources)) {
    if (!shouldFetch) continue;

    try {
      const columns = await detectColumns(tableName);
      const fields = [columns.id, columns.title, columns.location, columns.bedrooms, columns.bathrooms, columns.price, columns.sqft, columns.photo, columns.created_at]
        .filter(Boolean)
        .join(",");

      const { data: tableData, error } = await window.supabase
        .from(tableName)
        .select(fields)
        .order(columns.created_at, { ascending: false })
        .limit(limit);

      if (error) {
        console.error(`Error fetching from ${tableName}`, error);
        continue;
      }

      data = data.concat((tableData || []).map(p => ({
        ...p,
        location: p[columns.location] || "Dubai",
        size: p[columns.sqft],
        images: [p[columns.photo] || "https://via.placeholder.com/400x300"],
        title: p[columns.title],
        bedrooms: p[columns.bedrooms],
        bathrooms: p[columns.bathrooms],
        price: p[columns.price],
        id: p[columns.id]
      })));
    } catch (e) {
      console.error(`Failed to detect columns for ${tableName}`, e);
    }
  }

  return data;
}





// ========= UTILS & LOCAL STORAGE =========
function uuid() { return '_' + Math.random().toString(36).substr(2, 9); }
function getChats() { return JSON.parse(localStorage.getItem('multiChatHistory') || '[]'); }
function saveChats(chats) { localStorage.setItem('multiChatHistory', JSON.stringify(chats)); }
function getFavs() { return JSON.parse(localStorage.getItem('favorites') || '[]'); }
function saveFavs(arr) { localStorage.setItem('favorites', JSON.stringify(arr)); }

// ========= RENDU DES BIENS =========
function renderProperties(list) {
  const container = document.getElementById("property-cards-container");
  container.innerHTML = "";
  const favs = getFavs();
  list.forEach(property => {
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
      <img src="${property.images[0]}" class="property-img-v2" alt="${property.title}">
      <div class="property-title-ui-v2">${property.title}</div>
      <div class="property-loc-ui-v2"><i class="fas fa-map-marker-alt"></i> ${property.location}</div>
      <div class="property-features-ui-v2">
        <span><i class="fas fa-bed"></i> ${property.bedrooms}</span>
        <span><i class="fas fa-bath"></i> ${property.bathrooms}</span>
        <span><i class="fas fa-ruler-combined"></i> ${property.size} sqft</span>
      </div>
      <div class="property-desc-ui-v2">${property.description || ''}</div>
      <div class="property-price-ui-v2">${property.price}</div>
      <div class="property-actions-ui-v2">
        <button type="button" onclick="event.stopPropagation();window.location.href='tel:+000000000';">Call</button>
        <button type="button" onclick="event.stopPropagation();window.location.href='mailto:info@propindubai.com';">Email</button>
        <button type="button" onclick="event.stopPropagation();window.open('https://wa.me/', '_blank');">WhatsApp</button>
      </div>
    `;
    card.addEventListener("click", () => { window.location.href = "bien.html"; });
    container.appendChild(card);
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

// ========= LOGIQUE CHAT =========
function selectChat(id) {
  localStorage.setItem('multiCurrentChatId', id);
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
  renderAll();
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

      let type = this.dataset.type;
      if (type === "new") type = "commercial";

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
