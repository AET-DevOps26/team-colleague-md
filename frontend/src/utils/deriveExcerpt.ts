const EXCERPT_MAX = 200;

/**
 * Derive a plain-text card excerpt from markdown body content.
 *
 * The content-service stores `excerpt` as a persisted column rather than
 * recomputing it from `content` on every write, so the editor must send a fresh
 * excerpt whenever the body changes — otherwise a card preview keeps rendering
 * the pre-edit text. Strips the common markdown syntax that would otherwise leak
 * into the preview, collapses whitespace, and truncates on a word boundary.
 */
export function deriveExcerpt(content: string, max = EXCERPT_MAX): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')        // fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')   // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
    .replace(/^>\s?/gm, '')                  // blockquotes
    .replace(/^#{1,6}\s+/gm, '')             // headings
    .replace(/^[-*+]\s+/gm, '')              // list bullets
    .replace(/[*_~`]/g, '')                  // emphasis / inline code marks
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
