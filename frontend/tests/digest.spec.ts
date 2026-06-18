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
    await expect(page.getByRole('button', { name: /Read/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Past digests' })).toBeVisible();
  });

  test('DIG-2: logged-out user sees sign-in prompt on /digest', async ({ page }) => {
    await page.goto('/digest');

    await expect(page).toHaveURL('/digest');
    await expect(page.getByText('Your personalised digest awaits')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('DIG-3: tabs switch between Past Digests and Manage Topics', async ({ page }) => {
    await login(page);
    await page.goto('/digest');

    await expect(page.getByRole('heading', { name: 'Past digests' })).toBeVisible();

    await page.getByRole('button', { name: 'Manage Topics' }).click();
    await expect(page.getByText('Manage topics')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Past digests' })).not.toBeVisible();

    await page.getByRole('button', { name: 'Past Digests' }).click();
    await expect(page.getByRole('heading', { name: 'Past digests' })).toBeVisible();
  });

  test('DIG-4: logged-in user can access Manage Topics tab and see topic grid', async ({ page }) => {
    await login(page);
    await page.goto('/digest');
    await page.getByRole('button', { name: 'Manage Topics' }).click();

    await expect(page.getByText('Manage topics')).toBeVisible();
    await expect(page.locator('[class*="topicCard"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save preferences' })).toBeVisible();
  });

  test('DIG-5: follow toggle updates following count', async ({ page }) => {
    await login(page);
    await page.goto('/digest');
    await page.getByRole('button', { name: 'Manage Topics' }).click();

    // The save bar shows "Following <N> topics"; find the <strong> inside it
    const saveBarInfo = page.locator('strong').filter({ hasText: /^\d+$/ }).first();
    const initialCount = parseInt(await saveBarInfo.textContent() ?? '0', 10);

    // Click the first "Following" button to unfollow a topic
    await page.getByRole('button', { name: 'Following', exact: true }).first().click();

    const newCount = parseInt(await saveBarInfo.textContent() ?? '0', 10);
    expect(newCount).toBe(initialCount - 1);
  });

  test('DIG-6: save preferences shows toast', async ({ page }) => {
    await login(page);
    await page.goto('/digest');
    await page.getByRole('button', { name: 'Manage Topics' }).click();

    await page.getByRole('button', { name: 'Save preferences' }).click();
    await expect(page.getByText('Preferences saved')).toBeVisible({ timeout: 3000 });
  });

  test('DIG-7: reset reverts unsaved follow changes', async ({ page }) => {
    await login(page);
    await page.goto('/digest');
    await page.getByRole('button', { name: 'Manage Topics' }).click();

    const saveBarInfo = page.locator('strong').filter({ hasText: /^\d+$/ }).first();
    const initialCount = parseInt(await saveBarInfo.textContent() ?? '0', 10);

    // Unfollow the first followed topic
    await page.getByRole('button', { name: 'Following', exact: true }).first().click();
    expect(parseInt(await saveBarInfo.textContent() ?? '0', 10)).toBe(initialCount - 1);

    // Reset should revert back to initial count
    await page.getByRole('button', { name: 'Reset' }).click();
    expect(parseInt(await saveBarInfo.textContent() ?? '0', 10)).toBe(initialCount);
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

  test('DIG-9: search filters topic list by displayName', async ({ page }) => {
    await login(page);
    await page.goto('/digest');
    await page.getByRole('button', { name: 'Manage Topics' }).click();

    await page.getByPlaceholder('Filter topics…').fill('agents');

    // Topic displayName "AI Agents" matches the slug "agents"; card renders "#AI Agents"
    await expect(page.locator('[class*="tagName"]').filter({ hasText: 'AI Agents' })).toBeVisible();
    // "Alignment" should not appear in the filtered results
    await expect(page.locator('[class*="tagName"]').filter({ hasText: 'Alignment' })).not.toBeVisible();
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
