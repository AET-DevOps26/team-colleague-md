import { expect, type Page, type Locator } from '@playwright/test';
import { SEED_PASSWORD, SEED_USERS, type SeedUser } from '../e2e/support';

/**
 * Helpers for the demo recordings. These reuse the E2E suite's seed fixtures deliberately: a clip
 * recorded this way is the real app driven against the real backend with real seed data, which is
 * the claim the README is making.
 *
 * The vocabulary here is about pacing, not assertions — a viewer needs a beat to register what
 * changed before the next thing happens.
 */

export { SEED_USERS, SEED_PASSWORD, type SeedUser };

/** A beat for the viewer to read what just appeared. */
export async function beat(page: Page, ms = 900): Promise<void> {
  await page.waitForTimeout(ms);
}

/** Types at human speed — filling instantly reads as a glitch on video. */
export async function typeSlowly(target: Locator, text: string, delay = 45): Promise<void> {
  await click(target.page(), target);
  await target.pressSequentially(text, { delay });
}

/* ────────────────────────────── the on-camera cursor ──────────────────────────────
 *
 * Playwright's screencast does not capture the real pointer, so without this a click looks like the
 * UI reacting to nothing. This paints a synthetic pointer inside the page that follows the same
 * mouse events the automation dispatches, plus a ping on every press so the viewer can see where
 * the click landed.
 *
 * It hangs off documentElement rather than body: React owns body's subtree and would blow the
 * cursor away on the next re-render. addInitScript re-runs it after every navigation.
 */
async function installCursor(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const paint = () => {
      if (document.getElementById('__demo_cursor')) return;

      const style = document.createElement('style');
      style.textContent = `
        #__demo_cursor {
          position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none;
          will-change: transform; filter: drop-shadow(0 2px 4px rgba(0,0,0,.5));
        }
        #__demo_ping {
          position: fixed; left: 0; top: 0; width: 36px; height: 36px; margin: -18px 0 0 -18px;
          border-radius: 50%; z-index: 2147483646; pointer-events: none; opacity: 0;
          background: rgba(99,102,241,.3); border: 2px solid rgba(99,102,241,.95);
        }
        #__demo_ping.__on { animation: __demo_ping_kf .45s ease-out; }
        @keyframes __demo_ping_kf {
          from { opacity: 1; transform: scale(.35); }
          to   { opacity: 0; transform: scale(1.7); }
        }
      `;
      document.head.appendChild(style);

      const cursor = document.createElement('div');
      cursor.id = '__demo_cursor';
      // The classic arrow, drawn rather than imported so it needs no asset and stays sharp at 2x.
      cursor.innerHTML =
        '<svg width="22" height="33" viewBox="0 0 22 33" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M2 1.5 L2 24.5 L8 19 L11.8 27.8 L15.6 26.1 L11.9 17.6 L19.5 17.6 Z" ' +
        'fill="#fff" stroke="#111" stroke-width="1.7" stroke-linejoin="round"/></svg>';
      document.documentElement.appendChild(cursor);

      const ping = document.createElement('div');
      ping.id = '__demo_ping';
      document.documentElement.appendChild(ping);

      // Capture phase, so a page handler calling stopPropagation cannot blind the cursor.
      addEventListener(
        'mousemove',
        (e) => {
          // -2/-1 puts the arrow's tip, not its bounding box, on the pointer coordinate.
          cursor.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 1}px)`;
        },
        true,
      );

      addEventListener(
        'mousedown',
        (e) => {
          ping.style.left = `${e.clientX}px`;
          ping.style.top = `${e.clientY}px`;
          ping.classList.remove('__on');
          void ping.offsetWidth; // restart the animation rather than letting it no-op
          ping.classList.add('__on');
        },
        true,
      );
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', paint);
    } else {
      paint();
    }
  });
}

/** Where the mouse currently is, so a glide can start from there instead of teleporting. */
const mouseAt = new WeakMap<Page, { x: number; y: number }>();

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * Slides the pointer to a point over `duration`, easing in and out so it reads as a hand moving
 * rather than a jump cut.
 *
 * The frames are stepped here rather than through `mouse.move({ steps })` because that dispatches
 * every step in one burst — visually identical to a teleport. This config runs with slowMo disabled
 * for the same reason: a per-call delay would make a 26-frame glide take three seconds.
 */
async function glideMouse(page: Page, x: number, y: number, duration = 420): Promise<void> {
  const from = mouseAt.get(page) ?? { x: 12, y: 12 };
  const frames = Math.max(2, Math.round(duration / 16));

  for (let i = 1; i <= frames; i++) {
    const t = easeInOut(i / frames);
    await page.mouse.move(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
    await page.waitForTimeout(16);
  }
  mouseAt.set(page, { x, y });
}

async function centerOf(target: Locator): Promise<{ x: number; y: number }> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error('target has no bounding box — it is not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Moves the pointer onto a target and lets any hover state land, without clicking. */
export async function hover(page: Page, target: Locator, duration = 420): Promise<void> {
  const { x, y } = await centerOf(target);
  await glideMouse(page, x, y, duration);
}

/**
 * The demo's click: glide onto the target, pause long enough for the viewer's eye to arrive, then
 * press. Every interaction in a demo script should go through this — a bare `locator.click()` warps
 * the cursor and defeats the point of drawing it.
 */
export async function click(page: Page, target: Locator): Promise<void> {
  const { x, y } = await centerOf(target);
  await glideMouse(page, x, y);
  await beat(page, 220);
  await page.mouse.click(x, y);
  await beat(page, 180);
}

/**
 * Starts the recording already signed in — only the hero's story is the login itself, and the other
 * three clips should not spend their first seconds on a modal.
 *
 * The login runs over the API rather than the UI, which plants the httpOnly refresh cookie in the
 * context's jar (page.request shares it). The app then restores the session on mount exactly as it
 * does for a returning visitor, so nothing here fakes auth state — `goto` lands on a real signed-in
 * feed. Each demo mints its own cookie, so the backend's refresh-token rotation can't have one
 * recording invalidate the next.
 */
export async function startSignedIn(page: Page, user: SeedUser = SEED_USERS.alexchen): Promise<void> {
  const res = await page.request.post('/user/api/v1/auth/login', {
    data: { email: user.email, password: SEED_PASSWORD },
  });
  expect(res.ok(), `seed login failed for ${user.email} (${res.status()})`).toBeTruthy();

  await installCursor(page);
  await page.goto('/');
  await expect(page.locator('[data-testid="sidebar-signin"]')).toBeHidden();
  await beat(page, 600);
}

/**
 * Signs in through the real auth modal, paced for video — only the hero needs the login itself to
 * be part of the story. Mirrors e2e `loginAs` but types the credentials visibly.
 */
export async function signInOnCamera(page: Page, user: SeedUser = SEED_USERS.alexchen): Promise<void> {
  await installCursor(page);
  await page.goto('/');
  await beat(page, 700);
  await click(page, page.locator('[data-testid="sidebar-signin"]'));

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await beat(page, 400);

  await typeSlowly(dialog.locator('input[type="email"]'), user.email);
  await typeSlowly(dialog.locator('[data-testid="password-input"]'), SEED_PASSWORD, 35);
  await beat(page, 400);

  await click(page, dialog.locator('button[type="submit"]'));
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-testid="sidebar-signin"]')).toBeHidden();
}

/**
 * Resolves a seeded post's id from its title, over the public list endpoint.
 *
 * By title rather than by id: the seed's UUIDs are deterministic today, but a title is the thing a
 * reader of the script can match against what they see happening on screen.
 */
export async function findPostIdByTitle(page: Page, title: string): Promise<string> {
  const res = await page.request.get('/content/api/v1/posts?page=0&size=50');
  expect(res.ok(), `could not list posts (${res.status()})`).toBeTruthy();

  const { content } = (await res.json()) as { content: { id: string; title: string }[] };
  const match = content.find((p) => p.title === title);
  expect(match, `no seeded post titled "${title}" — is the stack seeded?`).toBeTruthy();
  return match!.id;
}

/** Scrolls smoothly instead of teleporting, so the motion reads on video. */
export async function glideTo(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.evaluate((sel) => {
    document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, selector);
  await beat(page, 800);
}
