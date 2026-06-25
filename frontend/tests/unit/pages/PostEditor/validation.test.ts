import { describe, it, expect } from 'vitest';
import { canPublish, isValidTitle, isValidContent } from '../../../../src/pages/PostEditor/validation';

describe('PostEditor validation', () => {
  it('(VAL-1) rejects a title shorter than 5 characters', () => {
    expect(isValidTitle('Hi')).toBe(false);
  });

  it('(VAL-2) accepts a title within 5–100 characters', () => {
    expect(isValidTitle('Hello world')).toBe(true);
  });

  it('(VAL-3) rejects a title longer than 100 characters', () => {
    expect(isValidTitle('a'.repeat(101))).toBe(false);
  });

  it('(VAL-4) treats a whitespace-padded title by its trimmed length', () => {
    expect(isValidTitle('  Hi  ')).toBe(false);
    expect(isValidTitle('  Hello  ')).toBe(true);
  });

  it('(VAL-5) rejects empty content', () => {
    expect(isValidContent('')).toBe(false);
    expect(isValidContent('   ')).toBe(false);
  });

  it('(VAL-6) accepts content up to 50000 characters and rejects beyond', () => {
    expect(isValidContent('x'.repeat(50000))).toBe(true);
    expect(isValidContent('x'.repeat(50001))).toBe(false);
  });

  it('(VAL-7) canPublish requires both a valid title and valid content', () => {
    expect(canPublish({ title: 'Hello world', content: 'Body' })).toBe(true);
    expect(canPublish({ title: 'Hi', content: 'Body' })).toBe(false);
    expect(canPublish({ title: 'Hello world', content: '' })).toBe(false);
  });
});
