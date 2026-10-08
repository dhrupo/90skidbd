import { test, expect } from '@playwright/test';
import { packChallenge, unpackChallenge } from '../../src/score.js';

const firstN = (n) => Array.from({ length: 60 }, (_, i) => i < n);

test('receiver plays, then sees how they compare with the sender', async ({ page }) => {
  await page.goto('/' + packChallenge(firstN(36), 'রাফি'));
  await expect(page.getByTestId('challenge-banner')).toContainText('রাফি তোমাকে চ্যালেঞ্জ');
  const cards = page.locator('.card');
  for (let i = 0; i < 30; i++) await cards.nth(i).click();
  await page.getByTestId('submit-bar').getByRole('button').click();
  const vs = page.getByTestId('versus');
  await expect(vs).toContainText('তুমি ৫০%');
  await expect(vs).toContainText('রাফি ৬০%');
  await expect(vs).toContainText('দুজনেরই মনে আছে ৩০টা');
  await expect(vs).toContainText('ঘুড়ি কাটাকাটি');
});

test('a booby-trapped name is shown as plain text and never runs', async ({ page }) => {
  const evil = '<img src=x onerror="window.__pwned=1">';
  await page.goto('/' + packChallenge(firstN(5), evil));
  const banner = page.getByTestId('challenge-banner');
  await expect(banner).toContainText('<img src=x');
  await expect(banner.locator('img')).toHaveCount(0);
  await page.locator('.card').first().click();
  await page.getByTestId('submit-bar').getByRole('button').click();
  await expect(page.getByTestId('versus')).toBeVisible();
  await expect(page.getByTestId('versus').locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test('a broken challenge link just starts a normal game', async ({ page }) => {
  await page.goto('/#c=!!!!&n=x');
  await expect(page.getByTestId('challenge-banner')).toBeHidden();
  await page.locator('.card').first().click();
  await expect(page.getByTestId('counter')).toHaveText('১/৬০');
});

test('the challenge survives tapping the intro button and reloading', async ({ page }) => {
  await page.goto('/' + packChallenge(firstN(36), 'রাফি'));
  await page.getByRole('link', { name: /আচ্ছা, দেখি তো/ }).click();
  await expect(page).not.toHaveURL(/#c=/);
  await page.reload();
  await expect(page.getByTestId('challenge-banner')).toContainText('রাফি তোমাকে চ্যালেঞ্জ');
});
