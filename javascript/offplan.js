document.addEventListener('DOMContentLoaded', () => {
  const properties = [
    {
      title: "Modern 2BR Apartment in Downtown",
      location: "Downtown Dubai",
      description: "Spacious and elegant unit with Burj Khalifa view.",
      description1: "Starting price:",
      price: "AED 2,400,000",
      images: [
        "styles/photo/insta.png",
        "https://via.placeholder.com/400x300?text=View+2",
        "https://via.placeholder.com/400x300?text=View+3"
      ]
    },
    {
      title: "Studio in Business Bay",
      location: "Business Bay",
      description: "Perfect for investment with high ROI.",
      description1: "Starting price:",
      price: "AED 850,000",
      images: [
        "styles/photo/dubai-map.jpg",
        "https://via.placeholder.com/400x300?text=Studio+Interior"
      ]
    },
    {
      title: "Luxury 3BR in Palm Jumeirah",
      location: "Palm Jumeirah",
      description: "Beach access and private pool included.",
      description1: "Starting price:",
      price: "AED 6,200,000",
      images: [
        "https://via.placeholder.com/400x300",
        "https://via.placeholder.com/400x300?text=Pool",
        "https://via.placeholder.com/400x300?text=Beach"
      ]
    }
  ];

  const propertiesContainer = document.getElementById("property-cards-container");

  properties.forEach((property, index) => {
    // Crée un lien autour de chaque carte
    const link = document.createElement("a");
    link.href = `off-plan-click.html?id=${index}`;
    link.style.textDecoration = "none";
    link.style.color = "inherit";

    const card = document.createElement("div");
    card.classList.add("property-card");

    // Génère les images du carrousel
    const carouselImages = property.images.map((img, idx) =>
      `<img src="${img}" class="carousel-image${idx === 0 ? ' active' : ''}" alt="${property.title} - ${idx + 1}">`
    ).join('');

    card.innerHTML = `
      <div class="carousel-container" data-index="${index}">
        ${carouselImages}
        <button class="carousel-button prev" type="button">&lt;</button>
        <button class="carousel-button next" type="button">&gt;</button>
      </div>
      <div class="property-details">
        <div>
          <div class="property-title">${property.title}</div>
          <div class="property-location">${property.location}</div>
          <div class="property-description">${property.description}</div>
          <div class="property-description1">${property.description1}</div>
        </div>
        <div class="property-price">${property.price}</div>
      </div>
    `;

    link.appendChild(card);
    propertiesContainer.appendChild(link);
  });

  // Carrousel JS avec event.stopPropagation + preventDefault sur le bouton
  document.querySelectorAll('.carousel-container').forEach(container => {
    const images = container.querySelectorAll('.carousel-image');
    let current = 0;

    container.querySelector('.next').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault(); // Ajoute cette ligne pour empêcher le lien de se déclencher
      images[current].classList.remove('active');
      current = (current + 1) % images.length;
      images[current].classList.add('active');
    });

    container.querySelector('.prev').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      images[current].classList.remove('active');
      current = (current - 1 + images.length) % images.length;
      images[current].classList.add('active');
    });
  });
});

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
