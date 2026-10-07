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
    navigator.share = async ({ files }) => {
      const buf = new Uint8Array(await files[0].arrayBuffer());
      window.__shared = { type: files[0].type, bytes: Array.from(buf.slice(0, 32)) };
    };
  });
  await page.goto('/');
  await tickAndReveal(page, 10);
  await page.getByRole('button', { name: /পোস্ট মারো/ }).click();
  await expect.poll(() => page.evaluate(() => window.__shared?.type)).toBe('image/png');
  const head = Buffer.from(await page.evaluate(() => window.__shared.bytes));
  expect(pngSize(head)).toEqual({ w: 1080, h: 1350 });
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
  const preview = page.getByRole('img', { name: /শেয়ার ছবি/ });
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((img) => img.naturalWidth)).toBe(1080);
});

test('older phones without canvas roundRect still get a share image', async ({ page }) => {
  await page.addInitScript(() => { delete CanvasRenderingContext2D.prototype.roundRect; });
  await page.goto('/');
  await tickAndReveal(page, 3);
  const preview = page.getByRole('img', { name: /শেয়ার ছবি/ });
  await expect.poll(() => preview.evaluate((img) => img.naturalWidth)).toBe(1080);
});
