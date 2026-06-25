/**
 * Publish-gate validation, aligned with content-service's PostRequest contract:
 * title 5–100 chars, content 1–50000 chars. Length is measured on the trimmed
 * value so whitespace-only input cannot satisfy a minimum.
 */
export const TITLE_MIN = 5;
export const TITLE_MAX = 100;
export const CONTENT_MIN = 1;
export const CONTENT_MAX = 50000;

export function isValidTitle(title: string): boolean {
  const len = title.trim().length;
  return len >= TITLE_MIN && len <= TITLE_MAX;
}

export function isValidContent(content: string): boolean {
  const len = content.trim().length;
  return len >= CONTENT_MIN && len <= CONTENT_MAX;
}

export function canPublish(post: { title: string; content: string }): boolean {
  return isValidTitle(post.title) && isValidContent(post.content);
}
