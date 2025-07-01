// Données fictives pour test (remplace plus tard par API/BDD si tu veux)
const agentProps = [
  {
    title: "Townhouse | End Corner Unit | 5BR | Lagoons",
    type: "Townhouse",
    location: "Costa Brava, DAMAC Lagoons, Dubai",
    price: "AED 3,550,000",
    beds: 5,
    baths: 6,
    area: "3,213 sqft",
    status: "HOT",
    img: "styles/photo/dubai-map.jpg"
  },
  {
    title: "Apartment | Burj Khalifa View",
    type: "Apartment",
    location: "Downtown Dubai",
    price: "AED 2,300,000",
    beds: 2,
    baths: 2,
    area: "1,110 sqft",
    status: "NEW",
    img: "styles/photo/dubai-map.jpg"
  },
  {
    title: "Townhouse | Garden Facing",
    type: "Townhouse",
    location: "Damac Hills 2",
    price: "AED 1,800,000",
    beds: 3,
    baths: 4,
    area: "2,050 sqft",
    status: "",
    img: "styles/photo/dubai-map.jpg"
  },
  {
    title: "Apartment | Investment Deal",
    type: "Apartment",
    location: "Jumeirah Village Circle",
    price: "AED 1,200,000",
    beds: 1,
    baths: 2,
    area: "820 sqft",
    status: "",
    img: "styles/photo/dubai-map.jpg"
  }
];

const CARDS_PER_PAGE = 3;

function renderAgentProperties(page = 1) {
  const propList = document.getElementById('agentPropList');
  const typeFilter = document.getElementById('prop-type').value;
  const searchValue = document.getElementById('prop-search').value.trim().toLowerCase();
  const sort = document.getElementById('prop-sort').value;

  let filtered = agentProps.filter(p =>
    (!typeFilter || p.type === typeFilter) &&
    (!searchValue || p.location.toLowerCase().includes(searchValue))
  );
  if (sort === 'price') {
    filtered = filtered.sort((a, b) =>
      parseInt(a.price.replace(/\D/g, '')) - parseInt(b.price.replace(/\D/g, '')));
  } else if (sort === 'priceDesc') {
    filtered = filtered.sort((a, b) =>
      parseInt(b.price.replace(/\D/g, '')) - parseInt(a.price.replace(/\D/g, '')));
  }

  // Pagination
  const total = filtered.length;
  const pages = Math.ceil(total / CARDS_PER_PAGE);
  const start = (page - 1) * CARDS_PER_PAGE;
  const slice = filtered.slice(start, start + CARDS_PER_PAGE);

  propList.innerHTML = "";
  slice.forEach(p => {
    const card = document.createElement("div");
    card.className = "agent-property-card";
    card.innerHTML = `
      <img src="${p.img}" alt="${p.title}" class="agent-property-img">
      <div class="agent-property-info">
        <div class="agent-property-title">${p.title}</div>
        <div class="agent-property-details">
          <span><i class="fa fa-bed"></i> ${p.beds}</span> &nbsp;
          <span><i class="fa fa-bath"></i> ${p.baths}</span> &nbsp;
          <span><i class="fa fa-ruler-combined"></i> ${p.area}</span>
        </div>
        <div class="agent-property-location"><i class="fa fa-map-marker-alt"></i> ${p.location}</div>
        <div class="agent-property-price">${p.price}</div>
        <div class="agent-property-badges">
          ${p.status ? `<span class="badge badge-main">${p.status}</span>` : ""}
        </div>
      </div>
    `;
    // Lien vers la page du bien
    card.addEventListener('click', () => {
      window.location.href = "bien.html";
    });
    propList.appendChild(card);
  });

  // Pagination buttons
  const pagDiv = document.getElementById('agentPropPagination');
  pagDiv.innerHTML = "";
  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = (i === page) ? "active" : "";
    btn.onclick = () => renderAgentProperties(i);
    pagDiv.appendChild(btn);
  }

  // Compteurs actifs/rent (simulateur)
  document.getElementById("agent-active-count").textContent = total;
  document.getElementById("agent-sale-count").textContent = `${total} For Sale`;
  document.getElementById("agent-rent-count").textContent = "1 For Rent";
}

document.addEventListener("DOMContentLoaded", () => {
  renderAgentProperties();
  document.getElementById('prop-type').addEventListener('change', () => renderAgentProperties());
  document.getElementById('prop-search').addEventListener('input', () => renderAgentProperties());
  document.getElementById('prop-sort').addEventListener('change', () => renderAgentProperties());
});

// Simulation de propriétés
const exampleProperties = [
  {
    image: "styles/photo/dubai-map.jpg",
    title: "Modern 2BR Apartment",
    location: "Downtown Dubai",
    price: "AED 2,200,000",
    bedrooms: 2,
    bathrooms: 2,
    size: "1,250 sqft"
  },
  {
    image: "styles/photo/fond.jpg",
    title: "Spacious Family Villa",
    location: "Arabian Ranches",
    price: "AED 4,400,000",
    bedrooms: 4,
    bathrooms: 5,
    size: "3,650 sqft"
  },
  {
    image: "styles/photo/dubai-map.jpg",
    title: "Luxury 1BR in Business Bay",
    location: "Business Bay",
    price: "AED 1,050,000",
    bedrooms: 1,
    bathrooms: 1,
    size: "870 sqft"
  }
  // ... Ajoute d'autres exemples
];

const agentPropertiesList = document.getElementById("agent-properties-list");
exampleProperties.forEach(property => {
  const card = document.createElement("div");
  card.className = "property-card";
  card.innerHTML = `
    <img src="${property.image}" alt="${property.title}">
    <div class="property-info">
      <h3>${property.title}</h3>
      <div class="location">${property.location}</div>
      <div class="features">
        🛏️ ${property.bedrooms} | 🛁 ${property.bathrooms} | 📐 ${property.size}
      </div>
      <div class="price">${property.price}</div>
      <a class="view-btn" href="bien.html">View Property</a>
    </div>
  `;
  agentPropertiesList.appendChild(card);
});

