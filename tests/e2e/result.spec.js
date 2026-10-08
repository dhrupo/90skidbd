import { test, expect } from '@playwright/test';
import { REMARKS } from '../../src/items.js';

async function tick(page, n) {
  const cards = page.locator('.card');
  for (let i = 0; i < n; i++) await cards.nth(i).click();
}

async function openResult(page) {
  await page.getByTestId('submit-bar').getByRole('button').click();
  return page.getByRole('dialog', { name: /রেজাল্ট/ });
}

test('40 of 60 gives 67%, grade A- and its own title and remark', async ({ page }) => {
  await page.goto('/');
  await tick(page, 40);
  const result = await openResult(page);
  await expect(result.getByTestId('score')).toHaveText('৬৭%');
  await expect(result.getByTestId('rank')).toContainText('A-');
  await expect(result.getByTestId('rank')).toContainText('নব্বইয়ের ভালো ছাত্র');
  await expect(result).toContainText('৬০টার মধ্যে ৪০টা চিনছো');
  const fill = (t) => t.replaceAll('{n}', '২০').replaceAll('{total}', '৬০') + ' — ক্লাস টিচার';
  expect(REMARKS['A-'].map(fill)).toContain(await result.getByTestId('remark').innerText());
  await result.getByText('মার্কিং স্কিম').click();
  await expect(result.locator('tr.you')).toContainText('৬০–৬৯%');
  await expect(result.locator('table.scheme tr')).toHaveCount(7);
});

for (const [n, grade, title] of [[12, 'F', '২০০০-এর পরের বাচ্চা'], [20, 'D', 'টেনেটুনে পাস'], [30, 'B', 'হাফ-টিফিন নব্বই'], [50, 'A+', 'বিটিভির লোগো তুমি নিজেই']]) {
  test(`${n} of 60 gets grade ${grade}`, async ({ page }) => {
    await page.goto('/');
    await tick(page, n);
    const result = await openResult(page);
    await expect(result.getByTestId('rank')).toContainText(grade);
    await expect(result.getByTestId('rank')).toContainText(title);
  });
}

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
