import { CHAPTERS, ITEMS } from './items.js';
import { bn, percent, tier } from './score.js';

const W = 1080;
const H = 1350;
const PAD = 64;
const C = { paper: '#F6EBCB', ink: '#2B2118', muted: '#6A5841', blue: '#26399A', red: '#C9221A', rule: '#9FB9D155' };
const FONTS = ['800 64px "Baloo Da 2"', '400 34px Atma', '700 34px "Hind Siliguri"', '600 34px "Hind Siliguri"', '400 30px "Hind Siliguri"'];

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

const RING = new Path2D('M60 8c30 1 52 22 52 52s-23 52-53 51C29 110 8 89 9 59 10 31 31 10 64 9');

function text(ctx, str, x, y, font, color, align = 'left') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

function fitFont(ctx, str, weight, family, size, maxWidth) {
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 20 && ctx.measureText(str).width > maxWidth) ctx.font = `${weight} ${--size}px ${family}`;
  return ctx.font;
}

function tape(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(239, 227, 174, .85)';
  ctx.fillRect(-34, -10, 68, 20);
  ctx.restore();
}

export async function drawShare(ticked, name = '') {
  await Promise.all(FONTS.map((f) => document.fonts.load(f, 'নব্বইয়ের ৬৭% A+')));
  const imgs = await Promise.all(ITEMS.map((it) => photo(it.id)));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.rule;
  for (let y = 40; y < H; y += 40) ctx.fillRect(0, y, W, 1.5);
  ctx.strokeStyle = C.blue;
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, W - 56, H - 56);
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, W - 84, H - 84);

  const total = ticked.size;
  const pct = percent(total, ITEMS.length);
  const t = tier(pct);

  text(ctx, 'বার্ষিক পরীক্ষা · ২০২৬', W / 2, 104, '400 30px Atma', C.red, 'center');
  text(ctx, 'নব্বইয়ের শিশু উচ্চ বিদ্যালয়', W / 2, 172, '800 60px "Baloo Da 2"', C.ink, 'center');
  text(ctx, 'স্থাপিত ১৯৯০ · পুরানো স্মৃতির গলি, বাংলাদেশ', W / 2, 214, '400 26px "Hind Siliguri"', C.muted, 'center');
  ctx.fillStyle = C.blue;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(W / 2 - 110, 236, 220, 52, 26);
  else ctx.rect(W / 2 - 110, 236, 220, 52);
  ctx.fill();
  text(ctx, 'মার্কশিট', W / 2, 274, '700 30px "Hind Siliguri"', '#fff', 'center');

  text(ctx, 'নাম:', PAD + 10, 358, '700 30px "Hind Siliguri"', C.muted);
  ctx.setLineDash([3, 7]);
  ctx.strokeStyle = C.muted;
  ctx.beginPath();
  ctx.moveTo(PAD + 82, 366);
  ctx.lineTo(700, 366);
  ctx.stroke();
  ctx.setLineDash([]);
  if (name) text(ctx, name, PAD + 92, 354, fitFont(ctx, name, 400, 'Atma', 44, 600 - PAD), C.blue);
  text(ctx, 'রোল:', 740, 358, '700 30px "Hind Siliguri"', C.muted);
  text(ctx, bn(String(total).padStart(2, '0')), 820, 356, '400 44px Atma', C.blue);

  const tx = PAD + 10;
  const tw = W - (PAD + 10) * 2;
  let y = 400;
  ctx.fillStyle = 'rgba(38, 57, 154, .08)';
  ctx.fillRect(tx, y, tw, 50);
  text(ctx, 'বিষয়', tx + 20, y + 35, '700 26px "Hind Siliguri"', C.blue);
  text(ctx, 'নম্বর', tx + 330, y + 35, '700 26px "Hind Siliguri"', C.blue, 'center');
  text(ctx, 'গ্রেড', tx + tw - 50, y + 35, '700 26px "Hind Siliguri"', C.blue, 'center');
  y += 50;
  for (const c of CHAPTERS) {
    const items = ITEMS.filter((it) => it.chapter === c.id);
    const n = items.filter((it) => ticked.has(it.id)).length;
    ctx.fillStyle = 'rgba(43, 33, 24, .14)';
    ctx.fillRect(tx, y + 61, tw, 1.5);
    text(ctx, c.chip, tx + 20, y + 42, '600 32px "Hind Siliguri"', C.ink);
    text(ctx, `${bn(n)}/${bn(items.length)}`, tx + 330, y + 44, '400 36px Atma', C.ink, 'center');
    items.forEach((_, i) => {
      const bx = tx + 400 + i * 34;
      ctx.strokeStyle = 'rgba(43, 33, 24, .35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, y + 17, 26, 26);
      if (i < n) {
        ctx.fillStyle = '#1E7B34';
        ctx.fillRect(bx + 4, y + 21, 18, 18);
      }
    });
    const g = tier(percent(n, items.length)).grade;
    text(ctx, g, tx + tw - 50, y + 45, '400 40px Atma', g === 'F' ? C.red : '#1E7B34', 'center');
    y += 62;
  }

  y += 20;
  text(ctx, `মোট: ${bn(total)}/${bn(ITEMS.length)}  ·  গ্রেড ${t.grade}`, tx + 20, y + 40, '800 40px "Baloo Da 2"', C.ink);
  text(ctx, 'মন্তব্য:', tx + 20, y + 96, '700 28px "Hind Siliguri"', C.muted);
  text(ctx, `${t.title} ${t.emoji}`, tx + 120, y + 96, fitFont(ctx, `${t.title} ${t.emoji}`, 400, 'Atma', 38, 520), C.red);

  ctx.save();
  ctx.translate(W - PAD - 196, y - 8);
  ctx.rotate(-0.06);
  ctx.scale(1.45, 1.45);
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.stroke(RING);
  ctx.restore();
  text(ctx, `${bn(pct)}%`, W - PAD - 108, y + 98, fitFont(ctx, `${bn(pct)}%`, 800, '"Baloo Da 2"', 58, 124), C.red, 'center');

  const picks = CHAPTERS.map((c) => ITEMS.findIndex((it) => it.chapter === c.id && ticked.has(it.id))).filter((i) => i >= 0);
  const pw = 136;
  const ph = 102;
  const gap = (tw - pw * 6) / 5;
  y += 172;
  picks.forEach((i, k) => {
    const x = tx + k * (pw + gap);
    const angle = [-0.05, 0.04, -0.03, 0.05, -0.04, 0.03][k];
    ctx.save();
    ctx.translate(x + pw / 2, y + ph / 2);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(43, 33, 24, .3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FCF8EE';
    ctx.fillRect(-pw / 2 - 8, -ph / 2 - 8, pw + 16, ph + 16);
    ctx.shadowColor = 'transparent';
    if (imgs[i]) drawCover(ctx, imgs[i], -pw / 2, -ph / 2, pw, ph);
    ctx.restore();
    tape(ctx, x + pw / 2, y - 6, -angle * 2);
  });
  if (!picks.length) text(ctx, 'একটাও মনে নাই? 🫠', W / 2, y + 64, '400 36px Atma', C.muted, 'center');

  y = 1218;
  ctx.strokeStyle = C.blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tx + 30, y);
  ctx.bezierCurveTo(tx + 60, y - 50, tx + 80, y + 20, tx + 110, y - 20);
  ctx.bezierCurveTo(tx + 140, y - 60, tx + 150, y + 10, tx + 190, y - 10);
  ctx.bezierCurveTo(tx + 220, y - 30, tx + 240, y, tx + 270, y - 14);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.fillRect(tx + 10, y + 14, 290, 2);
  text(ctx, 'প্রধান শিক্ষক', tx + 155, y + 46, '600 26px "Hind Siliguri"', C.muted, 'center');

  const pass = t.grade !== 'F';
  ctx.save();
  ctx.translate(W - PAD - 120, y - 14);
  ctx.rotate(-0.22);
  ctx.strokeStyle = pass ? '#1E7B34' : C.red;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 64, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, pass ? 'পাস' : 'ফেল', 0, 20, '800 58px "Baloo Da 2"', pass ? '#1E7B34' : C.red, 'center');
  ctx.restore();

  text(ctx, `তুমি কয়টা পারো? 😏  ${location.host}`, W / 2, 1286, '400 32px Atma', C.blue, 'center');
  text(ctx, 'made by dhrupo', W - 52, H - 52, '400 18px "Hind Siliguri"', 'rgba(43, 33, 24, .4)', 'right');

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export function saveImage(blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nobboiyer-shishu.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function shareImage(blob, text) {
  const file = new File([blob], 'nobboiyer-shishu.png', { type: 'image/png' });
  if (!navigator.canShare?.({ files: [file] })) {
    saveImage(blob);
    return 'downloaded';
  }
  try {
    await navigator.share(text ? { files: [file], text } : { files: [file] });
  } catch (e) {
    if (e.name !== 'AbortError') throw e;
  }
  return 'shared';
}
