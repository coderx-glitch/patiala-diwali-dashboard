import { useState } from 'react';

type Report = {
  id: string;
  type: string;
  lat: number;
  lon: number;
  note: string;
  photoUrl: string | null;
  status: string;
  ts: string;
};

// Owner-only moderation view at #moderate (not linked in the UI).
// The moderation token is entered per session from the owner's password manager
// and held only in memory. It is never stored, logged, or placed in the URL.
export function ModerationView() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (tok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/reports', { headers: { Authorization: `Bearer ${tok}` } });
      if (r.status === 503) {
        const j = await r.json().catch(() => ({}));
        setMsg(j.error === 'moderation not configured'
          ? 'Moderation is not configured on this deployment yet.'
          : 'Community reporting is not enabled on this deployment yet.');
        return;
      }
      if (r.status === 401 || r.status === 403) { setMsg('That moderation key was not accepted.'); return; }
      const j = await r.json();
      if (!j.moderator) { setMsg('That moderation key was not accepted.'); return; }
      setReports(j.reports || []);
      setPendingCount(j.pendingCount || 0);
      setAuthed(true);
    } catch {
      setMsg('Could not reach the reports service.');
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(true);
    try {
      const r = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action }),
      });
      if (!r.ok) { setMsg('Action failed. The report may already be gone.'); }
      await load(token);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <h1 className="font-serif font-bold text-stone-900 text-lg">Owner moderation - Community Reports</h1>
        <p className="text-[11px] text-stone-500">
          Approve or reject pending community reports. This page is not linked publicly.
          Your moderation key stays in this page's memory only and is never stored or shown in the address bar.
        </p>
        {!authed && (
          <form
            className="space-y-2"
            onSubmit={(e) => { e.preventDefault(); if (token) load(token); }}
          >
            <input type="hidden" name="username" autoComplete="username" value="moderator" readOnly />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Moderation key"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy || !token}
              className="px-3 py-2 rounded-lg bg-amber-700 text-white text-xs font-semibold disabled:opacity-50"
            >
              {busy ? 'Checking...' : 'Open moderation queue'}
            </button>
          </form>
        )}
        {msg && <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{msg}</p>}
      </div>

      {authed && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
          <p className="text-xs text-stone-600 font-medium">{pendingCount} pending - {reports.length} total in window</p>
          {reports.length === 0 && <p className="text-[11px] text-stone-400">No reports in the current 72-hour window.</p>}
          {reports.map((r) => (
            <div key={r.id} className="rounded-lg border border-stone-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-800">{r.type.replace(/_/g, ' ')}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{r.status}</span>
              </div>
              <p className="text-[11px] text-stone-500">{new Date(r.ts).toLocaleString('en-IN')} - {r.lat.toFixed(3)}, {r.lon.toFixed(3)}</p>
              {r.note && <p className="text-xs text-stone-700">{r.note}</p>}
              {r.photoUrl && <img src={r.photoUrl} alt="report" className="rounded-lg max-h-40 object-cover" />}
              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => act(r.id, 'approve')} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50">Approve</button>
                  <button disabled={busy} onClick={() => act(r.id, 'reject')} className="px-3 py-1.5 rounded-lg bg-stone-200 text-stone-700 text-xs font-semibold disabled:opacity-50">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
