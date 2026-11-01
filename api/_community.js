import { put, get, del } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export const TOKEN = () => process.env.PUSH_READ_WRITE_TOKEN;
export const INDEX_KEY = 'reports/index.json';
export const MAX_REPORTS = 200;
export const MAX_AGE_MS = 72 * 60 * 60 * 1000; // reports auto-expire after 72 hours
export const MAX_PER_DEVICE_PER_DAY = 10;
export const TYPES = ['firecracker', 'open_burning', 'garbage_burning', 'excessive_smoke', 'dust'];
export const LAT = [29.8, 30.9], LON = [75.8, 76.9]; // Patiala district bbox

// PUBLICATION HOLD: not authorized for public use yet (direct vs approval-first
// pending the owner's decision). While false, every community route 503s before any storage IO.
export const COMMUNITY_PUBLICATION_ENABLED = false;
// When enabled: 'direct' publishes immediately, 'approval' queues until a moderator approves.
export const COMMUNITY_MODE = 'approval';
// Moderation needs REPORTS_MOD_TOKEN set on the project at decision time (owner-approved
// settings change). Without it, approval mode safely refuses to publish anything.

export function isModerator(req) {
  const modTok = process.env.REPORTS_MOD_TOKEN;
  return !!modTok && req.headers.authorization === `Bearer ${modTok}`;
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// store interface: readIndex(), writeIndex(arr), putPhoto(buf, ext) -> key,
// getPhoto(key) -> {stream, contentType} | null, delPhoto(key)
export function vercelStore() {
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
      const key = `reports/img/${randomUUID()}.${ext}`;
      await put(key, buf, { access: 'private', token: TOKEN(), contentType: `image/${ext}` });
      return key;
    },
    async getPhoto(key) {
      const ext = key.split('.').pop();
      const r = await get(key, { access: 'private', token: TOKEN() });
      if (!r) return null;
      return { stream: r.stream, contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` };
    },
    async delPhoto(key) { await del(key, { token: TOKEN() }); },
  };
}

// Public payload: deviceId and the raw storage key never leave the server.
// Photos are served only through the status-gated proxy route.
export function publicView(r) {
  const { deviceId, photoKey, ...rest } = r;
  return { ...rest, photoUrl: photoKey ? `/api/report-photo?id=${r.id}` : null };
}
