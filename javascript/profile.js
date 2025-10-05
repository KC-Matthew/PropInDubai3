window.addEventListener('error', (ev) => {
  console.error('JS Error:', ev.error || ev.message);
});
window.addEventListener('unhandledrejection', (ev) => {
  console.error('Promise Rejection:', ev.reason);
});

// profile.js — My Profile (agent + agency + uploads + subscriptions)

const supa   = window.supabase;
const BUCKET = "profiles";

/* ============================ BOOT ============================ */
// BOOT
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  wireFileInputs();
  wireListingPhotos();
  loadEverything();
  loadSubscription();
  initSubscriptions();
  attachSubscribeHandlers();

  // Save profil
  document.getElementById("profileForm")
    ?.addEventListener("submit", (e) => { e.preventDefault(); onSaveProfile(); });

  // 👉 Save listing (c'est ICI)
  document.getElementById("addListingForm")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      saveListingToDB();
    });

  // Gate “My listings” (si tu l'utilises)
  // -> conserve un seul init, pas de doublon
  const target = document.getElementById('tab-contacted');
  if (target) {
    const tryInit = () => {
      if (getComputedStyle(target).display !== 'none') {
        initMyListingGate();
        setTimeout(() => setListingSubtab('sub-add'), 0);
        return true;
      }
      return false;
    };
    if (!tryInit()) {
      document.querySelector('.tab-btn[data-tab="tab-contacted"]')
        ?.addEventListener('click', () => setTimeout(tryInit, 0));
    }
  }
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


const LISTINGS_BUCKET = "photos_biens";


// --- Utils bucket / URL
function publicUrlFrom(bucket, path){
  const { data } = supa.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

// Retrouver le path Storage à partir d’une URL publique Supabase
function supaPathFromPublicUrl(url, bucket){
  try{
    const key = `/object/public/${bucket}/`;
    const i = url.indexOf(key);
    if (i === -1) return null;
    return url.substring(i + key.length);          // e.g. userId/listings/xxx.jpg
  }catch{ return null; }
}

// HEIC ?
function isHeic(f){
  const n = (f?.name || "").toLowerCase();
  return f?.type === "image/heic" || f?.type === "image/heif" || n.endsWith(".heic") || n.endsWith(".heif");
}

// Convertit un File/Blob en JPEG 16:9 (déformé pour remplir)
async function toRectBlob(inputFileOrBlob, width=1600, height=900, quality=0.9){
  const srcBlob = inputFileOrBlob instanceof Blob ? inputFileOrBlob : new Blob([inputFileOrBlob], { type: inputFileOrBlob.type || "application/octet-stream" });
  const url = URL.createObjectURL(srcBlob);
  try{
    const blob = await fetch(url).then(r=>r.blob());
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" }); // gère l’EXIF
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha:false });
    ctx.imageSmoothingQuality = "high";
    // Déformation volontaire: étire/compresse pour remplir 16:9
    ctx.drawImage(bmp, 0, 0, width, height);
    return await new Promise(resolve => canvas.toBlob(b => resolve(b), "image/jpeg", quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Supprime une photo (bucket + UI + JSON + preview)
async function removePhotoFromListing(publicUrl){
  const path = supaPathFromPublicUrl(publicUrl, LISTINGS_BUCKET);
  if (path){
    try { await supa.storage.from(LISTINGS_BUCKET).remove([path]); } catch(e){ console.warn("remove storage err", e); }
  }
  // MAJ champ caché
  const hidden = document.getElementById("lst_photos_json");
  const arr = (()=>{ try{ return JSON.parse(hidden.value || "[]"); }catch{ return []; }})();
  const next = arr.filter(u => u !== publicUrl);
  hidden.value = JSON.stringify(next);
  // Enlève la vignette
  const gallery = document.getElementById("lst_gallery");
  const card = gallery?.querySelector(`[data-url="${CSS.escape(publicUrl)}"]`);
  if (card) card.remove();
  // Rafraîchit un éventuel preview
  hidden.dispatchEvent(new Event("change"));
}

// Helper: UUID simple
function uuid(){ return (crypto?.randomUUID?.() || (Date.now() + "_" + Math.random().toString(16).slice(2))); }

// ====== Wiring des inputs d'upload pour les annonces ======
function wireListingPhotos(){
  const pickBtn = document.getElementById("btnPickPhotos");
  const fileInp = document.getElementById("lst_photos");
  const gallery = document.getElementById("lst_gallery");
  const hidden  = document.getElementById("lst_photos_json");
  if (!pickBtn || !fileInp || !gallery || !hidden) return;

  // Ouvrir sélecteur
  pickBtn.addEventListener("click", () => fileInp.click());

  // Sélection de fichiers
  fileInp.addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = ""; // reset pour pouvoir re-sélectionner les mêmes
    if (!files.length) return;

    // Validation basique
    const maxMB = 8;
    const valid = files.filter(f => (isHeic(f) || f.type.startsWith("image/")) && f.size <= maxMB*1024*1024);
    const rejected = files.length - valid.length;
    if (rejected > 0) flash(`${rejected} image(s) rejetée(s) (type ou taille)`);

    try{
      // User
      const { data: { user } } = await supa.auth.getUser();
      if (!user) { flash("Not authenticated"); return; }
      const userId = user.id;

      // URLs existantes
      const oldArr = (()=>{ try{ return JSON.parse(hidden.value || "[]"); }catch{ return []; }})();

      const uploadedUrls = [];
      for (const f of valid) {
        // 1) Si HEIC → convertir
        let srcBlob = f;
        if (isHeic(f)) {
          if (window.heic2any){
            try {
              const conv = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.92 });
              srcBlob = Array.isArray(conv) ? conv[0] : conv;
            } catch(err) {
              console.error("HEIC convert error", err);
              flash("HEIC non supporté — régle l’iPhone en JPEG (Le plus compatible).");
              continue;
            }
          } else {
            flash("HEIC non supporté sur ce navigateur. Utilise JPG/PNG ou ajoute heic2any.");
            continue;
          }
        }

        // 2) Rectifier en 16:9 déformé (1600×900)
        let rectBlob;
        try {
          rectBlob = await toRectBlob(srcBlob, 1600, 900, 0.9);
        } catch (e2) {
          console.error("toRectBlob error", e2);
          flash("Impossible de transformer l’image.");
          continue;
        }

        // 3) Upload en .jpg (public)
        const path = `${userId}/listings/${uuid()}.jpg`;
        const { error } = await supa.storage.from(LISTINGS_BUCKET)
          .upload(path, rectBlob, { upsert: false, contentType: "image/jpeg", cacheControl: "0" });
        if (error) {
          console.error("upload error", error);
          flash(`Upload failed: ${f.name}`);
          continue;
        }

        const url = publicUrlFrom(LISTINGS_BUCKET, path);
        if (!url) continue;
        uploadedUrls.push(url);

        // 4) Vignette + bouton Delete
        const item = document.createElement("div");
        item.className = "photos-item";
        item.dataset.url = url;

        const img = document.createElement("img");
        img.loading = "lazy";
        img.src = url;
        item.appendChild(img);

        const del = document.createElement("button");
        del.className = "remove-btn";
        del.type = "button";
        del.textContent = "Delete";
        del.addEventListener("click", () => removePhotoFromListing(url));
        item.appendChild(del);

        gallery.appendChild(item);
      }

      // 5) MAJ champ caché + refresh preview
      if (uploadedUrls.length){
        const merged = [...oldArr, ...uploadedUrls];
        hidden.value = JSON.stringify(merged);
        hidden.dispatchEvent(new Event("change"));
        flash(`Uploaded ${uploadedUrls.length} photo(s) ✅`, true);
      }
    }catch(err){
      console.error(err);
      flash("Photos upload failed");
    }
  });
}




/* ========= Live listing preview with carousel ========= */

function parsePhotosHidden(){
  try { return JSON.parse(document.getElementById("lst_photos_json").value || "[]"); }
  catch { return []; }
}

function getListingFormValues(){
  return {
    title:   document.getElementById("lst_title")?.value?.trim() || "Apartment",
    location:document.getElementById("lst_location")?.value?.trim() || "Dubai",
    beds:    document.getElementById("lst_bedrooms")?.value || "1",
    baths:   document.getElementById("lst_bathrooms")?.value || "1",
    sqft:    document.getElementById("lst_sqft")?.value || "",
    price:   document.getElementById("lst_price")?.value || "",
    agentName: (document.getElementById("firstName")?.value || "John") + " " + (document.getElementById("lastName")?.value || "Doe"),
    agentAvatar: (window.avatarUrl || ""),  // tu l’as déjà hydraté ailleurs
    photos: parsePhotosHidden()
  };
}

/* ============== Listing form values (buy/rent/commercial) ============== */
function getListingValues(){
  // photos stockées dans le hidden JSON
  const photos = (() => {
    try { return JSON.parse(document.getElementById('lst_photos_json')?.value || '[]'); }
    catch { return []; }
  })();

  const toNum = (v) => {
    const s = String(v ?? '').replace(/[^\d.]/g,'');
    return s ? Number(s) : null;
  };

  return {
    id:        document.getElementById('lst_id')?.value || null,     // hidden si update
    kind:      document.getElementById('lst_category')?.value || 'buy', // 'buy' | 'rent' | 'commercial'
    title:     document.getElementById('lst_title')?.value?.trim() || null,
    propertyType: document.getElementById('lst_property_type')?.value?.trim() || null,
    rentalPeriod:  document.getElementById('lst_rental_period')?.value?.trim() || null, // (commercial / rent si tu veux)
    bedrooms:  toNum(document.getElementById('lst_bedrooms')?.value),
    bathrooms: toNum(document.getElementById('lst_bathrooms')?.value),
    price:     toNum(document.getElementById('lst_price')?.value),
    sqft:      toNum(document.getElementById('lst_sqft')?.value),
    locationAccueil: document.getElementById('lst_location')?.value?.trim() || null,
    description: document.getElementById('lst_description')?.value?.trim() || null,
    photos
  };
}


function buildListingCardHTML(d){
  // toutes les photos ou placeholder
  const photos = d.photos && d.photos.length ? d.photos : ["https://placehold.co/800x480/jpg"];

  return `
    <div class="media" style="position:relative; width:800px; height:480px; overflow:hidden; border-radius:12px;">
      <img id="lp-photo" src="${photos[0]}" alt="Property photo"
           style="width:100%; height:100%; object-fit:cover; display:block;">
      <button class="nav prev" id="lp-prev" type="button" aria-label="Previous photo">‹</button>
      <button class="nav next" id="lp-next" type="button" aria-label="Next photo">›</button>
      <div class="badge"><span>📷</span><strong id="lp-count">${photos.length}</strong></div>
    </div>
  `;
}


// Affiche la photo d'index i dans le grand aperçu
function showPreviewPhotoAt(index){
  const hidden = document.getElementById("lst_photos_json");
  const img    = document.getElementById("lp-photo");
  if (!hidden || !img) return;

  let urls = [];
  try { urls = JSON.parse(hidden.value || "[]"); } catch {}

  if (!urls.length) return; // rien à afficher

  const len = urls.length;
  const i = ((index % len) + len) % len; // wrap
  img.src = urls[i];
  img.dataset.idx = i; // mémorise l'index courant
}

function wireGalleryToPreview(){
  const gallery = document.getElementById("lst_gallery");
  const hidden  = document.getElementById("lst_photos_json");
  if (!gallery || !hidden) return;

  // Empêche le double câblage
  if (gallery._wiredToPreview) return;
  gallery._wiredToPreview = true;

  // Normalise une URL (ignore les querystrings genre ?v=...)
  const normalize = (u) => {
    if (!u) return "";
    const a = document.createElement("a");
    a.href = u;
    return a.origin + a.pathname;
  };

  // Click sur une vignette -> affiche en grand
  gallery.addEventListener("click", (e) => {
    // ignore le bouton Delete
    if (e.target.closest(".remove-btn")) return;

    // ✅ closest ne supporte pas ".photos-item img"
    // on récupère d'abord .photos-item puis son <img>
    const item  = e.target.closest(".photos-item");
    if (!item) return;
    const thumb = item.querySelector("img");
    if (!thumb) return;

    // URLs actuelles
    let urls = [];
    try { urls = JSON.parse(hidden.value || "[]"); } catch {}

    // cherche l'index via l'URL normalisée
    const clicked = normalize(thumb.getAttribute("src"));
    let idx = urls.findIndex(u => normalize(u) === clicked);

    // fallback : position dans le DOM si l'URL a changé (cache-busting, etc.)
    if (idx < 0) {
      const thumbs = Array.from(gallery.querySelectorAll(".photos-item img"));
      idx = Math.max(0, thumbs.indexOf(thumb));
    }

    showPreviewPhotoAt(idx);
  });

  // Quand la liste change (upload/suppression), garde un index valide et MAJ du compteur
  hidden.addEventListener("change", () => {
    const img = document.getElementById("lp-photo");
    if (!img) return;

    let urls = [];
    try { urls = JSON.parse(hidden.value || "[]"); } catch {}
    if (!urls.length) return;

    let cur = Number(img.dataset.idx || 0);
    if (cur >= urls.length) cur = urls.length - 1;

    showPreviewPhotoAt(cur);

    const cnt = document.getElementById("lp-count");
    if (cnt) cnt.textContent = urls.length;
  });
}



function renderListingPreview(){
  const d   = getListingFormValues();
  const box = document.getElementById("listingPreview");
  if (!box) return;

  const photos = d.photos && d.photos.length ? d.photos : ["https://placehold.co/800x480/jpg"];
  box.innerHTML = `
    <div class="media" style="position:relative; width:800px; height:480px; overflow:hidden; border-radius:12px;">
      <img id="lp-photo" src="${photos[0]}" alt="Property photo"
           style="width:100%; height:100%; object-fit:cover; display:block;">
      <button class="nav prev" id="lp-prev" type="button" aria-label="Previous photo">‹</button>
      <button class="nav next" id="lp-next" type="button" aria-label="Next photo">›</button>
      <div class="badge"><span>📷</span><strong id="lp-count">${photos.length}</strong></div>
    </div>
  `;

  const img  = document.getElementById("lp-photo");
  const prev = document.getElementById("lp-prev");
  const next = document.getElementById("lp-next");
  img.dataset.idx = 0;

  const readUrls = () => {
    try { return JSON.parse(document.getElementById("lst_photos_json").value || "[]"); }
    catch { return []; }
  };

  const show = (i) => {
    const urls = readUrls();
    if (!urls.length) return;
    const idx = ((i % urls.length) + urls.length) % urls.length;
    img.src = urls[idx];
    img.dataset.idx = idx;
  };

  prev?.addEventListener("click", () => show((Number(img.dataset.idx)||0) - 1));
  next?.addEventListener("click", () => show((Number(img.dataset.idx)||0) + 1));

  show(0);

  // 👉 câble (une seule fois) la galerie -> preview
  wireGalleryToPreview();
}






/* Re-render à chaque changement de champ pertinent */
function wireListingPreviewAutoUpdate(){
  const ids = ["lst_title","lst_location","lst_bedrooms","lst_bathrooms","lst_sqft","lst_price","firstName","lastName"];
  ids.forEach(id => document.getElementById(id)?.addEventListener("input", renderListingPreview));
  // quand on ajoute des photos, wireListingPhotos() met déjà à jour #lst_photos_json,
  // donc on relance le rendu à la fin de son handler :
  const originalWire = wireListingPhotos;
  // si tu as déjà appelé wireListingPhotos(), on ajoute juste un listener sur le hidden:
  document.getElementById("lst_photos_json")?.addEventListener("change", renderListingPreview);
}

// appelle le rendu après le boot et après chaque upload
document.addEventListener("DOMContentLoaded", () => {
  wireListingPreviewAutoUpdate();
  renderListingPreview();
});





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
























function setListingSubtab(subId){
  // boutons (orange sur l'actif)
  document.querySelectorAll('#listingSubTabs .tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.subtab === subId);
  });
  // contenus (affiche uniquement le bon)
  document.querySelectorAll('#tab-contacted .subtab').forEach(s => {
    s.classList.toggle('active', s.id === subId);
  });
}


// active le switch des sous-onglets
function wireMyListingSubtabs() {
  if (wireMyListingSubtabs._wired) return;
  wireMyListingSubtabs._wired = true;

  document.getElementById('listingSubTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-subtab]');
    if (!btn) return;
    setListingSubtab(btn.dataset.subtab);
  });

  // lien "Go to Subscription"
  document.querySelector('[data-open-tab="tab-subscription"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector(`.tab-btn[data-tab="tab-subscription"]`)?.click();
  });
}


// lance quand l’onglet "My listings" devient visible OU au chargement
document.addEventListener('DOMContentLoaded', () => {
  // si ton système d’onglets ne déclenche pas d’événement, on surveille l’ouverture de la section
  const target = document.getElementById('tab-contacted');
  if (!target) return;

  const tryInit = () => {
    if (getComputedStyle(target).display !== 'none') {
      initMyListingGate();
      return true;
    }
    return false;
  };

  // tentative immédiate (si l’onglet est déjà actif)
  if (tryInit()) return;

  // sinon on “écoute” le clic de l’onglet bouton
  document.querySelector(`.tab-btn[data-tab="tab-contacted"]`)?.addEventListener('click', () => {
    // petit délai pour laisser ton code de tabs afficher la section
    setTimeout(tryInit, 0);
  });
});

// lance quand l’onglet "My listings" devient visible OU au chargement
document.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('tab-contacted');
  if (!target) return;

  const tryInit = () => {
    if (getComputedStyle(target).display !== 'none') {
      initMyListingGate();
      // par sécurité, forcer l’état par défaut juste après l’init
      setTimeout(() => setListingSubtab('sub-add'), 0);
      return true;
    }
    return false;
  };

  // tentative immédiate (si l’onglet est déjà actif)
  if (tryInit()) return;

  // sinon on écoute le clic sur l’onglet du haut
  document.querySelector(`.tab-btn[data-tab="tab-contacted"]`)?.addEventListener('click', () => {
    setTimeout(tryInit, 0);
  });
});









// -------- My Listing: gate + affichage --------
async function getCurrentAgent() {
  const { data: { user }, error: authErr } = await supa.auth.getUser();
  if (authErr || !user) throw new Error('Not authenticated');
  const { data, error } = await supa
    .from('agent')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error || !data) throw new Error('Agent not found');
  return data;
}

async function initMyListingGate() {
  const paywall = document.getElementById('listingPaywall');
  const subTabs = document.getElementById('listingSubTabs');
  const add = document.getElementById('sub-add');
  const view = document.getElementById('sub-view');
  if (!paywall || !subTabs || !add || !view) return;

  paywall.style.display = 'none';
  subTabs.style.display = 'none';
  add.style.display = 'none';
  view.style.display = 'none';

  try {
    const agent = await getCurrentAgent();
    if (agent.paid === true) {
      subTabs.style.display = '';
      add.style.display = '';
      view.style.display = '';
      wireMyListingSubtabs();
      setListingSubtab('sub-add'); // Add a listing actif + orange
    } else {
      paywall.style.display = '';
    }
  } catch (e) {
    console.error(e);
    paywall.style.display = '';
    paywall.innerHTML = `<p>You must be logged in as an approved agent.</p>`;
  }
}



function setListingSubtab(subId){
  document.querySelectorAll('#listingSubTabs .tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.subtab === subId);
  });
  document.querySelectorAll('#tab-contacted .subtab').forEach(s => {
    s.classList.toggle('active', s.id === subId);
  });
}

function wireMyListingSubtabs() {
  if (wireMyListingSubtabs._wired) return;
  wireMyListingSubtabs._wired = true;

  document.getElementById('listingSubTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-subtab]');
    if (!btn) return;
    setListingSubtab(btn.dataset.subtab);
  });

  document
    .querySelector('[data-open-tab="tab-subscription"]')
    ?.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('.tab-btn[data-tab="tab-subscription"]')?.click();
    });
}

// Initialisation du « gate » quand l’onglet My listings s’affiche
document.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('tab-contacted');
  if (!target) return;

  const tryInit = () => {
    if (getComputedStyle(target).display !== 'none') {
      initMyListingGate();
      // force "Add a listing" (orange) juste après
      setTimeout(() => setListingSubtab('sub-add'), 0);
      return true;
    }
    return false;
  };

  if (tryInit()) return;
  document
    .querySelector('.tab-btn[data-tab="tab-contacted"]')
    ?.addEventListener('click', () => setTimeout(tryInit, 0));
});


/* ================= Listing save UI state ================ */
function setListingSaving(isSaving){
  const btn = document.getElementById('saveListingBtn') || document.querySelector('.save-listing-btn');
  const note = document.getElementById('listingSavingNote');
  if (btn){
    if (isSaving){
      btn.disabled = true;
      btn.dataset._txt = btn.textContent;
      btn.textContent = 'Listing update…';
    }else{
      btn.disabled = false;
      if (btn.dataset._txt) btn.textContent = btn.dataset._txt;
    }
  }
  if (note){
    note.style.display = isSaving ? 'inline-flex' : 'none';
    note.textContent = isSaving ? 'Listing update…' : '';
  }
}




// 1) Helper de navigation (inchangé)
function goToMyListingsView() {
  // ouvrir l’onglet principal
  document.querySelector('.tab-btn[data-tab="tab-contacted"]')?.click();

  // quand visible, activer "View my listings"
  const trySet = () => {
    const sec = document.getElementById('tab-contacted');
    if (sec && getComputedStyle(sec).display !== 'none') {
      setListingSubtab('sub-view');
      return;
    }
    requestAnimationFrame(trySet);
  };
  requestAnimationFrame(trySet);
}

async function saveListingToDB(){
  const d = getListingValues();
  setListingSaving?.(true);

  try{
    // --- Auth + agent
    const { data: { user }, error: authErr } = await supa.auth.getUser();
    if (authErr) throw authErr;
    if (!user) throw new Error('Not authenticated');

    const { data: agent, error: agentErr } = await supa
      .from('agent').select('id').eq('user_id', user.id).maybeSingle();
    if (agentErr) throw agentErr;
    if (!agent?.id) throw new Error('Agent not found');

    // --- Données communes
    const photosArr = Array.isArray(d.photos) ? d.photos : (d.photos ? [d.photos] : null);

    // IMPORTANT : colonne de localisation selon la table
    // - buy       -> "localisation accueil" (ta colonne existante avec espace)
    // - rent/commercial -> "localisation" (sans espace, présent dans ces tables)
    const locCol = (d.kind === 'buy') ? 'localisation accueil' : 'localisation';

    // --- Routing table + payload
    let table, clickTable, fk, payload;

    if (d.kind === 'rent'){
      table='rent'; clickTable='rent click'; fk='rent_id';
      payload = {
        title: d.title,
        property_type: d.propertyType,
        bedrooms: d.bedrooms,
        bathrooms: d.bathrooms,
        price: d.price,
        sqft: d.sqft,
        photo_url: photosArr,
        agent_id: agent.id,
        [locCol]: d.locationAccueil
      };

    } else if (d.kind === 'commercial'){
      table='commercial'; clickTable='commercial click'; fk='commercial_id';
      payload = {
        title: d.title,
        ['rental period']: d.rentalPeriod,
        ['property type']: d.propertyType,
        bedrooms: d.bedrooms,
        bathrooms: d.bathrooms,
        price: d.price,
        sqft: d.sqft,
        photo_url: photosArr,
        agent_id: agent.id,
        [locCol]: d.locationAccueil
      };

    } else {
      // default: BUY
      table='buy'; clickTable='buy click'; fk='buy_id';
      payload = {
        title: d.title,
        property_type: d.propertyType,
        bedrooms: d.bedrooms,
        bathrooms: d.bathrooms,
        price: d.price,
        sqft: d.sqft,
        photos: photosArr,         // si la colonne existe
        photo_bien_url: photosArr, // ou celle-ci — garde les deux si ton schéma en a une des deux
        agent_id: agent.id,
        [locCol]: d.locationAccueil
      };
    }

    // --- Insert/Update listing
    let listingId = d.id || null;

    if (listingId){
      const { error: upErr } = await supa.from(table).update(payload).eq('id', listingId);
      if (upErr) throw upErr;
    } else {
      const { data: ins, error: inErr } = await supa.from(table).insert(payload).select('id').single();
      if (inErr) throw inErr;
      listingId = ins.id;

      // garde l'id dans un hidden pour les updates ultérieurs
      let hid = document.getElementById('lst_id');
      if (!hid){
        hid = document.createElement('input');
        hid.type='hidden'; hid.id='lst_id';
        document.body.appendChild(hid);
      }
      hid.value = listingId;
    }

    // --- Upsert dans la table "* click"
    const clickPayload = {
      [fk]: listingId,
      description: d.description || null,
      localisation: d.locationAccueil || null,
      ['property details']: {}  // objet vide pour satisfaire NOT NULL
    };

    const { data: existingClick, error: exErr } = await supa
      .from(clickTable).select('id').eq(fk, listingId).maybeSingle();
    if (exErr) throw exErr;

    if (existingClick?.id){
      const { error } = await supa.from(clickTable).update(clickPayload).eq('id', existingClick.id);
      if (error) throw error;
    } else {
      const { error } = await supa.from(clickTable).insert(clickPayload);
      if (error) throw error;
    }

    // --- Succès
    flash('Listing saved ✅', true);

    // Mémorise l’état dans l’URL (facultatif) puis ouvre "View my listings"
    const u = new URL(location.href);
    u.searchParams.set('tab','mylistings');
    u.searchParams.set('sub','sub-view');
    history.replaceState(null,'',u);

    goToMyListingsView();

    setTimeout(() => {
      document.getElementById('myListings')?.scrollIntoView({ behavior:'smooth', block:'start' });
      // loadMyListings?.();
    }, 150);

  } catch(e){
    console.error('[saveListingToDB] ', e);
    flash(e?.message || 'Save failed');
    if (e?.details) console.error(e.details);
    if (e?.hint) console.error(e.hint);
  } finally {
    setListingSaving?.(false);
  }
}



