// ========= UTILS & DONNÉES =========
function uuid() { return '_' + Math.random().toString(36).substr(2, 9); }
function getChats() { return JSON.parse(localStorage.getItem('multiChatHistory') || '[]'); }
function saveChats(chats) { localStorage.setItem('multiChatHistory', JSON.stringify(chats)); }

// ---- FAVORIS ----
function getFavs() {
  return JSON.parse(localStorage.getItem('favorites') || '[]');
}
function saveFavs(arr) {
  localStorage.setItem('favorites', JSON.stringify(arr));
}

// ========= DONNÉES TEST =========
let propertiesData = [
  {
    id: "p1",
    title: "Modern 2BR Apartment in Downtown",
    location: "Downtown Dubai",
    bedrooms: 2, bathrooms: 2, size: 1100,
    description: "Spacious and elegant unit with Burj Khalifa view.",
    price: "AED 2,400,000", images: ["styles/photo/insta.png"],
  },
  {
    id: "p2",
    title: "Studio in Business Bay", location: "Business Bay",
    bedrooms: 1, bathrooms: 1, size: 520,
    description: "Perfect for investment with high ROI.",
    price: "AED 850,000", images: ["styles/photo/dubai-map.jpg"],
  },
  {
    id: "p3",
    title: "Luxury 3BR in Palm Jumeirah", location: "Palm Jumeirah",
    bedrooms: 3, bathrooms: 3, size: 1830,
    description: "Beach access and private pool included.",
    price: "AED 6,200,000", images: ["https://via.placeholder.com/400x300"],
  }
];

// ========= RENDUS =========
function renderProperties(list) {
  const container = document.getElementById("property-cards-container");
  container.innerHTML = "";
  const favs = getFavs();
  list.forEach(property => {
    const card = document.createElement("div");
    card.className = "property-card-ui-v2";
    card.style.cursor = "pointer";
    card.style.position = "relative"; // important pour le cœur positionné

    // Coeur favori
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
      <div class="property-desc-ui-v2">${property.description}</div>
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

function renderAll() {
  let chats = getChats();
  let current = getCurrentChat();
  if (!chats.length) { addNewChat(); chats = getChats(); current = getCurrentChat(); }
  renderChatList(current ? current.id : null);
  renderChat(current);
  renderProperties(propertiesData);
}

// ========= CHAT LOGIQUE =========
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

// ========= FILTRES CHAT =========
function setupFilters() {
  document.querySelectorAll('.chat-pick-btn-v2').forEach(btn => {
    btn.addEventListener('click', function () {
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

// ========= BURGER SIDEBAR MOBILE =========
function setupMobileSidebar() {
  const burger = document.getElementById("burgerMenu");
  const mainSidebar = document.getElementById("mainSidebar");
  const mainOverlay = document.getElementById("mainSidebarOverlay");

  if (burger && mainSidebar && mainOverlay) {
    burger.addEventListener("click", function (e) {
      e.stopPropagation();
      mainSidebar.classList.add("open");
      mainOverlay.classList.add("active");
    });

    mainOverlay.addEventListener("click", function () {
      mainSidebar.classList.remove("open");
      mainOverlay.classList.remove("active");
    });
  }
}

// ========= SPLITBAR MOBILE DRAG (Version Corrigée) =========
function initMobileSplit() {
  if (window.innerWidth > 800) return;
  const header = document.querySelector('.header2');
  const chatCol = document.getElementById('chat-col-v2');
  const propsCol = document.getElementById('properties-col');
  const splitter = document.getElementById('splitterBar');
  if (!chatCol || !propsCol || !splitter || !header) return;

  const minChat = 70;
  const minProps = 70;

  function getTotalH() {
    return window.innerHeight - header.offsetHeight;
  }

  let dragging = false, startY = 0, startChatHeight = 0;

  splitter.addEventListener("mousedown", startDrag, false);
  splitter.addEventListener("touchstart", startDrag, false);

  function startDrag(e) {
    dragging = true;
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    startChatHeight = chatCol.offsetHeight;
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
    document.addEventListener("mousemove", moveDrag, false);
    document.addEventListener("touchmove", moveDrag, false);
    document.addEventListener("mouseup", endDrag, false);
    document.addEventListener("touchend", endDrag, false);
  }
  function moveDrag(e) {
    if (!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    const headerH = header.offsetHeight;
    const totalH = getTotalH();

    let splitterPos = y - headerH;
    splitterPos = Math.max(minChat, Math.min(totalH - minProps, splitterPos));
    const chatH = splitterPos;
    const propsH = totalH - chatH;

    chatCol.style.height = chatH + "px";
    propsCol.style.height = propsH + "px";

    if (e.cancelable) e.preventDefault();
  }
  function endDrag() {
    dragging = false;
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    document.removeEventListener("mousemove", moveDrag, false);
    document.removeEventListener("touchmove", moveDrag, false);
    document.removeEventListener("mouseup", endDrag, false);
    document.removeEventListener("touchend", endDrag, false);
  }

  function setInitialHeights() {
    const totalH = getTotalH();
    chatCol.style.height = Math.round(totalH * 0.58) + "px";
    propsCol.style.height = Math.round(totalH * 0.38) + "px";
  }

  window.addEventListener('resize', setInitialHeights);
  setInitialHeights();
}


// ========= DOM READY =========
document.addEventListener('DOMContentLoaded', () => {
  // --- Activation des boutons de la sidebar ---
  document.querySelectorAll('.sidebar-btn').forEach((btn, i) => {
    if (i === 0) btn.onclick = () => { window.location.href = "accueil.html"; };
    btn.addEventListener('click', function () {
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // --- Ajout d’un nouveau chat ---
  const newChatBtn = document.getElementById('new-chat-btn');
  if (newChatBtn) {
    newChatBtn.onclick = () => addNewChat(true);
  }

  // --- Soumission du formulaire de chat ---
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  if (chatForm && userInput) {
    chatForm.onsubmit = function (e) {
      e.preventDefault();
      const msg = userInput.value.trim();
      if (!msg) return;
      addMessageToCurrentChat('user', msg);
      userInput.value = '';
      setTimeout(() => {
        addMessageToCurrentChat('bot', "Thanks for your message! We will check properties accordingly.");
      }, 700);
    };
  }

  // --- Réinitialisation du chat ---
  const resetBtn = document.getElementById('reset-chat-btn');
  if (resetBtn) resetBtn.onclick = () => resetCurrentChat();

  // --- MENU BURGER PRINCIPAL (sidebar de gauche) ---
  const burger = document.getElementById("burgerMenu");
  const mainSidebar = document.getElementById("mainSidebar");
  const mainOverlay = document.getElementById("mainSidebarOverlay");
  if (burger && mainSidebar && mainOverlay) {
    burger.addEventListener("click", function (e) {
      e.stopPropagation();
      mainSidebar.classList.add("open");
      mainOverlay.classList.add("active");
    });
    mainOverlay.addEventListener("click", function () {
      mainSidebar.classList.remove("open");
      mainOverlay.classList.remove("active");
    });
  }

  // --- MENU CHAT MOBILE (sidebar droite) ---
  const chatToggleMobile = document.getElementById("btn-open-chat-sidebar");
  const chatSidebar = document.querySelector(".multi-sidebar");
  const chatOverlay = document.getElementById("sidebar-overlay");
  if (chatToggleMobile && chatSidebar && chatOverlay) {
    chatToggleMobile.addEventListener("click", (e) => {
      e.stopPropagation();
      chatSidebar.classList.add("open");
      chatOverlay.classList.add("active");
    });
    chatOverlay.addEventListener("click", () => {
      chatSidebar.classList.remove("open");
      chatOverlay.classList.remove("active");
    });
  }

  // --- Menu déroulant BUY / RENT ---
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');
  if (mainBuyBtn && buyDropdown) {
    mainBuyBtn.addEventListener('click', function(e) {
      e.preventDefault();
      buyDropdown.classList.toggle('open');
    });
    document.addEventListener('click', function(e) {
      if (!buyDropdown.contains(e.target) && e.target !== mainBuyBtn) {
        buyDropdown.classList.remove('open');
      }
    });
  }

  // --- Initialisations supplémentaires ---
  setupFilters();
  setupMobileSidebar(); // si utilisé autre part aussi
  initMobileSplit();
  renderAll();
});







document.addEventListener('DOMContentLoaded', function() {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');
  const burger = document.getElementById('burgerMenu');
  const allButton = document.querySelector('.all-button');

  // --- Menu BUY dropdown (desktop)
  mainBuyBtn.addEventListener('click', function(e) {
    e.preventDefault();
    buyDropdown.classList.toggle('open');
  });

  document.addEventListener('click', function(e) {
    if (!buyDropdown.contains(e.target) && e.target !== mainBuyBtn) {
      buyDropdown.classList.remove('open');
    }

    // Fermer menu mobile si on clique en dehors
    if (
      allButton.classList.contains('menu-open') &&
      !allButton.contains(e.target) &&
      !burger.contains(e.target)
    ) {
      allButton.classList.remove('menu-open');
    }
  });

  // --- Burger toggle (mobile)
  burger.addEventListener('click', function(e) {
    e.stopPropagation(); // empêche le clic extérieur de le refermer directement
    allButton.classList.toggle('menu-open');
  });
});
