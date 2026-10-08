import { CHAPTERS, ITEMS, REMARKS, UNTICK, WARNINGS } from './items.js';
import { bn, compare, packChallenge, percent, tier, TIERS, unpackChallenge } from './score.js';
import { drawShare, shareImage } from './share.js';

const STORE = '90skid-ticks';
const TOTAL = ITEMS.length;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const ticked = new Set(load());
const CHALLENGE = '90skid-challenge';
const challenger = unpackChallenge(location.hash, TOTAL) || unpackChallenge(sessionGet(CHALLENGE), TOTAL);
if (challenger && location.hash.startsWith('#c=')) sessionSet(CHALLENGE, location.hash);
const theirName = challenger?.name || 'তোমার বন্ধু';

function sessionGet(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function sessionSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch { /* storage blocked: challenge just won't survive a reload */ }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    return Array.isArray(saved) ? ITEMS.map((it) => it.id).filter((id) => saved.includes(id)) : [];
  } catch { return []; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify([...ticked])); } catch { /* private mode: ticks just won't persist */ }
}

const TICK_SVG = '<svg class="tick" viewBox="0 0 64 48" aria-hidden="true"><path d="M5 26c6 4 11 9 16 17C30 25 43 11 59 4" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function cardHtml(item) {
  return `<button type="button" class="card" data-id="${item.id}" aria-pressed="${ticked.has(item.id)}">
    <span class="photo"><img src="photos/${item.id}.webp" alt="" width="400" height="300" loading="lazy" decoding="async">${TICK_SVG}</span>
    <span class="caption">${item.caption}</span>
    <span class="remembered" aria-hidden="true">✔ মনে আছে</span>
  </button>`;
}

document.getElementById('chips').innerHTML = CHAPTERS.map((c) =>
  `<li><a href="#ch-${c.id}" data-chip="${c.id}">${c.chip} <small></small></a></li>`).join('');

document.getElementById('chapters').innerHTML = CHAPTERS.map((c, i) => `
  <section class="chapter" id="ch-${c.id}" aria-labelledby="h-${c.id}">
    <p class="chapter-kicker">অধ্যায় ${bn(i + 1)}</p>
    <div class="chapter-head">
      <div><h2 id="h-${c.id}">${c.title}</h2><p class="aside">${pick(c.asides)}</p></div>
      <span class="chapter-count" data-count="${c.id}"></span>
    </div>
    <div class="cards">${ITEMS.filter((it) => it.chapter === c.id).map(cardHtml).join('')}</div>
  </section>`).join('');

const counter = document.querySelector('[data-testid="counter"]');
const toastEl = document.querySelector('.toast');
let toastTimer;
let halfwayShown = false;
const spoken = new Set();
const MILESTONES = [3, 6, 8];

function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function replay(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const result = document.getElementById('result');
const scoreEl = result.querySelector('[data-testid="score"]');
const bar = document.querySelector('[data-testid="submit-bar"]');
const submitBtn = document.getElementById('submit-btn');
let closedOnce = false;

function remark(pct, missed) {
  if (pct === 0) return 'আগে উপরে কিছু টিক দাও, তারপর রেজাল্ট 😑';
  const band = pct === 100 ? 'full' : pct > 80 ? 'great' : pct > 50 ? 'good' : pct > 25 ? 'half' : 'low';
  return pick(REMARKS[band]).replaceAll('{n}', bn(missed)).replaceAll('{total}', bn(TOTAL)) + ' — ক্লাস টিচার';
}

function countUp() {
  const target = () => percent(ticked.size, TOTAL);
  if (reduceMotion()) { scoreEl.textContent = bn(target()) + '%'; return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 900);
    scoreEl.textContent = bn(Math.round(target() * (1 - (1 - t) ** 3))) + '%';
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

if (challenger) {
  const banner = document.querySelector('[data-testid="challenge-banner"]');
  banner.textContent = `${theirName} তোমাকে চ্যালেঞ্জ করছে 🥊 আগে নিজে খেলো, শেষে দেখবা কে জিতল।`;
  banner.hidden = false;
}

function renderVersus(pct) {
  const box = document.querySelector('[data-testid="versus"]');
  if (!challenger || ticked.size === 0) { box.hidden = true; return; }
  const mine = ITEMS.map((it) => ticked.has(it.id));
  const { both, onlyThem } = compare(mine, challenger.ticks);
  const theirs = percent(challenger.ticks.filter(Boolean).length, TOTAL);
  const face = pct > theirs ? '😎' : pct < theirs ? '😤' : '🤝';
  const lines = [
    `তুমি ${bn(pct)}%, ${theirName} ${bn(theirs)}% ${face}`,
    `দুজনেরই মনে আছে ${bn(both.length)}টা`,
  ];
  if (onlyThem.length) {
    const missed = onlyThem.slice(0, 3).map((i) => ITEMS[i].caption).join(', ');
    lines.push(`${theirName} মনে রাখছে কিন্তু তুমি ভুলে গেছ: ${missed}${onlyThem.length > 3 ? '…' : ''}`);
  }
  box.replaceChildren(...lines.map((text, i) => {
    const el = document.createElement(i === 0 ? 'strong' : 'p');
    el.textContent = text;
    return el;
  }));
  box.hidden = false;
}

function renderResult() {
  const pct = percent(ticked.size, TOTAL);
  const t = tier(pct);
  result.querySelector('.result-count').textContent = `${bn(TOTAL)}টার মধ্যে ${bn(ticked.size)}টা চিনছো`;
  result.querySelector('.rank').textContent = `${t.title} ${t.emoji}`;
  result.querySelector('.remark').textContent = remark(pct, TOTAL - ticked.size);
  document.getElementById('scheme').innerHTML = TIERS.map((x) =>
    `<tr${x === t ? ' class="you"' : ''}><td>${x.range}</td><td>${x.title} ${x.emoji}${x === t ? '<span class="you-mark">← তুমি</span>' : ''}</td></tr>`).join('');
  renderVersus(pct);
}

function possessive(name) {
  if (/^[\u0980-\u09FF]/.test(name)) return name + (/[\u0985-\u0994\u09BE-\u09CC]$/.test(name) ? 'র' : 'ের');
  return name + '-এর';
}

function renderBar() {
  bar.hidden = ticked.size === 0;
  bar.querySelector('.submit-count').textContent = bn(`${ticked.size}/${TOTAL}`);
  if (closedOnce) submitBtn.textContent = 'আবার দেখি 🔁';
  else if (challenger) submitBtn.textContent = `${challenger.name ? possessive(challenger.name) : 'বন্ধুর'} সাথে মিলাও 🥊`;
  else submitBtn.textContent = 'রেজাল্ট দেখাও 📝';
}

const preview = document.querySelector('.share-preview');
const senderEl = document.getElementById('sender');
let nameTimer;
senderEl.addEventListener('input', () => {
  clearTimeout(nameTimer);
  nameTimer = setTimeout(updatePreview, 250);
});
const shareBtn = document.getElementById('share-btn');
let shareBlob = null;
let drawing = 0;

async function updatePreview() {
  const mine = ++drawing;
  shareBlob = null;
  shareBtn.disabled = true;
  const blob = await drawShare(new Set(ticked), senderEl.value);
  if (mine !== drawing) return;
  shareBlob = blob;
  shareBtn.disabled = false;
  const old = preview.src;
  preview.src = URL.createObjectURL(blob);
  preview.hidden = false;
  if (old) URL.revokeObjectURL(old);
}

shareBtn.addEventListener('click', async () => {
  if (!shareBlob) return;
  try {
    const how = await shareImage(shareBlob);
    if (how === 'downloaded') toast('ছবি সেভ হইছে। না হলে উপরের ছবিটা চেপে ধরে সেভ করো 👆');
  } catch {
    toast('শেয়ার হইল না 😕 আবার চাপো তো');
  }
});

const challengeBtn = document.getElementById('challenge-btn');
document.getElementById('challenge').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = senderEl.value;
  const url = location.origin + location.pathname + packChallenge(ITEMS.map((it) => ticked.has(it.id)), name);
  const text = `আমি ${bn(percent(ticked.size, TOTAL))}% পাইছি 😎 দেখি তুমি কয়টা পারো?`;
  try {
    if (navigator.share) await navigator.share({ url, text });
    else await navigator.clipboard.writeText(`${text} ${url}`);
  } catch (err) {
    if (err.name === 'AbortError') return;
    toast('লিংক কপি হইল না 😕 আবার চাপো তো');
    return;
  }
  challengeBtn.classList.add('copied');
  challengeBtn.textContent = 'লিংক রেডি ✓';
  toast('এবার বন্ধুর ইনবক্সে ছুঁড়ে মারো 😈');
  setTimeout(() => {
    challengeBtn.classList.remove('copied');
    challengeBtn.innerHTML = 'দেখি ও কয়টা পারে <span aria-hidden="true">🥊</span>';
  }, 2500);
});

submitBtn.addEventListener('click', () => {
  renderResult();
  result.showModal();
  result.append(toastEl);
  replay(result, 'reveal');
  countUp();
  updatePreview();
});

result.addEventListener('cancel', (e) => e.preventDefault());
result.addEventListener('close', () => {
  document.body.append(toastEl);
  closedOnce = true;
  renderBar();
});
document.getElementById('close-btn').addEventListener('click', () => result.close());

const chapterDone = (c) => ITEMS.every((it) => it.chapter !== c.id || ticked.has(it.id));

function render() {
  counter.textContent = bn(`${ticked.size}/${TOTAL}`);
  document.querySelector('.meter').style.setProperty('--p', (ticked.size / TOTAL) * 100);
  for (const c of CHAPTERS) {
    const items = ITEMS.filter((it) => it.chapter === c.id);
    const n = items.filter((it) => ticked.has(it.id)).length;
    const label = bn(`${n}/${items.length}`);
    document.querySelector(`[data-count="${c.id}"]`).textContent = label;
    document.querySelector(`[data-chip="${c.id}"] small`).textContent = label;
    const done = n === items.length;
    document.getElementById(`ch-${c.id}`).classList.toggle('done', done);
    document.querySelector(`[data-chip="${c.id}"]`).classList.toggle('done', done);
  }
  renderBar();
}

document.getElementById('chapters').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const id = card.dataset.id;
  const on = !ticked.has(id);
  if (on) ticked.add(id); else ticked.delete(id);
  card.setAttribute('aria-pressed', on);
  save();
  render();
  replay(counter, 'bump');
  replay(document.querySelector('.meter-bar'), 'glow');

  if (!on) {
    if (!reduceMotion()) {
      const tick = card.querySelector('.tick');
      replay(tick, 'erasing');
      setTimeout(() => tick.classList.remove('erasing'), 200);
    }
    toast(pick(UNTICK));
    return;
  }
  card.querySelector('.tick').classList.remove('erasing');
  const chapter = CHAPTERS.find((c) => c.id === ITEMS.find((it) => it.id === id).chapter);
  if (chapterDone(chapter)) replay(document.getElementById(`ch-${chapter.id}`), 'stamped');
  const inChapter = ITEMS.filter((it) => it.chapter === chapter.id && ticked.has(it.id)).length;
  if (ticked.size === TOTAL / 2 && !halfwayShown) {
    halfwayShown = true;
    toast('অর্ধেক শেষ! চা খাবা? ☕');
  } else if (chapterDone(chapter) && !spoken.has(`${chapter.id}:done`)) {
    spoken.add(`${chapter.id}:done`);
    toast(pick(chapter.done));
  } else if (MILESTONES.includes(inChapter) && !spoken.has(`${chapter.id}:${inChapter}`)) {
    spoken.add(`${chapter.id}:${inChapter}`);
    const fresh = chapter.cheers.filter((line) => !spoken.has(line));
    const line = pick(fresh.length ? fresh : chapter.cheers);
    spoken.add(line);
    toast(line);
  }
});

render();
document.querySelector('.footer').hidden = false;
document.querySelector('.margin-note').textContent = '↳ ' + pick(WARNINGS);
