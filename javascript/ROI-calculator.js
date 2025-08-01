// ========== 1. FORMULAIRE ROI ==========

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("roi-form");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = {
      tower: form.tower.value,
      size: parseFloat(form.size.value),
      rooms: parseInt(form.rooms.value)
    };

    try {
      const response = await fetch("http://localhost:3000/api/roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      alert(`Estimated ROI: ${result.roi}%`);
    } catch (error) {
      console.error("Error:", error);
      alert("There was an error calculating the ROI.");
    }
  });
});

// ========== 2. TABLEAU EXEMPLE ==========

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

  // Ajoute l'action sur les boutons
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = "tableau-click.html";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderROITable(exampleROIData);
});

// ========== 3. MENU HEADER BURGER ==========

document.addEventListener('DOMContentLoaded', function() {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');

  if (mainBuyBtn) {
    mainBuyBtn.addEventListener('click', function(e) {
      e.preventDefault();
      buyDropdown.classList.toggle('open');
    });

    document.addEventListener('click', function(e) {
      if (!buyDropdown.contains(e.target)) {
        buyDropdown.classList.remove('open');
      }
    });
  }
});

// ========== 4. SYSTÈME MIN/MAX AREA ==========

const areaSizes = [
  300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800,
  2000, 2200, 2500, 3000, 3500, 4000, 5000, 6000, 7000, 8000, 10000
];

function setupAreaDropdowns() {
  const minBtn = document.getElementById('minAreaBtn');
  const maxBtn = document.getElementById('maxAreaBtn');
  const minDropdown = document.getElementById('minAreaDropdown');
  const maxDropdown = document.getElementById('maxAreaDropdown');

  if (!minBtn || !maxBtn || !minDropdown || !maxDropdown) return;

  // Remplit chaque dropdown
  minDropdown.innerHTML = areaSizes.map(size =>
    `<div class="area-option" tabindex="0" data-value="${size}">${size.toLocaleString()} sqft</div>`
  ).join('');
  maxDropdown.innerHTML = areaSizes.map(size =>
    `<div class="area-option" tabindex="0" data-value="${size}">${size.toLocaleString()} sqft</div>`
  ).join('');

  // Sélection logique
  minDropdown.querySelectorAll('.area-option').forEach(opt => {
    opt.addEventListener('click', () => {
      minBtn.textContent = "Min. " + opt.getAttribute('data-value') + " sqft";
      minBtn.dataset.value = opt.getAttribute('data-value');
      minDropdown.classList.remove('open');
    });
  });
  maxDropdown.querySelectorAll('.area-option').forEach(opt => {
    opt.addEventListener('click', () => {
      maxBtn.textContent = "Max. " + opt.getAttribute('data-value') + " sqft";
      maxBtn.dataset.value = opt.getAttribute('data-value');
      maxDropdown.classList.remove('open');
    });
  });

  // Ouverture/fermeture
  minBtn.onclick = function(e) {
    e.preventDefault();
    minDropdown.classList.toggle('open');
    maxDropdown.classList.remove('open');
  };
  maxBtn.onclick = function(e) {
    e.preventDefault();
    maxDropdown.classList.toggle('open');
    minDropdown.classList.remove('open');
  };

  // Ferme dropdown si clic dehors
  document.addEventListener('mousedown', function(e) {
    if (!minDropdown.contains(e.target) && !minBtn.contains(e.target))
      minDropdown.classList.remove('open');
    if (!maxDropdown.contains(e.target) && !maxBtn.contains(e.target))
      maxDropdown.classList.remove('open');
  });
}

document.addEventListener("DOMContentLoaded", setupAreaDropdowns);

// Suggestions pour le champ Tower/Area
function populateAreaDatalist(data) {
  const datalist = document.getElementById("areas-list");
  if (!datalist) return;
  datalist.innerHTML = "";
  data.forEach(entry => {
    const opt = document.createElement("option");
    opt.value = entry.area;
    datalist.appendChild(opt);
  });
}

// Au chargement, rempli avec la data du tableau exemple
document.addEventListener("DOMContentLoaded", function() {
  populateAreaDatalist(exampleROIData);
});
