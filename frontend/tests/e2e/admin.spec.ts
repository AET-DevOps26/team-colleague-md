import { test, expect } from '@playwright/test';
import { loginAs, SEED_USERS } from './support';

/**
 * US: Admin GenAI ops (ADR-0020, ADR-0007).
 *
 * The seed gives alexchen the ADMIN role and sarahjkim a plain one, which is what makes the guard
 * meaningful: the same route must render for one and redirect the other. The LLM config is served
 * through content-service's admin front door and forwarded to GenAI over the internal-service-token
 * channel, so it can only be exercised with the real stack up.
 */

test('ADM-1: /admin is reachable for an admin and closed to everyone else', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-testid="admin-page"]')).toHaveCount(0);

  await loginAs(page, SEED_USERS.sarahjkim);
  await page.goto('/admin');
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-testid="sidebar-admin"]')).toHaveCount(0);
});

test('ADM-2: an admin reaches the panel and it survives a hard refresh', async ({ page }) => {
  await loginAs(page, SEED_USERS.alexchen);

  await page.locator('[data-testid="sidebar-admin"]').click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('[data-testid="admin-page"]')).toBeVisible();

  // Session restore is async; the guard must wait for it or a refresh bounces a real admin.
  await page.reload();
  await expect(page.locator('[data-testid="admin-page"]')).toBeVisible();
});

test('ADM-3: the live LLM config loads and unconfigured providers cannot be selected', async ({ page }) => {
  await loginAs(page, SEED_USERS.alexchen);
  await page.goto('/admin');
  await page.locator('[data-testid="admin-tab-operations"]').click();

  await expect(page.locator('[data-testid="admin-llm-current"]')).toContainText('active:');
  await expect(page.locator('[data-testid="admin-llm-model"]')).not.toHaveValue('');

  // GenAI reports which providers have their connection setting; the rest must be unselectable.
  const disabled = page.locator('[data-testid="admin-llm-provider"] option[disabled]');
  for (const option of await disabled.all()) {
    await expect(option).toContainText('not configured');
  }
});
