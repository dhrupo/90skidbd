export const TIERS = [
  { max: 25, range: '০–২৫%', title: '২০০০-এর পরের বাচ্চা', emoji: '🍼' },
  { max: 50, range: '২৬–৫০%', title: 'আধা নব্বই, আধা ইউটিউব', emoji: '📱' },
  { max: 80, range: '৫১–৮০%', title: 'পাক্কা নব্বইয়ের পোলাপান', emoji: '🎒' },
  { max: 100, range: '৮১%+', title: 'বিটিভির লোগো তুমি নিজেই', emoji: '📺' },
];

export const percent = (ticked, total) => Math.round((ticked / total) * 100);

export const tier = (pct) => TIERS.find((t) => pct <= t.max);

const NAME_MAX = 20;
const cutName = (name) => Array.from((name || '').trim()).slice(0, NAME_MAX).join('');

export function packChallenge(ticks, name) {
  const bytes = new Uint8Array(Math.ceil(ticks.length / 8));
  ticks.forEach((on, i) => { if (on) bytes[i >> 3] |= 128 >> (i & 7); });
  const code = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const n = cutName(name);
  return `#c=${code}` + (n ? `&n=${encodeURIComponent(n)}` : '');
}

export function unpackChallenge(hash, total = 48) {
  const params = new URLSearchParams((hash || '').replace(/^#/, ''));
  const code = params.get('c') || '';
  if (!/^[A-Za-z0-9_-]+$/.test(code) || code.length !== Math.ceil(Math.ceil(total / 8) * 4 / 3)) return null;
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
