import { test, expect, chromium } from '@playwright/test';

const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';

test('the visitor counter never loads during local testing', async ({ page }) => {
  const hits = [];
  page.on('request', (r) => { if (r.url().startsWith(BEACON)) hits.push(r.url()); });
  await page.goto('/');
  await expect(page.locator('#chapters .card')).toHaveCount(60);
  expect(hits).toEqual([]);
});

test('on the real site the Cloudflare visitor counter loads with our token', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'host mapping uses a Chromium flag');
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP 90skidbd.test 127.0.0.1'] });
  const page = await browser.newPage();
  const hits = [];
  await page.route(`${BEACON}*`, (route) => { hits.push(route.request().url()); route.fulfill({ contentType: 'text/javascript', body: '' }); });
  await page.goto('http://90skidbd.test:4173/');
  await expect.poll(() => hits.length).toBe(1);
  const token = await page.locator(`script[src="${BEACON}"]`).getAttribute('data-cf-beacon');
  expect(JSON.parse(token)).toEqual({ token: '43e6db2d26cb4261811500ea1ec53112' });
  await browser.close();
});
