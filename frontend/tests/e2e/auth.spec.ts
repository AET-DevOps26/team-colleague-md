import { test, expect } from '@playwright/test';
import { SEED_PASSWORD, SEED_USERS, loginAs, uniqueUsername } from './support';

/**
 * US: Registration & Login.
 *
 * The modal's screens, tabs and field rendering are unit-tested. What only a real browser against
 * a real backend can prove is that an identity survives the round trip: credentials are accepted,
 * a new account is created, and the refresh cookie outlives a reload.
 */

test('AUTH-1: a seeded user can sign in and is greeted by name', async ({ page }) => {
  await loginAs(page, SEED_USERS.alexchen);

  await expect(page.getByText(`Welcome back, ${SEED_USERS.alexchen.displayName}`)).toBeVisible();
  await expect(page.getByRole('link', { name: 'New post' })).toBeVisible();
});

test('AUTH-2: a signed-in session survives a page reload', async ({ page }) => {
  await loginAs(page);

  // The access token lives in memory only, so staying signed in proves the real refresh cookie
  // round-tripped through restoreSession().
  await page.reload();

  await expect(page.locator('[data-testid="sidebar-signin"]')).toBeHidden();
  await expect(page.getByRole('link', { name: 'New post' })).toBeVisible();
});

test('AUTH-3: a new visitor can sign up and lands signed in', async ({ page }) => {
  const username = uniqueUsername();
  await page.goto('/');
  await page.locator('[data-testid="sidebar-signin"]').click();
  await page.locator('[data-testid="tab-signup"]').click();

  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input[autocomplete="nickname"]').fill(username);
  await dialog.locator('input[autocomplete="email"]').fill(`${username}@example.com`);
  await dialog.locator('input[autocomplete="new-password"]').fill(SEED_PASSWORD);
  await dialog.locator('button[type="submit"]').click();

  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-testid="sidebar-signin"]')).toBeHidden();
});

test('AUTH-4: bad credentials and a taken email are rejected inline', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="sidebar-signin"]').click();
  const dialog = page.locator('[role="dialog"]');

  await dialog.locator('input[type="email"]').fill(SEED_USERS.alexchen.email);
  await dialog.locator('[data-testid="password-input"]').fill('definitely-the-wrong-password');
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByText('Invalid email or password.')).toBeVisible();

  // The seeded email is already registered, so signup must flag it against the real backend.
  await page.locator('[data-testid="tab-signup"]').click();
  await dialog.locator('input[autocomplete="nickname"]').fill(uniqueUsername());
  await dialog.locator('input[autocomplete="email"]').fill(SEED_USERS.alexchen.email);
  await dialog.locator('input[autocomplete="new-password"]').fill(SEED_PASSWORD);

  // The availability check reports it inline before submit is ever reached.
  await expect(page.getByText('An account with this email already exists')).toBeVisible();
});
