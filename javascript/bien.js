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

// ------------- CARROUSEL PRINCIPAL -------------
let currentIndex = 0;

function updateMainCarousel() {
  const mainImage = document.getElementById('main-image');
  const thumb1 = document.getElementById('thumb1');
  const thumb2 = document.getElementById('thumb2');
  mainImage.src = propertyData.images[currentIndex];
  thumb1.src = propertyData.images[(currentIndex + 1) % propertyData.images.length];
  thumb2.src = propertyData.images[(currentIndex + 2) % propertyData.images.length];
  document.getElementById('image-count').textContent = propertyData.images.length;
}

function openLightbox(index) {
  // Supprime un éventuel lightbox déjà présent
  const prevLightbox = document.getElementById('lightbox-bien');
  if (prevLightbox) prevLightbox.remove();

  // Overlay
  const lightbox = document.createElement('div');
  lightbox.id = 'lightbox-bien';
  lightbox.style.cssText = `
    position: fixed; z-index: 9999;
    top:0;left:0;width:100vw;height:100vh;
    background:rgba(0,0,0,0.95);
    display:flex; align-items:center; justify-content:center;
  `;

  // Image
  const img = document.createElement('img');
  img.src = propertyData.images[index];
  img.style.cssText = `
    max-width:90vw; max-height:90vh; border-radius:12px; box-shadow:0 0 40px #0008;
    display:block; margin:auto;
    background:white;
  `;
  lightbox.appendChild(img);

  // Flèche gauche
  const prevBtn = document.createElement('button');
  prevBtn.textContent = "❮";
  prevBtn.style.cssText = `
    position:absolute; left:2vw; top:50%; transform:translateY(-50%);
    background:none; border:none; color:#fff; font-size:4rem; cursor:pointer; z-index:10;
    opacity:0.7; transition:opacity 0.2s;
  `;
  prevBtn.onclick = (e) => {
    e.stopPropagation();
    index = (index - 1 + propertyData.images.length) % propertyData.images.length;
    img.src = propertyData.images[index];
  };
  lightbox.appendChild(prevBtn);

  // Flèche droite
  const nextBtn = document.createElement('button');
  nextBtn.textContent = "❯";
  nextBtn.style.cssText = `
    position:absolute; right:2vw; top:50%; transform:translateY(-50%);
    background:none; border:none; color:#fff; font-size:4rem; cursor:pointer; z-index:10;
    opacity:0.7; transition:opacity 0.2s;
  `;
  nextBtn.onclick = (e) => {
    e.stopPropagation();
    index = (index + 1) % propertyData.images.length;
    img.src = propertyData.images[index];
  };
  lightbox.appendChild(nextBtn);

  // Close
  lightbox.onclick = () => { document.body.removeChild(lightbox); };

  document.body.appendChild(lightbox);
}

// Flèches sur l'image principale
function createMainArrows() {
  let arrowsDiv = document.getElementById('main-arrows-bien');
  if (arrowsDiv) arrowsDiv.remove();
  arrowsDiv = document.createElement('div');
  arrowsDiv.id = 'main-arrows-bien';
  arrowsDiv.style.cssText = `
    position:absolute; width:100%; top:45%; left:0; display:flex; justify-content:space-between; pointer-events:none;
  `;
  // Prev
  const prev = document.createElement('button');
  prev.textContent = '❮';
  prev.style.cssText = `
    pointer-events:auto; margin-left:8px;
    background:rgba(255,255,255,0.8); border:none; border-radius:50%; font-size:2rem; width:48px; height:48px; cursor:pointer;
    box-shadow:0 2px 8px #0002;
  `;
  prev.onclick = (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex - 1 + propertyData.images.length) % propertyData.images.length;
    updateMainCarousel();
  };
  // Next
  const next = document.createElement('button');
  next.textContent = '❯';
  next.style.cssText = `
    pointer-events:auto; margin-right:8px;
    background:rgba(255,255,255,0.8); border:none; border-radius:50%; font-size:2rem; width:48px; height:48px; cursor:pointer;
    box-shadow:0 2px 8px #0002;
  `;
  next.onclick = (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex + 1) % propertyData.images.length;
    updateMainCarousel();
  };
  arrowsDiv.appendChild(prev);
  arrowsDiv.appendChild(next);

  // Place dans le main-and-thumbs
  const mainAndThumbs = document.querySelector('.main-and-thumbs');
  mainAndThumbs.style.position = 'relative';
  mainAndThumbs.appendChild(arrowsDiv);
}

// Events (clic image/thumbnails)
function setupCarouselEvents() {
  document.getElementById('main-image').onclick = () => openLightbox(currentIndex);
  document.getElementById('thumb1').onclick = () => {
    currentIndex = (currentIndex + 1) % propertyData.images.length;
    updateMainCarousel();
  };
  document.getElementById('thumb2').onclick = () => {
    currentIndex = (currentIndex + 2) % propertyData.images.length;
    updateMainCarousel();
  };
}

// ----------- INFOS, AGENT, DETAILS (inchangés) -----------
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

// -------------- INIT ----------------
window.onload = () => {
  // Carrousel principal
  updateMainCarousel();
  createMainArrows();
  setupCarouselEvents();

  // Infos propriété
  const info = document.getElementById('property-info');
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
  document.getElementById('property-description').textContent = propertyData.description;
  document.getElementById('detail-property-type').textContent = propertyData.propertyType;
  document.getElementById('detail-property-size').textContent = propertyData.size;
  document.getElementById('detail-bedrooms').textContent = propertyData.bedrooms;
  document.getElementById('detail-bathrooms').textContent = propertyData.bathrooms;
  renderAgentInfo();
};

// --------- MAP (inchangé) ----------
window.addEventListener("load", function () {
  const mapElement = document.getElementById("map");
  if (!mapElement) return;
  mapElement.style.height = "400px";
  const dubaiCoordinates = [25.2048, 55.2708];
  const map = L.map("map").setView(dubaiCoordinates, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  L.marker(dubaiCoordinates).addTo(map)
    .bindPopup("Propriété située ici")
    .openPopup();
});

// --------- SIMILAR PROPERTIES (inchangé) ----------
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
];

function createSimilarPropertyCard(property) {
  const card = document.createElement('div');
  card.classList.add('similar-property-card');
  const imagesContainer = document.createElement('div');
  imagesContainer.classList.add('similar-property-carousel-images');
  property.images.forEach((imgSrc, index) => {
    const img = document.createElement('img');
    img.src = imgSrc;
    if(index === 0) img.classList.add('active');
    imagesContainer.appendChild(img);
  });
  const btns = document.createElement('div');
  btns.classList.add('similar-property-carousel-buttons');
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '‹';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '›';
  btns.appendChild(prevBtn);
  btns.appendChild(nextBtn);
  imagesContainer.appendChild(btns);

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

  const info = document.createElement('div');
  info.classList.add('similar-property-info');
  info.innerHTML = `
    <h4>${property.location}</h4>
    <p>${property.price}</p>
  `;

  card.appendChild(imagesContainer);
  card.appendChild(info);
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
