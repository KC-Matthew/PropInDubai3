// Onglets (tabs)
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// --- Custom Dropdown Property Type ---
(function () {
  const drop = document.getElementById('propertyTypeDropdown');
  if (!drop) return;
  const btn = drop.querySelector('.dropdown-btn');
  const label = btn.querySelector('.dropdown-label');
  const menu = drop.querySelector('.dropdown-menu');

  let selectedType = ''; // <-- valeur propre pour l’URL

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => { if (d !== drop) d.classList.remove('open'); });
    drop.classList.toggle('open');
  });

  menu.addEventListener('click', function (e) {
    if (!e.target.classList.contains('dropdown-item')) return;
    [...menu.querySelectorAll('.dropdown-item')].forEach(x => x.classList.remove('selected'));
    e.target.classList.add('selected');
    selectedType = e.target.textContent.trim(); // ex: "Apartment"
    label.textContent = selectedType || 'Property type';
    drop.classList.remove('open');
  });

  // expose pour lecture dans launchSearch
  drop.dataset.selectedType = '';
  const observer = new MutationObserver(() => {
    drop.dataset.selectedType = selectedType;
  });
  observer.observe(menu, { attributes: true, subtree: true });
  document.addEventListener('click', () => drop.classList.remove('open'));
})();

// --- Custom Dropdown Beds & Baths ---
(function () {
  const drop = document.getElementById('bedsBathsDropdown');
  if (!drop) return;
  const btn = drop.querySelector('.dropdown-btn');
  const label = btn.querySelector('.dropdown-label');
  const menu = drop.querySelector('.dropdown-menu');

  // valeurs "propres" pour l’URL (bedrooms/bathrooms)
  let bedroomsVal = ''; // "studio" | "1" | "2" | ... | "7plus"
  let bathroomsVal = '';

  function setSelected(container, target) {
    [...container.children].forEach(x => x.classList.remove('selected'));
    target.classList.add('selected');
  }

  function prettyFromVal(val, isBed) {
    if (!val) return '';
    if (val === 'studio') return 'Studio';
    if (val === '7plus') return '7+ ' + (isBed ? 'Bed' : 'Bath');
    return `${val} ${isBed ? 'Bed' : 'Bath'}`;
  }

  function updateLabel() {
    if (!bedroomsVal && !bathroomsVal) {
      label.textContent = 'Beds & Baths';
      return;
    }
    const bedTxt = prettyFromVal(bedroomsVal, true);
    const bathTxt = prettyFromVal(bathroomsVal, false);
    label.textContent = [bedTxt, bathTxt].filter(Boolean).join(', ');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => { if (d !== drop) d.classList.remove('open'); });
    drop.classList.toggle('open');
  });

  // Bedrooms
  const bedsBox = menu.querySelector('[data-type="bedrooms"]');
  bedsBox.addEventListener('click', function (e) {
    if (!e.target.classList.contains('dropdown-item')) return;
    const text = e.target.textContent.trim().toLowerCase(); // studio | 1 | 2 | ... | 7+
    setSelected(this, e.target);
    bedroomsVal = (text === 'studio') ? 'studio' : (text === '7+' ? '7plus' : text);
    updateLabel();
  });

  // Bathrooms
  const bathsBox = menu.querySelector('[data-type="bathrooms"]');
  bathsBox.addEventListener('click', function (e) {
    if (!e.target.classList.contains('dropdown-item')) return;
    const text = e.target.textContent.trim().toLowerCase(); // 1 | 2 | ... | 7+
    setSelected(this, e.target);
    bathroomsVal = (text === '7+' ? '7plus' : text);
    updateLabel();
  });

  // expose pour lecture dans launchSearch
  drop.dataset.bedroomsVal = '';
  drop.dataset.bathroomsVal = '';
  const observer = new MutationObserver(() => {
    drop.dataset.bedroomsVal = bedroomsVal;
    drop.dataset.bathroomsVal = bathroomsVal;
  });
  observer.observe(menu, { attributes: true, subtree: true });

  document.addEventListener('click', () => drop.classList.remove('open'));
})();

// --- Recherche : Search button et "Entrée" ---
(function () {
  const searchBar = document.querySelector('.search-bar');
  if (!searchBar) return;
  const input = searchBar.querySelector('input[type="text"]');
  const searchBtn = searchBar.querySelector('.search-btn');
  if (!input || !searchBtn) return;

  function resolvePageFromTab(tabText) {
    const t = tabText.toLowerCase();
    if (t === 'buy') return 'buy.html';
    if (t === 'rent') return 'rent.html';
    if (t === 'new projects') return 'off-plan-search.html';
    if (t === 'commercial') return 'commercial.html';
    return 'buy.html';
  }

  function launchSearch() {
    const activeTab = Array.from(document.querySelectorAll('.tab')).find(tab => tab.classList.contains('active'));
    const tabName = activeTab ? activeTab.textContent.trim() : 'Buy';
    const page = resolvePageFromTab(tabName);

    const q = input.value.trim();

    const typeDrop = document.getElementById('propertyTypeDropdown');
    const type = (typeDrop?.dataset.selectedType || '').trim(); // "Apartment" etc.

    const bbDrop = document.getElementById('bedsBathsDropdown');
    const bedroomsVal = (bbDrop?.dataset.bedroomsVal || '').trim(); // "studio" | "1"...|"7plus"
    const bathroomsVal = (bbDrop?.dataset.bathroomsVal || '').trim(); // "1"...|"7plus"

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    if (bedroomsVal) params.set('bedrooms', bedroomsVal);
    if (bathroomsVal) params.set('bathrooms', bathroomsVal);

    const url = params.toString() ? `${page}?${params.toString()}` : page;
    window.location.href = url;
  }

  searchBtn.addEventListener('click', launchSearch);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') launchSearch();
  });
})();

// Reveal
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

// Mobile burger menu
document.addEventListener('DOMContentLoaded', function () {
  const burger = document.getElementById('burgerMenu');
  const nav = document.querySelector('.all-button');
  burger?.addEventListener('click', () => {
    nav.classList.toggle('mobile-open');
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

// Menu Buy (header)
document.addEventListener('DOMContentLoaded', function () {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');

  mainBuyBtn?.addEventListener('click', function (e) {
    e.preventDefault();
    buyDropdown.classList.toggle('open');
  });

  document.addEventListener('click', function (e) {
    if (!buyDropdown?.contains(e.target)) {
      buyDropdown?.classList.remove('open');
    }
  });
});
