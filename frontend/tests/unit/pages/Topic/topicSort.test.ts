import { describe, it, expect } from 'vitest';
import { sortTopics } from '../../../../src/pages/Topic/topicSort';

describe('sortTopics', () => {
  it('moves a newly followed tag to end of the followed group', () => {
    const order = ['a', 'b', 'c', 'd'];
    const followed = new Set(['a', 'b']); // state BEFORE the toggle

    // User follows 'c' — followedTopics is still {'a','b'} at call time
    const result = sortTopics(order, 'c', followed);
    expect(result).toEqual(['a', 'b', 'c', 'd']);
  });

  it('moves an unfollowed tag to start of the unfollowed group', () => {
    const order = ['a', 'b', 'c', 'd'];
    const followed = new Set(['a', 'b', 'c']); // state BEFORE the toggle

    // User unfollows 'b' — followedTopics still has 'b'
    const result = sortTopics(order, 'b', followed);
    expect(result).toEqual(['a', 'c', 'b', 'd']);
  });

  it('preserves relative order within followed group on follow', () => {
    const order = ['x', 'y', 'a', 'b', 'c'];
    const followed = new Set(['x', 'y']); // following x, y already

    // User follows 'a'
    const result = sortTopics(order, 'a', followed);
    expect(result).toEqual(['x', 'y', 'a', 'b', 'c']);
  });

  it('preserves relative order within unfollowed group on unfollow', () => {
    const order = ['x', 'y', 'a', 'b'];
    const followed = new Set(['x', 'y', 'a', 'b']);

    // User unfollows 'x'
    const result = sortTopics(order, 'x', followed);
    expect(result).toEqual(['y', 'a', 'b', 'x']);
  });

  it('handles empty followed set (no followed peers)', () => {
    const order = ['a', 'b', 'c'];
    const followed = new Set<string>([]);

    const result = sortTopics(order, 'b', followed);
    expect(result).toEqual(['b', 'a', 'c']);
  });

  it('handles tag being the only item', () => {
    const order = ['a'];
    const followed = new Set<string>([]);

    const result = sortTopics(order, 'a', followed);
    expect(result).toEqual(['a']);
  });
});
