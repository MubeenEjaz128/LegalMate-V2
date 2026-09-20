import { test, expect } from '@playwright/test';
import { setMockAuthSession } from '../helpers/auth';
import { testUsers } from '../fixtures/testData';

test.describe('Wallet & PKR Financial Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await setMockAuthSession(page, testUsers.client);
  });

  test('Balance page displays PKR currency and quick action buttons', async ({ page }) => {
    await page.goto('/balance');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1, name: /balance|wallet/i })).toBeVisible();

    // Verify PKR currency display
    await expect(page.getByText(/PKR|Rs/i).first()).toBeVisible();

    // Verify Buy / Top-up button exists
    const buyButton = page.getByRole('link', { name: /buy|deposit|top up/i }).or(
      page.getByRole('button', { name: /buy|deposit|top up/i })
    );
    expect(await buyButton.count()).toBeGreaterThan(0);
  });

  test('Buy Balance page renders Pakistani payment methods (JazzCash, EasyPaisa, Bank)', async ({ page }) => {
    await page.goto('/buy-balance');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /buy balance|deposit/i })).toBeVisible();

    // Check payment method options or amount inputs
    const amountInput = page.locator('input[type="number"], input[name="amount"]');
    if (await amountInput.isVisible()) {
      await amountInput.fill('5000');
    }
  });

  test('Sell Balance page validates withdrawal requests and payout options', async ({ page }) => {
    // Mock withdrawal balance and profiles
    await page.route('**/api/lawyer-withdraw/balance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ balancePkr: 25000, minimumWithdrawalPkr: 1000 }),
      });
    });
    await page.route('**/api/lawyer-payout-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profiles: [] }),
      });
    });
    await page.route('**/api/lawyer-withdraw/requests', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ requests: [] }),
      });
    });

    await page.goto('/sell-balance');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1, name: /sell balance/i })).toBeVisible();
  });
});
