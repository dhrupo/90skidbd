import { test, expect } from '@playwright/test';
import { unpackChallenge } from '../../src/score.js';

const firstN = (n) => Array.from({ length: 60 }, (_, i) => i < n);

async function play(page) {
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = (url) => { window.__opened.push(url); return null; };
  });
  await page.goto('/');
  const cards = page.locator('.card');
  for (let i = 0; i < 3; i++) await cards.nth(i).click();
  await page.getByTestId('submit-bar').getByRole('button').click();
  await page.getByLabel('তোমার নাম').fill('রাফি');
  return page.getByRole('dialog');
}

const opened = (page) => page.evaluate(() => window.__opened.at(-1));

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
