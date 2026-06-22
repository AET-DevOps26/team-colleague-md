import { describe, it, expect } from 'vitest';
import { getInitials } from '../../../src/utils/getInitials';

describe('getInitials', () => {
  it('returns two uppercase initials for a two-word name', () => {
    expect(getInitials('Alice Morgan')).toBe('AM');
  });

  it('returns one initial for a single word', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('handles extra whitespace', () => {
    expect(getInitials('  Alice  Morgan  ')).toBe('AM');
  });

  it('returns empty string for empty input', () => {
    expect(getInitials('')).toBe('');
  });

  it('limits to two characters for names with many words', () => {
    expect(getInitials('Alice B Morgan')).toBe('AB');
  });

  it('uppercases lowercase names', () => {
    expect(getInitials('alice morgan')).toBe('AM');
  });
});
