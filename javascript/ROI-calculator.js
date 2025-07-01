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