// ==================== Multi-chat & propriétés ====================
function uuid() { return '_' + Math.random().toString(36).substr(2, 9); }
function getChats() { return JSON.parse(localStorage.getItem('multiChatHistory') || '[]'); }
function saveChats(chats) { localStorage.setItem('multiChatHistory', JSON.stringify(chats)); }

let propertiesData = [
  {
    title: "Modern 2BR Apartment in Downtown",
    location: "Downtown Dubai",
    bedrooms: 2, bathrooms: 2, size: 1100,
    description: "Spacious and elegant unit with Burj Khalifa view.",
    price: "AED 2,400,000", images: ["styles/photo/insta.png"],
  },
  {
    title: "Studio in Business Bay", location: "Business Bay",
    bedrooms: 1, bathrooms: 1, size: 520,
    description: "Perfect for investment with high ROI.",
    price: "AED 850,000", images: ["styles/photo/dubai-map.jpg"],
  },
  {
    title: "Luxury 3BR in Palm Jumeirah", location: "Palm Jumeirah",
    bedrooms: 3, bathrooms: 3, size: 1830,
    description: "Beach access and private pool included.",
    price: "AED 6,200,000", images: ["https://via.placeholder.com/400x300"],
  }
];

function renderProperties(list) {
  const container = document.getElementById("property-cards-container");
  container.innerHTML = "";
  list.forEach(property => {
    const card = document.createElement("div");
    card.className = "property-card-ui-v2";
    card.style.cursor = "pointer";
    card.addEventListener("click", () => { window.location.href = "bien.html"; });
    card.innerHTML = `
      <img src="${property.images[0]}" class="property-img-v2" alt="${property.title}">
      <div class="property-title-ui-v2">${property.title}</div>
      <div class="property-loc-ui-v2"><i class="fas fa-map-marker-alt"></i> ${property.location}</div>
      <div class="property-features-ui-v2">
        <span><i class="fas fa-bed"></i> ${property.bedrooms}</span>
        <span><i class="fas fa-bath"></i> ${property.bathrooms}</span>
        <span><i class="fas fa-ruler-combined"></i> ${property.size} sqft</span>
      </div>
      <div class="property-desc-ui-v2">${property.description}</div>
      <div class="property-price-ui-v2">${property.price}</div>
      <div class="property-actions-ui-v2">
        <button type="button" onclick="event.stopPropagation();window.location.href='tel:+000000000';">Call</button>
        <button type="button" onclick="event.stopPropagation();window.location.href='mailto:info@propindubai.com';">Email</button>
        <button type="button" onclick="event.stopPropagation();window.open('https://wa.me/', '_blank');">WhatsApp</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderChatList(selectedId) {
  const list = document.getElementById('chat-list');
  const chats = getChats();
  list.innerHTML = '';
  chats.forEach((chat, idx) => {
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
      if(e.target.closest('.delete-chat-btn')) return;
      selectChat(chat.id);
    };
    list.appendChild(item);
  });
  list.querySelectorAll('.delete-chat-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const chatId = btn.dataset.id;
      deleteChat(chatId);
    };
  });
}
function deleteChat(chatId) {
  let chats = getChats();
  const idx = chats.findIndex(c => c.id === chatId);
  if (idx === -1) return;
  chats.splice(idx, 1);
  saveChats(chats);
  let newId = (chats[idx] && chats[idx].id) || (chats[idx-1] && chats[idx-1].id) || (chats[0] && chats[0].id);
  if(!newId) { addNewChat(true); return; }
  localStorage.setItem('multiCurrentChatId', newId);
  renderAll();
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
function selectChat(id) { localStorage.setItem('multiCurrentChatId', id); renderAll(); }
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
  chat.messages.push({type, text});
  if (type === 'user' && chat.messages.filter(m => m.type === 'user').length === 1) {
    let title = text.trim().split(/\s+/).slice(0,7).join(' ');
    if(title.length > 34) title = title.slice(0, 34) + '...';
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
function setupFilters() {
  document.querySelectorAll('.chat-pick-btn-v2').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.chat-pick-btn-v2').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      if (this.dataset.type === "rent") {
        renderProperties(propertiesData.filter(x => x.title.toLowerCase().includes("apartment") || x.title.toLowerCase().includes("studio")));
      } else if (this.dataset.type === "buy") {
        renderProperties(propertiesData.filter(x => x.title.toLowerCase().includes("luxury") || x.title.toLowerCase().includes("apartment")));
      } else if (this.dataset.type === "new") {
        renderProperties(propertiesData);
      } else {
        renderProperties(propertiesData);
      }
    });
  });
}
function renderAll() {
  let chats = getChats();
  let current = getCurrentChat();
  if (!chats.length) { addNewChat(); chats = getChats(); current = getCurrentChat(); }
  renderChatList(current ? current.id : null);
  renderChat(current);
  renderProperties(propertiesData);
}

// ========== DOMContentLoaded général ==========
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-btn').forEach((btn, i) => {
    if(i === 0) btn.onclick = () => { window.location.href = "accueil.html"; };
  });
  document.getElementById('new-chat-btn').onclick = () => addNewChat(true);
  document.getElementById('chat-form').onsubmit = function(e) {
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
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
  setupFilters();
  renderAll();
});

// ========== Sidebar Burger mobile ==========
document.addEventListener("DOMContentLoaded", function() {
  const burger = document.getElementById("burger-menu");
  const sidebar = document.querySelector(".multi-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  }
  if(burger && sidebar && overlay) {
    burger.addEventListener("click", function(e) {
      e.stopPropagation();
      sidebar.classList.add("open");
      overlay.classList.add("active");
    });
    overlay.addEventListener("click", closeSidebar);
    window.addEventListener("resize", closeSidebar);
  }
});

// ========== Splitter Drag Mobile FONCTIONNEL & ROBUSTE ==========
function initMobileSplit() {
  if (window.innerWidth > 800) return;
  const header = document.querySelector('.header2');
  const chatCol = document.getElementById('chat-col-v2');
  const propsCol = document.getElementById('properties-col');
  const splitter = document.getElementById('splitterBar');
  if (!chatCol || !propsCol || !splitter || !header) return;

  // Valeurs min/max
  function getHeights() {
    const headerH = header.offsetHeight;
    const total = window.innerHeight - headerH;
    const chatInput = document.querySelector('.chat-input-form-v2');
    const chatBtns = document.querySelector('.chat-input-btns-row');
    const chatHeader = document.querySelector('.multi-header');
    let minChat = 0;
    if (chatHeader) minChat += chatHeader.offsetHeight;
    if (chatInput) minChat += chatInput.offsetHeight;
    if (chatBtns) minChat += chatBtns.offsetHeight;
    minChat += 16; // petit buffer
    const minProps = 70; // px minimum visible pour les biens
    return { total, minChat, minProps };
  }

  function setSplit(chatH) {
    const splitterH = splitter.offsetHeight;
    const { total, minChat, minProps } = getHeights();
    // Clamp chatH
    if (chatH < minChat) chatH = minChat;
    if (chatH > total - minProps - splitterH) chatH = total - minProps - splitterH;
    chatCol.style.height = chatH + "px";
    let propsH = total - chatH - splitterH;
    if (propsH < minProps) propsH = minProps;
    propsCol.style.height = propsH + "px";
    propsCol.style.overflowY = "auto";
  }

  function initSplit() {
    const { total, minChat, minProps } = getHeights();
    let defaultChatH = Math.max(minChat + 100, Math.round(total * 0.5));
    setSplit(defaultChatH);
  }

  let dragging = false;
  let startY = 0;
  let startChatHeight = 0;

  function startDrag(e) {
    dragging = true;
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    startChatHeight = chatCol.offsetHeight;
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
    document.addEventListener("mousemove", moveDrag, {passive:false});
    document.addEventListener("touchmove", moveDrag, {passive:false});
    document.addEventListener("mouseup", endDrag, {once:true});
    document.addEventListener("touchend", endDrag, {once:true});
  }
  function moveDrag(e) {
    if (!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    const delta = y - startY;
    let newChatH = startChatHeight + delta;
    setSplit(newChatH);
    if (e.cancelable) e.preventDefault();
  }
  function endDrag() {
    dragging = false;
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    document.removeEventListener("mousemove", moveDrag, {passive:false});
    document.removeEventListener("touchmove", moveDrag, {passive:false});
  }
  splitter.addEventListener("mousedown", startDrag);
  splitter.addEventListener("touchstart", startDrag, {passive:false});
  window.addEventListener('resize', initSplit);

  setTimeout(initSplit, 100);
}
document.addEventListener("DOMContentLoaded", function() {
  initMobileSplit();
});
