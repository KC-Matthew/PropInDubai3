document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await window.supabase.auth.getUser();
  const emailField = document.getElementById("email");
  const firstNameField = document.getElementById("firstName");
  const lastNameField = document.getElementById("lastName");

  if (!user) {
    document.querySelector(".profile-container").innerHTML = 
      "<p>You are not logged in. <a href='login.html'>Login</a></p>";
    return;
  }

  // Pré-remplir email
  emailField.value = user.email;

  // Si tu stockes prénom/nom dans metadata → les charger
  if (user.user_metadata) {
    firstNameField.value = user.user_metadata.firstName || "";
    lastNameField.value = user.user_metadata.lastName || "";
  }

  // Sauvegarde
  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const first = firstNameField.value.trim();
    const last = lastNameField.value.trim();

    const { error } = await window.supabase.auth.updateUser({
      data: { firstName: first, lastName: last }
    });

    if (error) {
      alert("Error while saving: " + error.message);
    } else {
      alert("Profile updated ✅");
    }
  });

  // Déconnexion
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await window.supabase.auth.signOut();
    window.location.href = "accueil.html";
  });
});

// Onglets
document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("tab-btn")) return;
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  e.target.classList.add("active");

  const tab = e.target.dataset.tab;
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
});
