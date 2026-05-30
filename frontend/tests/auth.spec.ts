import { test, expect, type Page } from '@playwright/test';

async function openAuthModal(page: Page, tab: 'login' | 'signup' = 'login') {
  await page.goto('/');
  await page.locator('[data-testid="sidebar-signin"]').click();
  if (tab === 'signup') {
    await page.locator('[role="dialog"] button', { hasText: 'Sign up' }).click();
  }
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  if (tab === 'signup') {
    await expect(page.locator('[data-testid="signup-screen"]')).toBeVisible();
  } else {
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
  }
}

test.describe('AuthModal — screens', () => {
  test('AM-1: login screen shows wordmark, email, password, forgot link', async ({ page }) => {
    await openAuthModal(page, 'login');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('[data-testid="auth-wordmark"]')).toBeVisible();
    await expect(dialog.locator('input[type="email"]')).toBeVisible();
    await expect(dialog.locator('input[type="password"]')).toBeVisible();
    await expect(dialog.locator('[data-testid="forgot-link"]')).toBeVisible();
  });

  test('AM-2: password toggle reveals password', async ({ page }) => {
    await openAuthModal(page, 'login');
    const dialog = page.locator('[role="dialog"]');
    const pwInput = dialog.locator('input[type="password"]');
    await pwInput.fill('secret');
    await dialog.locator('[data-testid="toggle-password"]').click();
    await expect(dialog.locator('input[type="text"][data-testid="password-input"]')).toHaveValue('secret');
  });

  test('AM-3: signup screen shows username field and terms text', async ({ page }) => {
    await openAuthModal(page, 'signup');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('input[autocomplete="username"]')).toBeVisible();
    await expect(dialog.locator('[data-testid="signup-terms"]')).toBeVisible();
  });

  test('AM-4: forgot password screen opens from login', async ({ page }) => {
    await openAuthModal(page, 'login');
    await page.locator('[data-testid="forgot-link"]').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('[data-testid="forgot-screen"]')).toBeVisible();
    await expect(dialog.getByText('Reset your password')).toBeVisible();
  });

  test('AM-5: back link on forgot screen returns to login', async ({ page }) => {
    await openAuthModal(page, 'login');
    await page.locator('[data-testid="forgot-link"]').click();
    await page.locator('[data-testid="back-to-login"]').click();
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
  });

  test('AM-6: send reset link navigates to OTP screen', async ({ page }) => {
    await openAuthModal(page, 'login');
    await page.locator('[data-testid="forgot-link"]').click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[type="email"]').fill('test@example.com');
    await page.locator('[data-testid="send-reset-btn"]').click();
    await expect(page.locator('[data-testid="otp-screen"]')).toBeVisible();
    await expect(dialog.getByText('Verify your email')).toBeVisible();
  });

  test('AM-7: OTP grid has 6 cells that accept digits', async ({ page }) => {
    await openAuthModal(page, 'login');
    await page.locator('[data-testid="forgot-link"]').click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[type="email"]').fill('test@example.com');
    await page.locator('[data-testid="send-reset-btn"]').click();
    const cells = page.locator('[data-testid="otp-cell"]');
    await expect(cells).toHaveCount(6);
    await cells.nth(0).locator('input').fill('1');
    await expect(cells.nth(1).locator('input')).toBeFocused();
  });

  test('AM-8: tab switch between login and signup', async ({ page }) => {
    await openAuthModal(page, 'login');
    await page.locator('[role="dialog"] button', { hasText: 'Sign up' }).click();
    await expect(page.locator('[data-testid="signup-screen"]')).toBeVisible();
    await page.locator('[role="dialog"] button', { hasText: 'Log in' }).click();
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
  });

  test('AM-9: switch link at bottom of login navigates to signup', async ({ page }) => {
    await openAuthModal(page, 'login');
    await page.locator('[data-testid="switch-to-signup"]').click();
    await expect(page.locator('[data-testid="signup-screen"]')).toBeVisible();
  });

  test('AM-10: switch link at bottom of signup navigates to login', async ({ page }) => {
    await openAuthModal(page, 'signup');
    await page.locator('[data-testid="switch-to-login"]').click();
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
  });
});
