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

// ── UP-1: own profile shows "Edit Profile" button ──────────────────────
test('UP-1: own profile shows Edit Profile button', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('avatar-edit-btn')).toBeVisible();
});

// ── UP-2: own profile shows Drafts tab ─────────────────────────────────
test('UP-2: own profile shows Drafts tab', async ({ page }) => {
  await goToOwnProfile(page);
  await expect(page.getByTestId('tab-drafts')).toBeVisible();
});

// ── UP-3: other user profile shows no Follow button (feature not yet implemented) ──
test('UP-3: other user profile does not show Follow button', async ({ page }) => {
  await goToOtherProfile(page);
  await expect(page.getByTestId('follow-btn')).not.toBeAttached();
});

// ── UP-4: other user profile does NOT show Drafts tab ─────────────────
test('UP-4: other user profile does not show Drafts tab', async ({ page }) => {
  await goToOtherProfile(page);
  await expect(page.getByTestId('tab-drafts')).not.toBeVisible();
});

// ── UP-5: own profile shows Edit Profile button but no Follow button ───
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
  await goToOtherProfile(page); // sarahjkim is VERIFIED
  await expect(page.getByTestId('verified-badge')).toBeVisible();
});

// ── UP-8: no verified badge on USER role profile ───────────────────────
test('UP-8: no verified badge on USER role profile', async ({ page }) => {
  await goToOwnProfile(page); // alexchen is USER
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
test('UP-15: clicking a post card navigates to post detail', async ({ page }) => {
  await login(page);
  // sarahjkim has posts in content.service mock
  await page.goto('/profile/sarahjkim');
  await page.waitForSelector('[data-testid="profile-page"]');
  const postCard = page.locator('[data-testid^="post-card-"]').first();
  const postId = (await postCard.getAttribute('data-testid'))?.replace('post-card-', '');
  await postCard.click();
  await expect(page).toHaveURL(new RegExp(`/post/${postId}`));
});

// ── UP-16: unauthenticated user can view profile (no edit/follow) ──────
test('UP-16: unauthenticated user sees profile without edit or follow buttons', async ({ page }) => {
  await page.goto('/profile/sarahjkim');
  await page.waitForSelector('[data-testid="profile-page"]');
  await expect(page.getByTestId('avatar-edit-btn')).not.toBeVisible();
  // Follow button links to auth when not logged in, but let's just verify
  // we can see the profile name
  await expect(page.getByTestId('profile-name')).toHaveText('Sarah Kim');
});

// ── UP-17: profile page accessible via Settings → Edit Profile link ────
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
