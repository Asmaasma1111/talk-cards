// One shared drag-and-drop module, built on Pointer Events (finger and Apple Pencil).
// - Picking up: the item lifts (scale 1.05, stronger shadow) and every valid drop zone glows.
// - Dropping on a zone: it snaps in with a small sound. Anywhere else: it glides back, no message.
// - Tap alternative: tap an item (it lifts and zones glow), then tap a zone.
// - Undo: every accepted drop returns an undo function; dnd.undo() runs the last one.
import { play } from './sound.js';

const MOVE_PX = 8; // movement before a press becomes a drag (smaller = a tap)

export function createDnD({ onDrop, accepts = () => true, onHistory = () => {}, sound = 'drop', scroller = null }) {
  const zones = [];
  const history = [];
  let active = null;   // the drag in progress
  let selected = null; // the item picked by tap

  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = () => (reduce() ? 1 : 240);

  function validZones(item) { return zones.filter(z => z.el.isConnected && accepts(item.data, z.data, item)); }
  function glow(item, on) {
    for (const z of zones) z.el.classList.remove('dz-on', 'dz-over');
    if (on) for (const z of validZones(item)) z.el.classList.add('dz-on');
  }
  function zoneAt(x, y, item) {
    for (const z of validZones(item)) {
      const r = z.el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z;
    }
    return null;
  }

  function makeGhost(item) {
    const r = item.el.getBoundingClientRect();
    const node = item.ghost ? item.ghost() : item.el.cloneNode(true);
    const g = document.createElement('div');
    g.className = 'dnd-ghost';
    g.append(node);
    document.body.append(g);
    // A custom ghost (e.g. one coin lifted out of a jar) starts centred on the press point.
    const w = item.ghost ? g.offsetWidth : r.width, h = item.ghost ? g.offsetHeight : r.height;
    if (!item.ghost) { g.style.width = r.width + 'px'; g.style.height = r.height + 'px'; }
    return { g, w, h };
  }

  function place(gh, x, y) {
    gh.g.style.transform = `translate(${x - gh.w / 2}px, ${y - gh.h / 2}px) scale(1.05)`;
  }

  function finish(gh, toX, toY, then) {
    const from = gh.g.style.transform;
    const to = `translate(${toX - gh.w / 2}px, ${toY - gh.h / 2}px) scale(1)`;
    const anim = gh.g.animate([{ transform: from }, { transform: to }], { duration: dur(), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    let ended = false;
    const end = () => { if (ended) return; ended = true; gh.g.remove(); then?.(); };
    anim.onfinish = end;
    setTimeout(end, dur() + 150); // never leave a ghost behind if the animation is paused
  }

  function center(el) {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  function drop(item, zone, gh) {
    const undo = onDrop(item.data, zone.data, item);
    glow(item, false);
    if (undo) {
      play(sound);
      history.push(undo);
      onHistory(history.length);
      if (gh) { const [x, y] = center(zone.el); finish(gh, x, y); }
      item.onDone?.(true);
      return true;
    }
    back(item, gh);
    return false;
  }

  function back(item, gh) {
    glow(item, false);
    if (gh) {
      const [x, y] = item.home || center(item.el);
      finish(gh, x, y, () => item.onDone?.(false));
    } else item.onDone?.(false);
  }

  function select(item) {
    deselect();
    selected = item;
    item.el.classList.add('dnd-selected');
    glow(item, true);
    play('tap');
  }
  function deselect() {
    if (!selected) return;
    selected.el.classList.remove('dnd-selected');
    glow(selected, false);
    selected = null;
  }

  // Tap on a zone while an item is selected → drop there.
  function tapZone(z) {
    if (!selected || !accepts(selected.data, z.data, selected)) return false;
    const item = selected;
    deselect();
    item.onLift?.();
    drop(item, z, null);
    return true;
  }

  function onMove(e) {
    if (!active || e.pointerId !== active.id) return;
    e.preventDefault();
    const dx = e.clientX - active.x0, dy = e.clientY - active.y0;
    if (!active.gh) {
      if (Math.hypot(dx, dy) < MOVE_PX) return;
      deselect();
      if (active.item.canPick && active.item.canPick() !== true) { active.item.onDeny?.(); active = null; return; }
      active.item.home = active.item.ghost ? [active.x0, active.y0] : center(active.item.el);
      active.gh = makeGhost(active.item);
      active.item.onLift?.();
      active.item.el.classList.add('dnd-src');
      glow(active.item, true);
    }
    const [hx, hy] = active.item.ghost ? [e.clientX, e.clientY] : [active.item.home[0] + dx, active.item.home[1] + dy];
    place(active.gh, hx, hy);
    // Near the top or bottom edge of a scrolling board, scroll it so far-away spots can be reached.
    if (scroller) {
      const r = scroller.getBoundingClientRect();
      if (e.clientY < r.top + 56) scroller.scrollTop -= 14;
      else if (e.clientY > r.bottom - 56) scroller.scrollTop += 14;
    }
    const over = zoneAt(e.clientX, e.clientY, active.item);
    for (const z of zones) z.el.classList.toggle('dz-over', z === over);
  }

  function onUp(e) {
    if (!active || e.pointerId !== active.id) return;
    const { item, gh } = active;
    active = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    item.el.classList.remove('dnd-src');
    if (!gh) {
      // A tap: drop the selected item here, or select / deselect this one.
      const z = zones.find(zz => zz.el === item.el);
      if (selected && selected !== item && z && tapZone(z)) return;
      if (selected === item) { deselect(); return; }
      if (item.canPick && item.canPick() !== true) { item.onDeny?.(); return; }
      select(item);
      return;
    }
    const z = e.type === 'pointerup' ? zoneAt(e.clientX, e.clientY, item) : null;
    if (z) drop(item, z, gh); else back(item, gh);
  }

  const api = {
    // el: the thing she presses. opts: { data, ghost(), canPick(), onDeny(), onLift(), onDone(dropped) }
    draggable(el, opts) {
      const item = { el, ...opts };
      el.classList.add('dnd-item');
      el.style.touchAction = 'none';
      el.addEventListener('pointerdown', (e) => {
        if (active || e.button > 0) return;
        e.preventDefault();
        active = { id: e.pointerId, x0: e.clientX, y0: e.clientY, item, gh: null };
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      });
      return item;
    },
    zone(el, data) {
      const z = { el, data };
      zones.push(z);
      el.classList.add('dz');
      // Zones that are not also draggable still take tap-drops.
      el.addEventListener('pointerup', () => { if (!el.classList.contains('dnd-item')) tapZone(z); });
      return z;
    },
    undo() {
      deselect();
      const fn = history.pop();
      if (fn) { fn(); play('tap'); }
      onHistory(history.length);
    },
    canUndo: () => history.length > 0,
    cancel: deselect,
  };
  return api;
}
