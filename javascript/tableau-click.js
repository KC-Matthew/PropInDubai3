const selectedProperties = [
  {
    images: ["styles/appart1.jpg"],
    title: "AED 1,800,000",
    bedrooms: 1,
    size: "989 sqft",
    location: "Rarcher Presidence",
    area: "Ruban Marina - June 2086",
    roi: "7.3%",
    averageRent: "AED 135,000",
    similar: false
  },
  {
    images: ["styles/select.jpg"],
    title: "AED 1,490,000",
    bedrooms: 1,
    size: "880 sqft",
    location: "Riverside Apartments",
    area: "Downtown",
    roi: "6.9%",
    averageRent: "AED 120,000",
    similar: false
  },
  {
    images: ["styles/select.jpg"],
    title: "AED 1,490,000",
    bedrooms: 1,
    size: "880 sqft",
    location: "Riverside Apartments",
    area: "Downtown",
    roi: "6.9%",
    averageRent: "AED 120,000",
    similar: false
  },
  {
    images: ["styles/select.jpg"],
    title: "AED 1,490,000",
    bedrooms: 1,
    size: "880 sqft",
    location: "Riverside Apartments",
    area: "Downtown",
    roi: "6.9%",
    averageRent: "AED 120,000",
    similar: false
  },
  {
    images: ["styles/select.jpg"],
    title: "AED 1,490,000",
    bedrooms: 1,
    size: "880 sqft",
    location: "Riverside Apartments",
    area: "Downtown",
    roi: "6.9%",
    averageRent: "AED 120,000",
    similar: false
  }
];

const similarROIProperties = [
  {
    images: ["styles/appart1.jpg"],
    title: "AED 1,590,000",
    bedrooms: 1,
    size: "860 sqft",
    location: "Marina Gate",
    area: "Dubai Marina",
    roi: "7.4%",
    averageRent: "AED 140,000",
    similar: false
  },
  {
    images: ["styles/appart1.jpg"],
    title: "AED 1,590,000",
    bedrooms: 1,
    size: "860 sqft",
    location: "Marina Gate",
    area: "Dubai Marina",
    roi: "7.4%",
    averageRent: "AED 140,000",
    similar: false
  },
  {
    images: ["styles/appart1.jpg"],
    title: "AED 1,590,000",
    bedrooms: 1,
    size: "860 sqft",
    location: "Marina Gate",
    area: "Dubai Marina",
    roi: "7.4%",
    averageRent: "AED 140,000",
    similar: false
  },
  {
    images: ["styles/appart1.jpg"],
    title: "AED 1,590,000",
    bedrooms: 1,
    size: "860 sqft",
    location: "Marina Gate",
    area: "Dubai Marina",
    roi: "7.4%",
    averageRent: "AED 140,000",
    similar: false
  },
  {
    images: ["styles/appart1.jpg"],
    title: "AED 1,590,000",
    bedrooms: 1,
    size: "860 sqft",
    location: "Marina Gate",
    area: "Dubai Marina",
    roi: "7.4%",
    averageRent: "AED 140,000",
    similar: false
  },
  {
    images: ["styles/appart1.jpg"],
    title: "AED 1,590,000",
    bedrooms: 1,
    size: "860 sqft",
    location: "Marina Gate",
    area: "Dubai Marina",
    roi: "7.4%",
    averageRent: "AED 140,000",
    similar: false
  }
];

function renderProperties(properties, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = ""; // vide d'abord
  properties.forEach((p, index) => {
    const cardId = `${containerId}-card-${index}`;
    // Crée une div temporaire pour construire le HTML
    const cardDiv = document.createElement('div');
    cardDiv.className = "card";
    cardDiv.innerHTML = `
      ${p.similar ? '<div class="similar-label">Similar ROI</div>' : ''}
      <div class="card-image-wrapper">
        <button class="carousel-arrow arrow-left" onclick="changeImage('${cardId}', -1); event.stopPropagation();">‹</button>
        <img id="${cardId}" src="${p.images[0]}" data-index="0" data-images='${JSON.stringify(p.images)}' />
        <button class="carousel-arrow arrow-right" onclick="changeImage('${cardId}', 1); event.stopPropagation();">›</button>
      </div>
      <div class="card-content">
        <p style="font-weight: bold; color: #28a745;">ROI: ${p.roi}</p>
        <p style="font-size: 0.85rem; color: #444;">Average Rent: ${p.averageRent}</p>
        <h3>${p.title}</h3>
        <p>🛏️ ${p.bedrooms} | 📐 ${p.size}</p>
        <strong>${p.location}</strong>
        <p>${p.area}</p>
      </div>
    `;
    // Ajoute le listener pour la redirection
    cardDiv.addEventListener("click", function () {
      window.location.href = "ROI-click-click.html";
    });
    container.appendChild(cardDiv);
  });
}

function changeImage(id, direction) {
  const img = document.getElementById(id);
  const images = JSON.parse(img.getAttribute('data-images'));
  let index = parseInt(img.getAttribute('data-index'), 10);
  index = (index + direction + images.length) % images.length;
  img.src = images[index];
  img.setAttribute('data-index', index);
}

renderProperties(selectedProperties, "selectedProperties");
renderProperties(similarROIProperties, "similarROI");

const exampleROIData = [
  {
    area: "Jumeirah Village Circle",
    badge: { label: "🔥 High demand zone", color: "red" },
    average_price: 950000,
    average_roi: 7.2,
    comparison: "+1.1% vs Downtown"
  },
  {
    area: "Dubai Sports City",
    badge: { label: "🪴 Emerging area", color: "green" },
    average_price: 880000,
    average_roi: 6.9,
    comparison: "+0.8% vs Downtown"
  },
  {
    area: "Arjan",
    badge: { label: "🏡 Stable residential area", color: "blue" },
    average_price: 910000,
    average_roi: 7.0,
    comparison: "+0.9% vs Downtown"
  },
  {
    area: "Business Bay",
    badge: { label: "🔥 High Demand Area", color: "red" },
    average_price: 1200000,
    average_roi: 7.0,
    comparison: "+0.9% vs Downtown"
  }
];

function renderROITable(data) {
  const tableBody = document.getElementById("roi-table-body");
  tableBody.innerHTML = "";

  data.forEach(entry => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <strong>${entry.area}</strong><br>
        <span class="badge ${entry.badge.color}">${entry.badge.label}</span>
      </td>
      <td>${entry.average_price.toLocaleString()} AED<br><span class="note">✓ Within your budget</span></td>
      <td>${entry.average_roi}%<br><span class="note">${entry.comparison}</span></td>
      <td><button class="view-btn">View Properties</button></td>
    `;

    tableBody.appendChild(row);
  });
}

renderROITable(exampleROIData);

// Rend tous les boutons "View Properties" cliquables vers ROI-click-click.html
document.addEventListener("DOMContentLoaded", () => {
  // Appelle renderROITable après le DOMContentLoaded déjà
  setTimeout(() => { // s'assure que le DOM/tableau est bien injecté
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = "tableau-click.html";
      });
    });
  }, 0);
});
