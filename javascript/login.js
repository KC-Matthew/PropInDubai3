// login.js — gère Login / Signup / Reset avec Supabase (window.supabase)

(function(){
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const supa = window.supabase;

  // Tabs
  const tabs = $$('.auth-tab');
  const formSignin = $('#form-signin');
  const formSignup = $('#form-signup');
  const formReset  = $('#form-reset');

  const siMsg = $('#si-message');
  const suMsg = $('#su-message');
  const rpMsg = $('#rp-message');

  tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      formSignin.classList.toggle('hidden', tab!=='signin');
      formSignup.classList.toggle('hidden', tab!=='signup');
      formReset .classList.add('hidden'); // si on passe d’un reset à autre chose
      clearMessages();
    });
  });

  $('#link-forgot')?.addEventListener('click', (e)=>{
    e.preventDefault();
    tabs.forEach(b=>b.classList.remove('active'));
    formSignin.classList.add('hidden');
    formSignup.classList.add('hidden');
    formReset.classList.remove('hidden');
  });

  function clearMessages(){
    [siMsg,suMsg,rpMsg].forEach(el=>{ if(!el) return; el.textContent=''; el.classList.remove('error','success'); });
  }

  // Utilitaires
  const redirectTo = new URLSearchParams(location.search).get('redirect') || 'accueil.html';
  const siteBase   = `${location.origin}`;

  // Si déjà logué → redirection
  (async ()=>{
    if (!supa || !supa.auth) return;
    const { data } = await supa.auth.getSession();
    if (data?.session) location.href = redirectTo;
  })();

  // LOGIN
  formSignin?.addEventListener('submit', async (e)=>{
    e.preventDefault(); clearMessages();
    if (!supa || !supa.auth){
      siMsg.textContent = 'Auth indisponible.'; siMsg.classList.add('error'); return;
    }
    const email = $('#si-email').value.trim();
    const password = $('#si-password').value;
    try{
      const { data, error } = await supa.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Souvenir : optionnel (tu peux stocker un flag)
      if ($('#si-remember').checked){
        try { localStorage.setItem('rememberMe','1'); } catch {}
      }
      siMsg.textContent = 'Logged in. Redirecting…'; siMsg.classList.add('success');
      setTimeout(()=>location.href = redirectTo, 400);
    }catch(err){
      siMsg.textContent = err.message || 'Login failed.'; siMsg.classList.add('error');
    }
  });

  // SIGNUP
  formSignup?.addEventListener('submit', async (e)=>{
    e.preventDefault(); clearMessages();
    if (!supa || !supa.auth){
      suMsg.textContent = 'Auth indisponible.'; suMsg.classList.add('error'); return;
    }
    const email = $('#su-email').value.trim();
    const password = $('#su-password').value;
    const fullName = $('#su-name').value.trim();

    try{
      const { data, error } = await supa.auth.signUp({
        email, password,
        options: {
          // si tu veux préremplir un profil
          data: { full_name: fullName },
          emailRedirectTo: `${siteBase}/reset-password.html` // page que tu créeras si tu actives le reset
        }
      });
      if (error) throw error;
      suMsg.textContent = 'Account created! Check your email to confirm.'; suMsg.classList.add('success');
    }catch(err){
      suMsg.textContent = err.message || 'Signup failed.'; suMsg.classList.add('error');
    }
  });

  // RESET PASSWORD
  formReset?.addEventListener('submit', async (e)=>{
    e.preventDefault(); clearMessages();
    if (!supa || !supa.auth){
      rpMsg.textContent = 'Auth indisponible.'; rpMsg.classList.add('error'); return;
    }
    const email = $('#rp-email').value.trim();
    try{
      const { data, error } = await supa.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteBase}/reset-password.html`
      });
      if (error) throw error;
      rpMsg.textContent = 'Reset link sent! Check your inbox.'; rpMsg.classList.add('success');
    }catch(err){
      rpMsg.textContent = err.message || 'Reset failed.'; rpMsg.classList.add('error');
    }
  });

  // GOOGLE OAUTH
  $('#btn-google')?.addEventListener('click', async ()=>{
    if (!supa || !supa.auth){
      siMsg.textContent = 'Auth indisponible.'; siMsg.classList.add('error'); return;
    }
    try{
      const { error } = await supa.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteBase}/accueil.html` // ou `${siteBase}${location.pathname}?redirect=...`
        }
      });
      if (error) throw error;
    }catch(err){
      siMsg.textContent = err.message || 'Google sign-in failed.'; siMsg.classList.add('error');
    }
  });

  // Header: dropdown Buy
  document.addEventListener('DOMContentLoaded', function () {
    const buyDropdown = document.getElementById('buyDropdown');
    const mainBuyBtn = document.getElementById('mainBuyBtn');
    if (!buyDropdown || !mainBuyBtn) return;
    mainBuyBtn.addEventListener('click', function (e) {
      e.preventDefault();
      buyDropdown.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!buyDropdown.contains(e.target)) {
        buyDropdown.classList.remove('open');
      }
    });
  });

})();
