import { test, expect } from '@playwright/test';
import { loginAs } from './support';


test.describe('Layout', () => {
  test('LT-5: sidebar is 240px wide', async ({ page }) => {
    await page.goto('/');
    const box = await page.locator('[data-testid="sidebar"]').boundingBox();
    expect(box?.width).toBe(240);
  });

  test('LT-6: topbar has search row and topic row', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="topbar-search-row"]')).toBeVisible();
    await expect(page.locator('[data-testid="topbar-topic-row"]')).toBeVisible();
  });

  test('LT-7: feed has both image cards and text cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="image-card"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="text-card"]').first()).toBeVisible();
  });
});

test.describe('Interactions', () => {
  test('I-8: topic chip click updates active state', async ({ page }) => {
    await page.goto('/');
    const chips = page.locator('[data-testid="topbar-topic-row"] button');
    const second = chips.nth(1);
    await second.click();
    await expect(second).toHaveClass(/active/);
  });

  test('I-9: sidebar sign in opens auth modal', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="sidebar-signin"]').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('I-10: scroll to bottom loads more posts', async ({ page }) => {
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

  test('I-11: search submit navigates to /search', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="topbar-search-row"] input[aria-label="Search"]').fill('transformers');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=transformers/);
  });
});

test.describe('Auth State', () => {
  test('S-12: logged-out — banner visible, settings disabled, first chip is Trending', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="auth-banner"]')).toBeVisible();
    const pointerEvents = await page.locator('[data-testid="sidebar-settings"]').evaluate(
      (el) => window.getComputedStyle(el).pointerEvents
    );
    expect(pointerEvents).toBe('none');
    await expect(page.locator('[data-testid="topbar-topic-row"] button').first()).toHaveText('Trending');
  });

  test('S-13: logged-in — banner absent, first chip is For you, New post CTA visible', async ({ page }) => {
    await loginAs(page);
    await page.goto('/');
    await expect(page.locator('[data-testid="auth-banner"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="topbar-topic-row"] button').first()).toHaveText('For you');
    await expect(page.getByRole('link', { name: 'New post' })).toBeVisible();
  });
});
