import { test, expect } from '@playwright/test';

async function tick(page, n) {
  const cards = page.locator('.card');
  for (let i = 0; i < n; i++) await cards.nth(i).click();
}

async function openResult(page) {
  await page.getByTestId('submit-bar').getByRole('button').click();
  return page.getByRole('dialog', { name: /রেজাল্ট/ });
}

test('40 of 60 gives 67% and the proper-90s-kid title', async ({ page }) => {
  await page.goto('/');
  await tick(page, 40);
  const result = await openResult(page);
  await expect(result.getByTestId('score')).toHaveText('৬৭%');
  await expect(result.getByTestId('rank')).toContainText('পাক্কা নব্বইয়ের পোলাপান');
  await expect(result).toContainText('৬০টার মধ্যে ৪০টা চিনছো');
  await expect(result.getByTestId('remark')).toContainText('২০টা');
  await result.getByText('মার্কিং স্কিম').click();
  await expect(result.locator('tr.you')).toContainText('৫১–৮০%');
});


test('reopening after another tick ends on the new score', async ({ page }) => {
  await page.goto('/');
  await tick(page, 30);
  const result = await openResult(page);
  await page.getByRole('button', { name: 'বন্ধ করো' }).click();
  await page.locator('.card').nth(30).click();
  await openResult(page);
  // JUSTIFIED: wait past the 900ms count-up so a stale final frame would be caught
  await page.waitForTimeout(1200);
  await expect(result.getByTestId('score')).toHaveText('৫২%');
});
