import { test, expect } from '@playwright/test';
import { loginAs, SEED_USERS } from './support';

/**
 * Admin panel + 404 (ADR-0020). Like the rest of the E2E suite these run against a live, seeded
 * backend. The seed gives alexchen the ADMIN role and sarahjkim a plain one, which is what makes
 * the guard assertions meaningful: the same route must render for one and redirect the other.
 */

test.describe('Admin — route guard', () => {
  test('ADM-1: anonymous visitor is redirected Home, never shown the panel', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="admin-page"]')).toHaveCount(0);
  });

  test('ADM-2: non-admin is redirected Home and has no Admin nav item', async ({ page }) => {
    await loginAs(page, SEED_USERS.sarahjkim);
    await page.goto('/admin');

    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="admin-page"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="sidebar-admin"]')).toHaveCount(0);
  });

  test('ADM-3: admin reaches the panel and survives a hard refresh', async ({ page }) => {
    await loginAs(page, SEED_USERS.alexchen);
    await page.goto('/admin');

    await expect(page.locator('[data-testid="admin-page"]')).toBeVisible();

    // Session restore is async; the guard must wait for it or a refresh bounces a real admin.
    await page.reload();
    await expect(page.locator('[data-testid="admin-page"]')).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('ADM-4: admin sees the Admin nav item and can navigate from it', async ({ page }) => {
    await loginAs(page, SEED_USERS.alexchen);

    await page.locator('[data-testid="sidebar-admin"]').click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('[data-testid="admin-page"]')).toBeVisible();
  });
});

test.describe('Admin — users tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, SEED_USERS.alexchen);
    await page.goto('/admin');
  });

  test('ADM-5: users load with email and role, and search filters server-side', async ({ page }) => {
    const rows = page.locator('[data-testid="admin-user-row"]');
    await expect(rows.first()).toBeVisible();

    await page.locator('[data-testid="admin-user-search"]').fill('sarah');

    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('sarah.kim@example.com');
  });

  test('ADM-6: the acting admin cannot change their own role or ban themselves', async ({ page }) => {
    await page.locator('[data-testid="admin-user-search"]').fill(SEED_USERS.alexchen.username);

    const ownRow = page.locator('[data-testid="admin-user-row"]').first();
    await expect(ownRow).toContainText(SEED_USERS.alexchen.displayName);
    await expect(ownRow.locator('[data-testid="admin-role-select"]')).toBeDisabled();
    await expect(ownRow.locator('[data-testid="admin-ban-button"]')).toBeDisabled();
  });

});

test.describe('Admin — operations tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, SEED_USERS.alexchen);
    await page.goto('/admin');
    await page.locator('[data-testid="admin-tab-operations"]').click();
  });

  test('ADM-8: the live LLM config loads and keyless providers cannot be selected', async ({ page }) => {
    await expect(page.locator('[data-testid="admin-llm-current"]')).toContainText('active:');

    const providerSelect = page.locator('[data-testid="admin-llm-provider"]');
    await expect(providerSelect).toBeVisible();
    await expect(page.locator('[data-testid="admin-llm-model"]')).not.toHaveValue('');

    // Providers without an API key are reported by GenAI and rendered unselectable.
    const disabled = providerSelect.locator('option[disabled]');
    for (const option of await disabled.all()) {
      await expect(option).toContainText('no API key');
    }
  });

  test('ADM-9: re-summarize rejects a value that carries no post ID', async ({ page }) => {
    await page.locator('[data-testid="admin-resummarize-input"]').fill('not-a-post');
    await page.locator('[data-testid="admin-resummarize-submit"]').click();

    await expect(page.getByText('Paste a post ID or a post URL', { exact: false })).toBeVisible();
  });

  test('ADM-7: digest generation defaults to yesterday and cannot run without a user', async ({ page }) => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await expect(page.locator('[data-testid="admin-digest-date"]')).toHaveValue(yesterday);

    // A digest is generated *for someone*; there is nothing to submit until one is picked.
    await expect(page.locator('[data-testid="admin-digest-submit"]')).toBeDisabled();
  });

  test('ADM-10: picking a user and generating starts a job the panel reports on', async ({ page }) => {
    await page.locator('[data-testid="admin-digest-user-search"]').fill('sarah');
    await page.locator('[data-testid="admin-digest-user-option"]').first().click();

    await expect(page.locator('[data-testid="admin-digest-user-search"]')).toHaveValue(
      `@${SEED_USERS.sarahjkim.username}`,
    );
    await page.locator('[data-testid="admin-digest-force"]').check();
    await page.locator('[data-testid="admin-digest-submit"]').click();

    // The 202 carries a PENDING job; the panel then polls it, so the status is the contract here.
    const status = page.locator('[data-testid="admin-digest-status"]');
    await expect(status).toBeVisible();
    await expect(status).toContainText(/PENDING|COMPLETED|SKIPPED|FAILED/);
  });
});

test.describe('404', () => {
  test('NF-1: an unknown route renders the 404 inside the app shell', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.locator('[data-testid="not-found"]')).toBeVisible();
    await expect(page.getByText('This page has gone off the record.')).toBeVisible();
    // Rendered inside AppLayout, so the sidebar is still there to escape with.
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });

  test('NF-2: "Back to Home" navigates home', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await page.locator('[data-testid="not-found-home"]').click();

    await expect(page).toHaveURL('/');
  });

  test('NF-3: "Go back" returns to the previous page', async ({ page }) => {
    await page.goto('/');
    await page.goto('/this-route-does-not-exist');

    await page.locator('[data-testid="not-found-back"]').click();

    await expect(page).toHaveURL('/');
  });
});
