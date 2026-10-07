import { test, expect } from '@playwright/test';

async function tick(page, n) {
  const cards = page.locator('.card');
  for (let i = 0; i < n; i++) await cards.nth(i).click();
}

test('32 of 48 gives 67% and the proper-90s-kid title', async ({ page }) => {
  await page.goto('/');
  await tick(page, 32);
  const result = page.getByRole('region', { name: /রেজাল্ট/ });
  await result.scrollIntoViewIfNeeded();
  await expect(result.getByTestId('score')).toHaveText('৬৭%');
  await expect(result.getByTestId('rank')).toContainText('পাক্কা নব্বইয়ের পোলাপান');
  await expect(result).toContainText('৪৮টার মধ্যে ৩২টা চিনছো');
  await expect(result.getByTestId('remark')).toContainText('১৬টা');
  await expect(result.locator('tr.you')).toContainText('৫১–৮০%');
});

test('with nothing ticked the result asks you to tick first', async ({ page }) => {
  await page.goto('/');
  const result = page.getByRole('region', { name: /রেজাল্ট/ });
  await result.scrollIntoViewIfNeeded();
  await expect(result.getByTestId('remark')).toContainText('আগে');
});
