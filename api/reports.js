import { put, get, del } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const TOKEN = () => process.env.PUSH_READ_WRITE_TOKEN;
const INDEX_KEY = 'reports/index.json';
const MAX_REPORTS = 200;
const MAX_AGE_MS = 72 * 60 * 60 * 1000; // reports auto-expire after 72 hours
const MAX_PER_DEVICE_PER_DAY = 10;
const TYPES = ['firecracker', 'open_burning', 'garbage_burning', 'excessive_smoke', 'dust'];
const LAT = [29.8, 30.9], LON = [75.8, 76.9]; // Patiala district bbox

// PUBLICATION HOLD: not authorized for public use yet (direct vs approval-first
// pending the owner's decision). While false, every method 503s before any storage IO.
const COMMUNITY_PUBLICATION_ENABLED = false;
// When enabled: 'direct' publishes immediately, 'approval' queues until a moderator approves.
const COMMUNITY_MODE = 'approval';
// Moderation needs REPORTS_MOD_TOKEN set on the project at decision time (owner-approved
// settings change). Without it, approval mode safely refuses to publish anything.

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// store interface: { readIndex(), writeIndex(arr), putPhoto(buf, ext) -> url, delPhoto(url) }
function vercelStore() {
  return {
    async readIndex() {
      try {
        const r = await get(INDEX_KEY, { access: 'private', token: TOKEN() });
        if (!r) return [];
        const arr = JSON.parse(await new Response(r.stream).text());
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    },
    async writeIndex(arr) {
      await put(INDEX_KEY, JSON.stringify(arr), {
        access: 'private', token: TOKEN(), contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true,
      });
    },
    async putPhoto(buf, ext) {
      const out = await put(`reports/img/${randomUUID()}.${ext}`, buf, { access: 'public', token: TOKEN(), contentType: `image/${ext}` });
      return out.url;
    },
    async delPhoto(url) { await del(url, { token: TOKEN() }); },
  };
}

function publicView(r) {
  const { deviceId, ...rest } = r;
  return rest;
}

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
        for (const r of all.filter((x) => !fresh.includes(x))) { if (r.photoUrl) { try { await store.delPhoto(r.photoUrl); } catch {} } }
        try { await store.writeIndex(fresh); } catch {}
      }
      return fresh;
    };

    if (req.method === 'GET') {
      const fresh = await purge();
      // approval mode exposes only approved reports publicly
      const visible = COMMUNITY_MODE === 'approval' ? fresh.filter((r) => r.status === 'approved') : fresh;
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        scope: 'Unverified community reports near Patiala. Anonymous, auto-expire after 72 hours. Not authority-verified incidents.',
        mode: COMMUNITY_MODE,
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

      let photoUrl = null;
      if (typeof b.photoBase64 === 'string' && b.photoBase64.length > 0) {
        const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(b.photoBase64);
        if (!m) return res.status(400).json({ error: 'photo must be jpeg, png or webp' });
        const buf = Buffer.from(m[2], 'base64');
        if (buf.length > 2_500_000) return res.status(400).json({ error: 'photo too large (max ~2MB)' });
        const ext = m[1] === 'jpg' ? 'jpeg' : m[1];
        photoUrl = await store.putPhoto(buf, ext);
      }

      const record = {
        id: randomUUID(), type,
        lat: Math.round(lat * 1000) / 1000,
        lon: Math.round(lon * 1000) / 1000,
        note, photoUrl, deviceId,
        status: COMMUNITY_MODE === 'approval' ? 'pending' : 'approved',
        ts: new Date().toISOString(),
      };
      all.unshift(record);
      const trimmed = all.slice(0, MAX_REPORTS);
      for (const r of all.slice(MAX_REPORTS)) { if (r.photoUrl) { try { await store.delPhoto(r.photoUrl); } catch {} } }
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
      if (r.photoUrl) { try { await store.delPhoto(r.photoUrl); } catch {} }
      await store.writeIndex(all.filter((x) => x.id !== id));
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PATCH') {
      // moderation: approve/reject pending reports. Requires the project-level moderator token.
      const modTok = process.env.REPORTS_MOD_TOKEN;
      if (!modTok) return res.status(503).json({ error: 'moderation not configured' });
      if (req.headers.authorization !== `Bearer ${modTok}`) return res.status(401).json({ error: 'unauthorized' });
      const { id, action } = req.body || {};
      if (typeof id !== 'string' || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'id and action approve|reject required' });
      const all = await store.readIndex();
      const r = all.find((x) => x.id === id);
      if (!r) return res.status(404).json({ error: 'report not found' });
      if (action === 'reject') {
        if (r.photoUrl) { try { await store.delPhoto(r.photoUrl); } catch {} }
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
