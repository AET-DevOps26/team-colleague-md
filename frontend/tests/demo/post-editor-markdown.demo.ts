import { test, expect } from '@playwright/test';
import { beat, click, startSignedIn, typeSlowly } from './support';

/**
 * post-editor-markdown — authoring, showing the live Markdown preview including KaTeX math.
 *
 * Self-contained: nothing here is saved, so it can be re-recorded freely without touching the
 * seeded DB.
 */

const BODY = `## Why retrieval still matters

Long-context models keep getting cheaper, but retrieval is not going away.

The attention cost still scales as $O(n^2)$ in sequence length:

$$\\text{cost} \\approx n^2 \\cdot d$$

- Retrieval keeps the prompt small
- Small prompts keep latency predictable
`;

test('post-editor-markdown', async ({ page }) => {
  await startSignedIn(page);

  await click(page, page.getByRole('link', { name: 'New post' }));
  await expect(page).toHaveURL(/\/post\/new$/);
  await beat(page, 700);

  await typeSlowly(page.getByLabel('Post title'), 'Why retrieval still matters', 55);
  await beat(page, 600);

  // Typed fast enough to stay watchable — the viewer needs to see it is Markdown, not read it.
  await typeSlowly(page.getByLabel('Post body'), BODY, 14);
  await beat(page, 900);

  // The payoff: the same source rendered, with the formula typeset by KaTeX.
  await click(page, page.getByRole('button', { name: 'Preview' }));
  await expect(page.getByRole('heading', { name: 'Why retrieval still matters' })).toBeVisible();
  await expect(page.locator('.katex').first()).toBeVisible();
  await beat(page, 3000);
});
