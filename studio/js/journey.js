// The nine stations of one project journey, in fixed order.
import * as store from './store.js';

export const STATIONS = [
  { n: 1, name: 'هدفي', icon: 'st1_dream.png', accent: 'pink', task: 'لماذا تحتاجين المال؟ اختاري عمل كل ريال.' },
  { n: 2, name: 'أفكاري', icon: 'st2_ideas.png', accent: 'yellow', task: 'اكتبي ٢٠ فكرة. لا توجد فكرة خاطئة!' },
  { n: 3, name: 'أسأل زبائني', icon: 'st3_customers.png', accent: 'green', task: 'اسألي الناس: أيّ فكرة تعجبكم؟' },
  { n: 4, name: 'خُطّتي', icon: 'st4_plan.png', accent: 'pink', task: 'خطّطي لمشروعك خطوة خطوة.' },
  { n: 5, name: 'أَصنع', icon: 'st5_make.png', accent: 'yellow', task: 'اصنعي منتجك، مهمّة بعد مهمّة.' },
  { n: 6, name: 'أُخبِر الناس', icon: 'st6_market.png', accent: 'green', task: 'أخبري الناس عن منتجك.' },
  { n: 7, name: 'أَبيع', icon: 'st7_sell.png', accent: 'pink', task: 'سجّلي كل بيعة.' },
  { n: 8, name: 'حساباتي وزجاجاتي', icon: 'st8_jars.png', accent: 'yellow', task: 'احسبي ربحك، ووزّعيه على زجاجاتك.' },
  { n: 9, name: 'مشروعي القادم', icon: 'st9_next.png', accent: 'green', task: 'اختاري مشروعك القادم.' },
];

// Where each station's girl stands on the home picture (% of the map): her feet on a painted ring of home_bg.
// The picture is shown mirrored, and the path is walked from the front: the first stations stand in the front row (right
// to left), the last ones at the back, a little smaller (her request, 29 Oct 2026). scripts/studio_pics.py prints the rings.
export const SPOTS = [
  [79.7, 82.3], [50.6, 82.5], [21.1, 82.0],
  [21.5, 48.7], [50.0, 47.9], [76.3, 45.7],
  [67.8, 17.2], [43.0, 17.9], [17.9, 17.3],
];
// Upright iPad: the taller map (3:4) and home_bg_portrait, the same way.
export const SPOTS_PORTRAIT = [
  [77.6, 85.4], [49.3, 85.5], [20.8, 85.8],
  [21.5, 45.1], [49.5, 44.1], [75.7, 44.6],
  [75.4, 9.9], [49.5, 10.1], [21.5, 10.2],
];
export const ROW_SCALE = [1, 1, 1, 0.84, 0.84, 0.84, 0.68, 0.68, 0.68];   // nearer is bigger

export function isDone(n) { return store.get().current.stationsDone.includes(n); }

export function isUnlocked(n) {
  const p = store.get().current;
  if (n === 1) return true;
  if (n === 9 && p.firstSaleAt) return true; // Station 9 opens early after the first sale
  return isDone(n - 1);
}

// The station "خطوتي التالية" opens: the first unlocked one not done yet, in order.
export function currentStation() {
  for (const s of STATIONS) if (!isDone(s.n) && isUnlocked(s.n)) return s.n;
  return 9;
}

export function statusOf(n) {
  if (isDone(n)) return 'done';
  if (n === currentStation()) return 'current';
  if (isUnlocked(n)) return 'open';
  return 'locked';
}

export function studioLevel() {
  const f = store.get().projectsFinished;
  return f >= 3 ? 3 : f >= 1 ? 2 : 1;
}
