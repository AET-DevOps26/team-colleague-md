import { test, expect, type Page } from '@playwright/test';
import { loginAs, SEED_USERS } from './support';

/**
 * US: Settings.
 *
 * The modal's copy and row rendering are unit-tested. The two stories that need a real session are
 * signing out, and a privacy toggle actually changing what another visitor sees.
 */

async function openSettings(page: Page) {
  await page.locator('[data-testid="sidebar-settings"]').click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  // The modal fetches current settings after it opens; touching a toggle before that lands would
  // be overwritten by the arriving state.
  await expect(dialog.getByTestId('settings-email')).toHaveText(SEED_USERS.alexchen.email);
  return dialog;
}

/** Drives the toggle to `visible`, whatever the account was left on by an earlier run. */
async function setBookmarkVisibility(page: Page, visible: boolean) {
  await loginAs(page);
  const dialog = await openSettings(page);
  const toggle = dialog.getByTestId('settings-toggle-bookmarks');

  // Only click when it is not already there — an earlier run may have left it either way.
  if ((await toggle.isChecked()) !== visible) {
    await dialog.locator('[aria-label="Show bookmarks to others"]').click();
    await expect(page.getByText('Settings saved')).toBeVisible();
  }
  await expect(toggle).toBeChecked({ checked: visible });
}

/** Looks at alexchen's profile as a signed-out visitor. */
async function visitProfileAsGuest(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto(`/profile/${SEED_USERS.alexchen.username}`);
  await expect(page.locator('[data-testid="profile-page"]')).toBeVisible();
}

test('SET-1: signing out ends the session and restores the signed-out shell', async ({ page }) => {
  await loginAs(page);
  const dialog = await openSettings(page);

  await dialog.getByTestId('settings-signout').click();

  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-testid="sidebar-signin"]')).toBeVisible();

  // A reload must not resurrect the session — the refresh cookie is gone too.
  await page.reload();
  await expect(page.locator('[data-testid="sidebar-signin"]')).toBeVisible();
});

test('SET-2: the bookmarks privacy toggle controls what other visitors see', async ({ page }) => {
  // The tab is always offered; the setting governs whether a visitor may see inside it.
  await setBookmarkVisibility(page, false);
  await visitProfileAsGuest(page);
  await page.getByTestId('tab-bookmarks').click();
  await expect(page.getByText('Bookmarks are private')).toBeVisible();

  await setBookmarkVisibility(page, true);
  await visitProfileAsGuest(page);
  await page.getByTestId('tab-bookmarks').click();
  await expect(page.getByText('Bookmarks are private')).toHaveCount(0);
});
