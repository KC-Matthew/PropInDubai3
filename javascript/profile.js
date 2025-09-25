// profile.js — My Profile (agent + agency + uploads + subscriptions)

const supa   = window.supabase;
const BUCKET = "profiles";

/* ============================ BOOT ============================ */
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  wireFileInputs();
  loadEverything();
  loadSubscription();
  initSubscriptions();
  attachSubscribeHandlers();
  document.getElementById("profileForm")?.addEventListener("submit", (e)=>{e.preventDefault(); onSaveProfile();});
});

document.getElementById("chooseLogoBtn")?.addEventListener("click", () =>
  document.getElementById("fileAgencyLogo")?.click()
);


/* ============================ Utils ============================ */
function setSavingState(isSaving){
  const btn = document.querySelector(".save-btn");
  if (!btn) return;
  if (isSaving){
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = "Saving…";
  }else{
    btn.disabled = false;
    if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
  }
}




const $ = (s) => document.querySelector(s);
function flash(msg, ok=false){
  const el = document.getElementById("psAlert");
  if(!el) return;
  el.textContent = msg;
  el.style.display = "block";
  el.style.border    = "1px solid " + (ok ? "#d6f2dd" : "#ffd9b8");
  el.style.background= ok ? "#ecfff0" : "#fff7f0";
  el.style.color     = ok ? "#146c2e" : "#7a3c00";
  setTimeout(()=> el.style.display="none", 2800);
}
function cacheBust(u){ if(!u || u.startsWith("blob:")) return u; return `${u}${u.includes("?")?"&":"?"}v=${Date.now()}`; }

function showPreview(sel, url){
  const img = document.querySelector(sel);
  if (!img || !url) return;
  const safe = cacheBust(url);
  img.onload = () => { img.style.display = "block"; };
  img.onerror = () => {};
  img.src = safe;
}




function pickExt(m){ if(!m) return "jpg"; if(m.includes("png")) return "png"; if(m.includes("webp")) return "webp"; if(m.includes("svg")) return "svg"; if(m.includes("jpeg")) return "jpg"; return "jpg"; }
function firstUrl(v){ return Array.isArray(v) ? (v[0] || null) : (v || null); }
function toPgTextArray(u){ return u ? [cleanUrl(u)] : null; }



// Remove surrounding quotes/spaces and normalize the URL
function cleanUrl(u){
  if (!u) return u;
  const s = String(Array.isArray(u) ? u[0] : u).trim();
  return s.replace(/^['"]+|['"]+$/g, "");
}


function cacheBust(u){
  const v = cleanUrl(u);
  if (!v || v.startsWith("blob:") || v.startsWith("data:")) return v;
  return `${v}${v.includes("?") ? "&" : "?"}v=${Date.now()}`;
}






// Fallback preview setters if your HTML uses other IDs
function showLogoPreview(url){
  const el = document.querySelector("#logoPreview, #agencyLogoPreview, [data-preview='agency-logo'] img");
  if (!el || !url) return;
  el.onload = () => el.style.display = "block";
  el.src = cacheBust(url);
}
function showAvatarPreview(url){
  const el = document.querySelector("#avatarPreview, #profileAvatarPreview, [data-preview='avatar'] img");
  if (!el || !url) return;
  el.onload = () => el.style.display = "block";
  el.src = cacheBust(url);
}


// Local preview that works on Safari/Chrome/Firefox
function showLocalPreview(file, selector){
  return new Promise((resolve) => {
    const img = document.querySelector(selector);
    if (!img || !file) return resolve(false);
    const r = new FileReader();
    r.onload = () => { img.onload = () => { img.style.display = "block"; resolve(true); }; img.src = r.result; };
    r.onerror = () => resolve(false);
    r.readAsDataURL(file);
  });
}






/* ============================ Tabs ============================ */
function initTabs(){
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");
  tabs.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      tabs.forEach(b=>b.classList.remove("active"));
      contents.forEach(c=>c.style.display="none");
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).style.display="block";
    });
  });
}

/* ============================ State ============================ */
let gUser=null, gAgent=null, gAgency=null;
let avatarUrl=null; // string pour l'UI
let logoUrl=null;   // string pour l'UI

/* ============================ Load (DB -> UI) ============================ */
async function loadEverything(){
  const { data, error } = await supa.auth.getSession();
  if (error || !data?.session){ location.href="login.html?redirect=/profile.html"; return; }
  gUser = data.session.user;
  if ($("#email")) $("#email").value = gUser.email || "";

  const { data: agentRow } = await supa.from("agent").select("*").eq("user_id", gUser.id).maybeSingle();
  gAgent = agentRow || null;

  if (gAgent?.agency_id){
    const { data: ag } = await supa.from("agency").select("*").eq("id", gAgent.agency_id).maybeSingle();
    gAgency = ag || null;
  } else gAgency = null;

  fillAgent(gAgent);
  fillAgency(gAgency);
  await hydratePreviewsFromStorageIfMissing();
}

function fillAgent(a){
  document.querySelector("#firstName").value = "";
  document.querySelector("#lastName").value  = "";
  if (a?.name){
    const p = String(a.name).trim().split(" ");
    document.querySelector("#firstName").value = p.shift() || "";
    document.querySelector("#lastName").value  = p.join(" ");
  }
  document.querySelector("#phone").value       = a?.phone || "";
  document.querySelector("#whatsapp").value    = a?.whatsapp ?? "";
  document.querySelector("#nationality").value = a?.nationality || "";
  document.querySelector("#languages").value   = a?.languages || "";
  document.querySelector("#about").value       = a?.["about agent"] ?? "";

  avatarUrl = cleanUrl(firstUrl(a?.photo_agent_url));
  if (avatarUrl) showPreview("#avatarPreview", avatarUrl);
}


function fillAgency(ag){
  document.querySelector("#agc_name").value    = ag?.name_agency ?? "";
  document.querySelector("#agc_address").value = ag?.address ?? "";
  document.querySelector("#agc_about").value   = ag?.about_the_agency ?? "";

  // agency.logo_url est un text[] (recommandé). On prend le 1er, nettoyé.
  logoUrl = ag?.logo_url ? cleanUrl(Array.isArray(ag.logo_url) ? ag.logo_url[0] : ag.logo_url) : null;

  if (logoUrl) {
    // affiche immédiatement et évite le cache
    showPreview("#logoPreview", logoUrl);
  } else {
    // cache l'image si pas d'URL pour éviter le texte alt
    const img = document.querySelector("#logoPreview");
    if (img) img.style.display = "none";
  }
}




/* ============================ Storage (1 seule image) ============================ */
async function cleanupOtherExts(folder, base, keepName){
  const { data: files } = await supa.storage.from(BUCKET).list(folder, { limit: 100 });
  const toDel = (files||[])
    .filter(f => f.name.startsWith(base + ".") && f.name !== keepName)
    .map(f => `${folder}/${f.name}`);
  if (toDel.length) await supa.storage.from(BUCKET).remove(toDel);
}

async function uploadToProfiles(file, kind){
  const { data: s, error: sessErr } = await supa.auth.getSession();
  if (sessErr) throw sessErr;
  const uid = s?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const max = (kind === "agency") ? 3*1024*1024 : 5*1024*1024;
  if (!file?.type?.startsWith("image/")) throw new Error("Invalid file");
  if (file.size > max) throw new Error("File too large");

  const folder = (kind === "agency") ? `agencies/${uid}` : `agents/${uid}`;
  const base   = (kind === "agency") ? "logo" : "profile-picture";
  const ext    = pickExt(file.type);
  const filename = `${base}.${ext}`;
  const path   = `${folder}/${filename}`;

  const { data: upData, error: upErr } = await supa.storage.from(BUCKET).upload(path, file, {
    upsert: true, contentType: file.type || "image/jpeg", cacheControl: "0"
  });
  if (upErr) { console.error("upload error:", upErr); throw upErr; }

  // nettoie les autres extensions
  const { data: files } = await supa.storage.from(BUCKET).list(folder, { limit: 100 });
  const toDel = (files||[]).filter(f => f.name.startsWith(base + ".") && f.name !== filename).map(f => `${folder}/${f.name}`);
  if (toDel.length) await supa.storage.from(BUCKET).remove(toDel).catch(()=>{});

  const { data: pub } = await supa.storage.from(BUCKET).getPublicUrl(path);
  return pub?.publicUrl ?? null;
}



async function findExistingIn(folder, base){
  const { data: files } = await supa.storage.from(BUCKET).list(folder, { limit: 50 });
  const exts = ["jpg","jpeg","png","webp","svg"];
  const f = files?.find(x => exts.some(e => x.name.toLowerCase() === `${base}.${e}`));
  if (!f) return null;
  const { data: pub } = await supa.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`);
  return pub?.publicUrl ?? null;
}

async function hydratePreviewsFromStorageIfMissing(){
  const uid = gUser?.id; if (!uid) return;

  if (!avatarUrl){
    const { data: filesA } = await supa.storage.from(BUCKET).list(`agents/${uid}`, { limit: 50 });
    const exts = ["jpg","jpeg","png","webp","svg"];
    const fA = filesA?.find(x => exts.some(e => x.name.toLowerCase() === `profile-picture.${e}`));
    if (fA){
      const { data: pub } = await supa.storage.from(BUCKET).getPublicUrl(`agents/${uid}/${fA.name}`);
      avatarUrl = cleanUrl(pub?.publicUrl);
      if (avatarUrl) showPreview("#avatarPreview", avatarUrl);
    }
  }

  if (!logoUrl){
    const { data: filesL } = await supa.storage.from(BUCKET).list(`agencies/${uid}`, { limit: 50 });
    const exts = ["jpg","jpeg","png","webp","svg"];
    const fL = filesL?.find(x => exts.some(e => x.name.toLowerCase() === `logo.${e}`));
    if (fL){
      const { data: pub } = await supa.storage.from(BUCKET).getPublicUrl(`agencies/${uid}/${fL.name}`);
      logoUrl = cleanUrl(pub?.publicUrl);
      if (logoUrl) showPreview("#logoPreview", logoUrl);
    }
  }
}



async function getOrCreateAgency(){
  // si on a déjà gAgency, on le renvoie tel quel
  if (gAgency?.id) return gAgency;

  // sinon, on regarde si l'agent a une agency_id
  if (gAgent?.agency_id){
    const { data: ag } = await supa.from("agency").select("*").eq("id", gAgent.agency_id).maybeSingle();
    if (ag) { gAgency = ag; return gAgency; }
  }

  // sinon, on crée une agence minimaliste (nom/adresse null ok)
  const { data: s } = await supa.auth.getSession();
  const uid = s?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data: agIns, error: agErr } = await supa
    .from("agency")
    .insert({ created_by: uid })
    .select()
    .single();

  if (agErr) throw agErr;
  gAgency = agIns;

  // si l'agent existe, on l'attache à cette agence
  if (gAgent?.id) {
    await supa.from("agent").update({ agency_id: gAgency.id }).eq("id", gAgent.id);
    gAgent.agency_id = gAgency.id;
  }

  return gAgency;
}


async function saveLogoAfterUpload(newUrl){
  // newUrl = URL publique retournée par uploadToProfiles
  if (!newUrl) return false;
  const url = cleanUrl(newUrl);

  const ag = await getOrCreateAgency();   // garantit une agence
  const payload = { logo_url: toPgTextArray(url) }; // text[]

  const { data: agUpd, error } = await supa
    .from("agency")
    .update(payload)
    .eq("id", ag.id)
    .select()
    .single();

  if (error) { console.error("saveLogoAfterUpload error:", error); return false; }

  gAgency = agUpd;           // garde l'état à jour
  logoUrl = url;             // garde l'URL en mémoire
  return true;
}


function wireFileInputs(){
  const avatarInput = document.getElementById("fileProfilePicture");
  const logoInput   = document.getElementById("fileAgencyLogo");

  document.getElementById("chooseLogoBtn")?.addEventListener("click", () => logoInput?.click());

  // --- Avatar ---
  avatarInput?.addEventListener("change", async () => {
    const f = avatarInput.files?.[0]; if (!f) return;

    // 1) aperçu immédiat
    await showLocalPreview(f, "#avatarPreview");

    // 2) upload storage
    try{
      const url = await uploadToProfiles(f, "agent");
      if (url){
        avatarUrl = cleanUrl(url);
        showPreview("#avatarPreview", avatarUrl); // bust cache
        flash("Profile picture uploaded.", true);
      }else{
        flash("Could not get public URL for avatar.");
      }
    }catch(e){
      console.error(e);
      flash("Profile picture upload failed.");
    }
  });

  // --- Agency logo ---
  logoInput?.addEventListener("change", async () => {
    const f = logoInput.files?.[0]; if (!f) return;

    // 1) aperçu immédiat (évite la sensation 'il faut 2 fois')
    await showLocalPreview(f, "#logoPreview");

    try{
      // 2) upload storage
      const url = await uploadToProfiles(f, "agency");
      if (!url) { flash("Could not get public URL for logo."); return; }

      // 3) met à jour l'aperçu avec l’URL publique
      logoUrl = cleanUrl(url);
      showPreview("#logoPreview", logoUrl);

      // 4) sauvegarde IMMÉDIATE en DB (clé: ça persiste au reload)
      const ok = await saveLogoAfterUpload(logoUrl);
      if (ok) flash("Logo uploaded & saved.", true);
      else    flash("Logo uploaded but DB save failed.");

    }catch(e){
      console.error("upload logo error:", e);
      flash("Logo upload failed.");
    }
  });
}




/* ============================ SAVE (UI -> DB) ============================ */
async function onSaveProfile(){
  setSavingState(true);
  try{
    const { data: s } = await supa.auth.getSession();
    const uid = s?.session?.user?.id;
    if (!uid) { flash("Not authenticated"); setSavingState(false); return; }

    // ----- AGENCY -----
    let agencyId = gAgency?.id || null;
    const agencyVals = {
      name_agency:      document.querySelector("#agc_name").value.trim() || null,
      address:          document.querySelector("#agc_address").value.trim() || null,
      about_the_agency: document.querySelector("#agc_about").value.trim() || null,
      logo_url:         toPgTextArray(logoUrl),
      created_by:       uid
    };
    const hasAgencyData =
      agencyVals.name_agency || agencyVals.address || agencyVals.about_the_agency || firstUrl(agencyVals.logo_url);

    if (agencyId){
      const { data: agUpd, error: agErr } =
        await supa.from("agency").update(agencyVals).eq("id", agencyId).select().single();
      if (agErr) throw agErr;
      gAgency = agUpd;
    } else if (hasAgencyData){
      const { data: agIns, error: agInsErr } =
        await supa.from("agency").insert(agencyVals).select().single();
      if (agInsErr) throw agInsErr;
      gAgency = agIns; agencyId = gAgency.id;
    }

    // ----- AGENT -----
    const fullName = [document.querySelector("#firstName").value.trim(), document.querySelector("#lastName").value.trim()]
      .filter(Boolean).join(" ");

    const agentVals = {
      user_id: uid,
      name: fullName || null,
      email: document.querySelector("#email").value.trim() || null,
      phone: document.querySelector("#phone").value.trim() || null,
      whatsapp: (document.querySelector("#whatsapp").value ?? "").trim(),
      nationality: document.querySelector("#nationality").value.trim() || null,
      languages: document.querySelector("#languages").value.trim() || null,
      ["about agent"]: document.querySelector("#about").value.trim() || null,
      photo_agent_url: toPgTextArray(avatarUrl),
      superagent: false,
      agency_id: agencyId || null
    };

    const { data: exists } = await supa.from("agent").select("id").eq("user_id", uid).maybeSingle();
    if (exists?.id){
      const { data: aUpd, error: aErr } =
        await supa.from("agent").update(agentVals).eq("user_id", uid).select().single();
      if (aErr) throw aErr;
      gAgent = aUpd;
    } else {
      const { data: aIns, error: aInsErr } =
        await supa.from("agent").insert(agentVals).select().single();
      if (aInsErr) throw aInsErr;
      gAgent = aIns;
    }

    flash("Saved ✅", true);

    // Laisse 350ms pour voir le flash puis refresh (forces reload)
    setTimeout(() => { location.reload(); }, 350);

  }catch(err){
    console.error("SAVE error:", err);
    flash(err?.message || "Save failed");
    setSavingState(false);
  }
}



/* ============================ Subscription (inchangé) ============================ */
async function loadSubscription() {
  const container = document.getElementById("subscription-container");
  if (!container) return;
  try {
    const { data: { user } } = await supa.auth.getUser();
    if (!user) { container.innerHTML = "<p>Please login to manage your subscription.</p>"; return; }
    const { data, error } = await supa.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
    if (error) throw error;
    const sub = data?.[0];
    container.innerHTML = sub
      ? `<p><strong>Plan:</strong> ${escapeHtml(sub.plan)}</p>
         <p><strong>Status:</strong> ${escapeHtml(sub.status)}</p>
         <p><strong>Start:</strong> ${new Date(sub.start_date).toLocaleDateString()}</p>
         ${sub.end_date ? `<p><strong>End:</strong> ${new Date(sub.end_date).toLocaleDateString()}</p>` : ""}
         <button id="cancelSubBtn" class="btn-red">Cancel Subscription</button>`
      : `<p>You don’t have a subscription yet.</p>
         <button id="subscribeBtn" class="btn-orange">Subscribe now</button>`;
    document.getElementById("cancelSubBtn")?.addEventListener("click", async () => {
      await supa.from("subscriptions").update({ status: "canceled", end_date: new Date().toISOString() }).eq("id", sub.id);
      loadSubscription();
    });
    document.getElementById("subscribeBtn")?.addEventListener("click", () =>
      alert("Use the plan cards to request a license & subscribe once approved.")
    );
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
    const { data } = await supa.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
    const sub = data?.[0];
    if (sub) { box.innerHTML = `Your current plan: <strong>${escapeHtml(sub.plan)}</strong><br>Status: ${escapeHtml(sub.status)}`; box.style.display="block"; }
    else { box.innerHTML = ""; box.style.display="none"; }
  } catch (err) { console.error("initSubscriptions error:", err); }
}
function attachSubscribeHandlers() {
  document.querySelectorAll(".subscribe-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const plan = btn.closest(".plan-card")?.dataset.plan;
      if (!plan) return;
      window.location.href = `verify.html?plan=${encodeURIComponent(plan)}`;
    });
  });
}
function escapeHtml(unsafe){ return (unsafe + "").replace(/[&<"'>]/g, (m)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }


