import { test, expect, type Page } from '@playwright/test';
import { SEED_PASSWORD, SEED_USERS } from './support';

async function openAuthModal(page: Page, tab: 'login' | 'signup' = 'login') {
  await page.goto('/');
  await page.locator('[data-testid="sidebar-signin"]').click();
  if (tab === 'signup') {
    await page.locator('[data-testid="tab-signup"]').click();
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
    await expect(dialog.locator('input[autocomplete="nickname"]')).toBeVisible();
    await expect(dialog.locator('[data-testid="signup-terms"]')).toBeVisible();
  });

  test('AM-4: forgot password screen opens from login', async ({ page }) => {
    await openAuthModal(page, 'login');
    await page.locator('[data-testid="forgot-link"]').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('[data-testid="forgot-screen"]')).toBeVisible();
    await expect(dialog.getByText('Reset your password', { exact: true })).toBeVisible();
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
    await page.locator('[data-testid="tab-signup"]').click();
    await expect(page.locator('[data-testid="signup-screen"]')).toBeVisible();
    await page.locator('[data-testid="tab-login"]').click();
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

// Helpers shared by API integration tests. These run against the real, seeded backend:
// `alexchen` (alex@example.com / Password123!) exists, so its email + username collide on signup.
const LOGIN_URL = '**/api/v1/auth/login';
const SEED_EMAIL = SEED_USERS.alexchen.email;
const SEED_DISPLAY_NAME = SEED_USERS.alexchen.displayName;
const SEED_USERNAME = SEED_USERS.alexchen.username;

async function fillAndSubmitLogin(page: Page, email = SEED_EMAIL, password = SEED_PASSWORD) {
  await openAuthModal(page, 'login');
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input[type="email"]').fill(email);
  await dialog.locator('[data-testid="password-input"]').fill(password);
  await dialog.locator('button[type="submit"]').click();
}

test.describe('AuthModal — API integration (real seeded backend)', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure a clean auth state before every test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('AM-11: login success → modal closes and Sign in button disappears', async ({ page }) => {
    await fillAndSubmitLogin(page);
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="sidebar-signin"]')).not.toBeVisible();
    await expect(page.getByText('New post')).toBeVisible();
  });

  test('AM-11b: login success → welcome pill greets the user by name', async ({ page }) => {
    await fillAndSubmitLogin(page);
    // Top-center welcome pill fires once on successful sign-in (independent of the toast stack).
    await expect(page.getByText(`Welcome back, ${SEED_DISPLAY_NAME}`)).toBeVisible();
  });

  test('AM-12: login success → page reload keeps user logged in', async ({ page }) => {
    await fillAndSubmitLogin(page);
    await expect(page.locator('[data-testid="sidebar-signin"]')).not.toBeVisible();

    // The real refresh cookie survives a reload → restoreSession() keeps the user logged in.
    await page.reload();
    await expect(page.locator('[data-testid="sidebar-signin"]')).not.toBeVisible();
    await expect(page.getByText('New post')).toBeVisible();
  });

  test('AM-13: login with wrong password → shows credential error', async ({ page }) => {
    await fillAndSubmitLogin(page, SEED_EMAIL, 'definitely-the-wrong-password');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });

  test('AM-14: login with network error → shows connection error', async ({ page }) => {
    // Abort the login request to simulate an offline client (not a backend-data concern).
    await page.route(LOGIN_URL, route => route.abort('failed'));
    await fillAndSubmitLogin(page);
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByText('Cannot reach the server. Check your connection.')).toBeVisible();
  });

  test('AM-15: signup with duplicate email → shows email taken error', async ({ page }) => {
    await openAuthModal(page, 'signup');
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[autocomplete="nickname"]').fill('brand-new-user');
    await dialog.locator('input[autocomplete="email"]').fill(SEED_EMAIL); // seeded → 409
    await dialog.locator('input[autocomplete="new-password"]').fill(SEED_PASSWORD);
    await dialog.locator('button[type="submit"]').click();
    await expect(page.getByText('An account with this email already exists.')).toBeVisible();
  });

  test('AM-16: signup with duplicate username → shows username taken error', async ({ page }) => {
    await openAuthModal(page, 'signup');
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[autocomplete="nickname"]').fill(SEED_USERNAME); // seeded → 409
    await dialog.locator('input[autocomplete="email"]').fill('a-brand-new-email@example.com');
    await dialog.locator('input[autocomplete="new-password"]').fill(SEED_PASSWORD);
    await dialog.locator('button[type="submit"]').click();
    await expect(page.getByText('This username is already taken.')).toBeVisible();
  });
});
