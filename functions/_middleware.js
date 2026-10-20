/* Cloudflare Pages: Maria's apps open only after signing in.
   Mama sets the password herself as the secret APP_PASSWORD (Cloudflare dashboard, or `wrangler pages secret put`);
   it is never in these files. The sign-in page is part of the app's own address, so it works inside the iPad
   home-screen app. A device stays signed in for a year; changing the password signs every device out.
   Before signing in, only the app's name and icon (for "Add to Home Screen") and this page are sent. */
const COOKIE = 'mr_session';
const YEAR = 365 * 24 * 3600;
const OPEN = new Set(['/signin', '/manifest.json', '/icon-192.png', '/icon-512.png', '/favicon.ico', '/robots.txt']);
const enc = new TextEncoder();

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function mac(secret, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
function same(a, b) {   // equal strings of equal length, compared without an early exit
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const ticket = (pw, exp) => mac(pw, 'maria-apps:' + exp);
async function signedIn(pw, request) {
  const m = /(?:^|;\s*)mr_session=(\d+)\.([0-9a-f]{64})(?:;|$)/.exec(request.headers.get('Cookie') || '');
  if (!m || Number(m[1]) < Date.now() / 1000) return false;
  return same(await ticket(pw, m[1]), m[2]);
}
async function rightPassword(given, pw) {   // compare digests, so the time taken says nothing about the password
  return same(await mac('maria-apps-check', given), await mac('maria-apps-check', pw));
}
function nextPath(v) {
  const s = String(v || '/');
  return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/signin') ? s : '/';
}
const PRIVATE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };

function signinPage(next, wrong) {
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return new Response(`<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><meta name="apple-mobile-web-app-capable" content="yes">
<link rel="manifest" href="/manifest.json"><link rel="apple-touch-icon" href="/icon-192.png">
<title>تطبيقات ماريا</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px; background: radial-gradient(circle at 50% 30%, #FFE0EC, #FFC4D9);
         font-family: 'Geeza Pro', 'Tajawal', system-ui, sans-serif; color: #2B2340; }
  form { width: min(380px, 100%); padding: 28px 24px 24px; text-align: center; background: #fff; border-radius: 28px; box-shadow: 0 18px 40px rgba(158, 47, 99, .18); }
  img { width: 84px; height: 84px; border-radius: 22px; }
  h1 { margin: 12px 0 4px; font-size: 26px; }
  p { margin: 0 0 18px; color: rgba(43, 35, 64, .65); font-size: 16px; line-height: 1.5; }
  .en { display: block; direction: ltr; font-family: system-ui, sans-serif; font-size: 14px; }
  input { width: 100%; min-height: 54px; padding: 0 16px; font-size: 20px; text-align: center; direction: ltr; border: 2px solid #F1C3D6; border-radius: 16px; outline: none; }
  input:focus { border-color: #E0558F; }
  button { margin-top: 14px; width: 100%; min-height: 54px; font: 800 20px/1 inherit; color: #fff; background: #E0558F; border: 0; border-radius: 99px; }
  .wrong { margin: 12px 0 0; color: #B3261E; font-size: 16px; }
</style></head>
<body><form method="post" action="/signin">
  <img src="/icon-192.png" alt="">
  <h1>تطبيقات ماريا</h1>
  <p>كلمة السرّ مرّة واحدة على هذا الجهاز.<span class="en">Enter the password once on this device.</span></p>
  <input type="password" name="password" autocomplete="current-password" required autofocus aria-label="Password">
  <input type="hidden" name="next" value="${esc(next)}">
  <button type="submit">ادخلي · Enter</button>
  ${wrong ? '<p class="wrong">كلمة السرّ غير صحيحة <span class="en">That password is not right.</span></p>' : ''}
</form></body></html>`, { status: wrong ? 401 : 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...PRIVATE } });
}

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const pw = env.APP_PASSWORD;
  if (!pw) return new Response('Maria\'s apps are not set up yet.', { status: 503, headers: PRIVATE });
  const url = new URL(request.url);

  if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain', ...PRIVATE } });
  if (url.pathname === '/signin') {
    if (request.method === 'POST') {
      let given = '', to = '/';
      try { const f = await request.formData(); given = String(f.get('password') || ''); to = nextPath(f.get('next')); } catch (e) {}
      if (given && await rightPassword(given, pw)) {
        const exp = Math.floor(Date.now() / 1000) + YEAR;
        return new Response(null, { status: 303, headers: { Location: to, ...PRIVATE,
          'Set-Cookie': `${COOKIE}=${exp}.${await ticket(pw, exp)}; Max-Age=${YEAR}; Path=/; HttpOnly; Secure; SameSite=Lax` } });
      }
      await new Promise(ok => setTimeout(ok, 1500));    // a wrong password waits, so guessing is slow
      return signinPage(to, true);
    }
    if (await signedIn(pw, request)) return Response.redirect(new URL(nextPath(url.searchParams.get('next')), url).toString(), 302);
    return signinPage(nextPath(url.searchParams.get('next')), false);
  }

  if (OPEN.has(url.pathname) || await signedIn(pw, request)) {
    const res = await next();
    const out = new Response(res.body, res);
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  }
  const page = request.method === 'GET' && (request.headers.get('Sec-Fetch-Mode') === 'navigate' || (request.headers.get('Accept') || '').includes('text/html'));
  if (page) return new Response(null, { status: 302, headers: { Location: '/signin?next=' + encodeURIComponent(url.pathname + url.search), ...PRIVATE } });
  return new Response('Sign in first.', { status: 401, headers: PRIVATE });
}
