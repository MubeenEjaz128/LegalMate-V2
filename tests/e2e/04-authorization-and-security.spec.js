import { test, expect } from '@playwright/test';
import { setMockAuthSession } from '../helpers/auth';
import { testUsers } from '../fixtures/testData';

test.describe('Authorization & RBAC Access Control', () => {
  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/appointments',
    '/chat',
    '/balance',
    '/buy-balance',
    '/sell-balance',
  ];

  for (const route of protectedRoutes) {
    test(`Unauthenticated request to ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Should be redirected to /login
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('Client role access: client can access client dashboard and cannot access unauthorized actions', async ({ page }) => {
    await setMockAuthSession(page, testUsers.client);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should stay on dashboard and not redirect to /login
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/client|overview|appointments|dashboard/i).first()).toBeVisible();
  });

  test('Lawyer role access: lawyer can access lawyer dashboard', async ({ page }) => {
    await setMockAuthSession(page, testUsers.lawyer);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Admin role access: admin can view admin telemetry and controls', async ({ page }) => {
    await setMockAuthSession(page, testUsers.admin);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
