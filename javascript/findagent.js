document.addEventListener('DOMContentLoaded', function () {
  // ========== DEMO DATA ==========
  const AGENTS = [
    // Mets ici tous tes agents (en vrai, mets-en > 18 pour tester la pagination !)
    {
      name: "JP Fluelllen",
      company: "Real Broker LLC",
      priceRange: "$38K - $1M",
      sales12m: 57,
      totalSales: 574,
      photo: "styles/photo/dubai-map.jpg",
      nationality: "France",
      languages: ["English", "French"],
      rating: 5.0,
      superagent: true
    },
    {
      name: "Steve Prescott",
      company: "RE/MAX Capitol Properties",
      priceRange: "$40K - $1.2M",
      sales12m: 29,
      totalSales: 969,
      photo: "styles/photo/dubai-map.jpg",
      nationality: "UK",
      languages: ["English"],
      rating: 5.0,
      superagent: true
    },
    {
      name: "Sarah Karim",
      company: "Dubai Elite Realty",
      priceRange: "$50K - $1.4M",
      sales12m: 64,
      totalSales: 1120,
      photo: "styles/photo/dubai-map.jpg",
      nationality: "India",
      languages: ["English", "Hindi"],
      rating: 4.9,
      superagent: false
    },
    // ... DUPLIQUE ces objets pour en avoir plus de 18 !
  ];

  const COMPANIES = [
    {
      name: "Real Broker LLC",
      agents: 15,
      totalSales: 2600,
      photo: "styles/photo/dubai-map.jpg"
    },
    {
      name: "Dubai Elite Realty",
      agents: 22,
      totalSales: 1850,
      photo: "styles/photo/dubai-map.jpg"
    },
    {
      name: "RE/MAX Capitol Properties",
      agents: 17,
      totalSales: 1550,
      photo: "styles/photo/dubai-map.jpg"
    },
    // ... DUPLIQUE pour tester la pagination si tu veux
  ];

  // ========== DOM ELEMENTS ==========
  const sectionAgent = document.getElementById('super-section-agent');
  const sectionCompany = document.getElementById('super-section-company');
  const tabs = document.querySelectorAll('.super-tab');
  const input = document.getElementById('searchInput');
  const serviceSelect = document.getElementById('serviceSelect');
  const langSelect = document.getElementById('langSelect');
  const natSelect = document.getElementById('nationalitySelect');
  const container = document.getElementById('agents-container');
  const pagination = document.getElementById('pagination');

  // ========== LOGIC ==========
  let mode = "agent";
  let currentPage = 1;
  const CARDS_PER_PAGE = 18;

  // ========== CARD RENDERING ==========
  function renderCards(data) {
    container.innerHTML = '';
    const startIdx = (currentPage - 1) * CARDS_PER_PAGE;
    const endIdx = startIdx + CARDS_PER_PAGE;
    const pageData = data.slice(startIdx, endIdx);

    if (mode === "agent") {
      pageData.forEach(agent => {
        const card = document.createElement('div');
        card.className = "agent-card";
        card.innerHTML = `
          <img src="${agent.photo}" alt="${agent.name}" class="agent-photo" />
          <div class="agent-info">
            <h3>
              ${agent.name}
              ${agent.superagent ? `<span class="label-superagent">SUPERAGENT</span>` : ""}
              <span class="star-rating">★ ${agent.rating}</span>
            </h3>
            <p class="agency">${agent.company}</p>
            <p><strong>${agent.priceRange}</strong> team price range</p>
            <p><strong>${agent.sales12m}</strong> sales last 12 months</p>
            <p><strong>${agent.totalSales}</strong> total sales in Dubai</p>
            <p>Nationality: ${agent.nationality}</p>
            <p>Languages: ${agent.languages.join(', ')}</p>
          </div>
        `;
        card.style.cursor = "pointer";
        card.onclick = () => window.location.href = "infoagent.html";
        container.appendChild(card);
      });
    } else {
      pageData.forEach(company => {
        const card = document.createElement('div');
        card.className = "agent-card";
        card.innerHTML = `
          <img src="${company.photo}" alt="${company.name}" class="agent-photo" />
          <div class="agent-info">
            <h3>${company.name}</h3>
            <p><strong>${company.agents}</strong> agents</p>
            <p><strong>${company.totalSales}</strong> total sales in Dubai</p>
          </div>
        `;
        card.style.cursor = "pointer";
        card.onclick = () => window.location.href = "agence.html";
        container.appendChild(card);
      });
    }
  }

  // ========== PAGINATION RENDERING ==========
  function renderPagination(data) {
    pagination.innerHTML = '';
    const totalPages = Math.ceil(data.length / CARDS_PER_PAGE);
    if (totalPages <= 1) return; // Pas besoin de pagination

    // «« bouton précédent
    const prevBtn = document.createElement('button');
    prevBtn.className = "page-btn";
    prevBtn.disabled = currentPage === 1;
    prevBtn.innerHTML = "&laquo;";
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        update();
      }
    };
    pagination.appendChild(prevBtn);

    // Numéros de pages
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = "page-btn";
      if (i === currentPage) btn.classList.add('active');
      btn.textContent = i;
      btn.onclick = () => {
        currentPage = i;
        update();
      };
      pagination.appendChild(btn);
    }

    // »» bouton suivant
    const nextBtn = document.createElement('button');
    nextBtn.className = "page-btn";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.innerHTML = "&raquo;";
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        update();
      }
    };
    pagination.appendChild(nextBtn);
  }

  // ========== UPDATE CARDS + PAGINATION ==========
  function update() {
    let data;
    const q = input.value.trim().toLowerCase();
    const filterService = serviceSelect.value;
    const filterLang = langSelect.value;
    const filterNat = natSelect.value;

    if (mode === "agent") {
      data = AGENTS.filter(a =>
        (a.name.toLowerCase().includes(q) ||
         a.company.toLowerCase().includes(q) ||
         q === "") &&
        (filterLang === "" || (a.languages && a.languages.includes(filterLang))) &&
        (filterNat === "" || a.nationality === filterNat)
      );
    } else {
      data = COMPANIES.filter(c =>
        (c.name.toLowerCase().includes(q) || q === "")
      );
    }

    // Reset currentPage if page > nb pages
    const totalPages = Math.ceil(data.length / CARDS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = 1;

    renderCards(data);
    renderPagination(data);
  }

  // ========== TABS LOGIC + SECTION DISPLAY ==========
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      mode = tab.getAttribute('data-type');
      input.placeholder = mode === "agent"
        ? "Enter location or agent name"
        : "Enter company name";
      currentPage = 1;

      // Show/hide guide section
      if (mode === "agent") {
        sectionAgent.style.display = "";
        sectionCompany && (sectionCompany.style.display = "none");
        langSelect.style.display = "";
        natSelect.style.display = "";
      } else {
        sectionAgent.style.display = "none";
        sectionCompany && (sectionCompany.style.display = "none"); // On ne l'affiche pas ici
        langSelect.style.display = "none";
        natSelect.style.display = "none";
      }
      update();
    });
  });

  // Au chargement : n'afficher que le guide agent
  sectionAgent.style.display = "";
  sectionCompany && (sectionCompany.style.display = "none");
  langSelect.style.display = "";
  natSelect.style.display = "";

  // ========== INPUT EVENTS ==========
  input.addEventListener('input', function () { currentPage = 1; update(); });
  serviceSelect.addEventListener('change', function () { currentPage = 1; update(); });
  langSelect.addEventListener('change', function () { currentPage = 1; update(); });
  natSelect.addEventListener('change', function () { currentPage = 1; update(); });

  // ========== FORM SUBMIT ==========
  document.querySelector('.super-search-bar').onsubmit = e => {
    e.preventDefault();
    currentPage = 1;
    update();
  };

  // ========== ACCORDION (inchangé) ==========
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const isActive = header.classList.contains('active');
      document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));
      document.querySelectorAll('.accordion-content').forEach(c => c.style.maxHeight = null);
      if (!isActive) {
        header.classList.add('active');
        const content = header.nextElementSibling;
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });

  // ========== SCROLLREVEAL (inchangé) ==========
  if (window.ScrollReveal) {
    ScrollReveal().reveal('.super-section,.quick-guide', {
      duration: 900,
      distance: '40px',
      origin: 'bottom',
      easing: 'ease-in-out',
      reset: false
    });
  }

  // ========== PREMIER AFFICHAGE ==========
  update();
});

// Mobile burger menu
document.addEventListener('DOMContentLoaded', function () {
  const burger = document.getElementById('burgerMenu');
  const nav = document.querySelector('.all-button');
  burger?.addEventListener('click', () => {
    nav.classList.toggle('mobile-open');
    // Close on any click outside
    if (nav.classList.contains('mobile-open')) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        document.addEventListener('click', closeMenu, { once: true });
      }, 0);
    } else {
      document.body.style.overflow = '';
    }
    function closeMenu(e) {
      if (!nav.contains(e.target) && !burger.contains(e.target)) {
        nav.classList.remove('mobile-open');
        document.body.style.overflow = '';
      }
    }
  });
});
