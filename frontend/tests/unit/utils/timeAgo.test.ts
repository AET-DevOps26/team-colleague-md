import { describe, it, expect } from 'vitest';
import { timeAgo } from '../../../src/utils/timeAgo';

function isoSecondsAgo(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

describe('timeAgo', () => {
  it('returns minutes for times under an hour', () => {
    expect(timeAgo(isoSecondsAgo(300))).toBe('5m ago');
  });

  it('returns 0m ago for very recent times', () => {
    expect(timeAgo(isoSecondsAgo(10))).toBe('0m ago');
  });

  it('returns hours for times between 1 and 24 hours', () => {
    expect(timeAgo(isoSecondsAgo(3 * 3600))).toBe('3h ago');
  });

  it('rounds hours correctly', () => {
    expect(timeAgo(isoSecondsAgo(23 * 3600))).toBe('23h ago');
  });

  it('returns days for times over 24 hours', () => {
    expect(timeAgo(isoSecondsAgo(2 * 86400))).toBe('2d ago');
  });

  it('returns days for old dates', () => {
    expect(timeAgo(isoSecondsAgo(10 * 86400))).toBe('10d ago');
  });
});
