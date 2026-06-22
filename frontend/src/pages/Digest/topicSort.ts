export function sortTopics(
  order: string[],
  tag: string,
  followedTopics: Set<string>,
): string[] {
  const others = order.filter(n => n !== tag);
  const followedOthers = others.filter(n => followedTopics.has(n));
  const unfollowedOthers = others.filter(n => !followedTopics.has(n));
  return [...followedOthers, tag, ...unfollowedOthers];
}
