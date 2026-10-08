import { test, expect } from '@playwright/test';

const card = (page, name) => page.getByRole('button', { name, exact: false });
const counter = (page) => page.getByTestId('counter');

test('tapping a memory ticks it, tapping again unticks it', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#chapters').getByRole('button', { pressed: false })).toHaveCount(60);
  await expect(counter(page)).toHaveText('০/৬০');

  await card(page, 'আলিফ লায়লা').click();
  await expect(card(page, 'আলিফ লায়লা')).toHaveAttribute('aria-pressed', 'true');
  await expect(counter(page)).toHaveText('১/৬০');

  await card(page, 'আলিফ লায়লা').click();
  await expect(card(page, 'আলিফ লায়লা')).toHaveAttribute('aria-pressed', 'false');
  await expect(counter(page)).toHaveText('০/৬০');
});

test('ticks survive a page reload', async ({ page }) => {
  await page.goto('/');
  await card(page, 'মিমি চকলেট').click();
  await card(page, 'লুডুতে ঝগড়া').click();
  await page.reload();
  await expect(card(page, 'মিমি চকলেট')).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page, 'লুডুতে ঝগড়া')).toHaveAttribute('aria-pressed', 'true');
  await expect(counter(page)).toHaveText('২/৬০');
});

for (const [label, saved] of [
  ['an id that no longer exists', JSON.stringify(['alif-laila', 'removed-item', 'meena'])],
  ['more ids than items', JSON.stringify([...Array(49)].map((_, i) => 'x' + i).concat('mimi'))],
  ['a number', '5'],
  ['an object', '{}'],
]) {
  test(`bad saved ticks (${label}) never break the page`, async ({ page }) => {
    await page.addInitScript((v) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('90skid-ticks', v); sessionStorage.setItem('seeded', '1'); } }, saved);
    await page.goto('/');
    await expect(page.locator('#chapters .card')).toHaveCount(60);
    const pressed = await page.locator('#chapters .card[aria-pressed="true"]').count();
    await expect(page.getByTestId('counter')).toHaveText(`${'০১২৩'[pressed]}/৬০`);
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
}

test('every chapter has 10 cards and every photo file exists', async ({ page, request }) => {
  await page.goto('/');
  for (const ch of ['tv', 'tiffin', 'school', 'khela', 'gadget', 'eid']) {
    await expect(page.locator(`#ch-${ch} .card`)).toHaveCount(10);
  }
  const srcs = await page.locator('.card img').evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')));
  expect(srcs).toHaveLength(60);
  for (const src of srcs) {
    const res = await request.get(src);
    expect(res.ok(), src).toBe(true);
    expect(res.headers()['content-type']).toContain('image/webp');
  }
});

test('a new tab starts fresh even after ticking in another tab', async ({ page, context }) => {
  await page.goto('/');
  await card(page, 'মিমি চকলেট').click();
  await expect(counter(page)).toHaveText('১/৬০');
  const fresh = await context.newPage();
  await fresh.goto('/');
  await expect(counter(fresh)).toHaveText('০/৬০');
});

test('ticks saved by the old version are ignored and cleaned up', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('90skid-ticks', JSON.stringify(['alif-laila', 'meena']));
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto('/');
  await expect(counter(page)).toHaveText('০/৬০');
  expect(await page.evaluate(() => localStorage.getItem('90skid-ticks'))).toBeNull();
});

test('"play again" clears every tick and the name and starts over', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.card');
  for (let i = 0; i < 5; i++) await cards.nth(i).click();
  await page.getByTestId('submit-bar').getByRole('button').click();
  await page.getByLabel('তোমার নাম').fill('রাফি');
  await page.getByRole('button', { name: /নতুন করে খেলো/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(counter(page)).toHaveText('০/৬০');
  await expect(page.locator('#chapters .card[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByTestId('submit-bar')).toBeHidden();
  await expect(page.getByLabel('তোমার নাম')).toHaveValue('');
  await expect(page.locator(':focus')).toHaveText(/নব্বইয়ের পোলাপান/);
  expect(await page.evaluate(() => sessionStorage.getItem('90skid-ticks'))).toBe('[]');
  await cards.nth(0).click();
  await expect(page.getByTestId('submit-bar').getByRole('button')).toHaveText(/রেজাল্ট দেখাও/);
});
