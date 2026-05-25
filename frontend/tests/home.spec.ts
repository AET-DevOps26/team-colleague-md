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

test('VR-1: logged-out 3-column masonry at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="image-card"], [data-testid="text-card"]');
  await expect(page).toMatchSnapshot('home-logged-out-1440.png');
});

test('VR-2: logged-in 3-column masonry at 1440px', async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="image-card"], [data-testid="text-card"]');
  await expect(page).toMatchSnapshot('home-logged-in-1440.png');
});

test('VR-3: 2-column masonry at 1024px', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="image-card"], [data-testid="text-card"]');
  await expect(page).toMatchSnapshot('home-1024.png');
});

test('VR-4: single column at 759px', async ({ page }) => {
  await page.setViewportSize({ width: 759, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="image-card"], [data-testid="text-card"]');
  await expect(page).toMatchSnapshot('home-759.png');
});

test('LT-5: sidebar is 240px wide', async ({ page }) => {
  await page.goto('/');
  const box = await page.locator('[data-testid="sidebar"]').boundingBox();
  expect(box?.width).toBe(240);
});

test('LT-6: topbar has search row and tag row', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="topbar-search-row"]')).toBeVisible();
  await expect(page.locator('[data-testid="topbar-tag-row"]')).toBeVisible();
});

test('LT-7: feed has both image cards and text cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="image-card"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="text-card"]').first()).toBeVisible();
});

test('LT-8: digest card has dark background', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('[data-testid="digest-card"]');
  await expect(card).toBeVisible();
  const bg = await card.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(10, 10, 10)');
});

test('I-9: tag chip click updates active state', async ({ page }) => {
  await page.goto('/');
  const chips = page.locator('[data-testid="topbar-tag-row"] button');
  const second = chips.nth(1);
  await second.click();
  await expect(second).toHaveClass(/active/);
});

test('I-10: sidebar sign in opens auth modal', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="sidebar-signin"]').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});

test('I-11: auth banner shown when logged out', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="auth-banner"]')).toBeVisible();
});

test('I-11b: auth banner hidden when logged in', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await expect(page.locator('[data-testid="auth-banner"]')).not.toBeVisible();
});

test('I-12: FAB click triggers spin animation', async ({ page }) => {
  await page.goto('/');
  const fab = page.locator('[aria-label="Refresh feed"]');
  await fab.click();
  const cls = await fab.locator('svg').getAttribute('class');
  expect(cls).toContain('spinning');
});

test('I-13: scroll to bottom loads more posts', async ({ page }) => {
  await page.goto('/');
  const before = await page.locator('[data-testid="image-card"], [data-testid="text-card"]').count();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  const after = await page.locator('[data-testid="image-card"], [data-testid="text-card"]').count();
  expect(after).toBeGreaterThan(before);
});

test('I-14: search submit navigates to /search', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="topbar-search-row"] input[aria-label="Search"]').fill('transformers');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=transformers/);
});

test('S-15: logged-out state — banner visible, settings disabled, first chip is Trending', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="auth-banner"]')).toBeVisible();
  const pointerEvents = await page.locator('[data-testid="sidebar-settings"]').evaluate(
    (el) => window.getComputedStyle(el).pointerEvents
  );
  expect(pointerEvents).toBe('none');
  await expect(page.locator('[data-testid="topbar-tag-row"] button').first()).toHaveText('Trending');
});

test('S-16: logged-in state — banner absent, first chip is For you, digest badge visible', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await expect(page.locator('[data-testid="auth-banner"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="topbar-tag-row"] button').first()).toHaveText('For you');
  await expect(page.locator('[data-testid="digest-badge"]')).toBeVisible();
});
