document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      contents.forEach(c => c.style.display = "none");

      btn.classList.add("active");
      const tabId = btn.dataset.tab;
      document.getElementById(tabId).style.display = "block";
    });
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

async function initSubscriptions() {
  const { data: { user } } = await window.supabase.auth.getUser();
  const currentBox = document.getElementById("current-subscription");
  if (!user) {
    currentBox.innerHTML = "Please login to see your subscription.";
    currentBox.style.display = "block";
    return;
  }

  // Récupère l’abonnement actuel
  const { data, error } = await window.supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error(error);
    currentBox.innerHTML = "Error loading subscription.";
    currentBox.style.display = "block";
    return;
  }

  const sub = data[0];
  if (sub) {
    currentBox.innerHTML = `
      Your current plan: <strong>${sub.plan}</strong><br>
      Status: ${sub.status}
    `;
    currentBox.style.display = "block";
  }

  // Quand on clique sur une offre
  document.querySelectorAll(".subscribe-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const plan = btn.closest(".plan-card").dataset.plan;
      const prices = {
        basic: { price_eur: 100, price_aed: 400, properties: 10 },
        pro: { price_eur: 300, price_aed: 1200, properties: 50 },
        unlimited: { price_eur: 500, price_aed: 2000, properties: -1 }
      };

      const offer = prices[plan];

      // ⚡ Ici : rediriger vers Stripe/PayPal si tu veux
      // Pour l’instant, on insère direct en DB
      const { error: insertErr } = await window.supabase.from("subscriptions").insert([{
        user_id: user.id,
        plan,
        status: "active",
        properties_limit: offer.properties,
        price_eur: offer.price_eur,
        price_aed: offer.price_aed,
        start_date: new Date()
      }]);

      if (insertErr) {
        alert("Error subscribing: " + insertErr.message);
      } else {
        alert(`You subscribed to the ${plan} plan!`);
        initSubscriptions();
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSubscriptions();
});
