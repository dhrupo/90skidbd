export const TIERS = [
  { min: 80, grade: 'A+', range: '৮০–১০০%', title: 'বিটিভির লোগো তুমি নিজেই', emoji: '📺' },
  { min: 70, grade: 'A', range: '৭০–৭৯%', title: 'পাক্কা নব্বইয়ের পোলাপান', emoji: '🎒' },
  { min: 60, grade: 'A-', range: '৬০–৬৯%', title: 'নব্বইয়ের ভালো ছাত্র', emoji: '📚' },
  { min: 50, grade: 'B', range: '৫০–৫৯%', title: 'হাফ-টিফিন নব্বই', emoji: '🍬' },
  { min: 40, grade: 'C', range: '৪০–৪৯%', title: 'আধা নব্বই, আধা ইউটিউব', emoji: '📱' },
  { min: 33, grade: 'D', range: '৩৩–৩৯%', title: 'টেনেটুনে পাস', emoji: '😅' },
  { min: 0, grade: 'F', range: '০–৩২%', title: '২০০০-এর পরের বাচ্চা', emoji: '🍼' },
];

export const percent = (ticked, total) => Math.round((ticked / total) * 100);

export const tier = (pct) => TIERS.find((t) => pct >= t.min);

const NAME_MAX = 20;
const LAUNCH_ITEMS = 60;
const codeLength = (items) => Math.ceil(Math.ceil(items / 8) * 4 / 3);
const cutName = (name) => Array.from((name || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim()).slice(0, NAME_MAX).join('');

export function packChallenge(ticks, name) {
  const bytes = new Uint8Array(Math.ceil(ticks.length / 8));
  ticks.forEach((on, i) => { if (on) bytes[i >> 3] |= 128 >> (i & 7); });
  const code = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const n = cutName(name);
  return `#c=${code}` + (n ? `&n=${encodeURIComponent(n)}` : '');
}

export function unpackChallenge(hash, total = LAUNCH_ITEMS) {
  const params = new URLSearchParams((hash || '').replace(/^#/, ''));
  const code = params.get('c') || '';
  if (!/^[A-Za-z0-9_-]+$/.test(code) || code.length % 4 === 1) return null;
  if (code.length < codeLength(LAUNCH_ITEMS) || code.length > codeLength(total)) return null;
  const raw = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  const ticks = Array.from({ length: total }, (_, i) => (raw.charCodeAt(i >> 3) & (128 >> (i & 7))) !== 0);
  return { ticks, name: cutName(params.get('n')) };
}

export function compare(me, them) {
  const out = { both: [], onlyThem: [] };
  me.forEach((mine, i) => {
    if (mine && them[i]) out.both.push(i);
    else if (!mine && them[i]) out.onlyThem.push(i);
  });
  return out;
}

export const bn = (v) => String(v).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
