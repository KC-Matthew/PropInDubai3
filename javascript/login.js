// login.js — tabs + auth (Login/Signup/Reset) + rôle Utilisateur/Agent
const $  = s => document.querySelector(s);

/* -------------------- Onglets -------------------- */
const tabLogin   = $('#tabLogin');
const tabSignup  = $('#tabSignup');
const openReset  = $('#openReset');

const formLogin  = $('#formLogin');
const formSignup = $('#formSignup');
const formReset  = $('#formReset');

function show(which){
  formLogin?.classList.toggle('is-hidden', which !== 'login');
  formSignup?.classList.toggle('is-hidden', which !== 'signup');
  formReset?.classList.toggle('is-hidden', which !== 'reset');
  if (tabLogin && tabSignup){
    tabLogin.style.fontWeight  = (which==='login') ? '700' : '400';
    tabSignup.style.fontWeight = (which==='signup')? '700' : '400';
  }
}
tabLogin?.addEventListener('click', e=>{ e.preventDefault(); show('login'); });
tabSignup?.addEventListener('click', e=>{ e.preventDefault(); show('signup'); });
openReset?.addEventListener('click', e=>{ e.preventDefault(); show('reset'); });
$('#linkToSignup')?.addEventListener('click', e=>{ e.preventDefault(); show('signup'); });

/* -------------------- Helpers -------------------- */
const supa = window.supabase;
const alertBox = $('#loginAlert');

// Base path auto (gère *.github.io/<repo>/ et localhost/domaine perso)
const basePath = (() => {
  // si un <base href="..."> est défini dans le HTML, on le respecte
  const htmlBase = document.querySelector('base')?.getAttribute('href');
  if (htmlBase) {
    // enlève le trailing slash si présent
    return htmlBase.replace(/\/+$/,'');
  }
  // cas GitHub Pages "project": https://user.github.io/<repo>/
  if (location.hostname.endsWith('github.io')) {
    const seg = location.pathname.split('/').filter(Boolean); // ["repo", "page.html"...]
    return seg.length ? `/${seg[0]}` : '';
  }
  // localhost ou domaine racine
  return '';
})();

// URL absolue "site"
const siteBase = `${location.origin}${basePath}`;

const getRole = () =>
  (document.querySelector('input[name="authRole"]:checked')?.value || 'user');

function flash(msg, ok=false){
  if(!alertBox) return;
  alertBox.textContent = msg;
  alertBox.style.borderColor = ok ? '#d6f2dd' : '#ffd9b8';
  alertBox.style.background  = ok ? '#ecfff0' : '#fff7f0';
  alertBox.style.color       = ok ? '#146c2e' : '#7a3c00';
  alertBox.classList.add('show');
  setTimeout(()=> alertBox.classList.remove('show'), 4000);
}

async function ensureAgentExists(userId){
  // retourne true si une ligne agent existe déjà
  const { data, error } = await supa
    .from('agent')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/* -------------------- LOGIN -------------------- */
formLogin?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  const role = getRole();

  try{
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error) return flash(error.message);

    // rôle agent → vérifier s'il a déjà une fiche agent
    if (role === 'agent'){
      const uid = data.user.id;
      const hasAgent = await ensureAgentExists(uid);
      const redirect = hasAgent ? `${basePath}/accueil.html`
                                : `${basePath}/agent-onboarding.html`;
      flash('Connected! Redirecting…', true);
      setTimeout(()=> location.href = redirect, 500);
      return;
    }

    // rôle utilisateur
    flash('Connected! Redirecting…', true);
    setTimeout(()=> location.href = `${basePath}/accueil.html`, 500);
  }catch(err){
    console.error(err);
    flash('Unexpected error.');
  }
});

/* -------------------- SIGNUP -------------------- */
formSignup?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = $('#signupEmail').value.trim();
  const password = $('#signupPassword').value;
  const full_name = $('#signupName').value.trim();

  try{
    const { data, error } = await supa.auth.signUp({
      email, password,
      options: {
        data: { full_name },
        // IMPORTANT: URL absolue dans le bon sous-dossier
        emailRedirectTo: `${siteBase}/reset-password.html`
      }
    });
    if (error) return flash(error.message);

    // Optionnel : créer le profile si tu as la table
    if (data.user){
      await supa.from('profiles').insert({ id: data.user.id, full_name }).select();
    }
    flash('Check your email to confirm your account.', true);
    show('login');
  }catch(err){
    console.error(err);
    flash('Unexpected error.');
  }
});

/* -------------------- RESET -------------------- */
formReset?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = $('#resetEmail').value.trim();
  try{
    const { error } = await supa.auth.resetPasswordForEmail(email, {
      // IMPORTANT: URL absolue dans le bon sous-dossier
      redirectTo: `${siteBase}/reset-password.html`
    });
    if (error) return flash(error.message);
    flash('Reset link sent. Check your email.', true);
    show('login');
  }catch(err){
    console.error(err);
    flash('Unexpected error.');
  }
});

/* -------------------- OAuth Google --------------------
   - Respecte le rôle choisi pour la page d’atterrissage
   - redirectTo doit être une URL ABSOLUE enregistrée dans Supabase Auth
-------------------------------------------------------- */
$('#btnGoogle')?.addEventListener('click', async ()=>{
  const role = getRole();
  const land = role === 'agent' ? `${basePath}/agent-onboarding.html`
                                : `${basePath}/accueil.html`;

  // Certains providers ignorent l’état (state), on redirige côté Supabase vers notre URL
  const { error } = await supa.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${location.origin}${land}`, // URL absolue SANS double basePath
      // facultatif mais utile si tu veux récupérer le rôle au retour:
      // queryParams: { prompt: 'select_account' }
    }
  });
  if (error) flash(error.message);
});

/* ------------- Header login/logout + dropdown + burger ------------- */
window.addEventListener('supabase:ready', async ()=>{
  try{
    const btn = $('#headerLoginBtn');
    if(!btn) return;
    const { data } = await supa.auth.getSession();
    if(data.session){
      btn.textContent = "Logout";
      btn.href = "#";
      btn.onclick = async (e)=>{ e.preventDefault(); await supa.auth.signOut(); location.reload(); };
    }else{
      btn.textContent = "Login";
      btn.href = `${basePath}/login.html`;
    }
    supa.auth.onAuthStateChange((_evt, session)=>{
      if(session){ btn.textContent="Logout"; btn.href="#"; }
      else{ btn.textContent="Login"; btn.href=`${basePath}/login.html`; }
    });
  }catch(e){
    console.warn('supabase:ready handler error', e);
  }
});

// Fallback au cas où l’événement personnalisé n’est pas dispatché
document.addEventListener('DOMContentLoaded', async ()=>{
  if (!window.__headerInitOnce){
    window.__headerInitOnce = true;
    const evt = new Event('supabase:ready');
    window.dispatchEvent(evt);
  }
});

/* -------------------- UI header (dropdown/burger) -------------------- */
document.addEventListener('DOMContentLoaded', function () {
  const buyDropdown = document.getElementById('buyDropdown');
  const mainBuyBtn = document.getElementById('mainBuyBtn');
  if (buyDropdown && mainBuyBtn){
    mainBuyBtn.addEventListener('click', function (e) {
      e.preventDefault();
      buyDropdown.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!buyDropdown.contains(e.target) && e.target !== mainBuyBtn) {
        buyDropdown.classList.remove('open');
      }
    });
  }

  const burger = document.getElementById('burgerMenu');
  const nav = document.querySelector('.all-button');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      nav.classList.toggle('mobile-open');
      document.body.style.overflow = nav.classList.contains('mobile-open') ? 'hidden' : '';
      if (nav.classList.contains('mobile-open')) {
        setTimeout(() => {
          document.addEventListener('click', function closeOnce(e) {
            if (!nav.contains(e.target) && !burger.contains(e.target)) {
              nav.classList.remove('mobile-open');
              document.body.style.overflow = '';
            }
          }, { once: true });
        }, 0);
      }
    });
  }
});



