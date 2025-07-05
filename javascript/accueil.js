
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

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

// Particles simple canvas
(() => {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let particlesArray = [];

  function init() {
    width = canvas.width = canvas.clientWidth;
    height = canvas.height = canvas.clientHeight;
    particlesArray = [];
    for (let i = 0; i < 40; i++) {
      particlesArray.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1 + Math.random() * 2,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        alpha: 0.1 + Math.random() * 0.2,
      });
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particlesArray.forEach(p => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 153, 0, ${p.alpha})`;
      ctx.shadowColor = 'rgba(255,153,0,0.7)';
      ctx.shadowBlur = 4;
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0 || p.x > width) p.speedX *= -1;
      if (p.y < 0 || p.y > height) p.speedY *= -1;
    });
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', init);

  init();
  animate();
})();

document.addEventListener('DOMContentLoaded', function () {
  const viewMapsBtn = document.getElementById('viewMapsBtn');
  if (viewMapsBtn) {
    viewMapsBtn.addEventListener('click', function () {
      window.location.href = 'maps.html';
    });
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const searchBar = document.querySelector('.search-bar');
  if (!searchBar) return;

  const input = searchBar.querySelector('input[type="text"]');
  const selectType = searchBar.querySelectorAll('select')[0];
  const selectBeds = searchBar.querySelectorAll('select')[1];
  const searchBtn = searchBar.querySelector('button');

  searchBtn.addEventListener('click', function () {
    // Récupère l'onglet actif
    const tabActive = tabs.find(tab => tab.classList.contains('active')).textContent.trim().toLowerCase();
    // Récupère les filtres
    const q = encodeURIComponent(input.value.trim());
    const type = encodeURIComponent(selectType.value !== "Property type" ? selectType.value : "");
    const beds = encodeURIComponent(selectBeds.value !== "Beds & Baths" ? selectBeds.value : "");

    // Détermine la page cible
    let page = "";
    if (tabActive === "buy") page = "buy.html";
    else if (tabActive === "rent") page = "rent.html";
    else if (tabActive === "new projects") page = "off-plan-search.html";
    else if (tabActive === "commercial") page = "commercial.html";
    else page = "buy.html"; // fallback

    // Construit les query params
    let params = [];
    if (q) params.push(`search=${q}`);
    if (type) params.push(`type=${type}`);
    if (beds) params.push(`beds=${beds}`);
    const queryString = params.length ? "?" + params.join("&") : "";

    // Redirige vers la page cible avec les filtres
    window.location.href = page + queryString;
  });

  // (optionnel) Permet de lancer la recherche avec "Entrée"
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') searchBtn.click();
  });
});


