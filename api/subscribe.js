import { put, get, del } from '@vercel/blob';
import { createHash } from 'node:crypto';

const TOKEN = () => process.env.PUSH_READ_WRITE_TOKEN;
const keyFor = (endpoint) => `subs/${createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 32)}.json`;


const ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'web.push.apple.com',
  'updates.push.services.mozilla.com',
  'notify.windows.com',
];
const B64URL_RE = /^[A-Za-z0-9_-]+={0,2}$/;

function isValidEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 1024) return false;
  let u;
  try { u = new URL(endpoint); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  return ALLOWED_PUSH_HOSTS.some((a) => h === a || h.endsWith('.' + a));
}

function isValidKey(k, max) {
  return typeof k === 'string' && k.length > 0 && k.length <= max && B64URL_RE.test(k);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'POST') {
    const sub = req.body;
    const endpoint = sub && sub.endpoint;
    const keys = sub && sub.keys;
    if (!isValidEndpoint(endpoint) || !keys || !isValidKey(keys.p256dh, 256) || !isValidKey(keys.auth, 64)) {
      return res.status(400).json({ error: 'invalid push subscription' });
    }
    const ahu = sub.alert_hour_utc;
    const ALLOWED_HOURS = [1, 3, 13, 15]; // the UTC hours with daily cron entries (IST windows 6:30-7:29 / 8:30-9:29 AM and 6:30-7:29 / 8:30-9:29 PM)
    const alertHourUtc = (ahu === null || ahu === undefined) ? null : (Number.isInteger(ahu) && ALLOWED_HOURS.includes(ahu) ? ahu : undefined);
    if (alertHourUtc === undefined) {
      return res.status(400).json({ error: 'alert_hour_utc must be null or one of 1, 3, 13, 15 (UTC)' });
    }
    const ALLOWED_THRESHOLDS = [60, 90, 120, 150, 200, 250];
    const pt = sub.pm25_threshold;
    const pm25Threshold = (pt === null || pt === undefined) ? null : (typeof pt === 'number' && ALLOWED_THRESHOLDS.includes(pt) ? pt : undefined);
    if (pm25Threshold === undefined) {
      return res.status(400).json({ error: 'pm25_threshold must be null or one of 60, 90, 120, 150, 200, 250' });
    }
    const record = {
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      alert_hour_utc: alertHourUtc,
      pm25_threshold: pm25Threshold,
      subscribed_at: new Date().toISOString()
    };
    try {
      await put(keyFor(endpoint), JSON.stringify(record), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        token: TOKEN(),
      });
    } catch (e) {
      return res.status(502).json({ error: 'persistence failed', detail: String(e && e.message || e) });
    }
    return res.status(200).json({ active: true });
  }

  if (req.method === 'GET') {
    const endpoint = req.query && req.query.endpoint;
    if (!endpoint) return res.status(400).json({ error: 'endpoint query param required' });
    try {
      const r = await get(keyFor(endpoint), { access: 'private', token: TOKEN() });
      if (!r || r.statusCode !== 200) return res.status(200).json({ active: false });
      const rec = JSON.parse(await new Response(r.stream).text());
      return res.status(200).json({
        active: true,
        alert_hour_utc: rec.alert_hour_utc ?? null,
        pm25_threshold: rec.pm25_threshold ?? null,
      });
    } catch {
      return res.status(200).json({ active: false });
    }
  }

  if (req.method === 'DELETE') {
    const endpoint = (req.query && req.query.endpoint) || (req.body && req.body.endpoint);
    if (!endpoint || typeof endpoint !== 'string') return res.status(400).json({ error: 'endpoint required' });
    try {
      await del(keyFor(endpoint), { token: TOKEN() });
    } catch (e) {
      return res.status(502).json({ error: 'delete failed', detail: String(e && e.message || e) });
    }
    return res.status(200).json({ active: false });
  }

  return res.status(405).json({ error: 'method not allowed' });
}