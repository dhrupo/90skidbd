import { test, expect } from '@playwright/test';

const jpegSize = (buf) => {
  for (let i = 2; i < buf.length; ) {
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc2) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
};

async function uploadBlank(page, width = 1200, height = 630) {
  await page.goto('/');
  return page.evaluate(async ([w, h]) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').fillRect(0, 0, w, h);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
    const res = await fetch('/api/card', { method: 'POST', body: blob, headers: { 'content-type': 'image/jpeg' } });
    return { status: res.status, body: res.status === 201 ? await res.json() : null };
  }, [width, height]);
}

test('an uploaded card is served back and becomes the link preview', async ({ page, request }) => {
  const { status, body } = await uploadBlank(page);
  expect(status).toBe(201);
  const card = await request.get(`/c/${body.id}.jpg`);
  expect(card.headers()['content-type']).toBe('image/jpeg');
  expect(jpegSize(await card.body())).toEqual({ w: 1200, h: 630 });

  const html = await (await request.get(`/?s=${body.id}`)).text();
  expect(html).toContain(`<meta property="og:image" content="http://localhost:4173/c/${body.id}.jpg">`);
  expect(html).toContain(`<meta name="twitter:image" content="http://localhost:4173/c/${body.id}.jpg">`);
  expect(html).toContain(`<meta property="og:url" content="http://localhost:4173/?s=${body.id}">`);
});

test('an unknown or broken card id keeps the general preview', async ({ request }) => {
  for (const s of ['AAAAAAAAAA', '../../etc', '<script>']) {
    const html = await (await request.get(`/?s=${encodeURIComponent(s)}`)).text();
    expect(html).toContain('og.png');
    expect(html).not.toContain('/c/');
  }
});

test('a picture that is not a 1200x630 card is refused', async ({ page }) => {
  expect((await uploadBlank(page, 1080, 1350)).status).toBe(400);
});
