/* كرّاس الإملاء: Mama's view (hold the gear on the home screen for 2 seconds). English labels, Arabic content.
   Each skill (unit): its stage, cards learned / total, unlock or relock. كلماتي الصعبة. Her writing gallery by date, where
   Mama can mark a self-check wrong (the card goes back to box 1). The last five weeks. Settings. Back up and Restore, in
   تطبيقات ماريا's file format (app 'maria-talk-cards', v 3, device: {ls, idb}) with only this sub-app's data; Restore
   takes that file or a whole تطبيقات ماريا backup and uses only the dictation part. */
(function (KD) {
'use strict';
const { el, icon, toast } = KD.ui;
const LS_KEYS = ['mariaDictation.v1'];
const LEVELS = [['full', 'كامل'], ['partial', 'جزئي'], ['none', 'بدون']];

function render(app) {
  KD.voice.stop();
  const E = KD.E, m = KD.store.get(), t = KD.store.today();
  const body = el('div', { class: 'pv-body' });
  app.replaceChildren(el('section', { class: 'screen parent', lang: 'en', dir: 'ltr' },
    el('header', { class: 'pv-top' }, el('button', { class: 'top-btn', 'aria-label': 'Close', onclick: () => { location.hash = '#home'; } }, icon('close')),
      el('h1', null, 'Dictation copybook · parent view')), body));
  body.append(skills(), hard(), gallery(), calendar(), settings(), backupBox());

  /* ---------- skills ---------- */
  function skills() {
    const rows = E.unitStats(m).map(u => {
      const sk = KD.skill(u.skill);
      const name = el('td', { class: 'ar', dir: 'rtl' }, sk.name + (u.label ? ` · ${u.label}` : ''));
      const stage = u.stage ? `${u.stage} of ${u.stages.length}` : '–';
      const btn = el('button', { class: 'pv-btn' + (u.open ? '' : ' on'), onclick: () => {
        m.manual[u.id] = !u.open; KD.store.save(); render(app); toast(u.open ? 'Relocked.' : 'Unlocked.');
      } }, u.open ? 'Relock' : 'Unlock');
      return el('tr', { class: u.open ? '' : 'locked' }, name, el('td', null, stage), el('td', null, `${u.learned} / ${u.total}`),
        el('td', null, u.complete ? 'complete' : (u.open ? (u.manual === true ? 'open (by you)' : 'open') : (u.manual === false ? 'locked (by you)' : 'locked'))), el('td', null, btn));
    });
    return section('Skills', el('table', { class: 'pv-table' },
      el('thead', null, el('tr', null, ['Skill', 'Stage', 'Learned', 'State', ''].map(h => el('th', null, h)))), el('tbody', null, rows)));
  }

  /* ---------- كلماتي الصعبة ---------- */
  function hard() {
    const list = E.hardest(m, 20);
    return section('كلماتي الصعبة (hardest words)', list.length
      ? el('div', { class: 'pv-chips ar', dir: 'rtl' }, list.map(h => el('span', { class: 'pv-chip' }, h.w, el('small', null, ` ×${h.n + h.wrong}`))))
      : el('p', { class: 'pv-none' }, 'None yet: words she taps as wrong in a sentence or a text appear here.'));
  }

  /* ---------- her writing, by date ---------- */
  function gallery() {
    const box = el('div', { class: 'pv-gallery' }, el('p', { class: 'pv-none' }, 'Loading…'));
    KD.store.allWriting().then(rows => {
      rows.sort((a, b) => b.ts - a.ts);
      const days = {}; rows.forEach(r => { (days[r.day] = days[r.day] || []).push(r); });
      box.replaceChildren();
      if (!rows.length) { box.append(el('p', { class: 'pv-none' }, 'Nothing written yet.')); return; }
      Object.keys(days).sort().reverse().forEach(d => {
        box.append(el('h3', { class: 'ar', dir: 'rtl' }, KD.ui.copyDate(d)),
          el('div', { class: 'pv-thumbs' }, days[d].map(r => {
            const u = URL.createObjectURL(r.png);
            return el('button', { class: 'pv-thumb ' + (r.ok === true ? 'ok' : r.ok === false ? 'no' : ''), onclick: () => open(r, u) },
              el('img', { src: u, alt: '' }), el('span', null, r.ok === true ? '✓' : r.ok === false ? '✗' : '–'));
          })));
      });
    });
    return section('Her writing', box);
  }
  function open(r, u) {
    const c = KD.session.cardOf(r.card);
    const text = !c ? r.card : c.type === 'missing' ? c.word : c.type === 'red' ? c.fixed : c.type === 'textred' ? c.fixed : (c.w || c.s || '');
    const shut = () => dlg.remove();
    const dlg = el('div', { class: 'pv-dialog', onclick: e => { if (e.target === dlg) shut(); } },
      el('div', { class: 'pv-card' },
        el('p', { class: 'ar pv-correct', dir: 'rtl' }, text),
        el('img', { class: 'pv-big', src: u, alt: '' }),
        el('p', null, `Card ${r.card} · ${r.step} · her self-check: ${r.ok === true ? 'right ✓' : r.ok === false ? 'wrong ✗' : 'none'}`),
        el('div', { class: 'pv-row' },
          r.ok === true ? el('button', { class: 'pv-btn on', onclick: async () => {
            await KD.store.setCheck(r.id, false);
            if (KD.data.cards[r.card] || m.hard[r.card]) E.markWrong(m, r.card, t);
            KD.store.save(); shut(); render(app); toast('Marked wrong: the card comes back tomorrow.');
          } }, 'Mark as wrong') : null,
          el('button', { class: 'pv-btn', onclick: shut }, 'Close'))));
    document.body.append(dlg);
  }

  /* ---------- the last five weeks ---------- */
  function calendar() {
    const done = new Set(E.practisedDays(m));
    const end = new Date(t + 'T12:00:00'); end.setDate(end.getDate() + (6 - end.getDay()));   // to the end of this week (Saturday)
    const cells = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(end); d.setDate(end.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push(el('span', { class: 'pv-day' + (done.has(ds) ? ' done' : '') + (ds === t ? ' today' : '') + (ds > t ? ' future' : ''), title: ds }, String(d.getDate())));
    }
    return section('The last five weeks', el('div', { class: 'pv-cal' }, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(h => el('b', null, h)), cells));
  }

  /* ---------- settings ---------- */
  function settings() {
    const S = m.settings;
    const pick = (label, value, options, onchange) => el('label', { class: 'pv-set' }, el('span', null, label),
      el('select', { onchange: e => { onchange(e.target.value); KD.store.save(); toast('Saved.'); } },
        options.map(([v, l]) => { const o = el('option', { value: v }, l); if (String(v) === String(value)) o.selected = true; return o; })));
    const rows = [
      pick('Cards per session', S.perSession, [4, 6, 8, 10, 12, 16].map(n => [n, n]), v => { S.perSession = Number(v); }),
      pick('New sets per day', S.newSets, [1, 2, 3].map(n => [n, n]), v => { S.newSets = Number(v); }),
      pick('Writing', m.prefs.pencilOnly ? 'pencil' : 'any', [['any', 'finger or Apple Pencil'], ['pencil', 'Apple Pencil only']], v => { m.prefs.pencilOnly = v === 'pencil' ? true : false; })
    ];
    KD.data.skills.forEach(sk => rows.push(pick(`Tashkeel: ${sk.name}`, S.tashkeel[sk.id] || 'full', LEVELS, v => { S.tashkeel[sk.id] = v; })));
    return section('Settings', el('div', { class: 'pv-sets' }, rows));
  }

  /* ---------- back up and restore ---------- */
  function backupBox() {
    const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: e => { const f = e.target.files[0]; e.target.value = ''; if (f) restore(f); } });
    return section('Back up progress', el('div', { class: 'pv-row' },
      el('button', { class: 'pv-btn on', onclick: backup }, 'Back up'), el('button', { class: 'pv-btn', onclick: () => file.click() }, 'Restore'), file));
  }
}

const section = (title, ...kids) => el('section', { class: 'pv-sec' }, el('h2', null, title), ...kids);
const blobB64 = blob => new Promise((ok, bad) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1] || ''); f.onerror = () => bad(f.error); f.readAsDataURL(blob); });
function b64Blob(s, type) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); }
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function backup() {
  KD.store.save();
  const ls = {}; LS_KEYS.forEach(k => { try { const v = localStorage.getItem(k); if (v != null) ls[k] = v; } catch (e) {} });
  const rows = await KD.store.allWriting();
  const writing = [];
  for (const r of rows) { const o = {}; for (const [k, v] of Object.entries(r)) o[k] = v instanceof Blob ? { __blob: await blobB64(v), type: v.type } : v; writing.push(o); }
  const data = JSON.stringify({ app: 'maria-talk-cards', v: 3, saved: new Date().toISOString(), profiles: {}, device: { ls, idb: writing.length ? { mariaDictation: { writing } } : {} } });
  const name = `maria-dictation-backup-${KD.store.today()}.json`;
  let file = null; try { file = new File([data], name, { type: 'application/json' }); } catch (e) {}
  if (file && isIOS() && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file] }).catch(() => {}); return; }
  const url = URL.createObjectURL(file || new Blob([data], { type: 'application/json' }));
  const a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Backup saved.');
}

async function restore(file) {
  try {
    const obj = JSON.parse(await file.text());
    const dev = obj && obj.app === 'maria-talk-cards' && obj.device;
    const raw = dev && dev.ls && dev.ls['mariaDictation.v1'];
    const state = raw ? JSON.parse(raw) : null;
    const rows = dev && dev.idb && dev.idb.mariaDictation && Array.isArray(dev.idb.mariaDictation.writing) ? dev.idb.mariaDictation.writing : [];
    if (!state || !KD.E.valid(state)) throw new Error('bad');
    if (!confirm(`Replace the dictation progress on this device with this backup (${rows.length} writing pictures)?`)) return;
    KD.store.replace(state);
    for (const o of rows) {
      const r = {}; for (const [k, v] of Object.entries(o)) r[k] = v && typeof v === 'object' && typeof v.__blob === 'string' ? b64Blob(v.__blob, v.type || 'image/png') : v;
      await KD.store.putWriting(r);
    }
    toast('Progress restored.');
    setTimeout(() => location.reload(), 900);
  } catch (e) { toast('That file has no dictation progress.'); }
}

KD.parent = { render, backup, restore };
})(window.KD = window.KD || {});
