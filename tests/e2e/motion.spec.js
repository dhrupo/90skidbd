import { test, expect } from '@playwright/test';
import { CHAPTERS, UNTICK } from '../../src/items.js';

const toast = (page) => page.getByRole('status');

test('unticking shows a kind little toast', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.card').first();
  await card.click();
  await card.click();
  expect(UNTICK).toContain(await toast(page).innerText());
});

test('finishing a chapter stamps full marks', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('#ch-tv .card');
  for (let i = 0; i < 10; i++) await cards.nth(i).click();
  await expect(page.locator('#ch-tv .chapter-count')).toHaveText('১০/১০');
  await expect(page.locator('#ch-tv')).toHaveClass(/done/);
  expect(CHAPTERS.find((c) => c.id === 'tv').done).toContain(await toast(page).innerText());
});

test('passing halfway offers tea', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.card');
  for (let i = 0; i < 30; i++) await cards.nth(i).click();
  await expect(toast(page)).toHaveText(/অর্ধেক শেষ/);
});

test('with reduce-motion the tick still works but does not move', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const card = page.locator('.card').first();
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  const anim = await card.locator('.tick').evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('none');
});

test('ticking animates the tick when motion is allowed', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.card').first();
  await card.click();
  const anim = await card.locator('.tick').evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).not.toBe('none');
});

test('nothing scrolls sideways on a small 360px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('with reduce-motion an unticked card loses its tick', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const card = page.locator('.card').first();
  await card.click();
  await card.click();
  await expect(card.locator('.tick')).toHaveCSS('opacity', '0');
});
