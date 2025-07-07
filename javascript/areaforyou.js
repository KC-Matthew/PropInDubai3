// --- AFFICHAGE DES BIENS VERSION "BUY" ---
document.addEventListener('DOMContentLoaded', () => {
  const properties = [
    {
      title: "Modern 2BR Apartment in Downtown",
      location: "Downtown Dubai",
      bedrooms: 2,
      bathrooms: 2,
      size: 1100,
      description: "Spacious and elegant unit with Burj Khalifa view.",
      price: "AED 2,400,000",
      images: [
        "styles/photo/insta.png",
        "https://via.placeholder.com/400x300?text=View+2",
        "https://via.placeholder.com/400x300?text=View+3"
      ],
      agent: {
        name: "John Doe",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg"
      }
    },
    {
      title: "Studio in Business Bay",
      location: "Business Bay",
      bedrooms: 1,
      bathrooms: 1,
      size: 520,
      description: "Perfect for investment with high ROI.",
      price: "AED 850,000",
      images: [
        "styles/photo/dubai-map.jpg",
        "https://via.placeholder.com/400x300?text=Studio+Interior"
      ],
      agent: {
        name: "Jane Smith",
        avatar: "https://randomuser.me/api/portraits/women/45.jpg"
      }
    },
    {
      title: "Luxury 3BR in Palm Jumeirah",
      location: "Palm Jumeirah",
      bedrooms: 3,
      bathrooms: 3,
      size: 1830,
      description: "Beach access and private pool included.",
      price: "AED 6,200,000",
      images: [
        "https://via.placeholder.com/400x300",
        "https://via.placeholder.com/400x300?text=Pool",
        "https://via.placeholder.com/400x300?text=Beach"
      ],
      agent: {
        name: "Omar Khalid",
        avatar: "https://randomuser.me/api/portraits/men/37.jpg"
      }
    }
  ];

  const propertiesContainer = document.getElementById("property-cards-container");

  properties.forEach((property, index) => {
    const card = document.createElement("div");
    card.classList.add("property-card");
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      window.location.href = "bien.html";
    });

    // Carousel Images
    const carouselImages = property.images.map((img, idx) =>
      `<img src="${img}" class="carousel-image${idx === 0 ? ' active' : ''}" alt="${property.title} - ${idx + 1}">`
    ).join('');

    // Agent avatar fallback
    const agentAvatar = property.agent?.avatar || "https://via.placeholder.com/38";

    card.innerHTML = `
      <div class="carousel-container" data-index="${index}">
        ${carouselImages}
        <button class="carousel-button prev">&lt;</button>
        <button class="carousel-button next">&gt;</button>
        <div class="image-count"><i class="fas fa-camera"></i> ${property.images.length}</div>
      </div>
      <div class="property-details" style="width:100%;">
        <div>
          <div class="property-title" style="font-size: 1.3rem; color: #3f265b; font-weight: bold;">${property.title}</div>
          <div class="property-location" style="color:#585a5c; margin-bottom:8px;"><i class="fas fa-map-marker-alt"></i> ${property.location}</div>
          <div style="margin-bottom:12px;">
            <span style="margin-right:16px;"><i class="fas fa-bed"></i> ${property.bedrooms}</span>
            <span style="margin-right:16px;"><i class="fas fa-bath"></i> ${property.bathrooms}</span>
            <span><i class="fas fa-ruler-combined"></i> ${property.size} sqft</span>
          </div>
          <div class="property-description" style="font-size: 15px; color: #444; margin-bottom: 15px;">${property.description}</div>
          <div class="property-price" style="font-size:1.12rem; color:#222; font-weight: bold; margin-bottom:8px;">${property.price}</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px; margin:12px 0;">
          <img src="${agentAvatar}" alt="Agent" style="width:38px;height:38px;border-radius:50%;border:2px solid #e6e6e6;">
          <span>${property.agent?.name || ''}</span>
        </div>
        <div class="property-actions" style="display:flex; gap:12px; margin-top:8px;">
          <button style="flex:1; padding:10px 0; background:#ff8800; color:#fff; border:none; border-radius:7px; font-size:15px; cursor:pointer; font-weight:600;">Call</button>
          <button style="flex:1; padding:10px 0; background:#ff8800; color:#fff; border:none; border-radius:7px; font-size:15px; cursor:pointer; font-weight:600;">Email</button>
          <button style="flex:1; padding:10px 0; background:#ff8800; color:#fff; border:none; border-radius:7px; font-size:15px; cursor:pointer; font-weight:600;">WhatsApp</button>
        </div>
      </div>
    `;

    propertiesContainer.appendChild(card);
  });

  // Carrousel
  document.querySelectorAll('.carousel-container').forEach(container => {
    const images = container.querySelectorAll('.carousel-image');
    let current = 0;
    container.querySelector('.next').addEventListener('click', (event) => {
      event.stopPropagation();
      images[current].classList.remove('active');
      current = (current + 1) % images.length;
      images[current].classList.add('active');
    });
    container.querySelector('.prev').addEventListener('click', (event) => {
      event.stopPropagation();
      images[current].classList.remove('active');
      current = (current - 1 + images.length) % images.length;
      images[current].classList.add('active');
    });
  });
});

// --- LE RESTE NE CHANGE PAS (CHAT, LOCALSTORAGE, ETC) ---
document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const chatMessages = document.getElementById('chat-messages');

  // Fonction pour sauvegarder le chat dans localStorage
  function saveChat() {
    const messages = [];
    chatMessages.querySelectorAll('.message').forEach(msg => {
      messages.push({
        role: msg.classList.contains('user') ? 'user' : 'bot',
        text: msg.textContent
      });
    });
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }

  // Fonction pour charger le chat depuis localStorage
  function loadChat() {
    const saved = localStorage.getItem('chatMessages');
    if (saved) {
      const messages = JSON.parse(saved);
      messages.forEach(m => appendMessage(m.role, m.text));
    }
  }

  // Fonction pour ajouter un message et sauvegarder
  function appendMessage(role, text) {
    const message = document.createElement('div');
    message.classList.add('message', role);
    message.textContent = text;
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    saveChat(); // Sauvegarde à chaque message ajouté
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = userInput.value.trim();
    if (!input) return;

    appendMessage('user', input);
    userInput.value = '';

    setTimeout(() => {
      appendMessage('bot', 'Thanks for your message! We will check properties accordingly.');
    }, 1000);
  });
  
  const resetButton = document.getElementById('reset-chat-button');
  resetButton.addEventListener('click', () => {
    chatMessages.innerHTML = '';
    localStorage.removeItem('chatMessages');
  });

  loadChat(); // Charger le chat au démarrage
});
