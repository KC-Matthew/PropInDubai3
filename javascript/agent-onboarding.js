// agent-onboarding.js
// Profile setup (Agent + Agency) with Storage uploads (bucket: "profiles")

/* ============ Mini helpers ============ */
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ============ Config ============ */
const BUCKET = "profiles";            // Bucket public existant
const supa   = window.supabase;

let profilePictureUrl = null;         // agent.photo_agent_url (string, nous stockons la 1ère URL)
let agencyLogoUrl     = null;         // agency.logo_url (string, nous stockons la 1ère URL)
const locked = { "agent-picture": false, "agency-logo": false };

/* ============ UI ============ */
function flash(msg, ok=false){
  const box = $("#psAlert");
  if(!box) return;
  box.textContent = msg;
  box.style.borderColor = ok ? "#d6f2dd" : "#ffd9b8";
  box.style.background  = ok ? "#ecfff0" : "#fff7f0";
  box.style.color       = ok ? "#146c2e" : "#7a3c00";
  box.classList.add("show");
  setTimeout(()=> box.classList.remove("show"), 3500);
}

// → Toujours afficher les deux sections comme actives
function setStepAlwaysOn(){
  $$(".step").forEach(s=> s.classList.add("active"));
  $("#formAgent")?.classList.remove("hidden");
  $("#formAgency")?.classList.remove("hidden");
}

function setUploading(type, on){
  const dz = type==="agency-logo" ? $("#dzAgencyLogo") : $("#dzProfilePicture");
  dz?.classList.toggle("uploading", !!on);
  dz?.setAttribute("aria-busy", on ? "true" : "false");
}
function lockDropzone(type, on){
  locked[type] = !!on;
  const dz = type==="agency-logo" ? $("#dzAgencyLogo") : $("#dzProfilePicture");
  dz?.classList.toggle("locked", !!on);
  const btnId = type==="agency-logo" ? "btnRemoveLogo" : "btnRemoveAvatar";
  if(on){
    if(!dz.querySelector(`#${btnId}`)){
      const b = document.createElement("button");
      b.type = "button";
      b.id = btnId;
      b.className = "linklike";
      b.style.marginTop = "8px";
      b.textContent = "Remove";
      b.addEventListener("click", ()=> removeImage(type).catch(console.error));
      dz.appendChild(b);
    }
  }else{
    dz.querySelector(`#${btnId}`)?.remove();
  }
}

/* ============ Auth ============ */
async function requireUser(){
  const { data, error } = await supa.auth.getSession();
  if (error || !data?.session){
    location.href = "login.html?redirect=/profile-setup.html";
    return null;
  }
  return data.session.user;
}

/* ============ DB ============ */
async function getAgentByUser(userId){
  const { data, error } = await supa.from("agent")
    .select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data || null;
}
async function getAgency(agencyId){
  if (!agencyId) return null;
  const { data, error } = await supa.from("agency")
    .select("*").eq("id", agencyId).maybeSingle();
  if (error) throw error;
  return data || null;
}

function fillAgent(a){
  if (!a) return;
  $("#ag_name").value        = a.name || "";
  $("#ag_email").value       = a.email || "";
  $("#ag_phone").value       = a.phone || "";
  $("#ag_whatsapp").value    = a.whatsapp || "";
  $("#ag_nationality").value = a.nationality || "";
  $("#ag_languages").value   = a.languages || "";
  $("#ag_about").value       = a["about agent"] || "";
  $("#ag_superagent") && ($("#ag_superagent").checked = !!a.superagent);

  // 🔧 Accepte string ou text[]
  const avatar = Array.isArray(a.photo_agent_url) ? a.photo_agent_url[0] : a.photo_agent_url;
  if (avatar){
    profilePictureUrl = avatar;
    showAvatar(avatar);
    lockDropzone("agent-picture", true);
  }
}

function fillAgency(ag){
  if (!ag) return;
  $("#agc_name").value    = ag.name_agency || "";
  $("#agc_address").value = ag.address || "";
  $("#agc_about").value   = ag.about_the_agency || "";

  // 🔧 Accepte string ou text[]
  const logo = Array.isArray(ag.logo_url) ? ag.logo_url[0] : ag.logo_url;
  if (logo){
    agencyLogoUrl = logo;
    showLogo(logo);
    lockDropzone("agency-logo", true);
  }
}

/* ============ Preview ============ */
function showAvatar(url){
  const img = $("#avatarPreview");
  const blank = $("#avatarBlank");
  if (!img) return;
  img.onload = () => { img.style.display = "block"; if (blank) blank.style.display = "none"; };
  img.src = url;
}
function showLogo(url){
  const img = $("#logoPreview");
  const blank = $("#logoBlank");
  if (!img) return;
  img.onload = () => { img.style.display = "block"; if (blank) blank.style.display = "none"; };
  img.src = url;
}
function preload(src){
  return new Promise((resolve, reject)=>{
    const i = new Image();
    i.onload = () => resolve(true);
    i.onerror = () => reject(new Error("load-failed"));
    i.src = src;
  });
}

/* ============ Dropzone ============ */
function setupDropzone(zoneSel, inputSel, type, cb) {
  const zone  = document.querySelector(zoneSel);
  const input = document.querySelector(inputSel);
  if (!zone || !input) return;

  const isLocked = () => !!locked[type];

  const handleFile = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return flash("Please select an image file.");
    if (isLocked()) return flash("You already uploaded an image. Remove it first to upload another.");
    uploadFile(file, type, cb).catch((e)=>{
      console.error("Upload failed:", e);
      flash(e?.message || "Upload failed.");
    });
  };

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    const files = e.dataTransfer?.files;
    if (files && files.length) handleFile(files[0]);
  });

  // toute la zone cliquable (labels/links/boutons conservent leur comportement)
  zone.addEventListener("click", (e) => {
    const t = e.target;
    if (t.tagName === "LABEL" || t.tagName === "A" || t.tagName === "BUTTON") return;
    if (isLocked()) return flash("You already uploaded an image. Remove it first to upload another.");
    input.value = "";
    input.click();
  });

  const picker = zone.querySelector("[data-pick]");
  if (picker) {
    picker.setAttribute("type","button");
    picker.addEventListener("click",(e)=>{
      e.preventDefault();
      if (isLocked()) return flash("You already uploaded an image. Remove it first to upload another.");
      input.value = "";
      input.click();
    });
  }

  input.addEventListener("change", () => {
    if (input.files && input.files.length) handleFile(input.files[0]);
  });

  zone.setAttribute("tabindex","0");
  zone.addEventListener("keydown",(e)=>{
    if (e.key==="Enter" || e.key===" "){
      e.preventDefault();
      if (isLocked()) return flash("You already uploaded an image. Remove it first to upload another.");
      input.value = "";
      input.click();
    }
  });
}

/* ============ Storage upload ============ */
async function uploadFile(file, type, cb) {
  try{
    const max = (type === "agency-logo") ? 3*1024*1024 : 5*1024*1024;
    if (!file || !/^image\//.test(file.type)) return flash("Merci de choisir une image.");
    if (file.size > max) return flash(`Fichier trop volumineux (max ${Math.round(max/1048576)} Mo).`);

    // aperçu local immédiat
    const localUrl = URL.createObjectURL(file);
    if (type === "agency-logo") showLogo(localUrl); else showAvatar(localUrl);

    // auth
    const { data: s, error: sessErr } = await supa.auth.getSession();
    if (sessErr) return flash(sessErr.message || "Erreur d’authentification.");
    const uid = s?.session?.user?.id;
    if (!uid) return flash("Non authentifié.");

    // chemin fixe (1 image max / type)
    const folder = (type === "agency-logo") ? `agencies/${uid}` : `agents/${uid}`;
    const base   = (type === "agency-logo") ? "logo" : "profile-picture";
    const ext    = file.type.includes("png") ? "png"
                  : file.type.includes("webp") ? "webp"
                  : file.type.includes("svg") ? "svg" : "jpg";
    const path   = `${folder}/${base}.${ext}`;

    // upload
    setUploading(type, true);
    const { error: upErr } = await supa.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
      cacheControl: "0",
    });
    setUploading(type, false);
    if (upErr) { console.error(upErr); flash("Échec de l’upload."); return; }

    // URL finale (publique ou signée)
    let finalUrl;
    const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(path);
    if (pub?.publicUrl) finalUrl = pub.publicUrl;
    else {
      const { data: signed, error: signErr } =
        await supa.storage.from(BUCKET).createSignedUrl(path, 60*60*24*365);
      if (signErr) { flash("Fichier envoyé mais URL non accessible."); return; }
      finalUrl = signed.signedUrl;
    }

    // forcer le rafraîchissement de l’aperçu
    const bust = `${finalUrl}${finalUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
    await preload(bust);
    if (type === "agency-logo") {
      agencyLogoUrl = finalUrl;
      showLogo(bust);
      lockDropzone("agency-logo", true);
    } else {
      profilePictureUrl = finalUrl;
      showAvatar(bust);
      lockDropzone("agent-picture", true);
    }
    try { URL.revokeObjectURL(localUrl); } catch {}
    cb?.(finalUrl);
    flash("Image envoyée.", true);
  }catch(err){
    console.error(err);
    flash("Erreur inattendue pendant l’upload.");
  }
}

async function removeImage(type){
  const { data: s } = await supa.auth.getSession();
  const uid = s?.session?.user?.id;
  if (!uid) return flash("Not authenticated.");

  const folder = type === "agency-logo" ? `agencies/${uid}` : `agents/${uid}`;
  const fname  = type === "agency-logo" ? "logo" : "profile-picture";
  const paths = ["jpg","png","webp","svg"].map(ext=> `${folder}/${fname}.${ext}`);
  await supa.storage.from(BUCKET).remove(paths).catch(()=>{});

  if (type === "agency-logo") {
    agencyLogoUrl = null;
    $("#logoPreview").style.display = "none";
    $("#logoBlank").style.display   = "flex";
  } else {
    profilePictureUrl = null;
    $("#avatarPreview").style.display = "none";
    $("#avatarBlank").style.display   = "flex";
  }
  lockDropzone(type, false);
  flash("Image removed.", true);
}

/* ============ Upserts (avec NOMS EXACTS) ============ */
async function upsertAgency(vals, existingId, userId) {
  const payload = existingId ? { id: existingId } : {};

  // ✅ Noms EXACTS de la table `agency`
  payload.name_agency        = vals.name || null;
  payload.about_the_agency   = vals.about || null;

  // 🔧 logo_url est text[] en DB → on envoie un array (ou null)
  payload.logo_url           = vals.logo_url ? [vals.logo_url] : null;

  payload.address            = vals.address || null;
  if (!existingId) payload.created_by = userId;

  const q = supa.from("agency");
  const { data, error } = existingId
    ? await q.update(payload).eq("id", existingId).select().single()
    : await q.insert(payload).select().single();

  if (error) throw error;
  return data;
}

async function upsertAgent(vals, userId, existingId, agencyId){
  const payload = existingId ? { id: existingId } : {};

  payload.name       = vals.name;
  payload.email      = vals.email;
  payload.phone      = vals.phone;
  payload.whatsapp   = vals.whatsapp || null;

  // 🔧 photo_agent_url est text[] en DB → on envoie un array (ou null)
  payload.photo_agent_url = vals.photo_agent_url ? [vals.photo_agent_url] : null;

  // ⚠️ colonne avec espace (existe ainsi dans ta table)
  payload["about agent"] = vals.about || null;

  payload.nationality = vals.nationality || null;
  payload.languages   = vals.languages || null;
  payload.superagent  = !!vals.superagent;
  payload.user_id     = userId;
  payload.agency_id   = agencyId;

  const q = supa.from("agent");
  const { data, error } = existingId
    ? await q.update(payload).eq("id", existingId).select().single()
    : await q.insert(payload).select().single();

  if (error) throw error;
  return data;
}

/* ============ Boot ============ */
(async ()=>{
  const user = await requireUser();
  if (!user) return;

  // Prefill
  let existingAgent = await getAgentByUser(user.id);
  if (existingAgent){
    fillAgent(existingAgent);
    const ag = await getAgency(existingAgent.agency_id);
    fillAgency(ag);
  }else{
    $("#ag_email").value = user.email || "";
    const full = user.user_metadata?.full_name || "";
    if (full) $("#ag_name").value = full;
  }

  // Dropzones
  setupDropzone("#dzProfilePicture", "#fileProfilePicture", "agent-picture",
    (url)=>{ profilePictureUrl = url; });
  setupDropzone("#dzAgencyLogo", "#fileAgencyLogo", "agency-logo",
    (url)=>{ agencyLogoUrl = url; });

  // toujours visibles
  setStepAlwaysOn();

  // Save (on utilise formAgency comme “submit global”)
  $("#formAgency")?.addEventListener("submit", async (e)=>{
    e.preventDefault();

    const agentVals = {
      name: $("#ag_name").value.trim(),
      email: $("#ag_email").value.trim(),
      phone: $("#ag_phone").value.trim(),
      whatsapp: $("#ag_whatsapp").value.trim(),
      nationality: $("#ag_nationality").value.trim(),
      languages: $("#ag_languages").value.trim(),
      about: $("#ag_about").value.trim(),
      superagent: $("#ag_superagent")?.checked || false,
      photo_agent_url: profilePictureUrl
    };
    const agencyVals = {
      name: $("#agc_name").value.trim(),
      address: $("#agc_address").value.trim(),
      about: $("#agc_about").value.trim(),
      logo_url: agencyLogoUrl
    };
    if (!agencyVals.name) return flash("Agency name is required.");

    try {
      const agencyRow = await upsertAgency(agencyVals, existingAgent?.agency_id, user.id);
      await upsertAgent(agentVals, user.id, existingAgent?.id || null, agencyRow.id);
      flash("Profile saved successfully!", true);
      setTimeout(()=> { location.href = "profile.html"; }, 600);
    } catch (err) {
      console.error("save profile error:", err);
      flash(err.message || "Failed to save profile.");
    }
  });
})();
