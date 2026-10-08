import { test, expect } from '@playwright/test';
import { CHAPTERS, UNTICK, WARNINGS } from '../../src/items.js';

const toast = (page) => page.getByRole('status');

test('the top warning is one of the funny warnings', async ({ page }) => {
  await page.goto('/');
  const note = (await page.locator('.margin-note').innerText()).replace(/^↳\s*/, '').trim();
  expect(WARNINGS).toContain(note);
});

test('each chapter aside comes from that chapter\'s pool', async ({ page }) => {
  await page.goto('/');
  for (const c of CHAPTERS) {
    expect(c.asides).toContain((await page.locator(`#ch-${c.id} .aside`).innerText()).trim());
  }
});

test('unticking says one of six different lines, not always the same', async ({ page }) => {
  expect(UNTICK).toHaveLength(6);
  await page.goto('/');
  const card = page.locator('.card').first();
  const seen = new Set();
  for (let i = 0; i < 15; i++) {
    await card.click();
    await card.click();
    const text = await toast(page).innerText();
    expect(UNTICK).toContain(text);
    seen.add(text);
  }
  expect(seen.size).toBeGreaterThan(1);
});

test('the 3rd tick in a chapter gets a pep-talk, only once', async ({ page }) => {
  await page.goto('/');
  const tv = CHAPTERS.find((c) => c.id === 'tv');
  const cards = page.locator('#ch-tv .card');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await cards.nth(2).click();
  const pep = await toast(page).innerText();
  expect(tv.pep).toContain(pep);
  await cards.nth(2).click();
  await cards.nth(2).click();
  expect(tv.pep).not.toContain(await toast(page).innerText());
  await cards.nth(3).click();
  expect(tv.pep).not.toContain(await toast(page).innerText());
});

test('the contact email is dhrupo@gmail.com', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo').getByRole('link')).toHaveText('dhrupo@gmail.com');
  await expect(page.getByRole('contentinfo').getByRole('link')).toHaveAttribute('href', 'mailto:dhrupo@gmail.com');
});

test('the 51-80% remark sends you to school with your mum', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.card');
  for (let i = 0; i < 40; i++) await cards.nth(i).click();
  await page.getByTestId('submit-bar').getByRole('button').click();
  await expect(page.getByTestId('remark')).toContainText('কালকে আম্মুকে নিয়ে স্কুলে আসবে');
});

test('the page and its preview text say 60 memories', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.lede')).toContainText('৬০টা');
  for (const sel of ['meta[name="description"]', 'meta[property="og:description"]']) {
    await expect(page.locator(sel)).toHaveAttribute('content', /^৬০টা/);
  }
});
