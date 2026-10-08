import { test, expect } from '@playwright/test';
import { CHAPTERS, REMARKS, UNTICK, WARNINGS } from '../../src/items.js';

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

async function recordToasts(page) {
  await page.evaluate(() => {
    window.__toasts = [];
    new MutationObserver(() => window.__toasts.push(document.querySelector('.toast').textContent))
      .observe(document.querySelector('.toast'), { childList: true, characterData: true, subtree: true });
  });
}

test('a chapter talks at its 3rd, 6th, 8th and 10th tick, never repeating a line', async ({ page }) => {
  await page.goto('/');
  await recordToasts(page);
  const tv = CHAPTERS.find((c) => c.id === 'tv');
  const cards = page.locator('#ch-tv .card');
  for (let i = 0; i < 10; i++) await cards.nth(i).click();
  const said = await page.evaluate(() => window.__toasts);
  expect(said).toHaveLength(4);
  for (const line of said.slice(0, 3)) expect(tv.cheers).toContain(line);
  expect(new Set(said.slice(0, 3)).size).toBe(3);
  expect(tv.done).toContain(said[3]);
});

test('re-ticking the same count does not repeat the chapter message', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('#ch-tiffin .card');
  for (let i = 0; i < 3; i++) await cards.nth(i).click();
  await recordToasts(page);
  await cards.nth(2).click();
  await cards.nth(2).click();
  const said = await page.evaluate(() => window.__toasts);
  expect(said).toHaveLength(1);
  expect(UNTICK).toContain(said[0]);
});

test('every chapter has 6 lines to say and 3 ways to finish', () => {
  for (const c of CHAPTERS) {
    expect(c.cheers).toHaveLength(6);
    expect(c.done).toHaveLength(3);
  }
});

test('the contact email is dhrupo@gmail.com', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo').getByRole('link')).toHaveText('dhrupo@gmail.com');
  await expect(page.getByRole('contentinfo').getByRole('link')).toHaveAttribute('href', 'mailto:dhrupo@gmail.com');
});

test('every score band has 5 teacher remarks to pick from', () => {
  for (const band of ['low', 'half', 'good', 'great', 'full']) expect(REMARKS[band]).toHaveLength(5);
  expect(REMARKS.good.join(' ')).toContain('কালকে আম্মুকে নিয়ে স্কুলে আসবে');
});

test('the teacher remark changes between openings', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.card');
  for (let i = 0; i < 40; i++) await cards.nth(i).click();
  const fill = (t) => t.replaceAll('{n}', '২০').replaceAll('{total}', '৬০');
  const allowed = REMARKS.good.map((t) => fill(t) + ' — ক্লাস টিচার');
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    await page.getByTestId('submit-bar').getByRole('button').click();
    const text = await page.getByTestId('remark').innerText();
    expect(allowed).toContain(text);
    seen.add(text);
    await page.getByRole('button', { name: 'বন্ধ করো' }).click();
  }
  expect(seen.size).toBeGreaterThan(1);
});

test('the page and its preview text say 60 memories', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.lede')).toContainText('৬০টা');
  for (const sel of ['meta[name="description"]', 'meta[property="og:description"]']) {
    await expect(page.locator(sel)).toHaveAttribute('content', /^৬০টা/);
  }
});
