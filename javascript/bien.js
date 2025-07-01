const propertyData = {
  price: "AED 135,000 /year",
  bedrooms: 2,
  bathrooms: 3,
  size: "1,367 sqft",
  location: "Al Andalus, Tower E, Dubai",
  description: "Spacious 2 Bed Apartment with Courtyard View.",
  images: [
    "styles/photo/dubai-map.jpg",
    "styles/photo/dubai-map.jpg",
    "styles/photo/dubai-map.jpg",
    "styles/photo/profil.png"
  ],
  propertyType: "Apartment"
};

const agentData = {
  name: "Benjamin John",
  rating: 5.0,
  ratingsCount: 6,
  responseTime: "within 5 minutes",
  photo: "styles/photo/profil.png",
  phoneNumber: "+971123456789",
  whatsappNumber: "+971123456789"
};

window.onload = () => {
  const mainImage = document.getElementById('main-image');
  const thumb1 = document.getElementById('thumb1');
  const thumb2 = document.getElementById('thumb2');
  const info = document.getElementById('property-info');
  const description = document.getElementById('property-description');

  // Affiche les images
  mainImage.src = propertyData.images[0];
  document.getElementById('image-count').textContent = propertyData.images.length;
  thumb1.src = propertyData.images[1] || propertyData.images[0];
  thumb2.src = propertyData.images[2] || propertyData.images[0];

  // Lightbox onclick
  mainImage.addEventListener('click', () => openLightboxCarousel(0));
  thumb1.addEventListener('click', () => openLightboxCarousel(1));
  thumb2.addEventListener('click', () => openLightboxCarousel(2));

  // Infos propriété
  info.innerHTML = `
    <h2>${propertyData.location}</h2>
    <div class="price">${propertyData.price}</div>
    <div class="details">
      <span>🛏️ ${propertyData.bedrooms} Bedrooms</span>
      <span>🛁 ${propertyData.bathrooms} Bathrooms</span>
      <span>📐 ${propertyData.size}</span>
    </div>
    <p style="margin-top: 20px;">${propertyData.description}</p>
  `;

  // Description détaillée
  description.textContent = propertyData.description;

  // Met à jour les détails additionnels
  document.getElementById('detail-property-type').textContent = propertyData.propertyType;
  document.getElementById('detail-property-size').textContent = propertyData.size;
  document.getElementById('detail-bedrooms').textContent = propertyData.bedrooms;
  document.getElementById('detail-bathrooms').textContent = propertyData.bathrooms;

  // Injecte les infos agent
  renderAgentInfo();
};

function renderAgentInfo() {
  const container = document.getElementById('agent-contact-card-container');
  container.innerHTML = `
    <div class="agent-contact-card">
      <div class="contact-buttons">
        <button class="call-btn" onclick="window.location.href='tel:${agentData.phoneNumber}'">📞 Call</button>
        <button class="whatsapp-btn" onclick="window.open('https://wa.me/${agentData.whatsappNumber.replace(/\D/g,'')}', '_blank')">💬 WhatsApp</button>
      </div>
      <div class="agent-profile">
        <img src="${agentData.photo}" alt="Agent photo" />
        <div class="agent-details">
          <strong>${agentData.name}</strong><br />
          ⭐ ${agentData.rating} <a href="#">${agentData.ratingsCount} Ratings</a><br />
        </div>
      </div>
    </div>
  `;
}

// Lightbox avec navigation (simplifié)
function openLightboxCarousel(startIndex) {
  let index = startIndex;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    flex-direction: column;
  `;

  const img = document.createElement('img');
  img.src = propertyData.images[index];
  img.style.cssText = `
    max-width: 90%;
    max-height: 85%;
    border-radius: 10px;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = "✕ Close";
  closeBtn.style.cssText = `
    margin-top: 20px;
    padding: 8px 16px;
    font-size: 16px;
    cursor: pointer;
    border: none;
    border-radius: 8px;
  `;

  // Navigation
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '⬅ Prev';
  prevBtn.style.cssText = 'margin-right: 10px; padding: 8px 16px; cursor: pointer; border-radius: 8px;';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next ➡';
  nextBtn.style.cssText = 'padding: 8px 16px; cursor: pointer; border-radius: 8px;';

  const navDiv = document.createElement('div');
  navDiv.style.cssText = 'margin-top: 10px;';
  navDiv.appendChild(prevBtn);
  navDiv.appendChild(nextBtn);

  overlay.appendChild(img);
  overlay.appendChild(navDiv);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  prevBtn.onclick = () => {
    index = (index - 1 + propertyData.images.length) % propertyData.images.length;
    img.src = propertyData.images[index];
  };

  nextBtn.onclick = () => {
    index = (index + 1) % propertyData.images.length;
    img.src = propertyData.images[index];
  };

  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
  };
}


window.onload2 = () => {
  // Ton code existant pour afficher les images, infos, agent...

  // --- Initialisation de la carte Leaflet ---
  const map = L.map('map').setView([25.2048, 55.2708], 13); // Coordonnées approximatives de Dubaï

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Ajouter un marqueur à la localisation approximative du bien
  L.marker([25.2048, 55.2708]).addTo(map)
    .bindPopup(propertyData.location)
    .openPopup();
};

// javascript/map-similar.js
window.addEventListener("load", function () {
  const mapElement = document.getElementById("map");
  if (!mapElement) {
    console.error("Div with ID 'map' not found.");
    return;
  }

  // Définir une hauteur pour la carte si non définie via CSS
  mapElement.style.height = "400px";

  // Coordonnées approximatives de Dubai
  const dubaiCoordinates = [25.2048, 55.2708];

  // Initialisation de la carte
  const map = L.map("map").setView(dubaiCoordinates, 13);

  // Ajout du fond de carte OpenStreetMap
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  // Ajout d'un marqueur sur Dubai
  L.marker(dubaiCoordinates).addTo(map)
    .bindPopup("Propriété située ici")
    .openPopup();
});


// Initialisation de la carte
const map = L.map('map').setView([25.2048, 55.2708], 12); // Coordonnées de Dubaï

// Ajout d'une couche de tuiles OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Marqueur (facultatif)
L.marker([25.2048, 55.2708]).addTo(map)
  .bindPopup('Propriété à Dubaï')
  .openPopup();

  // Vérifie que la carte n'est pas déjà initialisée
document.addEventListener("DOMContentLoaded", function () {
  const map = L.map("map").setView([25.2048, 55.2708], 12); // Coordonnées de Dubaï

  // Ajoute une couche de tuiles (tiles layer)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Ajoute un marqueur sur la carte
  L.marker([25.2048, 55.2708]).addTo(map).bindPopup("Propriété à Dubaï").openPopup();
});


// Exemple données simulées biens similaires (remplace par ta vraie BDD)
const similarProperties = [
  {
    id: 1,
    location: "Downtown Dubai",
    price: "AED 120,000 /year",
    images: [
      "styles/photo/dubai-map.jpg",
      "styles/photo/profil.png",
      "styles/photo/dubai-map.jpg"
    ]
  },
  {
    id: 2,
    location: "Jumeirah Lake Towers",
    price: "AED 95,000 /year",
    images: [
      "styles/photo/profil.png",
      "styles/photo/dubai-map.jpg"
    ]
  },
  {
    id: 3,
    location: "Dubai Marina",
    price: "AED 150,000 /year",
    images: [
      "styles/photo/dubai-map.jpg",
      "styles/photo/dubai-map.jpg",
      "styles/photo/profil.png",
      "styles/photo/profil.png"
    ]
  },
  // Ajoute autant que tu veux
];

function createSimilarPropertyCard(property) {
  // Création du card container
  const card = document.createElement('div');
  card.classList.add('similar-property-card');

  // Images carousel container
  const imagesContainer = document.createElement('div');
  imagesContainer.classList.add('similar-property-carousel-images');
  
  // For each image create img tag, only first active
  property.images.forEach((imgSrc, index) => {
    const img = document.createElement('img');
    img.src = imgSrc;
    if(index === 0) img.classList.add('active');
    imagesContainer.appendChild(img);
  });

  // Carousel buttons for images
  const btns = document.createElement('div');
  btns.classList.add('similar-property-carousel-buttons');

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '‹';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '›';

  btns.appendChild(prevBtn);
  btns.appendChild(nextBtn);
  imagesContainer.appendChild(btns);

  // Image navigation logic
  let currentIndex = 0;
  const imgs = imagesContainer.querySelectorAll('img');
  prevBtn.addEventListener('click', e => {
    e.stopPropagation();
    imgs[currentIndex].classList.remove('active');
    currentIndex = (currentIndex - 1 + imgs.length) % imgs.length;
    imgs[currentIndex].classList.add('active');
  });
  nextBtn.addEventListener('click', e => {
    e.stopPropagation();
    imgs[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % imgs.length;
    imgs[currentIndex].classList.add('active');
  });

  // Property info block
  const info = document.createElement('div');
  info.classList.add('similar-property-info');
  info.innerHTML = `
    <h4>${property.location}</h4>
    <p>${property.price}</p>
  `;

  card.appendChild(imagesContainer);
  card.appendChild(info);

  // REND LA CARTE CLIQUABLE POUR ALLER SUR "bien.html"
  card.style.cursor = "pointer";
  card.addEventListener('click', () => {
    window.location.href = "bien.html";
  });

  return card;

}

window.addEventListener('load', () => {
  const container = document.querySelector('.similar-properties-wrapper');
  if (!container) return;

  similarProperties.forEach(prop => {
    const card = createSimilarPropertyCard(prop);
    container.appendChild(card);
  });
});
