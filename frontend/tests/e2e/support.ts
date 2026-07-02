import { expect, type Page } from '@playwright/test';

/**
 * Shared helpers for the heavy, local-only E2E suite (see README). These specs run the real
 * frontend against a live, seeded backend — no route-mocking. Identity comes from a real login
 * with a seeded user; assertions key off the seed fixtures.
 */

export const SEED_PASSWORD = 'Password123!';

export const SEED_USERS = {
  alexchen: { email: 'alex@example.com', username: 'alexchen', displayName: 'Alex Chen' },
  sarahjkim: { email: 'sarah.kim@example.com', username: 'sarahjkim', displayName: 'Sarah Kim' },
} as const;

/** Logs in through the real auth modal so the refresh cookie + access token are genuine. */
export async function loginAs(page: Page, user = SEED_USERS.alexchen): Promise<void> {
  await page.goto('/');
  await page.locator('[data-testid="sidebar-signin"]').click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await dialog.locator('input[type="email"]').fill(user.email);
  await dialog.locator('[data-testid="password-input"]').fill(SEED_PASSWORD);
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden();
}
