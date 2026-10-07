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

for (const [label, saved] of [
  ['an id that no longer exists', JSON.stringify(['alif-laila', 'removed-item', 'meena'])],
  ['more ids than items', JSON.stringify([...Array(49)].map((_, i) => 'x' + i).concat('mimi'))],
  ['a number', '5'],
  ['an object', '{}'],
]) {
  test(`bad saved ticks (${label}) never break the page`, async ({ page }) => {
    await page.addInitScript((v) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('90skid-ticks', v); sessionStorage.setItem('seeded', '1'); } }, saved);
    await page.goto('/');
    await expect(page.locator('#chapters .card')).toHaveCount(48);
    const pressed = await page.locator('#chapters .card[aria-pressed="true"]').count();
    await expect(page.getByTestId('counter')).toHaveText(`${'০১২৩'[pressed]}/৪৮`);
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
}
