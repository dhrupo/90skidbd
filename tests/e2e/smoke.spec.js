import { test, expect } from '@playwright/test';

test('page loads with the brand title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/নব্বইয়ের শিশু/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
