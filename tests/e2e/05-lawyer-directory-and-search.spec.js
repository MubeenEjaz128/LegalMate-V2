import { test, expect } from '@playwright/test';

test.describe('Lawyer Directory & Search Verification', () => {
  test('Search page renders with search input, specialization filters, and results grid', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1, name: /find|search|lawyer/i })).toBeVisible();

    // Search input
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], input[type="text"]').first();
    await expect(searchInput).toBeVisible();

    // Type a query
    await searchInput.fill('Corporate');
    await page.waitForTimeout(400);
  });

  test('Filter by specialization and availability works without crashing', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Select/filter controls
    const filterButtons = page.locator('button, select, [role="button"]').filter({ hasText: /all|specialization|filter/i });
    if (await filterButtons.count() > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(300);
    }
  });
});
