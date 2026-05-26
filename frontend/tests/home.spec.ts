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

const STUB_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function stubImages(page: Page) {
  // Match URLs with image file extensions.
  await page.route(/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/, (route) => {
    route.fulfill({ status: 200, contentType: 'image/png', body: STUB_PNG });
  });
  // Match extensionless Unsplash CDN URLs (and similar image CDNs).
  await page.route(/images\.unsplash\.com\//, (route) => {
    route.fulfill({ status: 200, contentType: 'image/png', body: STUB_PNG });
  });
}

// Freeze Date.now() to a fixed epoch so timeAgo() and date strings are deterministic.
const FROZEN_NOW = new Date('2026-01-15T12:00:00.000Z').getTime();

async function freezeTime(page: Page) {
  await page.addInitScript((frozenNow) => {
    // Override Date.now so timeAgo() and any Date.now()-based code returns a fixed value.
    Date.now = () => frozenNow;
    // Override the no-arg Date constructor so `new Date()` also returns the frozen instant.
    const _OrigDate = window.Date;
    // @ts-ignore
    window.Date = function Date(...args: unknown[]) {
      // @ts-ignore
      return args.length === 0 ? new _OrigDate(frozenNow) : new _OrigDate(...args);
    };
    window.Date.now = () => frozenNow;
    // Preserve static methods by copying the prototype and statics.
    Object.setPrototypeOf(window.Date, _OrigDate);
  }, FROZEN_NOW);
}

// Wait for all 8 feed cards and the digest card to appear, then wait for fonts so
// the CSS column layout is fully settled before screenshotting.
async function waitForFeedReady(page: Page) {
  // The mock service returns 8 posts (BASE_POSTS) on the first page load.
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll(
      '[data-testid="image-card"], [data-testid="text-card"]'
    );
    return cards.length >= 8;
  });
  await page.evaluate(() => document.fonts.ready);
}

test.describe('Visual Regression', () => {
  test('VR-1: logged-out 3-column masonry at 1440px', async ({ page }) => {
    await stubImages(page);
    await freezeTime(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForFeedReady(page);
    await expect(page).toHaveScreenshot('home-logged-out-1440.png');
  });

  test('VR-2: logged-in 3-column masonry at 1440px', async ({ page }) => {
    await stubImages(page);
    await freezeTime(page);
    await login(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForFeedReady(page);
    await expect(page).toHaveScreenshot('home-logged-in-1440.png');
  });

  test('VR-3: 2-column masonry at 1024px', async ({ page }) => {
    await stubImages(page);
    await freezeTime(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await waitForFeedReady(page);
    await expect(page).toHaveScreenshot('home-1024.png');
  });

  test('VR-4: single column at 759px', async ({ page }) => {
    await stubImages(page);
    await freezeTime(page);
    await page.setViewportSize({ width: 759, height: 900 });
    await page.goto('/');
    await waitForFeedReady(page);
    await expect(page).toHaveScreenshot('home-759.png');
  });
});

test.describe('Layout', () => {
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
});

test.describe('Interactions', () => {
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
    await expect(fab.locator('svg')).toHaveClass(/spinning/);
  });

  test('I-13: scroll to bottom loads more posts', async ({ page }) => {
    await page.goto('/');
    const before = await page.locator('[data-testid="image-card"], [data-testid="text-card"]').count();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(
      (n) => document.querySelectorAll('[data-testid="image-card"], [data-testid="text-card"]').length > n,
      before
    );
    const after = await page.locator('[data-testid="image-card"], [data-testid="text-card"]').count();
    expect(after).toBeGreaterThan(before);
  });

  test('I-14: search submit navigates to /search', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="topbar-search-row"] input[aria-label="Search"]').fill('transformers');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=transformers/);
  });
});

test.describe('Auth State', () => {
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
});
