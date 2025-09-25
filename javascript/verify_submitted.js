// verify_submitted.js (version agent)
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const table  = (params.get('table') || 'agent').trim();   // par défaut: agent
  const id     = params.get('id');

  const statusEl   = document.getElementById('appStatus');
  const detailsEl  = document.getElementById('appDetails');
  const debugEl    = document.getElementById('debug');
  const refreshBtn = document.getElementById('refreshBtn');

  // blocs (facultatifs) pour un message de succès
  const approvedBlock = document.getElementById('approvedBlock');
  const payWrap       = document.getElementById('payWrap');
  const payLink       = document.getElementById('payLink');

  function logDebug(...args) {
    console.debug('[verify_submitted]', ...args);
    if (debugEl) {
      debugEl.textContent = args.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ');
    }
  }

  if (!id) {
    statusEl.textContent = 'Unknown';
    statusEl.className = 'status rejected';
    detailsEl.textContent = 'No application id provided.';
    return;
  }

  // Rendu
  function render(row) {
    if (!row) return;

    const approved = row.approved === true;
    const st = approved ? 'approved'
             : (String(row.status || '').toLowerCase() || 'pending');

    // Badge
    if (st === 'approved') {
      statusEl.textContent = 'Accepted';
      statusEl.className = 'status approved';
    } else if (st === 'rejected' || st === 'declined') {
      statusEl.textContent = 'Rejected';
      statusEl.className = 'status rejected';
    } else {
      statusEl.textContent = 'Pending';
      statusEl.className = 'status pending';
    }

    // Bloc succès visible uniquement si approved = true
    if (approved && approvedBlock) {
      approvedBlock.style.display = 'block';
    } else if (approvedBlock) {
      approvedBlock.style.display = 'none';
    }
    // Pas de colonne payment_link dans agent → on masque systématiquement
    if (payWrap)  payWrap.style.display = 'none';
    if (payLink)  payLink.removeAttribute('href');

    // Détails
    const agencyName = row.agency?.name_agency || '—';
    const requestedPlan = row.requested_plan || '—';
    const createdAt = row.created_at ? new Date(row.created_at).toLocaleString() : '—';

    detailsEl.innerHTML = `
      <p><strong>Agency:</strong> ${agencyName}</p>
      <p><strong>Requested plan:</strong> ${requestedPlan}</p>
      <p><strong>Submitted on:</strong> ${createdAt}</p>
    `;
  }

  // Récupération (table agent par défaut)
  async function fetchStatus() {
    try {
      logDebug('fetchStatus', { table, id });

      // Optionnel : voir si l'user est loggé
      const { data: { user } } = await window.supabase.auth.getUser();
      if (user) logDebug('current user id', user.id);

      // IMPORTANT : ne sélectionner que des colonnes existantes.
      // On joint l’agence pour obtenir son nom.
      const { data, error } = await window.supabase
        .from(table)
        .select(`
          id,
          created_at,
          approved,
          status,
          requested_plan,
          agency:agency_id ( name_agency )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      render(data);
    } catch (err) {
      console.error('[verify_submitted] fetch error', err);
      logDebug('fetch error: ' + (err.message || JSON.stringify(err)));
      statusEl.textContent = 'Error';
      statusEl.className = 'status rejected';
      detailsEl.textContent = 'Unable to fetch application status. If you are logged in, contact support.';
    }
  }

  refreshBtn?.addEventListener('click', fetchStatus);
  fetchStatus();

  // Poll (optionnel)
  const poll = setInterval(fetchStatus, 15000);
  setTimeout(() => clearInterval(poll), 10 * 60 * 1000);

  // Realtime sur la bonne table
  const channel = window.supabase
    .channel(`${table}-status-${id}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table,
      filter: `id=eq.${id}`
    }, (payload) => {
      logDebug('realtime update:', payload.new);
      render(payload.new);
    })
    .subscribe();

  window.addEventListener('beforeunload', () => {
    try { window.supabase.removeChannel(channel); } catch {}
  });
});
