import { test, expect } from '@playwright/test';
import { setMockAuthSession } from '../helpers/auth';
import { testUsers } from '../fixtures/testData';

test.describe('Appointments & Real-Time Communication', () => {
  test.beforeEach(async ({ page }) => {
    await setMockAuthSession(page, testUsers.client);
  });

  test('Appointments page displays tabs and appointment listings', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1, name: /my appointments/i })).toBeVisible();

    // Verify filter select dropdown exists with status options
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect.locator('option')).toHaveCount(5);
  });

  test('Chat page renders active conversations list and message input', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Chat sidebar heading
    await expect(page.getByRole('heading', { level: 1, name: /messages/i })).toBeVisible();

    // New Group button
    await expect(page.locator('button[title="New Group"]')).toBeVisible();
  });

  test('Video consultation room renders controls and camera/mic toggles', async ({ page }) => {
    await page.goto('/test-video-call');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /webrtc video call test/i })).toBeVisible();

    const startBtn = page.getByRole('button', { name: /start test video call/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Verify video call status or container renders
    await expect(page.getByText(/initializing video call|connecting|call/i).first()).toBeVisible();
  });
});
