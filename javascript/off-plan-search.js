// --- SUGGESTIONS dynamiques, pas dans le HTML ---
const projects = [
  {
    title: "Ocean House",
    location: "Palm Jumeirah",
    type: "Apartment",
    developer: "Ellington",
    price: 6500000,
    handover: 2025,
    status: "Launch",
    description: "Luxury beachfront apartment with full Palm views.",
    highlights: ["20% on booking", "80% during construction", "20% on handover"],
    images: ["styles/appart1.jpg","styles/photo/fond.jpg"],
  },
  {
    title: "Creek Beach Lotus",
    location: "Creek Beach",
    type: "Apartment",
    developer: "Emaar",
    price: 700000,
    handover: 2025,
    status: "Handover Soon",
    description: "Family-friendly, apartments steps Creek Beach.",
    highlights: ["From 700,000 AED", "Golf-view apartments"],
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
  },
  {
    title: "Creek Beach Lotus",
    location: "Creek Beach",
    type: "Apartment",
    developer: "Emaar",
    price: 700000,
    handover: 2025,
    status: "Handover Soon",
    description: "Family-friendly, apartments steps Creek Beach.",
    highlights: ["From 700,000 AED", "Golf-view apartments"],
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
  },
  {
    title: "Creek Beach Lotus",
    location: "Creek Beach",
    type: "Apartment",
    developer: "Emaar",
    price: 700000,
    handover: 2025,
    status: "Handover Soon",
    description: "Family-friendly, apartments steps Creek Beach.",
    highlights: ["From 700,000 AED", "Golf-view apartments"],
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
  },
  {
    title: "Creek Beach Lotus",
    location: "Creek Beach",
    type: "Apartment",
    developer: "Emaar",
    price: 700000,
    handover: 2025,
    status: "Handover Soon",
    description: "Family-friendly, apartments steps Creek Beach.",
    highlights: ["From 700,000 AED", "Golf-view apartments"],
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
  },
  {
    title: "Creek Beach Lotus",
    location: "Creek Beach",
    type: "Apartment",
    developer: "Emaar",
    price: 700000,
    handover: 2025,
    status: "Handover Soon",
    description: "Family-friendly, apartments steps Creek Beach.",
    highlights: ["From 700,000 AED", "Golf-view apartments"],
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
  },
  {
    title: "Creek Beach Lotus",
    location: "Creek Beach",
    type: "Apartment",
    developer: "Emaar",
    price: 700000,
    handover: 2025,
    status: "Handover Soon",
    description: "Family-friendly, apartments steps Creek Beach.",
    highlights: ["From 700,000 AED", "Golf-view apartments"],
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
  },
  {
    title: "Creek Beach Lotus",
    location: "Creek Beach",
    type: "Apartment",
    developer: "Emaar",
    price: 700000,
    handover: 2025,
    status: "Handover Soon",
    description: "Family-friendly, apartments steps Creek Beach.",
    highlights: ["From 700,000 AED", "Golf-view apartments"],
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
  },
  {
    title: "Creek Beach Lotus",
    location: "Creek Beach",
    type: "Apartment",
    developer: "Emaar",
    price: 700000,
    handover: 2025,
    status: "Handover Soon",
    description: "Family-friendly, apartments steps Creek Beach.",
    highlights: ["From 700,000 AED", "Golf-view apartments"],
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
  },
  {
    title: "Creek Beach Lotus",
    location: "Creek Beach",
    type: "Apartment",
    developer: "Emaar",
    price: 700000,
    handover: 2025,
    status: "Handover Soon",
    description: "Family-friendly, apartments steps Creek Beach.",
    highlights: ["From 700,000 AED", "Golf-view apartments"],
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
  },
  {
    title: "Creek Beach Lotus",
    location: "Creek Beach",
    type: "Apartment",
    developer: "Emaar",
    price: 700000,
    handover: 2025,
    status: "Handover Soon",
    description: "Family-friendly, apartments steps Creek Beach.",
    highlights: ["From 700,000 AED", "Golf-view apartments"],
    images: ["styles/photo/dubai-map.jpg", "styles/photo/fond.jpg"],
  },
  // Ajoute d'autres projets ici...
];

// Génération des suggestions dynamiquement (pour que ce soit connectable à une vraie DB)
function setDynamicFilters() {
  const unique = arr => [...new Set(arr)];
  const areas = unique(projects.map(p => p.location)).sort();
  const types = unique(projects.map(p => p.type || "Apartment")).sort();
  const devs = unique(projects.map(p => p.developer)).sort();
  const handovers = unique(projects.map(p => p.handover)).sort((a, b) => a - b);

  const areaFilter = document.getElementById("areaFilter");
  areaFilter.innerHTML = `<option>Location</option>` + areas.map(a => `<option>${a}</option>`).join('');

  const typeFilter = document.getElementById("propertyType");
  typeFilter.innerHTML = `<option>Property type</option>` + types.map(t => `<option>${t}</option>`).join('');

  const devFilter = document.getElementById("developerFilter");
  devFilter.innerHTML = `<option>Developer</option>` + devs.map(d => `<option>${d}</option>`).join('');

  const handoverFilter = document.getElementById("handoverFilter");
  handoverFilter.innerHTML = `<option>Handover</option>` + handovers.map(h => `<option>${h}</option>`).join('') + `<option>2027+</option>`;
}

let filteredProjects = [...projects];
let currentPage = 1;
const ITEMS_PER_PAGE = 6;

// Filtres et recherche
function filterProjects(page = 1) {
  currentPage = page;
  let filtered = projects.slice();

  const search = document.getElementById("search").value.trim().toLowerCase();
  const area = document.getElementById("areaFilter").value;
  const propertyType = document.getElementById("propertyType").value;
  const developer = document.getElementById("developerFilter").value;
  const handover = document.getElementById("handoverFilter").value;
  const priceMin = parseInt(document.getElementById("priceMin").value) || 0;
  const priceMax = parseInt(document.getElementById("priceMax").value) || Infinity;

  if (search) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(search) ||
      p.location.toLowerCase().includes(search) ||
      p.developer.toLowerCase().includes(search)
    );
  }
  if (area !== "Location") filtered = filtered.filter(p => p.location === area);
  if (propertyType !== "Property type") filtered = filtered.filter(p => (p.type ? p.type === propertyType : true));
  if (developer !== "Developer") filtered = filtered.filter(p => p.developer === developer);
  if (handover !== "Handover") {
    if (handover === "2027+") filtered = filtered.filter(p => parseInt(p.handover) >= 2027);
    else filtered = filtered.filter(p => p.handover == handover);
  }
  filtered = filtered.filter(p => p.price >= priceMin && p.price <= priceMax);

  filteredProjects = filtered;
  displayProjects(filteredProjects, currentPage);
  updatePagination(filteredProjects.length, currentPage);
}

function paginate(arr, page) {
  const total = arr.length;
  const pages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return { page, total, pages, slice: arr.slice(start, end) };
}

// Affichage projets
function displayProjects(array, page) {
  const container = document.getElementById("propertyResults");
  const { slice } = paginate(array, page);
  container.innerHTML = "";
  document.getElementById("propertyCount").textContent = `${array.length} projects found`;

  slice.forEach((property, i) => {
    let statusClass = property.status.toLowerCase().includes("handover") ? "handover" : "";
    let highlights = property.highlights.map(h => `<li>${h}</li>`).join('');
    let imgs = "";
    if (property.images.length > 1) {
      imgs = `
        <div class="carousel-v2">
          <img src="${property.images[0]}" class="active" alt="${property.title}" />
          ${property.images.slice(1).map(img => `<img src="${img}" alt="${property.title}" />`).join("")}
          <button class="carousel-btn prev"><i class="fas fa-chevron-left"></i></button>
          <button class="carousel-btn next"><i class="fas fa-chevron-right"></i></button>
        </div>
      `;
    } else {
      imgs = `<img src="${property.images[0]}" alt="${property.title}" />`;
    }
    const card = document.createElement("div");
    card.className = "property-card-v2";
    card.tabIndex = 0; // accessibilité au clavier
    card.innerHTML = `
      <div class="property-status ${statusClass}">${property.status.toUpperCase()}</div>
      <div class="property-img-side">${imgs}</div>
      <div class="property-details-main">
        <h3>${property.title}</h3>
        <div class="prop-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</div>
        <div class="prop-desc">${property.description}</div>
        <ul class="prop-highlights">${highlights}</ul>
        <div class="prop-info">
          <span><b>From:</b> ${property.price.toLocaleString()} AED</span>
          <span><b>Handover:</b> ${property.handover}</span>
          <span><b>Developer:</b> ${property.developer}</span>
        </div>
      </div>
    `;
    card.addEventListener("click", function () {
      window.location = 'off-plan-click.html?project=' + encodeURIComponent(property.title);
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter") window.location = 'off-plan-click.html?project=' + encodeURIComponent(property.title);
    });
    container.appendChild(card);

    // Carrousel JS
    const carousel = card.querySelector(".carousel-v2");
    if (carousel) {
      const imgs = carousel.querySelectorAll("img");
      let idx = 0;
      carousel.querySelector(".next").addEventListener("click", (e) => {
        e.stopPropagation();
        imgs[idx].classList.remove("active");
        idx = (idx + 1) % imgs.length;
        imgs[idx].classList.add("active");
      });
      carousel.querySelector(".prev").addEventListener("click", (e) => {
        e.stopPropagation();
        imgs[idx].classList.remove("active");
        idx = (idx - 1 + imgs.length) % imgs.length;
        imgs[idx].classList.add("active");
      });
    }
  });
}

function updatePagination(total, page) {
  const pages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
  const pagDiv = document.getElementById("pagination");
  pagDiv.innerHTML = "";
  if (pages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn main-orange-btn outline';
  prevBtn.disabled = page === 1;
  prevBtn.innerHTML = '<i class="fa fa-chevron-left"></i>';
  prevBtn.onclick = () => { if (page > 1) { currentPage--; displayProjects(filteredProjects, currentPage); updatePagination(filteredProjects.length, currentPage); }};
  pagDiv.appendChild(prevBtn);

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn main-orange-btn' + (i === page ? ' active' : ' outline');
    btn.textContent = i;
    btn.onclick = () => { currentPage = i; displayProjects(filteredProjects, currentPage); updatePagination(filteredProjects.length, currentPage); };
    pagDiv.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn main-orange-btn outline';
  nextBtn.disabled = page === pages;
  nextBtn.innerHTML = '<i class="fa fa-chevron-right"></i>';
  nextBtn.onclick = () => { if (page < pages) { currentPage++; displayProjects(filteredProjects, currentPage); updatePagination(filteredProjects.length, currentPage); }};
  pagDiv.appendChild(nextBtn);
}

// EVENTS
document.addEventListener('DOMContentLoaded', () => {
  setDynamicFilters();
  filterProjects(1);

  // --- AUTO-FILTER ON ANY CHANGE ---
  document.querySelectorAll('.filter-bar input, .filter-bar select').forEach(el => {
    el.addEventListener('input', () => filterProjects(1));
    el.addEventListener('change', () => filterProjects(1));
  });

  // "Clear" button
  document.getElementById("clearBtn").addEventListener("click", () => {
    document.querySelectorAll(".filter-bar input, .filter-bar select").forEach(el => {
      el.value = el.tagName === "SELECT" ? el.options[0].text : "";
    });
    filterProjects(1);
  });

  // --- Scroll to top btn ---
  const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  window.addEventListener('scroll', () => {
    if (window.scrollY > 250) scrollToTopBtn.style.display = 'block';
    else scrollToTopBtn.style.display = 'none';
  });
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});


// Sticky filter-bar show/hide on scroll direction
let lastScrollY = window.scrollY;
const filterBar = document.querySelector('.filter-bar');
let ticking = false;

window.addEventListener('scroll', function() {
  if (!ticking) {
    window.requestAnimationFrame(function() {
      if (window.scrollY > lastScrollY + 6) {
        // Scrolling down
        filterBar.classList.add('hide-on-scroll');
      } else if (window.scrollY < lastScrollY - 6) {
        // Scrolling up
        filterBar.classList.remove('hide-on-scroll');
      }
      lastScrollY = window.scrollY;
      ticking = false;
    });
    ticking = true;
  }
});
