import { test, expect, type Page } from '@playwright/test';

const MOCK_USER = {
  id: '1',
  username: 'testuser',
  displayName: 'Test User',
  role: 'USER',
  email: 'test@example.com',
};

async function login(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('verita_user', JSON.stringify(user));
    localStorage.setItem('verita_token', 'mock-token');
  }, MOCK_USER);
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'mock-token', user: MOCK_USER }),
    })
  );
}

test.describe('Topic page', () => {
  test('TOP-1: logged-out user sees sign-in prompt on /topics', async ({ page }) => {
    await page.goto('/topics');

    await expect(page).toHaveURL('/topics');
    await expect(page.getByText('Follow the topics you care about')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('TOP-2: logged-in user sees the topic grid', async ({ page }) => {
    await login(page);
    await page.goto('/topics');

    await expect(page.getByPlaceholder('Filter topics…')).toBeVisible();
    await expect(page.locator('[class*="topicCard"]').first()).toBeVisible();
  });

  test('TOP-3: follow toggle updates following count in the pill', async ({ page }) => {
    await login(page);
    await page.goto('/topics');

    const countEl = page.locator('[class*="followPill"] strong');
    const initialCount = parseInt(await countEl.textContent() ?? '0', 10);

    await page.getByRole('button', { name: /^Unfollow / }).first().click();

    const newCount = parseInt(await countEl.textContent() ?? '0', 10);
    expect(newCount).toBe(initialCount - 1);
  });

  test('TOP-4: following a topic shows follow toast', async ({ page }) => {
    await login(page);
    await page.goto('/topics');

    await page.getByRole('button', { name: /^Follow / }).first().click();
    await expect(page.getByText(/Following #/)).toBeVisible({ timeout: 3000 });
  });

  test('TOP-5: unfollowing a topic shows unfollow toast', async ({ page }) => {
    await login(page);
    await page.goto('/topics');

    await page.getByRole('button', { name: /^Unfollow / }).first().click();
    await expect(page.getByText(/Unfollowed #/)).toBeVisible({ timeout: 3000 });
  });

  test('TOP-6: search filters topic list by displayName', async ({ page }) => {
    await login(page);
    await page.goto('/topics');

    await page.getByPlaceholder('Filter topics…').fill('agents');

    await expect(page.locator('[class*="tagName"]').filter({ hasText: 'AI Agents' })).toBeVisible();
    await expect(page.locator('[class*="tagName"]').filter({ hasText: 'Alignment' })).not.toBeVisible();
  });

  test('TOP-7: sidebar Topic item navigates to /topics', async ({ page }) => {
    await login(page);
    await page.goto('/');

    await page.getByRole('link', { name: 'Topic', exact: true }).click();

    await expect(page).toHaveURL('/topics');
    await expect(page.getByPlaceholder('Filter topics…')).toBeVisible();
  });
});
