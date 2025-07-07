// Onglets (tabs)
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// --- Custom Dropdown Property Type ---
(function() {
  const drop = document.getElementById('propertyTypeDropdown');
  if (!drop) return;
  const btn = drop.querySelector('.dropdown-btn');
  const label = btn.querySelector('.dropdown-label');
  const menu = drop.querySelector('.dropdown-menu');
  let selected = '';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => { if (d !== drop) d.classList.remove('open'); });
    drop.classList.toggle('open');
  });
  menu.addEventListener('click', function(e) {
    if (!e.target.classList.contains('dropdown-item')) return;
    [...menu.querySelectorAll('.dropdown-item')].forEach(x => x.classList.remove('selected'));
    e.target.classList.add('selected');
    selected = e.target.textContent;
    label.textContent = selected || 'Property type';
    drop.classList.remove('open');
  });
  document.addEventListener('click', () => drop.classList.remove('open'));
})();

// --- Custom Dropdown Beds & Baths ---
(function() {
  const drop = document.getElementById('bedsBathsDropdown');
  if (!drop) return;
  const btn = drop.querySelector('.dropdown-btn');
  const label = btn.querySelector('.dropdown-label');
  const menu = drop.querySelector('.dropdown-menu');
  let selectedBed = '', selectedBath = '';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => { if (d !== drop) d.classList.remove('open'); });
    drop.classList.toggle('open');
  });
  // Bedrooms
  menu.querySelector('[data-type="bedrooms"]').addEventListener('click', function(e) {
    if (!e.target.classList.contains('dropdown-item')) return;
    [...this.children].forEach(x => x.classList.remove('selected'));
    e.target.classList.add('selected');
    selectedBed = e.target.textContent;
    updateLabel();
  });
  // Bathrooms
  menu.querySelector('[data-type="bathrooms"]').addEventListener('click', function(e) {
    if (!e.target.classList.contains('dropdown-item')) return;
    [...this.children].forEach(x => x.classList.remove('selected'));
    e.target.classList.add('selected');
    selectedBath = e.target.textContent;
    updateLabel();
  });
  function updateLabel() {
    let l = 'Beds & Baths';
    if (selectedBed || selectedBath) {
      l = '';
      if (selectedBed) l += selectedBed === 'Studio' ? 'Studio' : (selectedBed + ' Bed');
      if (selectedBed && selectedBath) l += ', ';
      if (selectedBath) l += selectedBath + ' Bath';
    }
    label.textContent = l;
  }
  document.addEventListener('click', () => drop.classList.remove('open'));
})();

// --- Recherche : Search button et "Entrée" ---
(function() {
  const searchBar = document.querySelector('.search-bar');
  if (!searchBar) return;
  const input = searchBar.querySelector('input[type="text"]');
  const searchBtn = searchBar.querySelector('.search-btn');
  if (!input || !searchBtn) return;

  function launchSearch() {
    const tabActive = Array.from(document.querySelectorAll('.tab')).find(tab => tab.classList.contains('active')).textContent.trim().toLowerCase();
    const query = input.value.trim();
    const type = document.querySelector('#propertyTypeDropdown .dropdown-label')?.textContent !== "Property type"
      ? document.querySelector('#propertyTypeDropdown .dropdown-label')?.textContent : "";
    const bedsLabel = document.querySelector('#bedsBathsDropdown .dropdown-label')?.textContent;
    const beds = (bedsLabel && bedsLabel !== "Beds & Baths") ? bedsLabel : "";

    // Choix de la page selon l'onglet actif
    let page = "";
    if (tabActive === "buy") page = "buy.html";
    else if (tabActive === "rent") page = "rent.html";
    else if (tabActive === "new projects") page = "off-plan-search.html";
    else if (tabActive === "commercial") page = "commercial.html";
    else page = "buy.html";

    let params = [];
    if (query) params.push(`search=${encodeURIComponent(query)}`);
    if (type) params.push(`type=${encodeURIComponent(type)}`);
    if (beds) params.push(`beds=${encodeURIComponent(beds)}`);
    const queryString = params.length ? "?" + params.join("&") : "";

    window.location.href = page + queryString;
  }

  searchBtn.addEventListener('click', launchSearch);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') launchSearch();
  });
})();

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

