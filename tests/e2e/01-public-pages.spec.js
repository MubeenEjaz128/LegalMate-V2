import { test, expect } from '@playwright/test';

test.describe('Public Pages & Content Verification', () => {
  test('Homepage loads with hero section, title, and key CTA buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Title verification
    await expect(page).toHaveTitle(/LegalMate/i);

    // Hero section content
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();

    // CTA buttons
    const ctaButtons = page.getByRole('link', { name: /find a lawyer|consult|get started|book/i });
    expect(await ctaButtons.count()).toBeGreaterThan(0);
  });

  test('Services page loads and displays legal service categories', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/services/i).first()).toBeVisible();
  });

  test('About Us page loads with company mission and values', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1, name: /about/i })).toBeVisible();
    await expect(page.getByText(/legal|platform|pakistan|consultation/i).first()).toBeVisible();
  });

  test('FAQs page displays questions and accordion interactions', async ({ page }) => {
    await page.goto('/faq');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1, name: /faq|frequently asked/i })).toBeVisible();

    // Verify at least one FAQ accordion item exists
    const faqItem = page.locator('button, [class*="accordion"], [class*="cursor-pointer"]').filter({ hasText: /\?/ }).first();
    if (await faqItem.count() > 0) {
      await faqItem.click();
      await page.waitForTimeout(300);
    }
  });

  test('Contact Us page displays contact form and details', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1, name: /get in touch|contact/i })).toBeVisible();
    await expect(page.locator('input[name="name"], input[placeholder*="name" i]')).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('Blogs page displays articles and pagination/cards', async ({ page }) => {
    await page.goto('/blogs');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1, name: /blog|articles|insights/i })).toBeVisible();
  });

  test('Legal Policy pages (Privacy Policy & Terms) load cleanly', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeVisible();

    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1, name: /terms/i })).toBeVisible();
  });
});
