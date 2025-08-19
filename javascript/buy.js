// buy.js (version propre connectée à Supabase)
document.addEventListener("DOMContentLoaded", () => {
  let properties = [];

  async function fetchProperties() {
    const { data, error } = await supabase
      .from("buy")
      .select("*, agent(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur Supabase :", error);
      return;
    }

    properties = data.map(item => {
      const images = (item.photo_bien_url || "")
        .split(",")
        .map(str => str.trim())
        .filter(Boolean);

      return {
        title: item.property_type || "Property",
        price: `${item.price} AED`,
        location: "Dubai",
        lat: 25.2048,
        lng: 55.2708,
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        size: item.sqft,
        images: images.length ? images : ["https://via.placeholder.com/800x600?text=No+Image"],
        agent: {
          name: item.agent?.name || "Unknown",
          avatar: item.agent?.photo_agent_url || "https://via.placeholder.com/60x60?text=Agent"
        }
      };
    });

    filterProperties(1);
  }

  fetchProperties();

  const container = document.getElementById("propertyResults");
  const propertyCountDiv = document.getElementById("propertyCount");
  const propertyTypeSelect = document.getElementById("propertyType");
  const paginationDiv = document.getElementById("pagination");

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
    prevBtn.addEventListener('click', () => filterProperties(page - 1));
    paginationDiv.appendChild(prevBtn);

    for (let i = 1; i <= pages; i++) {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (i === page ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => filterProperties(i));
      paginationDiv.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&raquo;';
    nextBtn.className = 'page-btn';
    nextBtn.disabled = page === pages;
    nextBtn.addEventListener('click', () => filterProperties(page + 1));
    paginationDiv.appendChild(nextBtn);
  }

  function displayProperties(propsArray, page) {
    const { slice, total, pages } = paginate(propsArray, page);
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

    updatePagination(pages, page);
  }

  function filterProperties(page = 1) {
    currentPage = page;
    let filtered = [...properties];
    const search = document.getElementById("search").value.trim().toLowerCase();
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
      const price = parseInt(p.price.replace(/\D/g, '')) || 0;
      return price >= priceMin && price <= priceMax;
    });

    displayProperties(filtered, page);
  }

  document.getElementById("searchBtn").addEventListener("click", () => filterProperties(1));
  document.getElementById("clearBtn").addEventListener("click", () => {
    document.querySelectorAll(".filter-bar input, .filter-bar select").forEach(el => {
      el.value = el.tagName === "SELECT" ? el.options[0].text : "";
    });
    filterProperties(1);
  });
});
