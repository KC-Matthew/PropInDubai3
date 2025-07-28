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
  propertyType: "Apartment",
  roi: 7.2,
  avgRent: "AED 120,000"
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

  // Infos propriété SANS avgPrice
  info.innerHTML = `
    <h2>${propertyData.location}</h2>
    <div class="price">${propertyData.price}</div>
    <div class="details">
      <span>🛏️ ${propertyData.bedrooms} Bedrooms</span>
      <span>🛁 ${propertyData.bathrooms} Bathrooms</span>
      <span>📐 ${propertyData.size}</span>
    </div>
    <div style="margin: 10px 0 15px 0; font-size: 1.04rem; color:rgb(0, 0, 0); font-weight: 500;">
      📈 ROI: ${propertyData.roi}% &nbsp; 
      💰 Avg Rent: ${propertyData.avgRent}
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

// Lightbox avec navigation (flèches + swipe mobile)
function openLightboxCarousel(startIndex) {
  let index = startIndex;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.93);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  const imgWrapper = document.createElement('div');
  imgWrapper.style.cssText = `
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const img = document.createElement('img');
  img.src = propertyData.images[index];
  img.style.cssText = `
    max-width: 92vw;
    max-height: 85vh;
    border-radius: 15px;
    box-shadow: 0 6px 36px rgba(0,0,0,0.38);
    display: block;
  `;

  // === SWIPE MOBILE LOGIC ===
  let touchStartX = 0;
  img.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
    }
  });
  img.addEventListener('touchend', function(e) {
    if (e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchEndX - touchStartX;
      if (Math.abs(deltaX) > 40) {
        if (deltaX < 0) {
          // Swipe gauche : next
          index = (index + 1) % propertyData.images.length;
          img.src = propertyData.images[index];
        } else {
          // Swipe droite : prev
          index = (index - 1 + propertyData.images.length) % propertyData.images.length;
          img.src = propertyData.images[index];
        }
      }
    }
  });
  // =========================

  // Modern arrows
  const arrowStyle = `
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(30,30,30,0.55);
    color: #fff;
    border: none;
    border-radius: 50%;
    font-size: 2.4rem;
    width: 56px; height: 56px;
    cursor: pointer;
    z-index: 10;
    opacity: 0.82;
    transition: background 0.2s, opacity 0.2s;
    display: flex; align-items: center; justify-content: center;
  `;

  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '&#8592;';
  prevBtn.style.cssText = arrowStyle + 'left: -72px;';
  prevBtn.onmouseenter = () => prevBtn.style.background = "rgba(30,30,30,0.85)";
  prevBtn.onmouseleave = () => prevBtn.style.background = "rgba(30,30,30,0.55)";

  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '&#8594;';
  nextBtn.style.cssText = arrowStyle + 'right: -72px;';
  nextBtn.onmouseenter = () => nextBtn.style.background = "rgba(30,30,30,0.85)";
  nextBtn.onmouseleave = () => nextBtn.style.background = "rgba(30,30,30,0.55)";

  prevBtn.onclick = (e) => {
    e.stopPropagation();
    index = (index - 1 + propertyData.images.length) % propertyData.images.length;
    img.src = propertyData.images[index];
  };
  nextBtn.onclick = (e) => {
    e.stopPropagation();
    index = (index + 1) % propertyData.images.length;
    img.src = propertyData.images[index];
  };

  imgWrapper.appendChild(prevBtn);
  imgWrapper.appendChild(img);
  imgWrapper.appendChild(nextBtn);

  // Close button (coin droit)
  const closeBtn = document.createElement('button');
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = `
    position: absolute; top: 24px; right: 40px;
    font-size: 2.1rem;
    color: #fff; background: none;
    border: none; cursor: pointer;
    z-index: 100;
    text-shadow: 0 1px 6px #000;
    opacity: 0.82;
    transition: opacity 0.15s;
  `;
  closeBtn.onmouseenter = () => closeBtn.style.opacity = "1";
  closeBtn.onmouseleave = () => closeBtn.style.opacity = "0.82";
  closeBtn.onclick = () => document.body.removeChild(overlay);

  overlay.appendChild(imgWrapper);
  overlay.appendChild(closeBtn);

  overlay.onclick = e => { if (e.target === overlay) document.body.removeChild(overlay); };

  document.body.appendChild(overlay);
}


// ---------------------------
// CARTE LEAFLET (à garder si tu utilises une carte sur la page)

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

// ---------------------------
// SIMILAR PROPERTIES

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
  card.style.cursor = "pointer";

  // --- Ajoute le click pour rediriger ---
  card.addEventListener('click', () => {
    window.location.href = "ROI-click-click.html";
  });

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

  return card;
}

// Injecte les cartes similaires au chargement
window.addEventListener('load', () => {
  const container = document.querySelector('.similar-properties-wrapper');
  if (!container) return;

  similarProperties.forEach(prop => {
    const card = createSimilarPropertyCard(prop);
    container.appendChild(card);
  });
});
