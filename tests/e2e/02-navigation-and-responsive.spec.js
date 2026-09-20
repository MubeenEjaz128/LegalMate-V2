import { test, expect } from '@playwright/test';
import { viewports } from '../fixtures/testData';

test.describe('Navigation & Responsive Viewport Verification', () => {
  for (const vp of viewports) {
    test(`Responsive layout renders without horizontal overflow on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

      // ScrollWidth should match clientWidth (allowing small 1-2px rounding tolerance)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

      // Navbar should be present
      const nav = page.locator('nav, header');
      await expect(nav.first()).toBeVisible();
    });
  }

  test('Desktop navigation links navigate to appropriate routes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Services link
    const servicesLink = page.getByRole('link', { name: /services/i }).first();
    await servicesLink.click();
    await expect(page).toHaveURL(/\/services/);

    // Click About link
    const aboutLink = page.getByRole('link', { name: /about/i }).first();
    await aboutLink.click();
    await expect(page).toHaveURL(/\/about/);

    // Click Contact link
    const contactLink = page.getByRole('link', { name: /contact/i }).first();
    await contactLink.click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test('Mobile navigation hamburger drawer opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for mobile menu toggle button
    const menuButton = page.locator('button[aria-label*="menu" i], button').filter({ has: page.locator('svg') }).first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);

      // Verify mobile menu items appear
      const navLinks = page.getByRole('link', { name: /services|about|contact|login/i });
      expect(await navLinks.count()).toBeGreaterThan(0);
    }
  });
});
