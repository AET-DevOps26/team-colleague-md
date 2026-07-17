import { test, expect, type Page } from '@playwright/test';
import { loginAs, SEED_USERS } from './support';

/**
 * US: User Profile.
 *
 * `alexchen` is the signed-in user; `sarahjkim` is the other author. The edit and unpublish flows
 * persist to the seeded DB, so reseed between runs (see docs/testing/Frontend_Testing.md).
 */

async function goToProfile(page: Page, username: string) {
  await page.goto(`/profile/${username}`);
  await expect(page.locator('[data-testid="profile-page"]')).toBeVisible();
}

test('PROF-1: an author sees management affordances on their own profile but not on another', async ({ page }) => {
  await loginAs(page);

  await goToProfile(page, SEED_USERS.alexchen.username);
  await expect(page.getByTestId('profile-name')).toHaveText(SEED_USERS.alexchen.displayName);
  await expect(page.getByTestId('profile-handle')).toContainText(SEED_USERS.alexchen.username);
  await expect(page.getByTestId('profile-stats')).toBeVisible();
  await expect(page.getByTestId('avatar-edit-btn')).toBeVisible();
  await expect(page.getByTestId('tab-drafts')).toBeVisible();

  // Someone else's profile is read-only: no drafts, no edit.
  await goToProfile(page, SEED_USERS.sarahjkim.username);
  await expect(page.getByTestId('profile-name')).toHaveText(SEED_USERS.sarahjkim.displayName);
  await expect(page.getByTestId('avatar-edit-btn')).toBeHidden();
  await expect(page.getByTestId('tab-drafts')).toBeHidden();
});

test('PROF-2: profile edits are saved and survive a refresh', async ({ page }) => {
  await loginAs(page);
  await goToProfile(page, SEED_USERS.alexchen.username);

  const bio = `Researching retrieval systems. Edited by E2E at ${Date.now()}.`;
  await page.getByTestId('avatar-edit-btn').click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.getByTestId('edit-bio').fill(bio);
  await dialog.getByTestId('edit-organisation').fill('Verita Labs');
  await dialog.getByTestId('edit-save-btn').click();

  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('profile-bio')).toHaveText(bio);

  // A refresh re-reads from user-service, so this is the write, not local state.
  await page.reload();
  await expect(page.getByTestId('profile-bio')).toHaveText(bio);
  await expect(page.getByTestId('profile-org')).toContainText('Verita Labs');
});

test('PROF-3: unpublishing a post moves it out of Posts and into Drafts', async ({ page }) => {
  await loginAs(page);
  await goToProfile(page, SEED_USERS.alexchen.username);
  await expect(page.getByTestId('posts-grid')).toBeVisible();

  await page.locator('[data-testid^="manage-btn-"]').first().click();
  await page.getByRole('menuitem', { name: 'Unpublish' }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText('Unpublish post?');
  await confirm.getByRole('button', { name: 'Unpublish' }).click();
  await expect(confirm).toBeHidden();

  await page.getByTestId('tab-drafts').click();
  await expect(page.getByTestId('drafts-grid')).toBeVisible();
  await expect(page.locator('[data-testid^="draft-card-"]').first()).toBeVisible();
});

test('PROF-4: a visitor sees the profile without any management controls', async ({ page }) => {
  await goToProfile(page, SEED_USERS.sarahjkim.username);

  await expect(page.getByTestId('profile-name')).toHaveText(SEED_USERS.sarahjkim.displayName);
  // sarahjkim is seeded VERIFIED, so the badge is part of what a visitor should see.
  await expect(page.getByTestId('verified-badge')).toBeVisible();
  await expect(page.getByTestId('avatar-edit-btn')).toBeHidden();
  await expect(page.getByTestId('tab-drafts')).toBeHidden();
});
