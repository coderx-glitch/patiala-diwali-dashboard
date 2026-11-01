import { Readable } from 'node:stream';
import {
  COMMUNITY_PUBLICATION_ENABLED, COMMUNITY_MODE,
  isModerator, cors, vercelStore,
} from './_community.js';

// Status-gated photo proxy. Photos are stored with private access; they leave
// storage only through here: approved reports (or direct mode) are public,
// pending photos require the moderator bearer token. While the publication
// hold stands, this route 503s like the rest.

export function makeHandler(store) {
  return async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (!COMMUNITY_PUBLICATION_ENABLED) {
      return res.status(503).json({ error: 'community reporting is not enabled', enabled: false });
    }
    if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const all = await store.readIndex();
    const r = all.find((x) => x.id === id);
    if (!r || !r.photoKey) return res.status(404).json({ error: 'not found' });
    const visible = COMMUNITY_MODE === 'direct' || r.status === 'approved';
    if (!visible && !isModerator(req)) return res.status(401).json({ error: 'unauthorized' });
    const photo = await store.getPhoto(r.photoKey);
    if (!photo) return res.status(404).json({ error: 'not found' });
    res.setHeader('Content-Type', photo.contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 200;
    Readable.fromWeb(photo.stream).pipe(res);
  };
}

export default makeHandler(vercelStore());
