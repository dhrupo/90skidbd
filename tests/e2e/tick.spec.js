import { test, expect } from '@playwright/test';

const card = (page, name) => page.getByRole('button', { name, exact: false });
const counter = (page) => page.getByTestId('counter');

test('tapping a memory ticks it, tapping again unticks it', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#chapters').getByRole('button', { pressed: false })).toHaveCount(48);
  await expect(counter(page)).toHaveText('০/৪৮');

  await card(page, 'আলিফ লায়লা').click();
  await expect(card(page, 'আলিফ লায়লা')).toHaveAttribute('aria-pressed', 'true');
  await expect(counter(page)).toHaveText('১/৪৮');

  await card(page, 'আলিফ লায়লা').click();
  await expect(card(page, 'আলিফ লায়লা')).toHaveAttribute('aria-pressed', 'false');
  await expect(counter(page)).toHaveText('০/৪৮');
});

test('ticks survive a page reload', async ({ page }) => {
  await page.goto('/');
  await card(page, 'মিমি চকলেট').click();
  await card(page, 'লুডুতে ঝগড়া').click();
  await page.reload();
  await expect(card(page, 'মিমি চকলেট')).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page, 'লুডুতে ঝগড়া')).toHaveAttribute('aria-pressed', 'true');
  await expect(counter(page)).toHaveText('২/৪৮');
});
