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

/* ============================ Utils ============================ */
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
function showPreview(sel, url){ const img=$(sel); if(!img||!url) return; img.onload=()=>img.style.display="block"; img.onerror=()=>{}; img.src=cacheBust(url); }
function pickExt(m){ if(!m) return "jpg"; if(m.includes("png")) return "png"; if(m.includes("webp")) return "webp"; if(m.includes("svg")) return "svg"; if(m.includes("jpeg")) return "jpg"; return "jpg"; }
// helpers array<->string pour colonnes text[]
const firstUrl = (v) => Array.isArray(v) ? (v[0] || null) : (v || null);
const toPgTextArray = (u) => (u ? [u] : null);

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
  $("#firstName").value = ""; $("#lastName").value  = "";
  if (a?.name){ const p=String(a.name).trim().split(" "); $("#firstName").value=p.shift()||""; $("#lastName").value=p.join(" ")||""; }
  $("#phone").value       = a?.phone || "";
  $("#whatsapp").value    = a?.whatsapp ?? "";
  $("#nationality").value = a?.nationality || "";
  $("#languages").value   = a?.languages || "";
  $("#about").value       = a?.["about agent"] ?? "";

  avatarUrl = firstUrl(a?.photo_agent_url);
  if (avatarUrl) showPreview("#avatarPreview", avatarUrl);
}

function fillAgency(ag){
  $("#agc_name").value    = ag?.name_agency ?? "";
  $("#agc_address").value = ag?.address ?? "";
  $("#agc_about").value   = ag?.about_the_agency ?? "";

  logoUrl = firstUrl(ag?.logo_url);
  if (logoUrl) showPreview("#logoPreview", logoUrl);
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
  const { data: s } = await supa.auth.getSession();
  const uid = s?.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const max = (kind === "agency") ? 3*1024*1024 : 5*1024*1024;
  if (!file.type.startsWith("image/")) throw new Error("Invalid file");
  if (file.size > max) throw new Error("File too large");

  const folder = (kind === "agency") ? `agencies/${uid}` : `agents/${uid}`;
  const base   = (kind === "agency") ? "logo" : "profile-picture";
  const ext    = pickExt(file.type);
  const filename = `${base}.${ext}`;
  const path   = `${folder}/${filename}`;

  const { error: upErr } = await supa.storage.from(BUCKET).upload(path, file, {
    upsert: true, contentType: file.type || "image/jpeg", cacheControl: "0"
  });
  if (upErr) throw upErr;

  await cleanupOtherExts(folder, base, filename);

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
  if (!avatarUrl){ const u=await findExistingIn(`agents/${uid}`, "profile-picture"); if(u){ avatarUrl=u; showPreview("#avatarPreview", u);} }
  if (!logoUrl){ const u=await findExistingIn(`agencies/${uid}`, "logo"); if(u){ logoUrl=u; showPreview("#logoPreview", u);} }
}

/* ============================ File inputs ============================ */
function wireFileInputs(){
  const avatarInput = document.getElementById("fileProfilePicture");
  const logoInput   = document.getElementById("fileAgencyLogo");

  avatarInput?.addEventListener("change", async () => {
    const f = avatarInput.files?.[0]; if (!f) return;
    const local = URL.createObjectURL(f); showPreview("#avatarPreview", local);
    try{ avatarUrl = await uploadToProfiles(f, "agent"); showPreview("#avatarPreview", avatarUrl); flash("Avatar uploadé.", true);}
    catch(e){ console.error(e); flash("Upload avatar échoué."); }
    finally{ try{ URL.revokeObjectURL(local);}catch{} }
  });

  logoInput?.addEventListener("change", async () => {
    const f = logoInput.files?.[0]; if (!f) return;
    const local = URL.createObjectURL(f); showPreview("#logoPreview", local);
    try{ logoUrl = await uploadToProfiles(f, "agency"); showPreview("#logoPreview", logoUrl); flash("Logo uploadé.", true);}
    catch(e){ console.error(e); flash("Upload logo échoué."); }
    finally{ try{ URL.revokeObjectURL(local);}catch{} }
  });
}

/* ============================ SAVE (UI -> DB) ============================ */
async function onSaveProfile(){
  try{
    const { data: s } = await supa.auth.getSession();
    const uid = s?.session?.user?.id;
    if (!uid) { flash("Not authenticated"); return; }

    // 1) AGENCY (snake_case exact)
    let agencyId = gAgency?.id || null;
    const agencyVals = {
      name_agency:      $("#agc_name").value.trim() || null,
      address:          $("#agc_address").value.trim() || null,
      about_the_agency: $("#agc_about").value.trim() || null,
      logo_url:         toPgTextArray(logoUrl),  // <- text[]
      created_by:       uid
    };

    const hasAgencyData = agencyVals.name_agency || agencyVals.address || agencyVals.about_the_agency || firstUrl(agencyVals.logo_url);
    if (agencyId){
      const { data: agUpd, error: agErr } = await supa.from("agency").update(agencyVals).eq("id", agencyId).select().single();
      if (agErr) throw agErr;
      gAgency = agUpd;
    } else if (hasAgencyData){
      const { data: agIns, error: agInsErr } = await supa.from("agency").insert(agencyVals).select().single();
      if (agInsErr) throw agInsErr;
      gAgency = agIns; agencyId = gAgency.id;
    }

    // 2) AGENT (with "about agent")
    const fullName = [$("#firstName").value.trim(), $("#lastName").value.trim()].filter(Boolean).join(" ");
    const agentVals = {
      user_id: uid,
      name: fullName || null,
      email: $("#email").value.trim() || null,
      phone: $("#phone").value.trim() || null,
      whatsapp: ($("#whatsapp").value ?? "").trim(),
      nationality: $("#nationality").value.trim() || null,
      languages: $("#languages").value.trim() || null,
      ["about agent"]: $("#about").value.trim() || null,
      photo_agent_url: toPgTextArray(avatarUrl), // <- text[]
      superagent: false,
      agency_id: agencyId || null
    };

    const { data: exists } = await supa.from("agent").select("id").eq("user_id", uid).maybeSingle();
    if (exists?.id){
      const { data: aUpd, error: aErr } = await supa.from("agent").update(agentVals).eq("user_id", uid).select().single();
      if (aErr) throw aErr;
      gAgent = aUpd;
    } else {
      const { data: aIns, error: aInsErr } = await supa.from("agent").insert(agentVals).select().single();
      if (aInsErr) throw aInsErr;
      gAgent = aIns;
    }

    await loadEverything(); // relit et affiche ce qui est stocké
    flash("Sauvegardé ✅", true);
  }catch(err){
    console.error("SAVE error:", err);
    flash(err?.message || "Save failed");
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
      window.location.href = `/verify.html?plan=${encodeURIComponent(plan)}`;
    });
  });
}
function escapeHtml(unsafe){ return (unsafe + "").replace(/[&<"'>]/g, (m)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
