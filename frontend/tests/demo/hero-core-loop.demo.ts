import { test, expect } from '@playwright/test';
import { beat, click, glideTo, signInOnCamera } from './support';

/**
 * hero-core-loop — the 10-second answer to "what is this?", and the only clip above the fold.
 *
 * Sign in → the feed renders seeded posts → open one → the AI summary appears. It has to reach the
 * summary: the differentiator is the AI layer, not the feed.
 */

test('hero-core-loop', async ({ page }) => {
  await signInOnCamera(page);

  // The personalised feed, with the welcome pill still landing.
  await expect(page.locator('[data-testid="topbar-topic-row"] button').first()).toHaveText('For you');
  await beat(page, 1200);

  // Browse before committing — shows there is real content here, not one fixture.
  await page.mouse.wheel(0, 320);
  await beat(page, 900);

  const cards = page.locator('[data-testid="image-card"], [data-testid="text-card"]');
  const summaryToggle = page.getByRole('button', { name: 'AI summary' });

  // Only posts with a generated summary can tell this story, so find one before settling.
  for (let i = 0; i < 6; i++) {
    await cards.nth(i).scrollIntoViewIfNeeded();
    await beat(page, 500);
    await click(page, cards.nth(i));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (await summaryToggle.isVisible()) break;
    await page.goBack();
  }

  await beat(page, 900);
  await glideTo(page, 'h1');

  // The payoff frame: the summary opens and the key points read out.
  await click(page, summaryToggle);
  await expect(page.getByText('Key points')).toBeVisible();
  await beat(page, 3000);
});
