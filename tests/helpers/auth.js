/**
 * Authentication test helper for LegalMate E2E automation
 */

/**
 * Perform login via UI
 */
export async function loginViaUI(page, email, password) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill credentials
  const emailInput = page.getByPlaceholder(/email/i).or(page.locator('input[type="email"]'));
  const passwordInput = page.getByPlaceholder(/password/i).or(page.locator('input[type="password"]'));

  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Click Submit
  const submitButton = page.getByRole('button', { name: /sign in|log in|login/i });
  await submitButton.click();
}

export async function setMockAuthSession(page, user, token = 'mock-jwt-token-for-e2e-testing') {
  const fullUser = {
    _id: '66e1234567890abcdef12345',
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: true,
    isVerified: true,
    ...user,
  };

  // Intercept /auth/me so initializeAuth preserves the session
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: fullUser }),
    });
  });

  // Mock dashboard stats if requested
  await page.route('**/api/admin/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalUsers: 25,
        totalLawyers: 10,
        totalClients: 15,
        totalAppointments: 50,
      }),
    });
  });

  await page.addInitScript(({ user, token }) => {
    window.localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user,
        token: token,
        isAuthenticated: true,
      },
      version: 0,
    }));
  }, { user: fullUser, token });
}
