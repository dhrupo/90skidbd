import { test, expect } from '@playwright/test';
import { unpackChallenge } from '../../src/score.js';

const firstN = (n) => Array.from({ length: 60 }, (_, i) => i < n);

async function play(page) {
  await page.addInitScript(() => {
    delete Navigator.prototype.share;
    delete Navigator.prototype.canShare;
    window.__opened = [];
    window.open = (url) => {
      if (url && url !== 'about:blank') window.__opened.push(url);
      return { opener: null, location: { set href(v) { window.__opened.push(v); } } };
    };
  });
  await page.goto('/');
  const cards = page.locator('.card');
  for (let i = 0; i < 3; i++) await cards.nth(i).click();
  await page.getByTestId('submit-bar').getByRole('button').click();
  await page.getByLabel('তোমার নাম').fill('রাফি');
  return page.getByRole('dialog');
}

const opened = async (page) => {
  await expect.poll(() => page.evaluate(() => window.__opened.length)).toBeGreaterThan(0);
  return page.evaluate(() => window.__opened.at(-1));
};

test('the challenge section is gone', async ({ page }) => {
  const dialog = await play(page);
  await expect(dialog.getByText('বন্ধুকে একটু খোঁচা দাও')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /দেখি ও কয়টা পারে/ })).toHaveCount(0);
});

test('Facebook opens its share page with my challenge link', async ({ page }) => {
  const dialog = await play(page);
  await dialog.getByRole('button', { name: 'ফেসবুকে শেয়ার' }).click();
  const url = new URL(await opened(page));
  expect(url.origin + url.pathname).toBe('https://www.facebook.com/sharer/sharer.php');
  expect(unpackChallenge(new URL(url.searchParams.get('u')).hash)).toEqual({ ticks: firstN(3), name: 'রাফি' });
});

test('X opens a post with my score and challenge link', async ({ page }) => {
  const dialog = await play(page);
  await dialog.getByRole('button', { name: 'X-এ শেয়ার' }).click();
  const url = new URL(await opened(page));
  expect(url.origin + url.pathname).toBe('https://x.com/intent/tweet');
  expect(url.searchParams.get('text')).toContain('৫%');
  expect(unpackChallenge(new URL(url.searchParams.get('url')).hash)?.name).toBe('রাফি');
});

test('WhatsApp opens a message with my score and challenge link', async ({ page }) => {
  const dialog = await play(page);
  await dialog.getByRole('button', { name: 'হোয়াটসঅ্যাপে শেয়ার' }).click();
  const url = new URL(await opened(page));
  expect(url.origin + url.pathname).toBe('https://wa.me/');
  const text = url.searchParams.get('text');
  expect(text).toContain('৫%');
  expect(unpackChallenge(new URL(text.match(/https?:\/\/\S+/)[0]).hash)?.name).toBe('রাফি');
});

test('every share icon has a visible label', async ({ page }) => {
  const dialog = await play(page);
  for (const label of ['ফেসবুক', 'ইনস্টা', 'X', 'হোয়াটসঅ্যাপ', 'আরও', 'সেভ']) {
    await expect(dialog.locator('.socials').getByText(label, { exact: true })).toBeVisible();
  }
});

test('X shares a link whose preview is my own score card', async ({ page, request }) => {
  const dialog = await play(page);
  await dialog.getByRole('button', { name: 'X-এ শেয়ার' }).click();
  const shared = new URL(new URL(await opened(page)).searchParams.get('url'));
  const id = shared.searchParams.get('s');
  expect(id).toMatch(/^[A-Za-z0-9]{10}$/);
  expect(unpackChallenge(shared.hash)).toEqual({ ticks: firstN(3), name: 'রাফি' });
  const card = await request.get(`/c/${id}.jpg`);
  expect(card.status()).toBe(200);
  expect(card.headers()['content-type']).toBe('image/jpeg');
});

test('sharing the same result to several apps uploads the card only once', async ({ page }) => {
  let uploads = 0;
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/card')) uploads++; });
  const dialog = await play(page);
  await dialog.getByRole('button', { name: 'ফেসবুকে শেয়ার' }).click();
  await opened(page);
  await dialog.getByRole('button', { name: 'হোয়াটসঅ্যাপে শেয়ার' }).click();
  await expect.poll(() => page.evaluate(() => window.__opened.length)).toBe(2);
  const [fb, wa] = await page.evaluate(() => window.__opened);
  const fbId = new URL(new URL(fb).searchParams.get('u')).searchParams.get('s');
  expect(new URL(wa).searchParams.get('text')).toContain(`?s=${fbId}`);
  expect(uploads).toBe(1);
});

test('changing the name uploads a new card', async ({ page }) => {
  let uploads = 0;
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/card')) uploads++; });
  const dialog = await play(page);
  await dialog.getByRole('button', { name: 'X-এ শেয়ার' }).click();
  await opened(page);
  await dialog.getByLabel('তোমার নাম').fill('সুমি');
  await dialog.getByRole('button', { name: 'X-এ শেয়ার' }).click();
  await expect.poll(() => page.evaluate(() => window.__opened.length)).toBe(2);
  expect(uploads).toBe(2);
});

for (const [why, handler] of [
  ['fails', (route) => route.abort()],
  ['is too slow', async (route) => { await new Promise((r) => setTimeout(r, 6000)); await route.continue(); }],
]) {
  test(`if the upload ${why}, sharing still works with the plain link`, async ({ page }) => {
    test.setTimeout(30000);
    await page.route('**/api/card', handler);
    const dialog = await play(page);
    await dialog.getByRole('button', { name: 'X-এ শেয়ার' }).click();
    const shared = new URL(new URL(await opened(page)).searchParams.get('url'));
    expect(shared.searchParams.has('s')).toBe(false);
    expect(unpackChallenge(shared.hash)?.name).toBe('রাফি');
  });
}

test('the privacy note about the 7-day picture is shown under the icons', async ({ page }) => {
  const dialog = await play(page);
  await expect(dialog.locator('.privacy-note')).toContainText('৭ দিন');
});

async function playWithShareSheet(page) {
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = (url) => { if (url !== 'about:blank') window.__opened.push(url); return null; };
    navigator.canShare = () => true;
    navigator.share = async ({ files, text }) => { window.__shared = { type: files?.[0]?.type, text }; };
  });
  await page.goto('/');
  const cards = page.locator('.card');
  for (let i = 0; i < 3; i++) await cards.nth(i).click();
  await page.getByTestId('submit-bar').getByRole('button').click();
  await page.getByLabel('তোমার নাম').fill('রাফি');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'ছবি সেভ করো' })).toBeEnabled({ timeout: 15000 });
  return dialog;
}

for (const [app, label] of [['X', 'X-এ শেয়ার'], ['WhatsApp', 'হোয়াটসঅ্যাপে শেয়ার']]) {
  test(`on a phone, ${app} shares the marksheet picture with my challenge link`, async ({ page }) => {
    const dialog = await playWithShareSheet(page);
    await dialog.getByRole('button', { name: label }).click();
    await expect.poll(() => page.evaluate(() => window.__shared?.type)).toBe('image/png');
    const text = await page.evaluate(() => window.__shared.text);
    expect(text).toContain('৫%');
    expect(unpackChallenge(new URL(text.match(/https?:\/\/\S+/)[0]).hash)?.name).toBe('রাফি');
    expect(await page.evaluate(() => window.__opened)).toEqual([]);
  });
}

test('on a phone, Facebook still opens its own share page with the link', async ({ page }) => {
  const dialog = await playWithShareSheet(page);
  await dialog.getByRole('button', { name: 'ফেসবুকে শেয়ার' }).click();
  await expect.poll(() => page.evaluate(() => window.__opened.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__opened.at(-1))).toContain('facebook.com/sharer');
  expect(await page.evaluate(() => window.__shared)).toBeUndefined();
});

test.describe('on a computer', () => {
  test.use({ isMobile: false, hasTouch: false, viewport: { width: 1280, height: 800 } });
  test('X keeps opening the X post page with a link', async ({ page }) => {
    const dialog = await playWithShareSheet(page);
    await dialog.getByRole('button', { name: 'X-এ শেয়ার' }).click();
    await expect.poll(() => page.evaluate(() => window.__opened.length)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__opened.at(-1))).toContain('x.com/intent/tweet');
    expect(await page.evaluate(() => window.__shared)).toBeUndefined();
  });
});
