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
}

async function openSettingsModal(page: Page) {
  await login(page);
  await page.goto('/');
  await page.locator('[data-testid="sidebar-settings"]').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
}

test.describe('Settings Modal', () => {
  test('SM-1: opens when settings icon clicked while logged in', async ({ page }) => {
    await openSettingsModal(page);
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('SM-2: account section shows stacked email and username', async ({ page }) => {
    await openSettingsModal(page);
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByTestId('settings-email')).toHaveText('test@example.com');
    await expect(dialog.getByTestId('settings-username')).toHaveText('@testuser');
  });

  test('SM-3: edit profile link-row has description text', async ({ page }) => {
    await openSettingsModal(page);
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByTestId('settings-edit-profile')).toContainText('Edit Profile');
    await expect(dialog.getByTestId('settings-edit-profile')).toContainText('Update bio, avatar, and profile fields');
  });

  test('SM-4: sign out link-row has description text and signs out on click', async ({ page }) => {
    await openSettingsModal(page);
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByTestId('settings-signout')).toContainText('Sign out');
    await expect(dialog.getByTestId('settings-signout')).toContainText('End your session on this device');
    await dialog.getByTestId('settings-signout').click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="sidebar-signin"]')).toBeVisible();
  });

  test('SM-5: digest frequency buttons change active state', async ({ page }) => {
    await openSettingsModal(page);
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByTestId('settings-freq-daily')).toBeVisible();
    await expect(dialog.getByTestId('settings-freq-weekly')).toBeVisible();
    await expect(dialog.getByTestId('settings-freq-off')).toBeVisible();
    await dialog.getByTestId('settings-freq-weekly').click();
    await expect(dialog.getByTestId('settings-freq-weekly')).toHaveClass(/freqActive/);
  });

  test('SM-6: manage topics link-row has description text', async ({ page }) => {
    await openSettingsModal(page);
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByTestId('settings-manage-topics')).toContainText('Manage Topics');
    await expect(dialog.getByTestId('settings-manage-topics')).toContainText('Subscribe or unsubscribe from digest topics');
  });

  test('SM-7: privacy toggles have description text', async ({ page }) => {
    await openSettingsModal(page);
    const dialog = page.locator('[role="dialog"]');
    // Inputs are visually hidden (opacity:0, width:0) — check they exist in DOM
    await expect(dialog.getByTestId('settings-toggle-bookmarks')).toBeAttached();
    await expect(dialog.getByTestId('settings-toggle-likes')).toBeAttached();
    // Description text is visible in the toggle row
    await expect(dialog.locator('[aria-label="Show bookmarks to others"]').locator('xpath=ancestor::div[contains(@class,"toggleRow")]')).toContainText('Visible on your public profile');
  });

  test('SM-8: privacy toggles are interactive', async ({ page }) => {
    await openSettingsModal(page);
    const dialog = page.locator('[role="dialog"]');
    const bookmarkToggle = dialog.getByTestId('settings-toggle-bookmarks');
    await expect(bookmarkToggle).not.toBeChecked();
    // Click the visible label (switch container) to toggle the hidden input
    await dialog.locator('[aria-label="Show bookmarks to others"]').click();
    await expect(bookmarkToggle).toBeChecked();
  });
});
