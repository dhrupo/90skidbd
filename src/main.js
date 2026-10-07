import { CHAPTERS, ITEMS } from './items.js';
import { bn } from './score.js';

const STORE = '90skid-ticks';
const TOTAL = ITEMS.length;
const ticked = new Set(load());

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; }
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
      <div><h2 id="h-${c.id}">${c.title}</h2><p class="aside">${c.aside}</p></div>
      <span class="chapter-count" data-count="${c.id}"></span>
    </div>
    <div class="cards">${ITEMS.filter((it) => it.chapter === c.id).map(cardHtml).join('')}</div>
  </section>`).join('');

const counter = document.querySelector('[data-testid="counter"]');
const toastEl = document.querySelector('.toast');
let toastTimer;
let halfwayShown = false;

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
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const tick = card.querySelector('.tick');
      replay(tick, 'erasing');
      setTimeout(() => tick.classList.remove('erasing'), 200);
    }
    toast('আচ্ছা, ভুল হইতেই পারে 😅');
    return;
  }
  card.querySelector('.tick').classList.remove('erasing');
  const chapter = CHAPTERS.find((c) => c.id === ITEMS.find((it) => it.id === id).chapter);
  if (chapterDone(chapter)) replay(document.getElementById(`ch-${chapter.id}`), 'stamped');
  if (ticked.size === TOTAL / 2 && !halfwayShown) {
    halfwayShown = true;
    toast('অর্ধেক শেষ! চা খাবা? ☕');
  } else if (chapterDone(chapter)) {
    toast(chapter.done);
  }
});

render();
