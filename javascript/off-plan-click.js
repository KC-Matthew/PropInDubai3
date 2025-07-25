const data = {
  title: "The Dasis",
  location: "Dubai Hills",
  developer: "Emaar",
  status: "Off-Plan",
  handover: "Q4 2027",
  price: "From AED 6.5M",
  units: "3-6 Bedroom Villas",
  paymentPlan: "Flexible 80/20 Payment Plan",
  brochure: "https://example.com/dasis-brochure.pdf",
  description: "The Dasis is a new waterfront community offering world-class amenities and smartly designed villas in Dubai Hills. Ideal for families and investors.",
  images: [
    "styles/photo/dubai-map.jpg",
    "styles/photo/findagent.png",
    "styles/photo/fond.jpg"
  ],
  agent: {
    name: "Sarah El Masri",
    whatsapp: "+971 50 987 6543",
    whatsappLink: "https://wa.me/971509876543",
    email: "sarah.elmasri@propindubai.com"
  },
  paymentDetails: [
    { month: "Jan 2025", amount: "20%" },
    { month: "Jun 2025", amount: "10%" },
    { month: "Jan 2026", amount: "20%" },
    { month: "Q4 2027", amount: "50% on Handover" }
  ],
  availableUnits: [
    { type: "3BR Villa", size: "3,200 sqft", price: "AED 6.5M", availability: "Available" },
    { type: "4BR Villa", size: "4,100 sqft", price: "AED 7.9M", availability: "Few Units Left" },
    { type: "5BR Mansion", size: "5,800 sqft", price: "AED 11.5M", availability: "Sold Out" }
  ],
  developerVision: "Emaar’s vision for this master development includes a marina, lush parks, retail zones, and educational hubs. Dasis is the first phase of this transformation.",
  otherProjects: ["Creek Harbour", "The Valley", "Emaar South", "Downtown Views II"]
};

// Inject project content
document.getElementById('projectTitle').textContent = data.title;
document.getElementById('projectLocation').textContent = data.location;
document.getElementById('developer').textContent = data.developer;
document.getElementById('status').textContent = data.status;
document.getElementById('handover').textContent = data.handover;
document.getElementById('price').textContent = data.price;
document.getElementById('units').textContent = data.units;
document.getElementById('paymentPlan').textContent = data.paymentPlan;
document.getElementById('description').textContent = data.description;
document.getElementById('mainProjectImage').src = data.images[0];
document.getElementById('photoCount').textContent = data.images.length;
document.getElementById('brochureLink').href = data.brochure;

const agentContact = document.getElementById('agentContact');
agentContact.innerHTML = `
  <p><i class="fas fa-user"></i> <strong>Agent:</strong> ${data.agent.name}</p>
  <p><i class="fab fa-whatsapp"></i> <a href="${data.agent.whatsappLink}" target="_blank">${data.agent.whatsapp}</a></p>
  <p><i class="fas fa-envelope"></i> <a href="mailto:${data.agent.email}">${data.agent.email}</a></p>
`;

const unitsTableBody = document.getElementById('unitsTableBody');
data.availableUnits.forEach(unit => {
  const row = `<tr><td>${unit.type}</td><td>${unit.size}</td><td>${unit.price}</td><td>${unit.availability}</td></tr>`;
  unitsTableBody.innerHTML += row;
});

const paymentToggle = document.getElementById('paymentToggle');
const paymentDetail = document.getElementById('paymentDetail');
paymentToggle.onclick = () => {
  paymentDetail.classList.toggle('show');
  if (paymentDetail.classList.contains('show')) {
    paymentDetail.innerHTML = '<h4>Payment Schedule</h4><ul>' +
      data.paymentDetails.map(p => `<li>${p.month} - ${p.amount}</li>`).join('') +'</ul>';
  } else {
    paymentDetail.innerHTML = '';
  }
};

document.getElementById('developerVision').textContent = data.developerVision;
const devList = document.getElementById('developerProjects');
data.otherProjects.forEach(p => {
  const li = document.createElement('li');
  li.textContent = p;
  devList.appendChild(li);
});

// Carousel + Lightbox
let currentImageIndex = 0;
const mainImage = document.getElementById('mainImage');
const mainProjectImage = document.getElementById('mainProjectImage');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

function updateImage() {
  mainProjectImage.src = data.images[currentImageIndex];
  lightboxImg.src = data.images[currentImageIndex];
}
document.getElementById('prevImage').onclick = () => {
  currentImageIndex = (currentImageIndex - 1 + data.images.length) % data.images.length;
  updateImage();
};
document.getElementById('nextImage').onclick = () => {
  currentImageIndex = (currentImageIndex + 1) % data.images.length;
  updateImage();
};
mainImage.onclick = (event) => {
  if (event.target.closest('.image-arrows')) return;
  lightbox.style.display = 'flex';
  updateImage();
};
document.getElementById('lightboxOverlay').onclick = () => {
  lightbox.style.display = 'none';
};
document.getElementById('lightbox-prev').onclick = () => {
  currentImageIndex = (currentImageIndex - 1 + data.images.length) % data.images.length;
  updateImage();
};
document.getElementById('lightbox-next').onclick = () => {
  currentImageIndex = (currentImageIndex + 1) % data.images.length;
  updateImage();
};

// ----- GESTION DU SWIPE TACTILE -----
let touchStartX = 0;
let touchEndX = 0;

mainImage.addEventListener('touchstart', function(e) {
  touchStartX = e.changedTouches[0].screenX;
}, false);

mainImage.addEventListener('touchmove', function(e) {
  touchEndX = e.changedTouches[0].screenX;
}, false);

mainImage.addEventListener('touchend', function(e) {
  // Seulement si le swipe est suffisamment long (>30px)
  if (touchStartX - touchEndX > 30) {
    // swipe gauche (image suivante)
    currentImageIndex = (currentImageIndex + 1) % data.images.length;
    updateImage();
  } else if (touchEndX - touchStartX > 30) {
    // swipe droite (image précédente)
    currentImageIndex = (currentImageIndex - 1 + data.images.length) % data.images.length;
    updateImage();
  }
}, false);

// Simulated recommended data (à remplacer par un appel DB ou API plus tard)
const recommendedProjects = [
  {
    image: "styles/select.jpg",
    units: [
      { price: "AED 1,200,000" },
      { price: "AED 1,350,000" },
      { price: "AED 1,550,000" }
    ],
    beds: 1,
    baths: 1,
    size: "857 sqft",
    location: "The Roof Residence, Nad Al Sheba Gardens",
    agency: "fäm Properties - Branch 23"
  },
  {
    image: "styles/appart1.jpg",
    units: [
      { price: "AED 1,733,421" },
      { price: "AED 1,800,000" }
    ],
    beds: 1,
    baths: 1,
    size: "870 sqft",
    location: "340 Riverside Crescent, Riverside Crescent",
    agency: "The Noble Club Real Estate"
  },
  {
    image: "styles/select.jpg",
    units: [
      { price: "AED 2,017,000" },
      { price: "AED 2,200,000" }
    ],
    beds: 2,
    baths: 2,
    size: "1230 sqft",
    location: "Palm Gate, Palm Jumeirah",
    agency: "Dream Homes Dubai"
  },
  {
    image: "styles/select.jpg",
    units: [
      { price: "AED 995,000" },
      { price: "AED 1,050,000" }
    ],
    beds: 1,
    baths: 1,
    size: "690 sqft",
    location: "Waves Tower, Sobha Hartland",
    agency: "Al Habtoor Real Estate"
  }
];

// --- UTILITAIRE POUR EXTRAIRE LE PRIX NUMÉRIQUE ---
function extractNumeric(priceStr) {
  // Retourne 1200000 à partir de "AED 1,200,000"
  return Number(priceStr.replace(/[^\d]/g, ""));
}

// --- AFFICHAGE DES CARTES RECOMMANDÉES ---
const recommendedList = document.getElementById("recommendedList");
recommendedList.innerHTML = ""; // clear avant d’ajouter

recommendedProjects.forEach((project, idx) => {
  let minPrice = null, maxPrice = null;
  if (project.units && project.units.length) {
    const prices = project.units.map(u => extractNumeric(u.price));
    minPrice = Math.min(...prices);
    maxPrice = Math.max(...prices);
  }
  const rangePriceText = minPrice && maxPrice 
    ? `Range Price: AED ${minPrice.toLocaleString()} - AED ${maxPrice.toLocaleString()}`
    : "";

  const card = document.createElement("div");
  card.className = "recommended-card";
  card.innerHTML = `
    <img src="${project.image}" alt="${project.location}">
    <div class="recommended-info">
      <h3>${rangePriceText}</h3>
      <p><i class="fas fa-bed"></i> ${project.beds} &nbsp; <i class="fas fa-bath"></i> ${project.baths} &nbsp; <i class="fas fa-vector-square"></i> ${project.size}</p>
      <p class="location-text">${project.location}</p>
      <p class="agency-text">${project.agency}</p>
    </div>
  `;
  card.style.cursor = "pointer";
  card.onclick = () => {
    // Redirige avec index (ou remplace idx par project.id si tu en as un unique)
    window.location.href = `off-plan-click.html?rec_id=${idx}`;
  };
  recommendedList.appendChild(card);
});
