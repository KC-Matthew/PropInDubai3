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

async function loadSubscription() {
  const { data: { user } } = await window.supabase.auth.getUser();
  const container = document.getElementById("subscription-container");
  if (!user) {
    container.innerHTML = "<p>Please login to manage your subscription.</p>";
    return;
  }

  // Charger abonnement de l’utilisateur
  const { data, error } = await window.supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Error loading subscription.</p>";
    return;
  }

  const sub = data[0];
  if (!sub) {
    // Pas d’abonnement
    container.innerHTML = `
      <p>You don’t have a subscription yet.</p>
      <button id="subscribeBtn" class="btn-orange">Subscribe now</button>
    `;
    document.getElementById("subscribeBtn").onclick = async () => {
      // Ici tu pourrais rediriger vers Stripe Checkout ou ton système de paiement
      alert("Redirecting to payment...");
      // Exemple : ajouter un abonnement de test
      await window.supabase.from("subscriptions").insert([{
        user_id: user.id,
        plan: "basic",
        status: "active",
        start_date: new Date()
      }]);
      loadSubscription();
    };
  } else {
    // Abonnement trouvé
    container.innerHTML = `
      <p><strong>Plan:</strong> ${sub.plan}</p>
      <p><strong>Status:</strong> ${sub.status}</p>
      <p><strong>Start:</strong> ${new Date(sub.start_date).toLocaleDateString()}</p>
      ${sub.end_date ? `<p><strong>End:</strong> ${new Date(sub.end_date).toLocaleDateString()}</p>` : ""}
      <button id="cancelSubBtn" class="btn-red">Cancel Subscription</button>
    `;

    document.getElementById("cancelSubBtn").onclick = async () => {
      await window.supabase.from("subscriptions")
        .update({ status: "canceled", end_date: new Date() })
        .eq("id", sub.id);
      loadSubscription();
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSubscription();
});
