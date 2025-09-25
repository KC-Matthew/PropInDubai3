// javascript/verify.js — saves to `agent` (+ creates/links `agency` if provided)
document.addEventListener("DOMContentLoaded", async () => {
  const sb = window.supabase;

  // ---- plan depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan") || "starter";
  document.getElementById("plan-label")?.replaceChildren(
    document.createTextNode(`Requested plan: ${plan}`)
  );
  const hiddenPlan = document.getElementById("requested_plan");
  if (hiddenPlan) hiddenPlan.value = plan;

  const form      = document.getElementById("verifyForm");
  const statusEl  = document.getElementById("status");
  const submitBtn = document.getElementById("submitBtn");

  const setErr = (msg) => { console.error("[verify]", msg); if (statusEl) statusEl.textContent = "Error: " + msg; };
  const setOk  = (msg) => { console.log("[verify]", msg);  if (statusEl) statusEl.textContent = msg; };

  // ---------- helpers ----------
  function sanitizeFilename(filename, maxLen = 200) {
    try{
      const normalized = filename.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
      const cleaned    = normalized.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^[._-]+/, "");
      const lastDot    = cleaned.lastIndexOf(".");
      if (lastDot > 0 && cleaned.length > maxLen){
        const ext  = cleaned.slice(lastDot);
        const name = cleaned.slice(0, lastDot).slice(0, maxLen - ext.length);
        return (name || "file") + ext;
      }
      return cleaned.slice(0, maxLen) || "file";
    }catch{ return (filename || "file").replace(/\s+/g, "_").slice(0, maxLen); }
  }

  async function uploadToDocs(file){
    const safe = sanitizeFilename(file?.name || "upload.bin", 200);
    const path = `licenses/${crypto.randomUUID()}-${safe}`;
    const { data, error } = await sb.storage.from("docs").upload(path, file);
    if (error) throw error;

    try{
      const { data: pub } = sb.storage.from("docs").getPublicUrl(data.path);
      return pub?.publicUrl || data.path;
    }catch{
      return data.path;
    }
  }

  async function getExistingAgent(userId){
    const { data } = await sb.from("agent").select("*").eq("user_id", userId).maybeSingle();
    return data || null;
  }

  async function upsertAgencyIfNeeded({ userId, agencyName }){
    if (!agencyName) return null;

    // cherche une agence existante (même créateur + même nom)
    const { data: existing } = await sb
      .from("agency")
      .select("id")
      .eq("created_by", userId)
      .eq("name_agency", agencyName)
      .maybeSingle();

    if (existing?.id) return existing.id;

    // sinon crée une agence minimaliste
    const { data: ins, error: insErr } = await sb
      .from("agency")
      .insert({ created_by: userId, name_agency: agencyName })
      .select("id")
      .single();
    if (insErr) throw insErr;
    return ins.id;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (statusEl) statusEl.textContent = "";
    submitBtn.disabled = true; submitBtn.textContent = "Sending…";

    try{
      // 0) Auth
      const { data: { user }, error: authErr } = await sb.auth.getUser();
      if (authErr || !user){ setErr("You must be logged in."); submitBtn.disabled=false; submitBtn.textContent="Send request"; return; }

      // 1) Lire le formulaire
      const agency_name = (document.getElementById("agency_name")?.value || "").trim();
      const emirate     = (document.getElementById("emirate")?.value || "").trim();
      const orn         = (document.getElementById("orn")?.value || "").trim();
      const brn         = (document.getElementById("brn")?.value || "").trim();
      const email       = (document.getElementById("email")?.value || "").trim();
      const phone       = (document.getElementById("phone")?.value || "").trim();
      const file        = document.getElementById("license_file")?.files?.[0];

      if (!emirate || !orn || !email || !phone || !file){
        setErr("Please fill required fields and attach a license file.");
        submitBtn.disabled=false; submitBtn.textContent="Send request"; return;
      }

      // 2) Upload
      let licence_file_url;
      try{
        licence_file_url = await uploadToDocs(file);
      }catch(err){
        setErr("Upload failed: " + (err?.message || JSON.stringify(err)));
        submitBtn.disabled=false; submitBtn.textContent="Send request"; return;
      }

      // 3) Valeurs par défaut pour colonnes NOT NULL d'`agent`
      const existing = await getExistingAgent(user.id);
      const safeName      = (existing?.name && existing.name.trim()) || (email.split("@")[0] || "Agent");
      const aboutFallback = (existing?.["about agent"] && String(existing["about agent"]).trim()) || "-";
      const languagesDef  = (existing?.languages && String(existing.languages).trim()) || "-";
      const superagentDef = (typeof existing?.superagent === "boolean") ? existing.superagent : false;

      // 4) Créer/relier une agency si nom fourni
      let agencyId = existing?.agency_id || null;
      if (agency_name){
        try{ agencyId = await upsertAgencyIfNeeded({ userId: user.id, agencyName: agency_name }); }
        catch(e){ console.warn("[verify] agency upsert failed:", e); }
      }

      // 5) Upsert dans `agent` (clé = user_id)
      const payload = {
        user_id: user.id,                // uuid
        name: safeName,                  // NOT NULL
        email,
        phone,
        emirate,
        orn,
        brn: brn || null,
        licence_file_url,                // orthographe de ta colonne
        requested_plan: plan,
        status: "pending",
        approved: false,
        paid: false,
        ["about agent"]: aboutFallback,  // NOT NULL
        languages: languagesDef,         // NOT NULL (si défini ainsi dans ton schéma)
        superagent: superagentDef        // NOT NULL (si défini ainsi)
      };
      if (agencyId) payload.agency_id = agencyId;

      const { data: row, error: upErr } = await sb
        .from("agent")
        .upsert(payload, { onConflict: "user_id" })
        .select("id")
        .single();

      if (upErr){
        setErr("Insert/Update error: " + (upErr.message || JSON.stringify(upErr)));
        submitBtn.disabled=false; submitBtn.textContent="Send request"; return;
      }

      // 6) OK → redirection de suivi (tu peux laisser ta page telle quelle)
      setOk("Request sent — we will verify your license.");
      const agentId = row?.id;
      window.location.href = `/verify_submitted.html?table=agent&id=${encodeURIComponent(agentId)}`;

    }catch(err){
      setErr("Unexpected: " + (err?.message || String(err)));
    }finally{
      submitBtn.disabled = false; submitBtn.textContent = "Send request";
    }
  });
});
