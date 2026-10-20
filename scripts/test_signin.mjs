// The sign-in gate (functions/_middleware.js), no Cloudflare needed: node scripts/test_signin.mjs
import assert from 'node:assert';
import { onRequest } from '../functions/_middleware.js';

const env = { APP_PASSWORD: 'test-only-password' };
const files = req => new Response('file ' + new URL(req.url).pathname, { status: 200, headers: { 'Content-Type': 'text/plain' } });
const call = (url, init = {}) => { const request = new Request('https://maria.example' + url, init); return onRequest({ request, env, next: () => files(request) }); };

// signed out: a page goes to the sign-in page, a file is refused, the name and icon are allowed
let r = await call('/', { headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' } });
assert.strictEqual(r.status, 302); assert.strictEqual(r.headers.get('Location'), '/signin?next=%2F');
r = await call('/reads.json'); assert.strictEqual(r.status, 401);
r = await call('/audio/voice.json'); assert.strictEqual(r.status, 401);
r = await call('/manifest.json'); assert.strictEqual(r.status, 200);
r = await call('/icon-192.png'); assert.strictEqual(r.status, 200);
r = await call('/robots.txt'); assert.match(await r.text(), /Disallow: \//);
r = await call('/signin?next=%2F'); assert.strictEqual(r.status, 200); assert.match(await r.text(), /type="password"/);

// a wrong password: refused, no cookie
const form = (pw, next = '/') => { const f = new FormData(); f.set('password', pw); f.set('next', next); return { method: 'POST', body: f }; };
r = await call('/signin', form('nope')); assert.strictEqual(r.status, 401); assert.strictEqual(r.headers.get('Set-Cookie'), null);

// the right password: a year-long cookie, back to where she was going (never to another site)
r = await call('/signin', form('test-only-password', '/index.html'));
assert.strictEqual(r.status, 303); assert.strictEqual(r.headers.get('Location'), '/index.html');
const cookie = r.headers.get('Set-Cookie'); assert.match(cookie, /^mr_session=\d+\.[0-9a-f]{64}; Max-Age=31536000; Path=\/; HttpOnly; Secure; SameSite=Lax$/);
r = await call('/signin', form('test-only-password', '//evil.example/')); assert.strictEqual(r.headers.get('Location'), '/');

// signed in: every file comes through
const jar = { headers: { Cookie: cookie.split(';')[0] } };
r = await call('/reads.json', jar); assert.strictEqual(r.status, 200); assert.strictEqual(await r.text(), 'file /reads.json');
r = await call('/', { headers: { ...jar.headers, 'Sec-Fetch-Mode': 'navigate' } }); assert.strictEqual(r.status, 200);

// a forged or changed cookie, or one from before a password change, does not work
r = await call('/reads.json', { headers: { Cookie: cookie.split(';')[0].replace(/.$/, c => (c === 'a' ? 'b' : 'a')) } }); assert.strictEqual(r.status, 401);
r = await call('/reads.json', { headers: { Cookie: 'mr_session=9999999999.' + '0'.repeat(64) } }); assert.strictEqual(r.status, 401);
env.APP_PASSWORD = 'a-new-password';
r = await call('/reads.json', jar); assert.strictEqual(r.status, 401);

// no password set yet: nothing is served
delete env.APP_PASSWORD;
r = await call('/reads.json', jar); assert.strictEqual(r.status, 503);
console.log('Sign-in gate: all tests passed');
