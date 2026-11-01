import { randomUUID } from 'node:crypto';
import {
  COMMUNITY_PUBLICATION_ENABLED, COMMUNITY_MODE,
  INDEX_KEY, MAX_REPORTS, MAX_AGE_MS, MAX_PER_DEVICE_PER_DAY, TYPES, LAT, LON,
  isModerator, cors, vercelStore, publicView,
} from './_community.js';

// PUBLICATION HOLD: see api/_community.js. While disabled, every method 503s before any storage IO.

export function makeHandler(store) {
  return async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (!COMMUNITY_PUBLICATION_ENABLED) {
      return res.status(503).json({ error: 'community reporting is not enabled', enabled: false });
    }

    const now = Date.now();
    const purge = async () => {
      const all = await store.readIndex();
      const fresh = all.filter((r) => now - new Date(r.ts).getTime() < MAX_AGE_MS);
      if (fresh.length !== all.length) {
        for (const r of all.filter((x) => !fresh.includes(x))) { if (r.photoKey) { try { await store.delPhoto(r.photoKey); } catch {} } }
        try { await store.writeIndex(fresh); } catch {}
      }
      return fresh;
    };

    if (req.method === 'GET') {
      // Moderator view: a valid bearer token sees every report with its status.
      // The token is compared here only; it is never stored client-side or shipped.
      const mod = isModerator(req);
      const fresh = await purge();
      // approval mode exposes only approved reports publicly
      const visible = mod ? fresh : (COMMUNITY_MODE === 'approval' ? fresh.filter((r) => r.status === 'approved') : fresh);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        scope: 'Unverified community reports near Patiala. No account or identity is collected; reports auto-expire after 72 hours. Not authority-verified incidents.',
        mode: COMMUNITY_MODE,
        moderator: mod,
        pendingCount: mod ? fresh.filter((r) => r.status === 'pending').length : undefined,
        count: visible.length,
        reports: visible.map(publicView),
      });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const type = String(b.type || '');
      const lat = Number(b.lat), lon = Number(b.lon);
      const note = typeof b.note === 'string' ? b.note.slice(0, 280) : '';
      const deviceId = typeof b.deviceId === 'string' ? b.deviceId.slice(0, 64) : '';
      if (!TYPES.includes(type)) return res.status(400).json({ error: 'invalid type' });
      if (!isFinite(lat) || !isFinite(lon) || lat < LAT[0] || lat > LAT[1] || lon < LON[0] || lon > LON[1]) {
        return res.status(400).json({ error: 'location must be within the Patiala district area' });
      }
      if (!deviceId) return res.status(400).json({ error: 'missing device id' });

      const all = await purge();
      const dayAgo = now - 24 * 3600e3;
      const mineToday = all.filter((r) => r.deviceId === deviceId && new Date(r.ts).getTime() > dayAgo).length;
      if (mineToday >= MAX_PER_DEVICE_PER_DAY) return res.status(429).json({ error: 'daily report limit reached (10 per device per day)' });

      let photoKey = null;
      if (typeof b.photoBase64 === 'string' && b.photoBase64.length > 0) {
        const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(b.photoBase64);
        if (!m) return res.status(400).json({ error: 'photo must be jpeg, png or webp' });
        const buf = Buffer.from(m[2], 'base64');
        if (buf.length > 2_500_000) return res.status(400).json({ error: 'photo too large (max ~2MB)' });
        const ext = m[1] === 'jpg' ? 'jpeg' : m[1];
        photoKey = await store.putPhoto(buf, ext);
      }

      const record = {
        id: randomUUID(), type,
        lat: Math.round(lat * 1000) / 1000,
        lon: Math.round(lon * 1000) / 1000,
        note, photoKey, deviceId,
        status: COMMUNITY_MODE === 'approval' ? 'pending' : 'approved',
        ts: new Date().toISOString(),
      };
      all.unshift(record);
      const trimmed = all.slice(0, MAX_REPORTS);
      for (const r of all.slice(MAX_REPORTS)) { if (r.photoKey) { try { await store.delPhoto(r.photoKey); } catch {} } }
      await store.writeIndex(trimmed);
      return res.status(201).json({
        ok: true,
        queued: record.status === 'pending',
        report: publicView(record),
      });
    }

    if (req.method === 'DELETE') {
      const { id, deviceId } = req.query || {};
      if (typeof id !== 'string' || typeof deviceId !== 'string') return res.status(400).json({ error: 'id and deviceId required' });
      const all = await store.readIndex();
      const r = all.find((x) => x.id === id);
      if (!r) return res.status(404).json({ error: 'report not found' });
      if (r.deviceId !== deviceId) return res.status(403).json({ error: 'only the submitting device can remove a report' });
      if (r.photoKey) { try { await store.delPhoto(r.photoKey); } catch {} }
      await store.writeIndex(all.filter((x) => x.id !== id));
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PATCH') {
      // moderation: approve/reject pending reports. Requires the project-level moderator token.
      if (!process.env.REPORTS_MOD_TOKEN) return res.status(503).json({ error: 'moderation not configured' });
      if (!isModerator(req)) return res.status(401).json({ error: 'unauthorized' });
      const { id, action } = req.body || {};
      if (typeof id !== 'string' || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'id and action approve|reject required' });
      const all = await store.readIndex();
      const r = all.find((x) => x.id === id);
      if (!r) return res.status(404).json({ error: 'report not found' });
      if (action === 'reject') {
        if (r.photoKey) { try { await store.delPhoto(r.photoKey); } catch {} }
        await store.writeIndex(all.filter((x) => x.id !== id));
      } else {
        r.status = 'approved';
        await store.writeIndex(all);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  };
}

export default makeHandler(vercelStore());
