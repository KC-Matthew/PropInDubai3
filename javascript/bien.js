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

let currentIndex = 0;

// ----------- CARROUSEL PRINCIPAL -----------

function updateMainCarousel() {
  const mainImage = document.getElementById('main-image');
  const thumb1 = document.getElementById('thumb1');
  const thumb2 = document.getElementById('thumb2');
  const count = propertyData.images.length;

  mainImage.src = propertyData.images[currentIndex];
  thumb1.src = propertyData.images[(currentIndex + 1) % count];
  thumb2.src = propertyData.images[(currentIndex + 2) % count];

  // Overlay photo count
  const countOverlay = document.querySelector('.image-count-overlay');
  if (countOverlay) {
    if (count > 1) {
      countOverlay.style.display = '';
      countOverlay.style.background = 'rgba(0,0,0,0.7)';
      countOverlay.style.padding = '8px 16px';
      countOverlay.innerHTML = `📷 ${count}`;
    } else {
      countOverlay.style.display = 'none';
      countOverlay.style.background = 'none';
      countOverlay.style.padding = '0';
      countOverlay.innerHTML = '';
    }
  }
}

function openLightbox(index) {
  const prevLightbox = document.getElementById('lightbox-bien');
  if (prevLightbox) prevLightbox.remove();

  let current = index;

  const lightbox = document.createElement('div');
  lightbox.id = 'lightbox-bien';
  lightbox.style.cssText = `
    position: fixed; z-index: 9999;
    top:0;left:0;width:100vw;height:100vh;
    background:rgba(0,0,0,0.95);
    display:flex; align-items:center; justify-content:center;
  `;

  const img = document.createElement('img');
  img.src = propertyData.images[current];
  img.style.cssText = `
    max-width:90vw; max-height:90vh; border-radius:12px; box-shadow:0 0 40px #0008;
    display:block; margin:auto;
    background:white;
    touch-action: pan-y; /* important pour mobile */
  `;
  lightbox.appendChild(img);

  // Flèches
  const prevBtn = document.createElement('button');
  prevBtn.textContent = "❮";
  prevBtn.style.cssText = `
    position:absolute; left:2vw; top:50%; transform:translateY(-50%);
    background:none; border:none; color:#fff; font-size:4rem; cursor:pointer; z-index:10;
    opacity:0.7; transition:opacity 0.2s;
  `;
  prevBtn.onclick = (e) => {
    e.stopPropagation();
    current = (current - 1 + propertyData.images.length) % propertyData.images.length;
    img.src = propertyData.images[current];
  };
  lightbox.appendChild(prevBtn);

  const nextBtn = document.createElement('button');
  nextBtn.textContent = "❯";
  nextBtn.style.cssText = `
    position:absolute; right:2vw; top:50%; transform:translateY(-50%);
    background:none; border:none; color:#fff; font-size:4rem; cursor:pointer; z-index:10;
    opacity:0.7; transition:opacity 0.2s;
  `;
  nextBtn.onclick = (e) => {
    e.stopPropagation();
    current = (current + 1) % propertyData.images.length;
    img.src = propertyData.images[current];
  };
  lightbox.appendChild(nextBtn);

  // Swipe mobile
  let touchStartX = 0;
  let touchEndX = 0;

  img.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
    }
  });
  img.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        // swipe gauche : next
        current = (current + 1) % propertyData.images.length;
        img.src = propertyData.images[current];
      } else {
        // swipe droite : prev
        current = (current - 1 + propertyData.images.length) % propertyData.images.length;
        img.src = propertyData.images[current];
      }
    }
  });

  lightbox.onclick = () => { document.body.removeChild(lightbox); };

  document.body.appendChild(lightbox);
}


function createMainArrows() {
  let arrowsDiv = document.getElementById('main-arrows-bien');
  if (arrowsDiv) arrowsDiv.remove();
  arrowsDiv = document.createElement('div');
  arrowsDiv.id = 'main-arrows-bien';
  arrowsDiv.style.cssText = `
    position:absolute; width:100%; top:45%; left:0; display:flex; justify-content:space-between; pointer-events:none;
  `;
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

  const mainAndThumbs = document.querySelector('.main-and-thumbs');
  mainAndThumbs.style.position = 'relative';
  mainAndThumbs.appendChild(arrowsDiv);
}

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

// ----------- INFOS, AGENT, DETAILS -----------

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

// --------- SIMILAR PROPERTIES ----------
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

// ----------- MOBILE SWIPE (main image) -----------
function setupMobileSwipeOnMainImage() {
  const mainImage = document.getElementById('main-image');
  let startX = 0, isTouch = false;

  mainImage.addEventListener('touchstart', function(e) {
    isTouch = true;
    startX = e.touches[0].clientX;
  });

  mainImage.addEventListener('touchend', function(e) {
    if (!isTouch) return;
    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - startX;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        currentIndex = (currentIndex + 1) % propertyData.images.length;
        updateMainCarousel();
      } else {
        currentIndex = (currentIndex - 1 + propertyData.images.length) % propertyData.images.length;
        updateMainCarousel();
      }
    }
    isTouch = false;
  });
}

// ----------- INITIALISATION TOTALE -----------
window.onload = () => {
  // Images, carrousel, swipe, flèches
  updateMainCarousel();
  createMainArrows();
  setupCarouselEvents();
  setupMobileSwipeOnMainImage();

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

  // Similaires
  const container = document.querySelector('.similar-properties-wrapper');
  if (container) {
    similarProperties.forEach(prop => {
      const card = createSimilarPropertyCard(prop);
      container.appendChild(card);
    });
  }

  // MAP
  const mapElement = document.getElementById("map");
  if (mapElement) {
    mapElement.style.height = "400px";
    const dubaiCoordinates = [25.2048, 55.2708];
    const map = L.map("map").setView(dubaiCoordinates, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.marker(dubaiCoordinates).addTo(map)
      .bindPopup("Propriété située ici")
      .openPopup();
  }
};

document.addEventListener('DOMContentLoaded', function () {
  const burger = document.getElementById('burgerMenu');
  const nav = document.querySelector('.all-button');
  burger?.addEventListener('click', () => {
    nav.classList.toggle('mobile-open');
    // Empêche scroll du body quand le menu est ouvert
    if (nav.classList.contains('mobile-open')) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        document.addEventListener('click', closeMenu, { once: true });
      }, 0);
    } else {
      document.body.style.overflow = '';
    }
    function closeMenu(e) {
      if (!nav.contains(e.target) && !burger.contains(e.target)) {
        nav.classList.remove('mobile-open');
        document.body.style.overflow = '';
      }
    }
  });

  // Ferme aussi quand on clique sur un lien du menu mobile
  document.querySelectorAll('.all-button a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('mobile-open');
      document.body.style.overflow = '';
    });
  });
});

