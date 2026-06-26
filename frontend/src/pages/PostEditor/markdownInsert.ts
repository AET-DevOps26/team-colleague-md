/**
 * Pure Markdown text transforms for the editor toolbar. Each takes the current
 * textarea state (value + selection range) and returns the next state, so the
 * page can apply it imperatively without the transforms touching the DOM.
 */
export interface TextState {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Wrap the selection (or a placeholder, if empty) and select the inner text. */
export function wrapSelection(
  s: TextState,
  before: string,
  after: string,
  placeholder: string,
): TextState {
  const inner = s.value.slice(s.selectionStart, s.selectionEnd) || placeholder;
  const value =
    s.value.slice(0, s.selectionStart) + before + inner + after + s.value.slice(s.selectionEnd);
  const selectionStart = s.selectionStart + before.length;
  return { value, selectionStart, selectionEnd: selectionStart + inner.length };
}

/** Prepend `prefix` to the start of the line containing the caret. */
export function insertAtLineStart(s: TextState, prefix: string): TextState {
  const lineStart = s.value.lastIndexOf('\n', s.selectionStart - 1) + 1;
  const value = s.value.slice(0, lineStart) + prefix + s.value.slice(lineStart);
  const caret = s.selectionEnd + prefix.length;
  return { value, selectionStart: caret, selectionEnd: caret };
}

/** Replace the selection with `text`, placing the caret after it. */
export function insertText(s: TextState, text: string): TextState {
  const value = s.value.slice(0, s.selectionStart) + text + s.value.slice(s.selectionEnd);
  const caret = s.selectionStart + text.length;
  return { value, selectionStart: caret, selectionEnd: caret };
}

export function insertImage(s: TextState, alt: string, url: string): TextState {
  return insertText(s, `\n![${alt}](${url})\n`);
}

export function insertLink(s: TextState, text: string, url: string): TextState {
  return insertText(s, `[${text || url}](${url})`);
}
