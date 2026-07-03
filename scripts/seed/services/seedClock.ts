/**
 * Shared seed-time clock — captured once at import, used everywhere so every
 * seed run produces fresh relative dates.
 */

export const SEED_NOW = new Date();

export function minutesAgo(n: number): string {
  return iso(SEED_NOW.getTime() - n * 60_000);
}

export function hoursAgo(n: number): string {
  return iso(SEED_NOW.getTime() - n * 3_600_000);
}

export function daysAgo(n: number): string {
  return iso(SEED_NOW.getTime() - n * 86_400_000);
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}
