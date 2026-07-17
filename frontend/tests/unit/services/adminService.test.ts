import { describe, expect, it } from 'vitest';
import { extractPostId } from '../../../src/services/admin.service';

/**
 * The Operations tab lets an admin paste "a post" — in practice a bare ID, a URL copied from the
 * address bar, or a URL with query junk. All of them must resolve to the same post ID.
 */
describe('extractPostId', () => {
  const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

  it('accepts a bare UUID', () => {
    expect(extractPostId(id)).toBe(id);
  });

  it('trims surrounding whitespace', () => {
    expect(extractPostId(`  ${id}\n`)).toBe(id);
  });

  it('pulls the ID out of a post URL', () => {
    expect(extractPostId(`https://verita.app/post/${id}`)).toBe(id);
  });

  it('pulls the ID out of a relative path with a query string', () => {
    expect(extractPostId(`/post/${id}?from=digest`)).toBe(id);
  });

  it('normalises case so an upper-case UUID still matches', () => {
    expect(extractPostId(id.toUpperCase())).toBe(id);
  });

  it('returns null when there is no post ID to find', () => {
    expect(extractPostId('not-a-post')).toBeNull();
    expect(extractPostId('')).toBeNull();
  });
});
