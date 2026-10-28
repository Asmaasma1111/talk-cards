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

// Where each station sits on the home picture (% of width, % of height).
// Right-to-left zig-zag. Nudge these when home_bg.png arrives so they sit on its painted spots.
export const SPOTS = [
  [84, 20], [50, 22], [16, 20],
  [16, 50], [50, 52], [84, 50],
  [84, 80], [50, 82], [16, 80],
];
// Upright iPad: a taller map (3:4). Used with home_bg_portrait.png if it exists.
export const SPOTS_PORTRAIT = [
  [80, 14], [50, 17], [20, 14],
  [20, 48], [50, 51], [80, 48],
  [80, 82], [50, 85], [20, 82],
];

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
