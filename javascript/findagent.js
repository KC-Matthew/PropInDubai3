// Gère le changement de type de recherche
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const searchInput = document.getElementById('searchInput');
    const type = tab.getAttribute('data-type');

    if (type === 'location') {
      searchInput.placeholder = 'City, community or building';
      searchInput.classList.remove('agent-mode');
    } else {
      searchInput.placeholder = 'Enter agent name';
      searchInput.classList.add('agent-mode');
    }
  });
});

// Animation scroll si besoin
document.addEventListener('DOMContentLoaded', function () {
  ScrollReveal().reveal('.ai-section, .offplan-section, .roi-section, .map-section', {
    duration: 1000,
    distance: '50px',
    origin: 'bottom',
    easing: 'ease-in-out',
    reset: false,
    interval: 200
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const agents = Array.from(document.querySelectorAll('.agent-card'));
  const paginationContainer = document.getElementById('pagination');
  const cardsPerPage = 18;
  let currentPage = 1;
  const totalPages = Math.ceil(agents.length / cardsPerPage);

  function showPage(page) {
    currentPage = page;
    const start = (page - 1) * cardsPerPage;
    const end = start + cardsPerPage;

    agents.forEach((card, index) => {
      if (index >= start && index < end) {
        card.style.display = ''; // ou 'flex', si tu utilises flexbox
        card.style.visibility = 'visible';
        card.style.position = 'relative';
      }
      else {
        card.style.visibility = 'hidden';
        card.style.position = 'absolute';
      }

    });

    updatePaginationButtons();
  }

  function updatePaginationButtons() {
    paginationContainer.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&laquo;';
    prevBtn.className = 'page-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => showPage(currentPage - 1));
    paginationContainer.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => showPage(i));
      paginationContainer.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&raquo;';
    nextBtn.className = 'page-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => showPage(currentPage + 1));
    paginationContainer.appendChild(nextBtn);
  }

  // Initial call
  showPage(1);
});

  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const isActive = header.classList.contains('active');
      
      // Fermer tous les items
      document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));
      document.querySelectorAll('.accordion-content').forEach(c => c.style.maxHeight = null);

      if (!isActive) {
        header.classList.add('active');
        const content = header.nextElementSibling;
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });

  // Relier chaque carte agent à infoagent.html lors du clic
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.agent-card').forEach(card => {
    card.style.cursor = "pointer";
    card.addEventListener('click', function () {
      window.location.href = "infoagent.html";
    });
  });
});


