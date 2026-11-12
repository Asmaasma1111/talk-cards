/* Automatic backups of Maria's progress (her request, 12 Nov 2026), kept in Mama's own Cloudflare account.
   Storage: the KV namespace bound to this Pages project as BACKUPS. Every request passes the sign-in first
   (functions/_middleware.js), so only a signed-in device can read or write.

   GET  /api/backup                 the list: { ok, copies: [{ key, saved, size, days }], rec: { saved, size } | null }
   GET  /api/backup?key=p:...       one saved copy of her progress (the same JSON as the Back up file, without recordings)
   GET  /api/backup?key=r:latest    her recordings (the "device.idb" part of the Back up file)
   PUT  /api/backup?days=N          saves a new copy of her progress; the oldest copies beyond KEEP are removed
   PUT  /api/backup?kind=rec        replaces the saved recordings
   The body is stored as it is (it is not parsed here: a large file would use up the free plan's time limit). */
const KEEP = 40;                       // copies of her progress kept (about three weeks at two a day)
const MAX_PROGRESS = 6 * 1024 * 1024;  // bytes
const MAX_REC = 24 * 1024 * 1024;      // KV holds up to 25 MB in one value
const HEAD = '{"app":"maria-talk-cards"';
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function onRequest({ request, env }) {
  const kv = env.BACKUPS;
  if (!kv) return json({ ok: false, error: 'no-store' }, 503);
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const key = url.searchParams.get('key');
    if (key) {
      if (!/^(p:[0-9TZ:.\-]{20,30}|r:latest)$/.test(key)) return json({ ok: false, error: 'bad-key' }, 400);
      const v = await kv.get(key, 'stream');
      if (!v) return json({ ok: false, error: 'gone' }, 404);
      return new Response(v, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    const list = await kv.list({ prefix: 'p:' });
    const copies = list.keys.map(k => ({ key: k.name, ...(k.metadata || {}) })).sort((a, b) => (a.key < b.key ? 1 : -1));
    const rec = await kv.getWithMetadata('r:meta');
    return json({ ok: true, copies, rec: rec && rec.metadata ? rec.metadata : null });
  }

  if (request.method === 'PUT') {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ ok: false, error: 'origin' }, 403);
    const rec = url.searchParams.get('kind') === 'rec';
    const body = await request.text();
    if (!body.startsWith(rec ? '{' : HEAD)) return json({ ok: false, error: 'not-a-backup' }, 400);
    if (body.length > (rec ? MAX_REC : MAX_PROGRESS)) return json({ ok: false, error: 'too-big' }, 413);
    const saved = new Date().toISOString();
    if (rec) {
      await kv.put('r:latest', body);
      await kv.put('r:meta', '1', { metadata: { saved, size: body.length } });
      return json({ ok: true, saved });
    }
    const days = Math.max(0, Math.min(99999, Math.round(Number(url.searchParams.get('days')) || 0)));
    const key = 'p:' + saved;
    await kv.put(key, body, { metadata: { saved, size: body.length, days } });
    const list = await kv.list({ prefix: 'p:' });
    const old = list.keys.map(k => k.name).sort().slice(0, Math.max(0, list.keys.length - KEEP));
    await Promise.all(old.map(k => kv.delete(k)));
    return json({ ok: true, key, saved, kept: list.keys.length - old.length });
  }
  return json({ ok: false, error: 'method' }, 405);
}
