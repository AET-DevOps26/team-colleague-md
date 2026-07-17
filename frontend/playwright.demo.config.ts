import { defineConfig, devices } from '@playwright/test';

const desktopChrome = devices['Desktop Chrome'];

/**
 * Recording config for the README/presentation demo clips — opt-in, never part of `npm test`.
 *
 * These scripts have deliberate pauses and almost no assertions, so they must not run with the
 * acceptance suite (whose testMatch only picks up `e2e/**\/*.spec.ts`). They drive the same real,
 * seeded stack the E2E suite does, so a recording shows genuine application behaviour.
 *
 *   docker compose up -d && npm run seed:local   # from the repo root
 *   cd frontend && npm run demo:record
 *   ./scripts/make-demo-clips.sh                 # webm -> docs/assets/demo/*.webp
 */
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

/**
 * Every run gets its own directory. Playwright wipes `outputDir` on start, so a fixed path would
 * throw away the previous takes — and picking the best take means having them to compare.
 *
 * Stamped into the environment rather than kept in a const because each worker re-imports this
 * config in its own process: a bare `new Date()` would give the workers a different id from the
 * main process and scatter one run across two directories. Workers inherit the env from the main
 * process, which loads this first, so they all agree on the id it sets here.
 */
process.env.DEMO_RUN_ID ||= new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const runId = process.env.DEMO_RUN_ID;

export default defineConfig({
  testDir: './tests/demo',
  testMatch: ['**/*.demo.ts'],
  workers: 1,
  retries: 0,
  // Pauses are the point here, and admin-genai-ops waits on a real LLM round trip.
  timeout: 240_000,
  use: {
    ...desktopChrome,
    baseURL,
    // The page lays out at 1920x1080 and is painted at 2x, so the frames arrive at 3840x2160 and
    // make-demo-clips.sh scales them to a 2560-wide clip. Both halves matter and they are separate:
    // the viewport decides the *layout* a viewer sees (a 1280 viewport gives the cramped small-
    // desktop breakpoint), the scale factor decides how many pixels are behind each glyph.
    //
    // --force-device-scale-factor is what raises the capture. `deviceScaleFactor: 2` alone only
    // changes what the page reports to itself — the screencast still captures at CSS size, and the
    // recorder then pads that into the top-left of the frame rather than scaling it up, which
    // yields a clip with a grey L around it. The flag raises the compositor surface instead.
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    video: { mode: 'on', size: { width: 3840, height: 2160 } },
    launchOptions: {
      args: ['--force-device-scale-factor=2'],
      // No slowMo: it delays every single Playwright call, which turns the cursor glide in
      // tests/demo/support.ts into a slideshow. The scripts pace themselves with explicit beats.
      slowMo: 0,
    },
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  // The device preset is spread *under* the shared `use`, not in a project on top of it: a project's
  // `use` wins over the top-level one, and Desktop Chrome carries its own viewport (1280x720) and
  // deviceScaleFactor (1). Spread into a project it silently reverts both settings above, and the
  // recorder pads the smaller surface into the top-left of the frame — a 720p clip in a 4K box.
  projects: [{ name: 'chromium' }],
  outputDir: `./demo-recordings/${runId}`,
});
