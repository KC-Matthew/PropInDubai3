document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await window.supabase.auth.getUser();
  const profileInfo = document.getElementById("profileInfo");

  if (!user) {
    profileInfo.innerHTML = "<p>Vous n’êtes pas connecté. <a href='login.html'>Se connecter</a></p>";
    return;
  }

  // Affiche les infos de base
  profileInfo.innerHTML = `
    <h2>${user.email}</h2>
    <p>ID utilisateur : ${user.id}</p>
  `;

  // Si tu ajoutes plus de champs (nom, photo, etc.), on les affichera ici
  // Exemple : user.user_metadata.full_name
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await window.supabase.auth.signOut();
  window.location.href = "accueil.html";
});
