// antiflash.js — général, fonctionne sur toutes les pages
// But : cacher la page très tôt, puis révéler dès que le "premier visuel utile"
// (souvent la grande image) est prêt. Si pas d'image, on révèle très vite.
// Sécurités intégrées pour ne jamais rester caché.

(function () {
  const root = document.documentElement;

  // 1) Masquer TRES tôt
  root.classList.add('anti-flash-html');

  // 2) Style critique minimal, retiré ensuite
  const style = document.createElement('style');
  style.id = 'anti-flash-style';
  style.textContent = `
    html.anti-flash-html body { visibility: hidden; }
    /* Petite aide anti-saut sur pages immo, n'affecte rien si sélecteurs absents */
    #main-image, .main-image { aspect-ratio: 16/9; object-fit: cover; width: 100%; max-width: 100%; }
  `;
  document.head.appendChild(style);

  // 3) Fonction pour révéler
  function reveal() {
    if (!root.classList.contains('anti-flash-html')) return;
    root.classList.remove('anti-flash-html');
    document.getElementById('anti-flash-style')?.remove();
  }
  // Option : tu peux la déclencher manuellement après ton render()
  window.propertyPageReveal = reveal;

  // 4) Choisir automatiquement une "image héros" (si présente)
  function pickHeroCandidate() {
    const selectors = [
      '#main-image',
      '.main-image',
      '.hero img',
      '.image-section img',
      'img[fetchpriority="high"]',
      'img[loading="eager"]',
      'img[srcset]',
      'img'
    ];
    const list = Array.from(document.querySelectorAll(selectors.join(',')));
    if (!list.length) return null;

    // On préfère une image visible et grande dans la fenêtre
    const visible = list.filter(el => {
      const r = el.getBoundingClientRect();
      const inView = r.bottom > 0 && r.top < (window.innerHeight || 800);
      const area = Math.max(1, r.width * r.height);
      // ignore les icônes minuscules
      return inView && area > 10_000; // ~100x100
    });

    const pool = visible.length ? visible : list;
    let best = pool[0], bestScore = 0;
    for (const el of pool) {
      const r = el.getBoundingClientRect();
      const score = (r.width * r.height) + (el.hasAttribute('fetchpriority') ? 50_000 : 0);
      if (score > bestScore) { bestScore = score; best = el; }
    }
    return best || null;
  }

  // 5) S'accrocher à l'image choisie (ou révéler rapidement si aucune)
  function attach() {
    const hero = pickHeroCandidate();
    if (!hero) {
      // Pas d'image cible : révéler très vite (après 2 frames)
      requestAnimationFrame(() => requestAnimationFrame(reveal));
      return;
    }

    if (hero.complete && hero.naturalWidth > 0) {
      // Déjà en cache
      reveal();
      return;
    }

    hero.addEventListener('load', reveal, { once: true });
    hero.addEventListener('error', () => setTimeout(reveal, 50), { once: true });

    // Si la page injecte une meilleure image juste après, on observe brièvement
    const mo = new MutationObserver(() => {
      const newer = pickHeroCandidate();
      if (newer && newer !== hero) {
        if (newer.complete && newer.naturalWidth > 0) reveal();
        else {
          newer.addEventListener('load', reveal, { once: true });
          newer.addEventListener('error', () => setTimeout(reveal, 50), { once: true });
        }
        mo.disconnect();
      }
    });
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => mo.disconnect(), 1500); // on arrête d'observer après 1,5s
    }
  }

  // 6) Lancer l'attache au bon moment
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }

  // 7) Filet de sécurité global : ne jamais rester caché
  setTimeout(reveal, 4000);
})();





