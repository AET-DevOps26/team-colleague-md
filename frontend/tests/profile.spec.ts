import { test, expect, type Page } from '@playwright/test';

const MOCK_USER = {
  id: 'user-1',
  username: 'alexchen',
  displayName: 'Alex Chen',
  role: 'USER',
  email: 'alex@example.com',
};

async function login(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('verita_user', JSON.stringify(user));
    localStorage.setItem('verita_token', 'mock-token');
  }, MOCK_USER);
}

async function goToOwnProfile(page: Page) {
  await login(page);
  await page.goto('/profile/alexchen');
  await page.waitForSelector('[data-testid="profile-page"]');
}

async function goToOtherProfile(page: Page) {
  await login(page);
  await page.goto('/profile/sarahjkim');
  await page.waitForSelector('[data-testid="profile-page"]');
}

/** Returns the first post card in the active posts grid. */
function firstPostCard(page: Page) {
  return page
    .locator('[data-testid="posts-grid"] [data-testid="image-card"], [data-testid="posts-grid"] [data-testid="text-card"]')
    .first();
}

// ── UP-1: own profile shows avatar edit button ─────────────────────────
test('UP-1: own profile shows Edit Profile button', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('avatar-edit-btn')).toBeVisible();
});

// ── UP-2: own profile shows Drafts tab ─────────────────────────────────
test('UP-2: own profile shows Drafts tab', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('tab-drafts')).toBeVisible();
});

// ── UP-3: other user profile has no Follow button ──────────────────────
test('UP-3: other user profile does not show Follow button', async ({ page }) => {
  await goToOtherProfile(page);
  await expect(page.getByTestId('follow-btn')).not.toBeAttached();
});

// ── UP-4: other user profile does NOT show Drafts tab ─────────────────
test('UP-4: other user profile does not show Drafts tab', async ({ page }) => {
  await goToOtherProfile(page);
  await expect(page.getByTestId('tab-drafts')).not.toBeVisible();
});

// ── UP-5: own profile has no Follow button ─────────────────────────────
test('UP-5: own profile does not show Follow button', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('follow-btn')).not.toBeAttached();
});

// ── UP-6: profile displays name, handle, bio and stats ─────────────────
test('UP-6: profile displays name, handle, bio and stats', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('profile-name')).toHaveText('Alex Chen');
  await expect(page.getByTestId('profile-handle')).toHaveText('@alexchen');
  await expect(page.getByTestId('profile-bio')).toBeVisible();
  await expect(page.getByTestId('profile-stats')).toBeVisible();
});

// ── UP-7: verified badge shown for VERIFIED user ───────────────────────
test('UP-7: verified badge shown for VERIFIED user profile', async ({ page }) => {
  await goToOtherProfile(page);
  await expect(page.getByTestId('verified-badge')).toBeVisible();
});

// ── UP-8: no verified badge on USER role profile ───────────────────────
test('UP-8: no verified badge on USER role profile', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('verified-badge')).not.toBeVisible();
});

// ── UP-9: edit profile modal opens on button click ─────────────────────
test('UP-9: edit profile modal opens when Edit Profile clicked', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('avatar-edit-btn').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});

// ── UP-10: edit profile modal has correct fields ───────────────────────
test('UP-10: edit profile modal contains expected form fields', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('avatar-edit-btn').click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.getByTestId('edit-display-name')).toBeVisible();
  await expect(dialog.getByTestId('edit-bio')).toBeVisible();
  await expect(dialog.getByTestId('edit-organization')).toBeVisible();
  await expect(dialog.getByTestId('edit-website')).toBeVisible();
  await expect(dialog.getByTestId('edit-expertise')).toBeVisible();
});

// ── UP-11: edit profile save updates display name ──────────────────────
test('UP-11: saving edit profile updates display name on page', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('avatar-edit-btn').click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.getByTestId('edit-display-name').fill('Alex Updated');
  await dialog.getByTestId('edit-save-btn').click();
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  await expect(page.getByTestId('profile-name')).toHaveText('Alex Updated');
});

// UP-12 removed — Follow button hidden until backend follow API is implemented

// ── UP-13: tabs switch content ─────────────────────────────────────────
test('UP-13: switching to Bookmarks tab shows bookmark content', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('tab-bookmarks').click();
  await expect(page.getByTestId('tab-bookmarks')).toHaveAttribute('aria-selected', 'true');
});

// ── UP-14: switching to Drafts tab shows draft cards ──────────────────
test('UP-14: switching to Drafts tab shows draft cards', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('tab-drafts').click();
  await expect(page.getByTestId('drafts-grid')).toBeVisible();
  const draftCards = page.locator('[data-testid^="draft-card-"]');
  await expect(draftCards.first()).toBeVisible();
});

// ── UP-15: clicking a post card navigates to post detail ───────────────
// Fixed: cards are now ImageCard/TextCard (data-testid="image-card" or "text-card")
test('UP-15: clicking a post card navigates to post detail', async ({ page }) => {
  await login(page);
  await page.goto('/profile/sarahjkim');
  await page.waitForSelector('[data-testid="profile-page"]');
  const card = page
    .locator('[data-testid="posts-grid"] [data-testid="image-card"], [data-testid="posts-grid"] [data-testid="text-card"]')
    .first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/post\//);
});

// ── UP-16: unauthenticated user can view profile ───────────────────────
test('UP-16: unauthenticated user sees profile without edit or follow buttons', async ({ page }) => {
  await page.goto('/profile/sarahjkim');
  await page.waitForSelector('[data-testid="profile-page"]');
  await expect(page.getByTestId('avatar-edit-btn')).not.toBeVisible();
  await expect(page.getByTestId('profile-name')).toHaveText('Sarah Kim');
});

// ── UP-17: profile accessible via Settings link ────────────────────────
test('UP-17: navigating from Settings Edit Profile link loads own profile', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await page.locator('[data-testid="sidebar-settings"]').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await page.getByTestId('settings-edit-profile').click();
  await page.waitForSelector('[data-testid="profile-page"]');
  await expect(page).toHaveURL('/profile/alexchen');
  await expect(page.getByTestId('avatar-edit-btn')).toBeVisible();
});

// ── UP-18: tab order is Posts → Bookmarks → Likes → Drafts ────────────
test('UP-18: tabs appear in order Posts, Bookmarks, Likes, Drafts', async ({ page }) => {
  await goToOwnProfile(page);
  const tabs = page.locator('[role="tablist"] [role="tab"]');
  await expect(tabs.nth(0)).toContainText('Posts');
  await expect(tabs.nth(1)).toContainText('Bookmarks');
  await expect(tabs.nth(2)).toContainText('Likes');
  await expect(tabs.nth(3)).toContainText('Drafts');
});

// ── UP-19: each tab has an icon ────────────────────────────────────────
test('UP-19: each tab contains an SVG icon', async ({ page }) => {
  await goToOwnProfile(page);
  const tabs = page.locator('[role="tablist"] [role="tab"]');
  for (let i = 0; i < 4; i++) {
    await expect(tabs.nth(i).locator('svg')).toBeVisible();
  }
});

// ── UP-20: own profile posts show manage button ────────────────────────
test('UP-20: own profile posts grid shows manage buttons', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('posts-grid')).toBeVisible();
  const manageBtn = page.locator('[data-testid^="manage-btn-"]').first();
  await expect(manageBtn).toBeVisible();
});

// ── UP-21: other profile posts have no manage button ──────────────────
test('UP-21: other profile posts grid has no manage buttons', async ({ page }) => {
  await goToOtherProfile(page);
  await expect(page.getByTestId('posts-grid')).toBeVisible();
  await expect(page.locator('[data-testid^="manage-btn-"]')).toHaveCount(0);
});

// ── UP-22: delete post — confirmation dialog cancel ────────────────────
test('UP-22: delete post shows confirmation dialog; cancel keeps post', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('posts-grid')).toBeVisible();

  const manageBtn = page.locator('[data-testid^="manage-btn-"]').first();
  await manageBtn.click();
  await page.getByRole('menuitem', { name: 'Delete post' }).click();

  // Confirm dialog appears
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Delete?');

  // Cancel — dialog closes, post still in grid
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(firstPostCard(page)).toBeVisible();
});

// ── UP-23: delete post — confirm removes post from grid ────────────────
test('UP-23: confirming delete removes post from grid', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('posts-grid')).toBeVisible();

  const countBefore = await page
    .locator('[data-testid="posts-grid"] [data-testid="image-card"], [data-testid="posts-grid"] [data-testid="text-card"]')
    .count();

  const manageBtn = page.locator('[data-testid^="manage-btn-"]').first();
  await manageBtn.click();
  await page.getByRole('menuitem', { name: 'Delete post' }).click();
  await expect(page.getByRole('dialog')).toContainText('Delete?');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('dialog')).not.toBeVisible();
  const countAfter = await page
    .locator('[data-testid="posts-grid"] [data-testid="image-card"], [data-testid="posts-grid"] [data-testid="text-card"]')
    .count();
  expect(countAfter).toBe(countBefore - 1);
});

// ── UP-24: unpublish — confirmation dialog and moves to drafts ─────────
test('UP-24: unpublish shows confirmation; confirmed post appears in Drafts', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('posts-grid')).toBeVisible();

  const manageBtn = page.locator('[data-testid^="manage-btn-"]').first();
  await manageBtn.click();
  await page.getByRole('menuitem', { name: 'Unpublish' }).click();

  // Confirm dialog appears with unpublish copy
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Unpublish post?');

  await page.getByRole('dialog').getByRole('button', { name: 'Unpublish' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  // Switch to Drafts tab — the unpublished post should now appear there
  await page.getByTestId('tab-drafts').click();
  await expect(page.getByTestId('drafts-grid')).toBeVisible();
  const draftCards = page.locator('[data-testid^="draft-card-"]');
  await expect(draftCards.first()).toBeVisible();
});

// ── UP-25: draft delete — confirmation dialog cancel ──────────────────
test('UP-25: draft delete shows confirmation dialog; cancel keeps draft', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('tab-drafts').click();
  await expect(page.getByTestId('drafts-grid')).toBeVisible();

  const firstDraft = page.locator('[data-testid^="draft-card-"]').first();
  await firstDraft.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Delete?');

  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('[data-testid^="draft-card-"]').first()).toBeVisible();
});

// ── UP-26: draft delete — confirm removes draft ────────────────────────
test('UP-26: confirming draft delete removes it from drafts grid', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('tab-drafts').click();
  await expect(page.getByTestId('drafts-grid')).toBeVisible();

  const countBefore = await page.locator('[data-testid^="draft-card-"]').count();

  await page.locator('[data-testid^="draft-card-"]').first().getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('dialog')).toContainText('Delete?');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('[data-testid^="draft-card-"]')).toHaveCount(countBefore - 1);
});

// ── UP-27: website validation — invalid URL shows error ────────────────
test('UP-27: invalid website URL shows error and blocks save', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('avatar-edit-btn').click();
  const dialog = page.locator('[role="dialog"]');

  // "hello world" normalizes to "https://hello world" — space in hostname is invalid
  await dialog.getByTestId('edit-website').fill('hello world');
  await dialog.getByTestId('edit-save-btn').click();

  // Dialog stays open with an error message; save button is not in saving state
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('edit-save-btn')).toHaveText('Save Changes');
  await expect(dialog).toContainText('valid URL');
});

// ── UP-28: website validation — bare domain gets https:// prepended ────
test('UP-28: website without protocol is normalized to https://', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('avatar-edit-btn').click();
  const dialog = page.locator('[role="dialog"]');

  await dialog.getByTestId('edit-website').fill('example.com');
  await dialog.getByTestId('edit-save-btn').click();
  await expect(dialog).not.toBeVisible();

  // The saved website link href should be https://example.com
  const websiteLink = page.locator('[data-testid="profile-page"] a[href="https://example.com"]');
  await expect(websiteLink).toBeAttached();
});

// ── UP-29: Bookmarks tab shows Saved badge on cards ────────────────────
// All tab panels stay in the DOM (display:none when inactive), so cards from
// inactive panels are "hidden". Use :visible to target only the active panel's cards.
test('UP-29: Bookmarks tab cards show Saved badge', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('tab-bookmarks').click();
  await expect(page.getByTestId('tab-bookmarks')).toHaveAttribute('aria-selected', 'true');

  const visibleCard = page
    .locator('[data-testid="image-card"]:visible, [data-testid="text-card"]:visible')
    .first();
  await expect(visibleCard).toBeVisible();
  await expect(page.getByText('Saved').first()).toBeVisible();
});

// ── UP-30: Likes tab is switchable and shows cards ─────────────────────
test('UP-30: Likes tab is selectable and renders post cards', async ({ page }) => {
  await goToOwnProfile(page);
  await page.getByTestId('tab-likes').click();
  await expect(page.getByTestId('tab-likes')).toHaveAttribute('aria-selected', 'true');

  const visibleCard = page
    .locator('[data-testid="image-card"]:visible, [data-testid="text-card"]:visible')
    .first();
  await expect(visibleCard).toBeVisible();
});
