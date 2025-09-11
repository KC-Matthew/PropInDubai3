// /javascript/anti-flash.js
(function () {
  const root = document.documentElement;

  // Masquer très tôt
  root.classList.add('anti-flash-html');

  // Style critique (retiré ensuite)
  const style = document.createElement('style');
  style.id = 'anti-flash-style';
  style.textContent = [
    'html.anti-flash-html body{visibility:hidden}',
    '#main-image{aspect-ratio:16/9;object-fit:cover;width:100%;max-width:100%}'
  ].join('\n');
  document.head.appendChild(style);

  function reveal(){
    if(!root.classList.contains('anti-flash-html')) return;
    root.classList.remove('anti-flash-html');
    const st = document.getElementById('anti-flash-style');
    if (st) st.remove();
  }
  // Option: tu peux l’appeler toi-même après render()
  window.propertyPageReveal = reveal;

  // Une fois le DOM prêt, accroche-toi au vrai #main-image
  function attachToHero(){
    const hero = document.querySelector('#main-image');
    if (!hero) {
      // pas d'image héro → on révèle au prochain frame (tu n'as rien à cacher)
      requestAnimationFrame(()=>requestAnimationFrame(reveal));
      return;
    }
    if (hero.complete && hero.naturalWidth > 0) { reveal(); return; }
    hero.addEventListener('load', reveal, { once:true });
    hero.addEventListener('error', () => setTimeout(reveal, 50), { once:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachToHero, { once:true });
  } else {
    attachToHero();
  }

  // Sécurité : ne jamais rester caché indéfiniment
  setTimeout(reveal, 4000);
})();
