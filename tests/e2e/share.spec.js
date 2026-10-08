import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

async function tickAndReveal(page, n) {
  const cards = page.locator('.card');
  for (let i = 0; i < n; i++) await cards.nth(i).click();
  await page.getByTestId('submit-bar').getByRole('button').click();
}

test('share sheet receives a 1080x1350 PNG of the result', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.canShare = () => true;
    navigator.share = async ({ files, text }) => {
      const buf = new Uint8Array(await files[0].arrayBuffer());
      window.__shared = { type: files[0].type, bytes: Array.from(buf.slice(0, 32)), text };
    };
  });
  await page.goto('/');
  await tickAndReveal(page, 10);
  await page.getByRole('button', { name: /পোস্ট মারো/ }).click();
  await expect.poll(() => page.evaluate(() => window.__shared?.type)).toBe('image/png');
  const head = Buffer.from(await page.evaluate(() => window.__shared.bytes));
  expect(pngSize(head)).toEqual({ w: 1080, h: 1350 });
  expect(await page.evaluate(() => window.__shared.text)).toContain('localhost:4173');
});

test('without a share sheet the PNG downloads instead', async ({ page }) => {
  await page.addInitScript(() => { delete Navigator.prototype.share; delete Navigator.prototype.canShare; });
  await page.goto('/');
  await tickAndReveal(page, 5);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /পোস্ট মারো/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  await expect(page.getByRole('status')).toContainText('চেপে ধরে');
  expect(pngSize(fs.readFileSync(await download.path()))).toEqual({ w: 1080, h: 1350 });
});

test('the result shows a preview of the share image', async ({ page }) => {
  await page.goto('/');
  await tickAndReveal(page, 3);
  const preview = page.getByRole('img', { name: /মার্কশিট/ });
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((img) => img.naturalWidth)).toBe(1080);
});

test('older phones without canvas roundRect still get a share image', async ({ page }) => {
  await page.addInitScript(() => { delete CanvasRenderingContext2D.prototype.roundRect; });
  await page.goto('/');
  await tickAndReveal(page, 3);
  const preview = page.getByRole('img', { name: /মার্কশিট/ });
  await expect.poll(() => preview.evaluate((img) => img.naturalWidth)).toBe(1080);
});

test('the marksheet preview sits under the name box and redraws as you type', async ({ page }) => {
  await page.goto('/');
  await tickAndReveal(page, 7);
  const dialog = page.getByRole('dialog');
  const name = dialog.getByLabel('তোমার নাম');
  const preview = dialog.getByRole('img', { name: /মার্কশিট/ });
  await expect.poll(() => preview.evaluate((img) => img.naturalWidth)).toBe(1080);
  const nameBox = await name.boundingBox();
  const previewBox = await preview.boundingBox();
  expect(nameBox.y).toBeLessThan(previewBox.y);
  const before = await preview.getAttribute('src');
  await name.fill('রাফি');
  await expect.poll(() => preview.getAttribute('src')).not.toBe(before);
  await expect.poll(() => preview.evaluate((img) => img.naturalWidth)).toBe(1080);
});

test('the post button waits until the marksheet is ready, then shares at once', async ({ page }) => {
  await page.route('**/photos/*.webp', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.addInitScript(() => {
    navigator.canShare = () => true;
    navigator.share = async ({ files }) => { window.__sharedAt = performance.now(); window.__file = files[0].type; };
  });
  await page.goto('/');
  await page.locator('.card').first().click();
  await page.getByTestId('submit-bar').getByRole('button').click();
  const post = page.getByRole('button', { name: /পোস্ট মারো/ });
  await expect(post).toBeDisabled();
  await expect(post).toBeEnabled({ timeout: 15000 });
  const clickedAt = await page.evaluate(() => performance.now());
  await post.click();
  await expect.poll(() => page.evaluate(() => window.__file)).toBe('image/png');
  expect(await page.evaluate(() => window.__sharedAt) - clickedAt).toBeLessThan(500);
});
