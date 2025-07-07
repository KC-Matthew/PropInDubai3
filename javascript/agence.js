// --- DATA STRUCTURE ---
const agencyData = {
  logo: "styles/photo/dubai-map.jpg",
  name: "Al Hilal Property",
  orn: "12109",
  location: "Office shop 8&9, Building Golden Mile 9, Palm Jumeirah, Dubai",
  email: "contact@alhilal.com",
  phone: "+97143210910",
  about: `Al Hilal Property was established in 2013 and since its inception has grown from strength to strength, opening a 3,000 sqft office on the Golden Mile, Palm Jumeirah, in September 2018.
  The multilingual team at Al Hilal Homes, with all their years of experience and talents combined, are competent and able to deal with every Real Estate eventuality and work with one simple philosophy; "Every action must be an honest one".`,
  listings: [
    {
      images: ["styles/photo/property1-1.jpg","styles/photo/property1-2.jpg"],
      type: "Apartment",
      location: "Downtown Dubai",
      beds: 2,
      baths: 1,
      size: 1100,
      price: 2000000,
      priceUnit: "AED",
      agent: { name: "John Doe", photo: "styles/photo/agent-john.jpg" },
      for: "buy"
    },
    {
      images: ["styles/photo/villa1-1.jpg", "styles/photo/villa1-2.jpg"],
      type: "Villa",
      location: "Palm Jumeirah",
      beds: 3,
      baths: 2,
      size: 1113,
      price: 2120000,
      priceUnit: "AED",
      agent: { name: "Jane Smith", photo: "styles/photo/agent-jane.jpg" },
      for: "buy"
    },
    {
      images: ["styles/photo/rent1.jpg"],
      type: "Apartment",
      location: "Business Bay",
      beds: 1,
      baths: 2,
      size: 900,
      price: 120000,
      priceUnit: "AED/year",
      agent: { name: "Moe Salah", photo: "styles/photo/agent-moe.jpg" },
      for: "rent"
    },
    {
      images: ["styles/photo/commercial-buy1.jpg"],
      type: "Shop",
      location: "Al Barsha",
      beds: 0,
      baths: 2,
      size: 2200,
      price: 4400000,
      priceUnit: "AED",
      agent: { name: "Commercial Guy", photo: "styles/photo/agent-john.jpg" },
      for: "commercial-buy"
    },
    {
      images: ["styles/photo/commercial-rent1.jpg"],
      type: "Office",
      location: "Business Bay",
      beds: 0,
      baths: 2,
      size: 1850,
      price: 210000,
      priceUnit: "AED/year",
      agent: { name: "Commercial Girl", photo: "styles/photo/agent-jane.jpg" },
      for: "commercial-rent"
    }
  ],
  agents: [
    {
      img: "styles/photo/agent-john.jpg",
      name: "John Doe",
      role: "Client Manager • SuperAgent ⭐ 5.0",
      meta: "Lebanon • Languages: English, Arabic, French",
      link: "#"
    },
    {
      img: "styles/photo/agent-jane.jpg",
      name: "Jane Smith",
      role: "Agent • ⭐ 5.0",
      meta: "UK • Languages: English, Arabic",
      link: "#"
    }
  ]
};

// --- HEADER / INFOS ---
document.getElementById('agency-logo').src = agencyData.logo;
document.getElementById('agency-name').textContent = agencyData.name;
document.getElementById('about-agency-name').textContent = agencyData.name;
document.getElementById('listing-count').textContent = agencyData.listings.length;
document.getElementById('agent-count').textContent = agencyData.agents.length;
document.getElementById('agency-orn').textContent = agencyData.orn;
document.getElementById('agency-location').textContent = agencyData.location;
document.getElementById('about-text').textContent = agencyData.about;

document.getElementById('email-btn').onclick = () => location.href = "mailto:" + agencyData.email;
document.getElementById('call-btn').onclick = () => location.href = "tel:" + agencyData.phone;

// --- ABOUT / READ MORE ---
const aboutDiv = document.getElementById('about-text');
const readMoreBtn = document.getElementById('read-more-btn');
let expanded = false;
function updateReadMore() {
  if(aboutDiv.scrollHeight > 100 && !expanded) {
    readMoreBtn.style.display = 'block';
    aboutDiv.classList.remove('expanded');
    readMoreBtn.textContent = "Read more";
  } else if(expanded) {
    aboutDiv.classList.add('expanded');
    readMoreBtn.textContent = "Show less";
  } else {
    readMoreBtn.style.display = 'none';
  }
}
readMoreBtn.onclick = function() {
  expanded = !expanded;
  updateReadMore();
};
window.onload = updateReadMore;

// --- TABS ---
window.showTab = function(tab) {
  document.getElementById('tab-properties').classList.remove('active');
  document.getElementById('tab-agents').classList.remove('active');
  document.getElementById('properties-tab-content').style.display = 'none';
  document.getElementById('agents-tab-content').style.display = 'none';

  if(tab === 'properties') {
    document.getElementById('tab-properties').classList.add('active');
    document.getElementById('properties-tab-content').style.display = '';
  } else {
    document.getElementById('tab-agents').classList.add('active');
    document.getElementById('agents-tab-content').style.display = '';
  }
}

// --- PROPERTY FILTER + LISTING + CAROUSEL ---
let currentFilter = "rent";
function renderProperties(filterType) {
  currentFilter = filterType;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === filterType);
  });

  const filtered = agencyData.listings.filter(p => p.for === filterType);
  const container = document.getElementById('property-list');
  if(filtered.length === 0) {
    container.innerHTML = "<div style='padding:40px 0 0 0;color:#aaa;font-size:1.2rem;'>No properties found for this type.</div>";
    return;
  }
  container.innerHTML = filtered.map((property, i) => {
    const imgCount = property.images.length;
    return `
      <div class="property-card-v2" data-index="${i}">
        <div class="property-image-block">
          <button class="carousel-btn left" onclick="moveCarousel(${i},-1,event)">&lt;</button>
          <img class="property-carousel-img" id="property-img-${i}" src="${property.images[0]}" alt="Property">
          <button class="carousel-btn right" onclick="moveCarousel(${i},1,event)">&gt;</button>
          <div class="property-img-count"><span class="icon">📷</span> ${imgCount}</div>
        </div>
        <div class="property-info-block">
          <div class="property-type-title">${property.type}</div>
          <div class="property-location"><span class="icon">📍</span> ${property.location}</div>
          <div class="property-specs">
            <span class="icon">🛏️</span> ${property.beds} &nbsp;
            <span class="icon">🛁</span> ${property.baths} &nbsp;
            <span class="icon">📐</span> ${property.size} sqft
          </div>
          <div class="property-price">${property.price.toLocaleString()} <span style="font-weight:400;">${property.priceUnit}</span></div>
          <div class="property-agent">
            <img src="${property.agent.photo}" alt="${property.agent.name}" class="agent-photo-v2">
            ${property.agent.name}
          </div>
          <div class="property-action-bar">
            <button class="property-action-btn">Call</button>
            <button class="property-action-btn">Email</button>
            <button class="property-action-btn">WhatsApp</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
  filtered.forEach((property, i) => {
    window["carouselIndex"+i] = 0;
  });
}
window.moveCarousel = function(cardIndex, dir, event) {
  event.stopPropagation();
  const filtered = agencyData.listings.filter(p => p.for === currentFilter);
  const imgs = filtered[cardIndex].images;
  let idx = window["carouselIndex"+cardIndex] || 0;
  idx = (idx + dir + imgs.length) % imgs.length;
  window["carouselIndex"+cardIndex] = idx;
  document.getElementById("property-img-"+cardIndex).src = imgs[idx];
}
// --- INIT FILTER BTN EVENTS ---
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = function() {
      renderProperties(this.dataset.type);
    };
  });
  renderProperties("rent");
});

// --- AGENTS LISTING ---
const agentList = document.getElementById('agent-list');
agentList.innerHTML = agencyData.agents.map(agent => `
  <div class="agent-card">
    <img class="agent-photo" src="${agent.img}" alt="${agent.name}">
    <div class="agent-info">
      <div class="agent-name">${agent.name}</div>
      <div class="agent-role">${agent.role}</div>
      <div class="agent-meta">${agent.meta}</div>
    </div>
    <a href="${agent.link}" class="search-btn">View</a>
  </div>
`).join('');