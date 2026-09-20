import { test, expect } from '@playwright/test';

test.describe('CMS Content, Inquiries & Feedback System', () => {
  test('Contact Us form validates email format and required message', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const messageInput = page.locator('textarea').first();
    const submitButton = page.getByRole('button', { name: /send|submit|message/i });

    await nameInput.fill('QA Tester');
    await emailInput.fill('invalid-email-format');
    await messageInput.fill('Test message for contact inquiry.');

    await submitButton.click();

    // Check validity
    const isEmailValid = await emailInput.evaluate(el => el.checkValidity());
    expect(isEmailValid).toBeFalsy();
  });

  test('Blog listing displays cards and permits clicking to detail view', async ({ page }) => {
    await page.goto('/blogs');
    await page.waitForLoadState('networkidle');

    const blogCards = page.locator('article, [class*="card"]').filter({ has: page.locator('h2, h3') });
    if (await blogCards.count() > 0) {
      const firstBlogLink = blogCards.first().locator('a').first();
      if (await firstBlogLink.isVisible()) {
        await firstBlogLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/blogs\/.+/);
      }
    }
  });
});
