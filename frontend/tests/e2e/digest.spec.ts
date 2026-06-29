import { test, expect, type Page } from '@playwright/test';

const MOCK_USER = {
  id: '1',
  username: 'testuser',
  displayName: 'Test User',
  role: 'USER',
  email: 'test@example.com',
};

async function login(page: Page) {
  // Set localStorage so getCurrentUser() returns the mock user immediately
  await page.addInitScript((user) => {
    localStorage.setItem('verita_user', JSON.stringify(user));
    localStorage.setItem('verita_token', 'mock-token');
  }, MOCK_USER);
  // Intercept the refresh-token call so AuthContext.restoreSession() succeeds
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'mock-token', user: MOCK_USER }),
    })
  );
}

test.describe('Digest Management', () => {
  test('DIG-1: logged-in user sees today hero and past digests', async ({ page }) => {
    await login(page);
    await page.goto('/digest');

    await expect(page.getByText('Today ·', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Read', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Past digests' })).toBeVisible();
  });

  test('DIG-2: logged-out user sees sign-in prompt on /digest', async ({ page }) => {
    await page.goto('/digest');

    await expect(page).toHaveURL('/digest');
    await expect(page.getByText('Your personalised digest awaits')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('DIG-3: digest is a single past-digests view with no tab bar', async ({ page }) => {
    await login(page);
    await page.goto('/digest');

    await expect(page.getByRole('heading', { name: 'Past digests' })).toBeVisible();
    // Topic management moved to the standalone Topic page (ADR-0014) — no tabs remain here.
    await expect(page.getByRole('tab', { name: 'Manage Topics' })).toHaveCount(0);
    await expect(page.getByPlaceholder('Filter topics…')).toHaveCount(0);
  });

  test('DIG-8: load more adds more digest cards', async ({ page }) => {
    await login(page);
    await page.goto('/digest');

    // Count only the digest history cards (role="button" with aria-label starting with "Read digest")
    const initialCards = await page.locator('[role="button"][aria-label^="Read digest"]').count();

    await page.getByRole('button', { name: 'Load more' }).click();

    const newCards = await page.locator('[role="button"][aria-label^="Read digest"]').count();
    expect(newCards).toBeGreaterThan(initialCards);
  });

  test('DIG-10: back button navigates away from digest page', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await page.goto('/digest');

    // PostDetailTopbar renders a back button with text "Explore" (default from state)
    await page.getByRole('button', { name: /Explore|Back/i }).first().click();

    await expect(page).not.toHaveURL('/digest');
  });
});
