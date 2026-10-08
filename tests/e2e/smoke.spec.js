import { test, expect } from '@playwright/test';

test('page loads with the brand title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/নব্বইয়ের শিশু/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('the page does not jump around while it loads on a slow network', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit has no layout-shift performance API');
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.route('**/src/main.js', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/');
  await expect(page.locator('.card')).toHaveCount(60);
  expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.1);
});
