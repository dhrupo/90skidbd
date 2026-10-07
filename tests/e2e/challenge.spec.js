import { test, expect } from '@playwright/test';
import { packChallenge, unpackChallenge } from '../../src/score.js';

const firstN = (n) => Array.from({ length: 48 }, (_, i) => i < n);

test('sender gets a challenge link carrying their ticks and name', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.share = async ({ url }) => { window.__url = url; };
  });
  await page.goto('/');
  const cards = page.locator('.card');
  for (let i = 0; i < 3; i++) await cards.nth(i).click();
  await page.getByLabel('তোমার নাম').fill('রাফি');
  await page.getByRole('button', { name: /দেখি ও কয়টা পারে/ }).click();
  await expect.poll(() => page.evaluate(() => window.__url)).toContain('#c=');
  const shared = new URL(await page.evaluate(() => window.__url));
  expect(unpackChallenge(shared.hash)).toEqual({ ticks: firstN(3), name: 'রাফি' });
});

test('receiver plays, then sees how they compare with the sender', async ({ page }) => {
  await page.goto('/' + packChallenge(firstN(36), 'রাফি'));
  await expect(page.getByTestId('challenge-banner')).toContainText('রাফি তোমাকে চ্যালেঞ্জ');
  const cards = page.locator('.card');
  for (let i = 0; i < 30; i++) await cards.nth(i).click();
  const vs = page.getByTestId('versus');
  await vs.scrollIntoViewIfNeeded();
  await expect(vs).toContainText('তুমি ৬৩%');
  await expect(vs).toContainText('রাফি ৭৫%');
  await expect(vs).toContainText('দুজনেরই মনে আছে ৩০টা');
  await expect(vs).toContainText('লুডুতে ঝগড়া');
});

test('a booby-trapped name is shown as plain text and never runs', async ({ page }) => {
  const evil = '<img src=x onerror="window.__pwned=1">';
  await page.goto('/' + packChallenge(firstN(5), evil));
  const banner = page.getByTestId('challenge-banner');
  await expect(banner).toContainText('<img src=x');
  await expect(banner.locator('img')).toHaveCount(0);
  await page.locator('.card').first().click();
  await page.locator('#result').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('versus').locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test('a broken challenge link just starts a normal game', async ({ page }) => {
  await page.goto('/#c=!!!!&n=x');
  await expect(page.getByTestId('challenge-banner')).toBeHidden();
  await page.locator('.card').first().click();
  await expect(page.getByTestId('counter')).toHaveText('১/৪৮');
});
