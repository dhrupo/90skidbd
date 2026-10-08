import { test, expect } from '@playwright/test';

test('footer has the photo-removal email and the tiny credit', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer).toContainText('dhrupo@gmail.com');
  await expect(footer).toContainText('made by dhrupo');
});

test('facebook preview tags point to a real 1200x630 image', async ({ page, request }) => {
  await page.goto('/');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toBe('https://90skidbd.pages.dev/og.png');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://90skidbd.pages.dev/');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /নব্বইয়ের/);
  const res = await request.get('/og.png');
  expect(res.ok()).toBe(true);
  const buf = await res.body();
  expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([1200, 630]);
});
