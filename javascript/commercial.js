// javascript/buy.js
document.addEventListener("DOMContentLoaded", () => {
  // Dummy data AVEC coordonnées (pour test)
  const properties = [];
  for (let i = 0; i < 47; i++) {
    properties.push({
      title: ["Apartment", "Villa", "Townhouse", "Penthouse"][i % 4],
      price: `${2_000_000 + i * 120_000} AED`,
      location: ["Downtown Dubai", "Palm Jumeirah", "Dubai South", "JVC"][i % 4],
      lat: 25.19 + 0.04 * (i % 4), lng: 55.26 + 0.04 * (i % 3),
      bedrooms: 2 + (i % 5),
      bathrooms: 1 + (i % 4),
      size: 1100 + (i * 13) % 900,
      images: [
        "styles/photo/dubai-map.jpg",
        "styles/photo/fond.jpg"
      ],
      agent: {
        name: ["John Doe", "Jane Smith", "Omar Khalid", "Sara Hamed"][i % 4],
        avatar: `https://randomuser.me/api/portraits/${i % 2 === 0 ? "men" : "women"}/${30 + i % 40}.jpg`
      }
    });
  }

  const container = document.getElementById("propertyResults");
  const propertyCountDiv = document.getElementById("propertyCount");
  const propertyTypesDiv = document.getElementById("propertyTypesSummary");
  const propertyTypeSelect = document.getElementById("propertyType");
  const paginationDiv = document.getElementById("pagination");


  // --- Types de bien (cliquables)
  function displayPropertyTypesSummary(propsArray, filterType) {
    const typeCounts = {};
    propsArray.forEach(p => { typeCounts[p.title] = (typeCounts[p.title] || 0) + 1; });
    const typeOrder = [
      "Apartment", "Villa", "Townhouse", "Land", "Duplex", "Penthouse", "Compound", "Whole Building"
    ];
    const sortedTypes = Object.keys(typeCounts).sort((a, b) => {
      const idxA = typeOrder.indexOf(a); const idxB = typeOrder.indexOf(b);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
    let html = `<div class="pts-row">`;
    sortedTypes.forEach(type => {
      html += `<span class="pts-type${filterType === type ? " selected" : ""}" data-type="${type}" style="cursor:pointer">${type} <span class="pts-count">(${typeCounts[type]})</span></span>`;
    });
    html += `</div>`;
    propertyTypesDiv.innerHTML = html;
    propertyTypesDiv.querySelectorAll('.pts-type').forEach(elem => {
      elem.addEventListener('click', function() {
        propertyTypeSelect.value = elem.getAttribute('data-type');
        filterProperties(1); // go page 1 !
        propertyTypesDiv.querySelectorAll('.pts-type').forEach(span => span.classList.remove('selected'));
        elem.classList.add('selected');
        propertyCountDiv.scrollIntoView({behavior: "smooth"});
      });
    });
  }

  // --- Pagination dynamique
  let currentPage = 1;
  const cardsPerPage = 18;
  function paginate(arr, page) {
    const total = arr.length;
    const pages = Math.ceil(total / cardsPerPage) || 1;
    const start = (page - 1) * cardsPerPage;
    const end = start + cardsPerPage;
    return { page, total, pages, slice: arr.slice(start, end) };
  }
  function updatePagination(pages, page) {
    paginationDiv.innerHTML = '';
    if (pages <= 1) return;
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&laquo;';
    prevBtn.className = 'page-btn';
    prevBtn.disabled = page === 1;
    prevBtn.addEventListener('click', () => { filterProperties(page - 1); });
    paginationDiv.appendChild(prevBtn);
    for (let i = 1; i <= pages; i++) {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (i === page ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => { filterProperties(i); });
      paginationDiv.appendChild(btn);
    }
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&raquo;';
    nextBtn.className = 'page-btn';
    nextBtn.disabled = page === pages;
    nextBtn.addEventListener('click', () => { filterProperties(page + 1); });
    paginationDiv.appendChild(nextBtn);
  }

  // --- Affichage des biens
  function displayProperties(propsArray, page) {
    const {slice, total, pages} = paginate(propsArray, page);
    container.innerHTML = "";
    propertyCountDiv.textContent = `${propsArray.length} properties found`;
    slice.forEach(property => {
      const card = document.createElement("div");
      card.className = "property-card";
      const imageElements = property.images.map((src, index) =>
        `<img src="${src}" class="${index === 0 ? 'active' : ''}" alt="Property Photo">`
      ).join('');
      card.innerHTML = `
        <div class="carousel">
          ${imageElements}
          <div class="carousel-btn prev">❮</div>
          <div class="carousel-btn next">❯</div>
          <div class="image-count"><i class="fas fa-camera"></i> ${property.images.length}</div>
        </div>
        <div class="property-info">
          <h3>${property.title}</h3>
          <p><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
          <p><i class="fas fa-bed"></i> ${property.bedrooms} 
             <i class="fas fa-bath"></i> ${property.bathrooms} 
             <i class="fas fa-ruler-combined"></i> ${property.size} sqft</p>
          <strong>${property.price}</strong>
          <div class="agent-info">
            <img src="${property.agent.avatar}" alt="Agent">
            <span>${property.agent.name}</span>
          </div>
          <div class="property-actions">
            <button>Call</button>
            <button>Email</button>
            <button>WhatsApp</button>
          </div>
        </div>
      `;

      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        window.location.href = "bien.html";
      });

      container.appendChild(card);

      // Carousel logic
      const carousel = card.querySelector(".carousel");
      const imgs = carousel.querySelectorAll("img");
      let currentIndex = 0;
      carousel.querySelector(".next").addEventListener("click", (e) => {
        e.stopPropagation();
        imgs[currentIndex].classList.remove("active");
        currentIndex = (currentIndex + 1) % imgs.length;
        imgs[currentIndex].classList.add("active");
      });
      carousel.querySelector(".prev").addEventListener("click", (e) => {
        e.stopPropagation();
        imgs[currentIndex].classList.remove("active");
        currentIndex = (currentIndex - 1 + imgs.length) % imgs.length;
        imgs[currentIndex].classList.add("active");
      });
    });
    displayPropertyTypesSummary(propsArray, propertyTypeSelect.value);
    updatePagination(pages, page);
    updateMiniMap(slice);
  }

  // --- Filtres (tous)
  function filterProperties(page = 1) {
    currentPage = page;
    let filtered = properties.slice();
    const search = document.getElementById("search").value.trim().toLowerCase();
    const transaction = document.getElementById("transaction").value;
    const propertyType = propertyTypeSelect.value;
    const bedrooms = document.getElementById("bedrooms").value;
    const bathrooms = document.getElementById("bathrooms").value;
    const priceMin = parseInt(document.getElementById("priceMin").value) || 0;
    const priceMax = parseInt(document.getElementById("priceMax").value) || Infinity;

    if (search) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(search) ||
        p.location.toLowerCase().includes(search)
      );
    }
    if (propertyType !== "Property Type") {
      filtered = filtered.filter(p => p.title === propertyType);
    }
    if (bedrooms !== "Bedrooms") {
      const min = parseInt(bedrooms);
      filtered = filtered.filter(p => p.bedrooms >= min);
    }
    if (bathrooms !== "Bathrooms") {
      const min = parseInt(bathrooms);
      filtered = filtered.filter(p => p.bathrooms >= min);
    }
    filtered = filtered.filter(p => {
      const price = parseInt(p.price.replace(/[\D]/g, '')) || 0;
      return price >= priceMin && price <= priceMax;
    });

    displayProperties(filtered, page);
  }

  // --- EVENTS search/clear
  document.getElementById("searchBtn").addEventListener("click", () => filterProperties(1));
  document.getElementById("clearBtn").addEventListener("click", () => {
    document.querySelectorAll(".filter-bar input, .filter-bar select").forEach(el => {
      el.value = el.tagName === "SELECT" ? el.options[0].text : "";
    });
    filterProperties(1);
  });

  // --- Initial
  filterProperties(1);

  // --- Scroll to top btn
  const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  window.addEventListener('scroll', () => {
    if (window.scrollY > 250) scrollToTopBtn.style.display = 'block';
    else scrollToTopBtn.style.display = 'none';
  });
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// --- Auto-prefill from query params + auto-search on arrival ---
document.addEventListener('DOMContentLoaded', function () {
  // Helper to get URL params
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // Find filter fields by ID or fallback by order
  const searchInput = document.getElementById('search') ||
    document.querySelector('.filter-bar input[type="text"]');
  const typeSelect = document.getElementById('propertyType') ||
    document.querySelectorAll('.filter-bar select')[0];
  const bedsSelect = document.querySelector('.filter-bar select[name="beds"]') ||
    document.querySelectorAll('.filter-bar select')[1];
  const searchBtn = document.getElementById('searchBtn') ||
    document.querySelector('.filter-bar button[type="submit"], .filter-bar button');

  // 1. Pré-remplit si paramètres présents
  const q = getParam('search') || '';
  const type = getParam('type') || '';
  const beds = getParam('beds') || '';

  if (searchInput && q) searchInput.value = decodeURIComponent(q);
  if (typeSelect && type) {
    Array.from(typeSelect.options).forEach(opt => {
      if (opt.value === decodeURIComponent(type) || opt.text === decodeURIComponent(type)) {
        opt.selected = true;
      }
    });
  }
  if (bedsSelect && beds) {
    Array.from(bedsSelect.options).forEach(opt => {
      if (opt.value === decodeURIComponent(beds) || opt.text === decodeURIComponent(beds)) {
        opt.selected = true;
      }
    });
  }

  // 2. Lance la recherche automatiquement si un paramètre présent
  if ((q || type || beds) && searchBtn) {
    // petit délai pour laisser le DOM (et JS dynamiques) s'installer
    setTimeout(() => searchBtn.click(), 100);
  }
});
