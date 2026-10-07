import { CHAPTERS, ITEMS } from './items.js';
import { bn, percent, tier } from './score.js';

const W = 1080;
const H = 1350;
const PAD = 64;
const C = { paper: '#F6EBCB', ink: '#2B2118', muted: '#6A5841', blue: '#26399A', red: '#C9221A', rule: '#9FB9D155' };
const FONTS = ['800 64px "Baloo Da 2"', '400 34px Atma', '700 34px "Hind Siliguri"', '400 30px "Hind Siliguri"'];

const photos = new Map();
function photo(id) {
  if (!photos.has(id)) {
    const img = new Image();
    img.src = `photos/${id}.webp`;
    photos.set(id, img.decode().then(() => img, () => null));
  }
  return photos.get(id);
}

function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

export async function drawShare(ticked) {
  await Promise.all(FONTS.map((f) => document.fonts.load(f, 'নব্বইয়ের ৬৭%')));
  const imgs = await Promise.all(ITEMS.map((it) => photo(it.id)));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.rule;
  for (let y = 48; y < H; y += 48) ctx.fillRect(0, y, W, 2);

  const pct = percent(ticked.size, ITEMS.length);
  const t = tier(pct);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.ink;
  ctx.font = FONTS[0];
  ctx.fillText('নব্বইয়ের শিশু', PAD, 140);
  ctx.fillStyle = C.muted;
  ctx.font = FONTS[3];
  ctx.fillText(`${t.title} ${t.emoji}  ·  ${bn(ticked.size)}/${bn(ITEMS.length)}`, PAD, 196);

  const pill = { w: 230, h: 112, x: W - PAD - 230, y: 76 };
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(pill.x, pill.y, pill.w, pill.h, 56);
  ctx.stroke();
  ctx.fillStyle = C.red;
  ctx.font = '800 68px "Baloo Da 2"';
  ctx.textAlign = 'center';
  ctx.fillText(`${bn(pct)}%`, pill.x + pill.w / 2, pill.y + 82);
  ctx.textAlign = 'left';

  const cols = 8;
  const gap = 12;
  const top = 248;
  const tw = (W - PAD * 2 - gap * (cols - 1)) / cols;
  const th = (1170 - top - gap * (CHAPTERS.length - 1)) / CHAPTERS.length;
  ITEMS.forEach((it, i) => {
    const x = PAD + (i % cols) * (tw + gap);
    const y = top + Math.floor(i / cols) * (th + gap);
    ctx.fillStyle = '#E8D6A6';
    ctx.fillRect(x, y, tw, th);
    if (imgs[i]) drawCover(ctx, imgs[i], x, y, tw, th);
    if (!ticked.has(it.id)) {
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = '#808080';
      ctx.fillRect(x, y, tw, th);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(246, 235, 203, .55)';
      ctx.fillRect(x, y, tw, th);
    }
  });

  ctx.fillStyle = C.blue;
  ctx.font = FONTS[1];
  ctx.fillText('তুমি কয়টা পারো? 😏', PAD, 1250);
  ctx.fillStyle = C.ink;
  ctx.font = FONTS[2];
  ctx.textAlign = 'right';
  ctx.fillText('90skidbd.com', W - PAD, 1250);
  ctx.fillStyle = 'rgba(43, 33, 24, .35)';
  ctx.font = '400 20px "Hind Siliguri"';
  ctx.fillText('made by dhrupo', W - PAD, 1310);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export async function shareImage(blob) {
  const file = new File([blob], 'nobboiyer-shishu.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: 'আমি কতটা নব্বইয়ের, দেখো 😎 তুমি কয়টা পারো? 90skidbd.com' });
    } catch (e) {
      if (e.name !== 'AbortError') throw e;
    }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
