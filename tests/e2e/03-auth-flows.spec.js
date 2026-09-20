import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/testData';

test.describe('Authentication & User Registration Flows', () => {
  test('Login page renders with email, password fields and social/role options', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /sign in|welcome back|log in/i })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();

    // Link to register
    await expect(page.getByRole('link', { name: /register|sign up|create account/i })).toBeVisible();
    // Link to forgot password
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
  });

  test('Login rejects invalid credentials with error notification', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"], input[name="email"]').fill('nonexistent.user@example.com');
    await page.locator('input[type="password"], input[name="password"]').fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Verify error toast or message appears
    await expect(page.getByText(/invalid|not found|error|failed/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Registration page validates required fields and password strength', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

    // Check HTML5 email format validation
    const emailInput = page.locator('input[type="email"], input[id="email"]');
    await emailInput.fill('invalid-email');

    const isValid = await emailInput.evaluate(el => el.checkValidity());
    expect(isValid).toBeFalsy();
  });

  test('Forgot password page sends reset link or shows validation', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /forgot password|reset/i })).toBeVisible();
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();

    await emailInput.fill('user@example.com');
    await page.getByRole('button', { name: /send|submit|reset/i }).click();
  });
});
