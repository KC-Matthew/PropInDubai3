// -- MOCK DATA (remplace par ta database plus tard) --
const selectedProperties = [
  {
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
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
    images: ["styles/photo/appart1.jpg", "styles/photo/fond.jpg"],
    title: "AED 1,490,000",
    bedrooms: 2,
    size: "1,080 sqft",
    location: "Downtown Residence",
    area: "Downtown",
    roi: "6.9%",
    averageRent: "AED 155,000",
    similar: false
  },
  {
    images: ["styles/photo/select.jpg", "styles/photo/dubai-map.jpg"],
    title: "AED 2,020,000",
    bedrooms: 2,
    size: "1,180 sqft",
    location: "Palm Residence",
    area: "Palm Jumeirah",
    roi: "8.1%",
    averageRent: "AED 168,000",
    similar: false
  }
];

const similarROIProperties = [
  {
    images: ["styles/photo/fond.jpg", "styles/photo/dubai-map.jpg"],
    title: "AED 1,390,000",
    bedrooms: 1,
    size: "860 sqft",
    location: "Marina Gate",
    area: "Dubai Marina",
    roi: "7.4%",
    averageRent: "AED 140,000",
    similar: true
  },
  {
    images: ["styles/photo/findagent.png", "styles/photo/appart1.jpg"],
    title: "AED 1,480,000",
    bedrooms: 1,
    size: "925 sqft",
    location: "Waves Residence",
    area: "JVC - 925 sqft",
    roi: "7.3%",
    averageRent: "AED 128,000",
    similar: true
  },
  {
    images: ["styles/photo/appart1.jpg", "styles/photo/select.jpg"],
    title: "AED 1,590,000",
    bedrooms: 2,
    size: "1,010 sqft",
    location: "Harbour Views",
    area: "Dubai Creek Harbour",
    roi: "7.5%",
    averageRent: "AED 158,000",
    similar: true
  }
];

// -- CARDS RENDERING --
function renderProperties(properties, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = ""; // clear before inject
  properties.forEach((p, index) => {
    const cardId = `${containerId}-card-${index}`;
    const cardDiv = document.createElement('div');
    cardDiv.className = "card";
    cardDiv.innerHTML = `
      ${p.similar ? '<div class="similar-label">Similar ROI</div>' : ''}
      <div class="card-image-wrapper">
        <button class="carousel-arrow arrow-left" onclick="event.stopPropagation(); changeImage('${cardId}', -1);">‹</button>
        <img id="${cardId}" src="${p.images[0]}" data-index="0" data-images='${JSON.stringify(p.images)}' alt="Property image" />
        <button class="carousel-arrow arrow-right" onclick="event.stopPropagation(); changeImage('${cardId}', 1);">›</button>
      </div>
      <div class="card-content">
        <div class="roi">ROI: ${p.roi}</div>
        <div class="rent">Avg. Rent: ${p.averageRent}</div>
        <h3>${p.title}</h3>
        <div class="location">${p.location}</div>
        <div>${p.area}</div>
        <div>🛏️ ${p.bedrooms} | 📐 ${p.size}</div>
      </div>
    `;
    // Click -> details
    cardDiv.addEventListener("click", function () {
      window.location.href = "ROI-click-click.html";
    });
    container.appendChild(cardDiv);
  });
}

window.changeImage = function (id, direction) {
  const img = document.getElementById(id);
  const images = JSON.parse(img.getAttribute('data-images'));
  let index = parseInt(img.getAttribute('data-index'), 10);
  index = (index + direction + images.length) % images.length;
  img.src = images[index];
  img.setAttribute('data-index', index);
};

renderProperties(selectedProperties, "selectedProperties");
renderProperties(similarROIProperties, "similarROI");

// -- ROI TABLE (INCHANGÉ) --
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

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = "tableau-click.html";
      });
    });
  }, 0);
});
