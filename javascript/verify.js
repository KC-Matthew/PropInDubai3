// verify.debug.js — improved: sanitize filename, better logs, robust upload + insert
// Load this file instead of verify.js while debugging

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[verify.debug] DOM loaded");
  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan') || 'starter';
  const planLabel = document.getElementById('plan-label');
  if (planLabel) planLabel.textContent = `Requested plan: ${plan}`;
  const requestedPlanInput = document.getElementById('requested_plan');
  if (requestedPlanInput) requestedPlanInput.value = plan;

  const status = document.getElementById('status');
  function showError(msg){
    console.error("[verify.debug] ", msg);
    if (status) status.textContent = "Error: " + msg;
  }

  // sanitize filename: remove accents, replace unsafe chars by underscore, keep extension
  function sanitizeFilename(filename, maxLen = 200) {
    try {
      const normalized = filename.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
      const cleaned = normalized.replace(/[^A-Za-z0-9._-]/g, '_');
      const safeStart = cleaned.replace(/^[._-]+/, '');
      const lastDot = safeStart.lastIndexOf('.');
      if (lastDot > 0 && safeStart.length > maxLen) {
        const ext = safeStart.slice(lastDot);
        const namePart = safeStart.slice(0, lastDot).slice(0, maxLen - ext.length);
        return (namePart || 'file') + ext;
      }
      return safeStart.slice(0, maxLen) || 'file';
    } catch (e) {
      // fallback
      return filename.replace(/\s+/g, '_').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, maxLen) || 'file';
    }
  }

  // wrapper to upload and return path
  async function uploadFileToDocs(file) {
    const originalName = file.name || 'upload.bin';
    const safeName = sanitizeFilename(originalName, 200);
    const path = `licenses/${crypto.randomUUID()}-${safeName}`;
    console.debug("[verify.debug] Uploading to path:", path);

    const { data: uploadData, error: uploadError } = await window.supabase
      .storage
      .from('docs')
      .upload(path, file);

    console.debug("[verify.debug] upload result:", { uploadData, uploadError });
    if (uploadError) {
      // throw full error object so caller can inspect
      throw uploadError;
    }
    return { path: uploadData?.path ?? path };
  }

  // Print current auth user for debugging (on load)
  try {
    const userRes = await window.supabase.auth.getUser();
    console.log("[verify.debug] getUser() =>", userRes);
    console.log("[verify.debug] current user id:", userRes?.data?.user?.id);
  } catch (e) {
    console.warn("[verify.debug] getUser() failed", e);
  }

  const form = document.getElementById('verifyForm');
  const submitBtn = document.getElementById('submitBtn');
  if (!form) {
    console.warn("[verify.debug] verifyForm not found in DOM");
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (status) status.textContent = '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

    try {
      // ensure user is authenticated
      const { data: { user }, error: userErr } = await window.supabase.auth.getUser();
      console.log("[verify.debug] auth.getUser response:", { user, userErr });
      if (userErr) {
        showError("auth.getUser error: " + (userErr.message || userErr));
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send request'; }
        return;
      }
      if (!user) {
        showError("Not logged in. Please sign in first.");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send request'; }
        return;
      }
      console.log("[verify.debug] user.id =", user.id);

      // collect form values
      const agency_name = (document.getElementById('agency_name')?.value || '').trim();
      const emirate = (document.getElementById('emirate')?.value || '').trim();
      const orn = (document.getElementById('orn')?.value || '').trim();
      const brn = (document.getElementById('brn')?.value || '').trim();
      const email = (document.getElementById('email')?.value || '').trim();
      const phone = (document.getElementById('phone')?.value || '').trim();
      const fileInput = document.getElementById('license_file');
      const file = fileInput?.files?.[0];

      if (!agency_name || !emirate || !orn || !email || !file) {
        showError('Please fill required fields and attach a license file.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send request'; }
        return;
      }

      // 1) upload file (sanitizes name)
      let uploadResp;
      try {
        uploadResp = await uploadFileToDocs(file);
        console.log("[verify.debug] uploaded path:", uploadResp.path);
      } catch (uplErr) {
        // Storage API error (400/403/...)
        console.error("[verify.debug] Upload failed:", uplErr);
        showError("Upload failed: " + (uplErr?.message || JSON.stringify(uplErr)));
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send request'; }
        return;
      }

      // 2) try get public URL (if bucket public)
      let publicUrl = null;
      try {
        const pub = window.supabase.storage.from('docs').getPublicUrl(uploadResp.path);
        publicUrl = pub?.data?.publicUrl ?? null;
      } catch (e) {
        console.warn("[verify.debug] getPublicUrl error", e);
      }
      console.log("[verify.debug] publicUrl:", publicUrl);

      // 3) prepare record and insert
      const id = crypto.randomUUID();
      const record = {
        id,
        user_id: user.id,            // NOTE: ensure your RLS compares user_id = auth.uid()::text if user_id is text
        agency_name,
        emirate,
        orn,
        brn: brn || null,
        email,
        phone,
        license_file_url: publicUrl || uploadResp.path,
        requested_plan: plan,
        status: 'pending',
        approved: false,
        paid: false,
        created_at: new Date().toISOString()
      };
      console.log("[verify.debug] record to insert:", record);

      const insertResp = await window.supabase
        .from('license_applications')
        .insert([record])
        .select()
        .single();

      console.log("[verify.debug] insertResp:", insertResp);
      if (insertResp.error) {
        showError("Insert error: " + (insertResp.error.message || JSON.stringify(insertResp.error)));
        console.error("[verify.debug] full insertResp.error:", insertResp.error);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send request'; }
        return;
      }

      // success
      if (status) status.textContent = 'Request sent — we will verify your license and email you.';
      console.log("[verify.debug] insert success:", insertResp.data);
      // après insert success (insertResp.data contient la row insérée)
        const insertedId = insertResp.data?.id ?? record.id;
        window.location.href = `/verify_submitted.html?id=${encodeURIComponent(insertedId)}`;


    } catch (err) {
      console.error("[verify.debug] unexpected error:", err);
      showError("Unexpected: " + (err?.message || String(err)));
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send request'; }
    }
  });
});
