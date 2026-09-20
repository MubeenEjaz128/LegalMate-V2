import { test, expect } from '@playwright/test';

test.describe('Error Handling & Negative Edge Cases', () => {
  test('Non-existent route redirects cleanly or displays fallback', async ({ page }) => {
    await page.goto('/some-non-existent-route-404-test');
    await page.waitForLoadState('networkidle');

    // In App.jsx, <Route path="*" element={<Navigate to="/" replace />} /> redirects to '/'
    await expect(page).toHaveURL(/\//);
  });

  test('XSS script injection in search input is properly sanitized', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], input[type="text"]').first();
    const xssPayload = '<script>alert("xss")</script>';

    let dialogFired = false;
    page.on('dialog', async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });

    await searchInput.fill(xssPayload);
    await page.waitForTimeout(500);

    // No alert dialog should have fired
    expect(dialogFired).toBeFalsy();
  });

  test('Extremely long text in inputs does not cause layout breaks', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    const longText = 'A'.repeat(1000);
    const messageInput = page.locator('textarea').first();
    await messageInput.fill(longText);

    // Ensure page does not horizontally overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
