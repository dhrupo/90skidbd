import { test, expect } from '@playwright/test';

const bar = (page) => page.getByTestId('submit-bar');

test('the result stays hidden while playing', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().click();
  await expect(page.getByRole('heading', { name: /রেজাল্ট বের হইছে/ })).toBeHidden();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('the submit bar appears only after the first tick', async ({ page }) => {
  await page.goto('/');
  await expect(bar(page)).toBeHidden();
  await page.locator('.card').first().click();
  await expect(bar(page)).toBeVisible();
  await expect(bar(page)).toContainText('১/৪৮');
  await expect(bar(page).getByRole('button')).toHaveText(/রেজাল্ট দেখাও/);
  await page.locator('.card').first().click();
  await expect(bar(page)).toBeHidden();
});

async function tick(page, n) {
  const cards = page.locator('.card');
  for (let i = 0; i < n; i++) await cards.nth(i).click();
}

test('the button opens a pop-up report card with share and challenge', async ({ page }) => {
  await page.goto('/');
  await tick(page, 32);
  await bar(page).getByRole('button').click();
  const dialog = page.getByRole('dialog', { name: /রেজাল্ট বের হইছে/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('score')).toHaveText('৬৭%');
  await expect(dialog.getByTestId('rank')).toContainText('পাক্কা নব্বইয়ের পোলাপান');
  await expect.poll(() => dialog.getByRole('img', { name: /শেয়ার ছবি/ }).evaluate((img) => img.naturalWidth)).toBe(1080);
  await expect(dialog.getByRole('button', { name: /পোস্ট মারো/ })).toBeVisible();
  await expect(dialog.getByLabel('তোমার নাম')).toBeVisible();
});
