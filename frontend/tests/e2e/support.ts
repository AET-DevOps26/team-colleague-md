import { expect, type Page, type Locator } from '@playwright/test';

/**
 * Shared helpers for the E2E suite. These specs drive the real frontend against a live, seeded
 * backend — no route-mocking of data. Identity comes from a real login with a seeded user, so the
 * refresh cookie and access token are genuine.
 *
 * The suite is deliberately thin: one spec per user story, each test a complete flow. Rendering
 * details, validation rules and component state belong in the Vitest suite (`tests/unit/`), which
 * is faster and runs in CI.
 *
 * Every target environment (local compose, verita-dev, Azure VM) must carry the same seed users.
 * The target is chosen with BASE_URL (see playwright.config.ts); SEED_PASSWORD overrides the
 * password where an environment does not use the local seed default.
 */

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Password123!';

export const SEED_USERS = {
  /** Seeded ADMIN — the only user that can reach /admin. */
  alexchen: { email: 'alex@example.com', username: 'alexchen', displayName: 'Alex Chen' },
  /** Seeded VERIFIED author — the "other user" in profile and visibility flows. */
  sarahjkim: { email: 'sarah.kim@example.com', username: 'sarahjkim', displayName: 'Sarah Kim' },
  /** Plain seeded user. */
  marcello: { email: 'marcello.rossi@example.com', username: 'marcello_r', displayName: 'Marcello Rossi' },
} as const;

export type SeedUser = (typeof SEED_USERS)[keyof typeof SEED_USERS];

/** Logs in through the real auth modal so the refresh cookie + access token are genuine. */
export async function loginAs(page: Page, user: SeedUser = SEED_USERS.alexchen): Promise<void> {
  await page.goto('/');
  await page.locator('[data-testid="sidebar-signin"]').click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await dialog.locator('input[type="email"]').fill(user.email);
  await dialog.locator('[data-testid="password-input"]').fill(SEED_PASSWORD);
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-testid="sidebar-signin"]')).toBeHidden();
}

/** Post cards render as either an image card or a text card; a flow rarely cares which. */
export function postCards(scope: Page | Locator): Locator {
  return scope.locator('[data-testid="image-card"], [data-testid="text-card"]');
}

/** Suffix for content a test creates, so reruns against a shared environment never collide. */
export function unique(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** A free username that fits the signup form's 20-char, `[A-Za-z0-9_]` rule. */
export function uniqueUsername(): string {
  return `e2e_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}
