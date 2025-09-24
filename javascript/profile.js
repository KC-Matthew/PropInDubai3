// profile.js — My Profile (agent + agency + uploads + subscriptions)

const supa   = window.supabase;
const BUCKET = "profiles"; // Storage bucket (Public = ON)

/* ============================ BOOT ============================ */
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  wireFileInputs();        // listeners file inputs
  loadEverything();        // agent + agency + previews (DB + Storage fallback)
  loadSubscription();      // bloc souscriptions
  initSubscriptions();     // encart "current plan"
  attachSubscribeHandlers();

  const form = document.getElementById("profileForm");
  if (form) form.addEventListener("submit", onSaveProfile);
});

/* ============================ Tiny utils ============================ */
const $ = (s) => document.querySelector(s);

function flash(msg, ok = false) {
  const box = document.getElementById("psAlert");
  if (!box) return;
  box.textContent = msg;
  box.style.display   = "block";
  box.style.border    = "1px solid " + (ok ? "#d6f2dd" : "#ffd9b8");
  box.style.background= ok ? "#ecfff0" : "#fff7f0";
  box.style.color     = ok ? "#146c2e" : "#7a3c00";
  setTimeout(() => (box.style.display = "none"), 4000);
}

/* ============================ Tabs ============================ */
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      contents.forEach((c) => (c.style.display = "none"));
      btn.classList.add("active");
      const el = document.getElementById(btn.dataset.tab);
      if (el) el.style.display = "block";
    });
  });
}

/* ============================ State ============================ */
let gUser = null;
let gAgent = null;
let gAgency = null;
let avatarFinalUrl = null; // agent.photo_agent_url
let logoFinalUrl   = null; // agency.logo_url

/* ============================ Load agent + agency ============================ */
async function loadEverything() {
  // auth
  const { data, error } = await supa.auth.getSession();
  if (error || !data?.session) {
    location.href = "login.html?redirect=/profile.html";
    return;
  }
  gUser = data.session.user;

  // Prefill email (non éditable)
  $("#email") && ($("#email").value = gUser.email || "");

  // agent
  const { data: agentRow, error: aErr } = await supa
    .from("agent")
    .select("*")
    .eq("user_id", gUser.id)
    .maybeSingle();
  if (aErr) console.error(aErr);
  gAgent = agentRow || null;

  // agency (si rattaché)
  if (gAgent?.agency_id) {
    const { data: ag, error: e2 } = await supa
      .from("agency")
      .select("*")
      .eq("id", gAgent.agency_id)
      .maybeSingle();
    if (e2) console.error(e2);
    gAgency = ag || null;
  }

  // Remplir UI depuis la DB
  fillAgent(gAgent);
  fillAgency(gAgency);

  // Pas d’URL en DB ? → Essayer de récupérer dans le bucket
  await hydratePreviewsFromStorageIfMissing();

  // Si on a trouvé des URLs via le bucket, persister en DB
  await ensureDbHasImageUrls();
}

function fillAgent(a) {
  if (a?.name) {
    const parts = String(a.name).trim().split(" ");
    $("#firstName").value = parts.shift() || "";
    $("#lastName").value  = parts.join(" ") || "";
  }
  $("#phone").value       = a?.phone || "";
  $("#whatsapp").value    = a?.whatsapp ?? ""; // côté DB NOT NULL → vide si absent
  $("#nationality").value = a?.nationality || "";
  $("#languages").value   = a?.languages || "";
  $("#about").value       = a?.["about agent"] || a?.about_agent || "";

  if (a?.photo_agent_url) {
    avatarFinalUrl = a.photo_agent_url;
    showPreview("#avatarPreview", a.photo_agent_url);
  }
}

function fillAgency(ag) {
  $("#agc_name").value    = ag?.name_agency || ag?.["name agency"] || "";
  $("#agc_address").value = ag?.address || "";
  $("#agc_about").value   = ag?.about_the_agency || ag?.["about the agency"] || "";

  if (ag?.logo_url) {
    logoFinalUrl = ag.logo_url;
    showPreview("#logoPreview", ag.logo_url);
  }
}

// anti-cache seulement pour http(s), pas pour blob:
function showPreview(sel, url) {
  const img = document.querySelector(sel);
  if (!img || !url) return;
  const isBlob = url.startsWith("blob:");
  const src = isBlob ? url : `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
  img.onload  = () => { img.style.display = "block"; };
  img.onerror = () => { /* garder le placeholder */ };
  img.src = src;
}

/**
 * Si DB ne contient pas encore les URLs, on regarde dans Storage :
 * - agents/<uid>/profile-picture.(jpg|png|webp|svg)
 * - agencies/<uid>/logo.(jpg|png|webp|svg)
 */
async function hydratePreviewsFromStorageIfMissing() {
  const uid = gUser?.id;
  if (!uid) return;

  if (!avatarFinalUrl) {
    const avatar = await findFirstImageIn(`agents/${uid}`, "profile-picture");
    if (avatar) {
      avatarFinalUrl = avatar;
      showPreview("#avatarPreview", avatarFinalUrl);
    }
  }

  if (!logoFinalUrl) {
    const logo = await findFirstImageIn(`agencies/${uid}`, "logo");
    if (logo) {
      logoFinalUrl = logo;
      showPreview("#logoPreview", logoFinalUrl);
    }
  }
}

// Liste un dossier et renvoie l’URL publique du premier fichier baseName.ext
async function findFirstImageIn(folder, baseName) {
  try {
    const exts = ["jpg", "jpeg", "png", "webp", "svg"];
    const { data: files, error } = await supa.storage.from(BUCKET).list(folder, { limit: 100 });
    if (error) return null;
    const found = files?.find(f => {
      const lower = f.name.toLowerCase();
      return exts.some(ext => lower === `${baseName}.${ext}`);
    });
    if (!found) return null;
    const path = `${folder}/${found.name}`;
    const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(path);
    return pub?.publicUrl || null;
  } catch {
    return null;
  }
}

// Persiste en DB les URLs trouvées via Storage si colonnes vides
async function ensureDbHasImageUrls() {
  try {
    const uid = gUser?.id;
    if (!uid) return;

    // agent.photo_agent_url
    if (avatarFinalUrl && (!gAgent || !gAgent.photo_agent_url)) {
      if (!gAgent?.id) {
        const { data: aIns, error } = await supa
          .from("agent")
          .insert({ user_id: uid, photo_agent_url: avatarFinalUrl })
          .select().single();
        if (!error) gAgent = aIns;
      } else {
        const { data: aUpd, error } = await supa
          .from("agent")
          .update({ photo_agent_url: avatarFinalUrl })
          .eq("id", gAgent.id)
          .select().single();
        if (!error) gAgent = aUpd;
      }
    }

    // agency.logo_url
    if (logoFinalUrl) {
      if (!gAgency?.id) {
        const { data: agIns, error } = await supa
          .from("agency")
          .insert({ created_by: uid, logo_url: logoFinalUrl })
          .select().single();
        if (!error) gAgency = agIns;

        // Lier l’agent à l’agence si possible
        if (gAgent?.id && gAgency?.id) {
          await supa.from("agent").update({ agency_id: gAgency.id }).eq("id", gAgent.id);
        }
      } else if (!gAgency.logo_url) {
        const { data: agUpd } = await supa
          .from("agency")
          .update({ logo_url: logoFinalUrl })
          .eq("id", gAgency.id)
          .select().single();
        if (agUpd) gAgency = agUpd;
      }
    }
  } catch (e) {
    console.warn("ensureDbHasImageUrls:", e);
  }
}

/* ============================ Uploads (avatar/logo) ============================ */
function wireFileInputs() {
  const avatarInput = document.getElementById("fileProfilePicture");
  const logoInput   = document.getElementById("fileAgencyLogo");

  // AVATAR
  avatarInput?.addEventListener("change", async () => {
    const f = avatarInput.files?.[0];
    if (!f) return;

    const local = URL.createObjectURL(f);        // preview immédiat
    showPreview("#avatarPreview", local);

    try {
      avatarFinalUrl = await uploadToProfiles(f, "agent-picture");
      showPreview("#avatarPreview", avatarFinalUrl); // URL http(s)
      flash("Photo de profil mise à jour.", true);
    } catch (e) {
      console.error(e);
      flash("Échec de l’upload de la photo.");
    } finally {
      try { URL.revokeObjectURL(local); } catch {}
    }
  });

  // LOGO
  logoInput?.addEventListener("change", async () => {
    const f = logoInput.files?.[0];
    if (!f) return;

    const local = URL.createObjectURL(f);
    showPreview("#logoPreview", local);

    try {
      logoFinalUrl = await uploadToProfiles(f, "agency-logo");
      showPreview("#logoPreview", logoFinalUrl);
      flash("Logo mis à jour.", true);
    } catch (e) {
      console.error(e);
      flash("Échec de l’upload du logo.");
    } finally {
      try { URL.revokeObjectURL(local); } catch {}
    }
  });
}

function pickExtByMime(m) {
  if (!m) return "jpg";
  if (m.includes("png"))  return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("svg"))  return "svg";
  return "jpg";
}

async function uploadToProfiles(file, type) {
  const { data: s } = await supa.auth.getSession();
  const uid = s?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const max = type === "agency-logo" ? 3*1024*1024 : 5*1024*1024;
  if (!file.type.startsWith("image/")) throw new Error("Invalid file");
  if (file.size > max) throw new Error("File too large");

  const folder = type === "agency-logo" ? `agencies/${uid}` : `agents/${uid}`;
  const base   = type === "agency-logo" ? "logo" : "profile-picture";
  const ext    = pickExtByMime(file.type);
  const path   = `${folder}/${base}.${ext}`;

  const { error: upErr } = await supa.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
    cacheControl: "0",
  });
  if (upErr) throw upErr;

  const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(path);
  if (pub?.publicUrl) return pub.publicUrl;

  const { data: signed, error: signErr } = await supa.storage
    .from(BUCKET)
    .createSignedUrl(path, 60*60*24*365);
  if (signErr) throw signErr;
  return signed.signedUrl;
}

/* ============================ Save (upserts) ============================ */
async function onSaveProfile(e) {
  e.preventDefault();
  try {
    const { data: s } = await supa.auth.getSession();
    const uid = s?.session?.user?.id;
    if (!uid) throw new Error("Not authenticated");

    // Concat first + last
    const fullName = [$("#firstName").value.trim(), $("#lastName").value.trim()]
      .filter(Boolean).join(" ");

    // Agent values
    const agentVals = {
      name: fullName || null,
      email: $("#email").value.trim() || null,
      phone: $("#phone").value.trim() || null,
      whatsapp: ($("#whatsapp").value ?? "").trim(), // jamais NULL
      nationality: $("#nationality").value.trim() || null,
      languages: $("#languages").value.trim() || null,
      about: $("#about").value.trim() || null,
      photo_agent_url: avatarFinalUrl || null,
      superagent: false,
    };

    // Agency values
    const agencyVals = {
      name_agency: $("#agc_name").value.trim() || null,
      address: $("#agc_address").value.trim() || null,
      about_the_agency: $("#agc_about").value.trim() || null,
      logo_url: logoFinalUrl || null,
      created_by: uid,
    };

    // Upsert agency
    let agencyId = gAgency?.id || null;
    if (agencyVals.name_agency) {
      if (agencyId) {
        const { data: agUpd, error: agErr } = await supa
          .from("agency").update(agencyVals).eq("id", agencyId)
          .select().single();
        if (agErr) throw agErr;
        gAgency = agUpd;
      } else {
        const { data: agIns, error: agInsErr } = await supa
          .from("agency").insert(agencyVals).select().single();
        if (agInsErr) throw agInsErr;
        gAgency = agIns;
      }
      agencyId = gAgency.id;
    }

    // Upsert agent
    const payloadAgent = {
      name: agentVals.name,
      email: agentVals.email,
      phone: agentVals.phone,
      whatsapp: agentVals.whatsapp,
      photo_agent_url: agentVals.photo_agent_url,
      nationality: agentVals.nationality,
      languages: agentVals.languages,
      "about agent": agentVals.about,
      about_agent: agentVals.about,
      superagent: !!agentVals.superagent,
      user_id: uid,
      agency_id: agencyId || null,
    };

    if (gAgent?.id) {
      const { data: aUpd, error: aErr } = await supa
        .from("agent").update(payloadAgent).eq("id", gAgent.id)
        .select().single();
      if (aErr) throw aErr;
      gAgent = aUpd;
    } else {
      const { data: aIns, error: aInsErr } = await supa
        .from("agent").insert(payloadAgent).select().single();
      if (aInsErr) throw aInsErr;
      gAgent = aIns;
    }

    flash("Profil sauvegardé.", true);
  } catch (err) {
    console.error("save profile error:", err);
    flash(err?.message || "Impossible d’enregistrer le profil.");
  }
}

/* ============================ Subscription (existant) ============================ */
async function loadSubscription() {
  const container = document.getElementById("subscription-container");
  if (!container) return;
  try {
    const { data: { user } } = await supa.auth.getUser();
    if (!user) { container.innerHTML = "<p>Please login to manage your subscription.</p>"; return; }

    const { data, error } = await supa
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;

    const sub = data?.[0];
    if (!sub) {
      container.innerHTML = `
        <p>You don’t have a subscription yet.</p>
        <button id="subscribeBtn" class="btn-orange">Subscribe now</button>`;
      document.getElementById("subscribeBtn")?.addEventListener("click", () =>
        alert("Use the plan cards to request a license & subscribe once approved.")
      );
    } else {
      container.innerHTML = `
        <p><strong>Plan:</strong> ${escapeHtml(sub.plan)}</p>
        <p><strong>Status:</strong> ${escapeHtml(sub.status)}</p>
        <p><strong>Start:</strong> ${new Date(sub.start_date).toLocaleDateString()}</p>
        ${sub.end_date ? `<p><strong>End:</strong> ${new Date(sub.end_date).toLocaleDateString()}</p>` : ""}
        <button id="cancelSubBtn" class="btn-red">Cancel Subscription</button>`;
      document.getElementById("cancelSubBtn")?.addEventListener("click", async () => {
        await supa.from("subscriptions")
          .update({ status: "canceled", end_date: new Date().toISOString() })
          .eq("id", sub.id);
        loadSubscription();
      });
    }
  } catch (err) {
    console.error("loadSubscription error:", err);
    container.innerHTML = "<p>Error loading subscription.</p>";
  }
}

async function initSubscriptions() {
  const box = document.getElementById("current-subscription");
  if (!box) return;
  try {
    const { data: { user } } = await supa.auth.getUser();
    if (!user) { box.innerHTML = "Please login to see your subscription."; box.style.display = "block"; return; }
    const { data, error } = await supa
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;

    const sub = data?.[0];
    if (sub) {
      box.innerHTML = `Your current plan: <strong>${escapeHtml(sub.plan)}</strong><br>Status: ${escapeHtml(sub.status)}`;
      box.style.display = "block";
    } else {
      box.innerHTML = "";
      box.style.display = "none";
    }
  } catch (err) {
    console.error("initSubscriptions error:", err);
  }
}

function attachSubscribeHandlers() {
  document.querySelectorAll(".subscribe-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const plan = btn.closest(".plan-card")?.dataset.plan;
      if (!plan) return;
      window.location.href = `/verify.html?plan=${encodeURIComponent(plan)}`;
    });
  });
}

/* ============================ Util ============================ */
function escapeHtml(unsafe) {
  return (unsafe + "").replace(/[&<"'>]/g, (m) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;"
  }[m]));
}
