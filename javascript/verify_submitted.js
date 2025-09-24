// verify_submitted.js
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const statusEl = document.getElementById('appStatus');
  const detailsEl = document.getElementById('appDetails');
  const debugEl = document.getElementById('debug');
  const refreshBtn = document.getElementById('refreshBtn');

  function logDebug(...args){ console.debug('[verify_submitted]', ...args); if(debugEl) debugEl.textContent = args.join(' '); }

  if (!id) {
    statusEl.textContent = 'Unknown';
    statusEl.className = 'status rejected';
    detailsEl.textContent = 'No application id provided.';
    return;
  }

  async function fetchStatus() {
    try {
      logDebug('fetchStatus id=', id);
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) {
        // if not logged in, still can try to fetch if policy allows public select
        logDebug('not logged in (or auth failed). Will attempt fetch anyway.');
      } else {
        logDebug('current user id', user.id);
      }

      // fetch application row by id
      const { data, error } = await window.supabase
        .from('license_applications')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();

      if (error) {
        throw error;
      }
      logDebug('application row:', data);
      const st = (data.status || 'pending').toLowerCase();
      if (st === 'approved') {
        statusEl.textContent = 'Approved';
        statusEl.className = 'status approved';
      } else if (st === 'rejected' || st === 'declined') {
        statusEl.textContent = 'Rejected';
        statusEl.className = 'status rejected';
      } else {
        statusEl.textContent = 'Pending';
        statusEl.className = 'status pending';
      }
      detailsEl.innerHTML = `
        <p><strong>Agency:</strong> ${data.agency_name || '—'}</p>
        <p><strong>Requested plan:</strong> ${data.requested_plan || '—'}</p>
        <p><strong>Submitted on:</strong> ${data.created_at ? new Date(data.created_at).toLocaleString() : '—'}</p>
      `;
    } catch (err) {
      console.error('[verify_submitted] fetch error', err);
      logDebug('fetch error: ' + (err.message || JSON.stringify(err)));
      statusEl.textContent = 'Error';
      statusEl.className = 'status rejected';
      detailsEl.textContent = 'Unable to fetch application status. If you are logged in, contact support.';
    }
  }

  refreshBtn.addEventListener('click', fetchStatus);

  // initial fetch:
  fetchStatus();

  // optional: poll every 15s to auto-update
  const pollInterval = setInterval(fetchStatus, 15000);
  // stop polling after 10 minutes
  setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
});
