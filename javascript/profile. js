// javascript/supabaseClient.js (ESM)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ⚠️ sans slash final
const SUPABASE_URL = "https://hiigdwqwtilboeimlybl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaWdkd3F3dGlsYm9laW1seWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODQwMTYsImV4cCI6MjA2Njk2MDAxNn0.lDjA9eZwR_EV-hkZmg2Y9WzzXlD5Zfz5u7HCs6fXYOw";

window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.db = (table) => window.supabase.from(table);

// ✅ signale que Supabase est prêt (le module peut charger plus lentement que le script classique)
window.dispatchEvent(new Event("supabase:ready"));
console.log("Supabase ready:", !!window.supabase);

document.addEventListener("DOMContentLoaded", async () => {
  // Vérifie l'état de connexion Supabase
  const { data: { user } } = await window.supabase.auth.getUser();
  const profilBlock = document.getElementById("profilBlock");

  if (user) {
    // Utilisateur connecté → on remplace par "Profil"
    profilBlock.innerHTML = `
      <a href="profile.html" class="profile-button header-btn">
        <i class="fa fa-user"></i> Profil
      </a>
    `;
  } else {
    // Pas connecté → garder Login
    profilBlock.innerHTML = `
      <a href="login.html" class="login-button header-btn">Login</a>
    `;
  }
});
