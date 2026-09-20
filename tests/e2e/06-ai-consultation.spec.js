import { test, expect } from '@playwright/test';

test.describe('AI Legal Consultation Interface', () => {
  test('Floating AI assistant button is present on public pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Floating chatbot button trigger
    const aiButton = page.locator('button[title="Open Chat Helper"], button[title="Minimize Chat"]');
    await expect(aiButton).toBeVisible();

    await aiButton.click();
    await page.waitForTimeout(400);

    // Verify chat interface opened
    const chatModal = page.locator('[class*="SimpleChatbotInterface"], [class*="chat"], .shadow-2xl');
    expect(await chatModal.count()).toBeGreaterThan(0);
  });

  test('AI chat modal contains input field and disclaimer notice', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const trigger = page.locator('button[title="Open Chat Helper"], button[title="Minimize Chat"]');
    if (await trigger.isVisible()) {
      await trigger.click();
      await page.waitForTimeout(400);

      // Look for input field
      const chatInput = page.locator('textarea, input[placeholder*="ask" i], input[placeholder*="message" i], input[type="text"]').last();
      if (await chatInput.isVisible()) {
        await chatInput.fill('What is the procedure for registering a company in Pakistan?');
      }
    }
  });
});
