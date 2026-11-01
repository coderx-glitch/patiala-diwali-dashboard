import { put, get, del } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const TOKEN = () => process.env.PUSH_READ_WRITE_TOKEN;
const INDEX_KEY = 'reports/index.json';
const MAX_REPORTS = 200;
const MAX_AGE_MS = 72 * 60 * 60 * 1000; // reports auto-expire after 72 hours
const TYPES = ['firecracker', 'open_burning', 'garbage_burning', 'excessive_smoke', 'dust'];
// Patiala district bounding box - reports must be local
const LAT = [29.8, 30.9], LON = [75.8, 76.9];

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readIndex() {
  try {
    const r = await get(INDEX_KEY, { access: 'private', token: TOKEN() });
    if (!r) return [];
    const text = await new Response(r.stream).text();
    const arr = JSON.parse(text);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

async function writeIndex(arr) {
  await put(INDEX_KEY, JSON.stringify(arr), {
    access: 'private',
    token: TOKEN(),
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function publicView(r) {
  // never expose the submitting device id
  const { deviceId, ...rest } = r;
  return rest;
}

// PUBLICATION HOLD: community reporting is not authorized for public use yet
// (publication model - direct vs approval-first - pending the owner's decision).
// The API must not accept, store, or expose submissions until then.
const COMMUNITY_PUBLICATION_ENABLED = false;

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!COMMUNITY_PUBLICATION_ENABLED) {
    return res.status(503).json({ error: 'community reporting is not enabled', enabled: false });
  }

  if (req.method === 'GET') {
    const now = Date.now();
    const all = await readIndex();
    const fresh = all.filter((r) => now - new Date(r.ts).getTime() < MAX_AGE_MS);
    if (fresh.length !== all.length) {
      // best-effort purge of expired photo blobs
      const expired = all.filter((r) => !fresh.includes(r));
      for (const r of expired) { if (r.photoUrl) { try { await del(r.photoUrl, { token: TOKEN() }); } catch {} } }
      try { await writeIndex(fresh); } catch {}
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      scope: 'Unverified community reports near Patiala. Anonymous, auto-expire after 72 hours. Not authority-verified incidents.',
      count: fresh.length,
      reports: fresh.map(publicView),
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

    let photoUrl = null;
    if (typeof b.photoBase64 === 'string' && b.photoBase64.length > 0) {
      const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(b.photoBase64);
      if (!m) return res.status(400).json({ error: 'photo must be jpeg, png or webp' });
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 2_500_000) return res.status(400).json({ error: 'photo too large (max ~2MB)' });
      const ext = m[1] === 'jpg' ? 'jpeg' : m[1];
      const out = await put(`reports/img/${randomUUID()}.${ext}`, buf, {
        access: 'public',
        token: TOKEN(),
        contentType: `image/${ext}`,
      });
      photoUrl = out.url;
    }

    const record = {
      id: randomUUID(),
      type,
      lat: Math.round(lat * 1000) / 1000,   // ~110 m precision - no exact addresses
      lon: Math.round(lon * 1000) / 1000,
      note,
      photoUrl,
      deviceId,
      ts: new Date().toISOString(),
    };
    const all = await readIndex();
    all.unshift(record);
    const trimmed = all.slice(0, MAX_REPORTS);
    for (const r of all.slice(MAX_REPORTS)) { if (r.photoUrl) { try { await del(r.photoUrl, { token: TOKEN() }); } catch {} } }
    await writeIndex(trimmed);
    return res.status(201).json({ ok: true, report: publicView(record) });
  }

  if (req.method === 'DELETE') {
    const { id, deviceId } = req.query || {};
    if (typeof id !== 'string' || typeof deviceId !== 'string') return res.status(400).json({ error: 'id and deviceId required' });
    const all = await readIndex();
    const r = all.find((x) => x.id === id);
    if (!r) return res.status(404).json({ error: 'report not found' });
    if (r.deviceId !== deviceId) return res.status(403).json({ error: 'only the submitting device can remove a report' });
    if (r.photoUrl) { try { await del(r.photoUrl, { token: TOKEN() }); } catch {} }
    await writeIndex(all.filter((x) => x.id !== id));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
