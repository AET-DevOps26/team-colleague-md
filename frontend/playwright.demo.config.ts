import { defineConfig, devices } from '@playwright/test';

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
    baseURL,
    // 1440p 16:9. The page is laid out at 1280x720 and rendered at deviceScaleFactor 2, so the
    // screencast captures 2560x1440 real device pixels — the layout a 720p viewport produces, with
    // four times the pixels behind every glyph. Recording at native size means the encoder never
    // has to upscale, which is what smeared the type before.
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    video: { mode: 'on', size: { width: 2560, height: 1440 } },
    // No slowMo: it delays every single Playwright call, which turns the cursor glide in
    // tests/demo/support.ts into a slideshow. The scripts pace themselves with explicit beats.
    launchOptions: { slowMo: 0 },
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  outputDir: `./demo-recordings/${runId}`,
});
