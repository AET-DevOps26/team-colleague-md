import { describe, it, expect } from 'vitest';
import {
  wrapSelection,
  insertAtLineStart,
  insertText,
  insertImage,
  insertLink,
} from '../../../../src/pages/PostEditor/markdownInsert';

describe('markdownInsert', () => {
  it('(MD-1) wrapSelection wraps the selected text and selects the inner content', () => {
    // "the [quick] fox" — select "quick"
    const r = wrapSelection({ value: 'the quick fox', selectionStart: 4, selectionEnd: 9 }, '**', '**', 'bold');
    expect(r.value).toBe('the **quick** fox');
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe('quick');
  });

  it('(MD-2) wrapSelection with no selection inserts the placeholder and selects it', () => {
    const r = wrapSelection({ value: 'ab', selectionStart: 2, selectionEnd: 2 }, '**', '**', 'bold text');
    expect(r.value).toBe('ab**bold text**');
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe('bold text');
  });

  it('(MD-3) insertAtLineStart prepends the prefix to the line containing the caret', () => {
    const r = insertAtLineStart({ value: 'line one\nline two', selectionStart: 12, selectionEnd: 12 }, '## ');
    expect(r.value).toBe('line one\n## line two');
  });

  it('(MD-4) insertText replaces the selection and places the caret after it', () => {
    const r = insertText({ value: 'ab', selectionStart: 2, selectionEnd: 2 }, '\n\n---\n\n');
    expect(r.value).toBe('ab\n\n---\n\n');
    expect(r.selectionStart).toBe(r.value.length);
    expect(r.selectionEnd).toBe(r.value.length);
  });

  it('(MD-5) insertImage inserts a markdown image with alt and url', () => {
    const r = insertImage({ value: '', selectionStart: 0, selectionEnd: 0 }, 'a cat', 'https://x/c.png');
    expect(r.value).toContain('![a cat](https://x/c.png)');
  });

  it('(MD-6) insertLink uses the display text when present', () => {
    const r = insertLink({ value: '', selectionStart: 0, selectionEnd: 0 }, 'Verita', 'https://verita.dev');
    expect(r.value).toBe('[Verita](https://verita.dev)');
  });

  it('(MD-7) insertLink falls back to the url as text when display text is empty', () => {
    const r = insertLink({ value: '', selectionStart: 0, selectionEnd: 0 }, '', 'https://verita.dev');
    expect(r.value).toBe('[https://verita.dev](https://verita.dev)');
  });
});
