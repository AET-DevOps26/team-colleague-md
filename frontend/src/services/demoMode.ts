/**
 * Single source of truth for the demo run state (ADR-0011, CONTEXT.md "Demo mode").
 *
 * The default (flagless) start is a pure real backend. With `VITE_DEMO_MODE` set, auth
 * and profile data stay real, but the post-derived reads that the backend can serve yet
 * has no seeded data for are filled from a mock display layer so the UI looks populated.
 *
 * Classification is static per service method at the call site — never a runtime
 * "real returned empty → fall back to mock", which would silently pollute real-mode testing.
 */
export function isDemoMode(): boolean {
  const flag = import.meta.env.VITE_DEMO_MODE;
  return flag === 'true' || flag === '1';
}
