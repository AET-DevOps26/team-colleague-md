import { test, expect, type Page } from '@playwright/test';

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

// Helpers shared by API integration tests
const LOGIN_URL = '**/api/v1/auth/login';
const REFRESH_URL = '**/api/v1/auth/refresh';
const REGISTER_URL = '**/api/v1/auth/register';

const MOCK_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'alexchen',
  displayName: 'Alex Chen',
  email: 'alex@example.com',
  role: 'USER',
};

async function mockLoginSuccess(page: Page) {
  await page.route(LOGIN_URL, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'fake-jwt', user: MOCK_USER }),
    })
  );
}

async function fillAndSubmitLogin(page: Page) {
  await openAuthModal(page, 'login');
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input[type="email"]').fill('alex@example.com');
  await dialog.locator('[data-testid="password-input"]').fill('password123');
  await dialog.locator('button[type="submit"]').click();
}

test.describe('AuthModal — API integration (mocked backend)', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure a clean auth state before every test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('AM-11: login success → modal closes and Sign in button disappears', async ({ page }) => {
    await mockLoginSuccess(page);
    await fillAndSubmitLogin(page);
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="sidebar-signin"]')).not.toBeVisible();
    await expect(page.getByText('New post')).toBeVisible();
  });

  test('AM-11b: login success → welcome pill greets the user by name', async ({ page }) => {
    await mockLoginSuccess(page);
    await fillAndSubmitLogin(page);
    // Top-center welcome pill fires once on successful sign-in (independent of the toast stack).
    await expect(page.getByText(`Welcome back, ${MOCK_USER.displayName}`)).toBeVisible();
  });

  test('AM-12: login success → page reload keeps user logged in', async ({ page }) => {
    // Refresh returns 401 initially so the user starts logged out (modal can open)
    await page.route(REFRESH_URL, route =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      })
    );
    await mockLoginSuccess(page);
    await fillAndSubmitLogin(page);
    await expect(page.locator('[data-testid="sidebar-signin"]')).not.toBeVisible();

    // Switch refresh mock to return success so restoreSession() works after reload
    await page.unroute(REFRESH_URL);
    await page.route(REFRESH_URL, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'new-fake-jwt', user: MOCK_USER }),
      })
    );
    await page.reload();
    await expect(page.locator('[data-testid="sidebar-signin"]')).not.toBeVisible();
    await expect(page.getByText('New post')).toBeVisible();
  });

  test('AM-13: login with wrong password → shows credential error', async ({ page }) => {
    await page.route(LOGIN_URL, route =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ status: 401, message: 'Error: User not found with email' }),
      })
    );
    // Mock refresh so the userApi 401-retry interceptor fails quickly instead of timing out
    await page.route(REFRESH_URL, route =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      })
    );
    await fillAndSubmitLogin(page);
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });

  test('AM-14: login with network error → shows connection error', async ({ page }) => {
    await page.route(LOGIN_URL, route => route.abort('failed'));
    await fillAndSubmitLogin(page);
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByText('Cannot reach the server. Check your connection.')).toBeVisible();
  });

  test('AM-15: signup with duplicate email → shows email taken error', async ({ page }) => {
    await page.route(REGISTER_URL, route =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ status: 409, message: 'Error: Email is already in use!' }),
      })
    );
    await openAuthModal(page, 'signup');
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[autocomplete="nickname"]').fill('newuser');
    await dialog.locator('input[autocomplete="email"]').fill('taken@example.com');
    await dialog.locator('input[autocomplete="new-password"]').fill('password123');
    await dialog.locator('button[type="submit"]').click();
    await expect(page.getByText('An account with this email already exists.')).toBeVisible();
  });

  test('AM-16: signup with duplicate username → shows username taken error', async ({ page }) => {
    await page.route(REGISTER_URL, route =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ status: 409, message: 'Error: Username is already taken!' }),
      })
    );
    await openAuthModal(page, 'signup');
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[autocomplete="nickname"]').fill('takenuser');
    await dialog.locator('input[autocomplete="email"]').fill('new@example.com');
    await dialog.locator('input[autocomplete="new-password"]').fill('password123');
    await dialog.locator('button[type="submit"]').click();
    await expect(page.getByText('This username is already taken.')).toBeVisible();
  });
});
