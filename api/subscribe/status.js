import { get } from '@vercel/blob';
import { createHash } from 'node:crypto';

const TOKEN = () => process.env.PUSH_READ_WRITE_TOKEN;
const keyFor = (endpoint) => `subs/${createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 32)}.json`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
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