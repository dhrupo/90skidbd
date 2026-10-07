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

const dialogOf = (page) => page.getByRole('dialog', { name: /রেজাল্ট বের হইছে/ });

for (const [how, close] of [
  ['the ✕ button', (page) => dialogOf(page).getByRole('button', { name: 'বন্ধ করো' }).click()],
  ['Escape', (page) => page.keyboard.press('Escape')],
  ['a tap on the dark backdrop', (page) => page.mouse.click(5, 5)],
  ['the back gesture', (page) => page.goBack()],
]) {
  test(`${how} closes the pop-up and keeps you on the page`, async ({ page }) => {
    await page.goto('/');
    await tick(page, 2);
    await bar(page).getByRole('button').click();
    await expect(dialogOf(page)).toBeVisible();
    await close(page);
    await expect(dialogOf(page)).toBeHidden();
    await expect(page).toHaveURL(/localhost:4173\/$/);
    await expect.poll(() => page.evaluate(() => history.state?.result ?? null)).toBeNull();
    await expect(page.locator('#chapters .card[aria-pressed="true"]')).toHaveCount(2);
    await expect(bar(page).getByRole('button')).toHaveText(/আবার দেখি/);
  });
}
