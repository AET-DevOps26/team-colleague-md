import styles from '../PostEditor.module.css';

export type ToolbarAction =
  | 'bold' | 'italic' | 'code' | 'codeblock'
  | 'link' | 'image'
  | 'h1' | 'h2' | 'h3' | 'quote' | 'hr';

interface MarkdownToolbarProps {
  mode: 'edit' | 'preview';
  onMode: (mode: 'edit' | 'preview') => void;
  onAction: (action: ToolbarAction) => void;
}

interface ButtonSpec {
  action: ToolbarAction;
  label: string;
  glyph: string;
}

const GROUPS: ButtonSpec[][] = [
  [
    { action: 'bold', label: 'Bold (⌘B)', glyph: 'B' },
    { action: 'italic', label: 'Italic (⌘I)', glyph: 'I' },
    { action: 'code', label: 'Inline code', glyph: '<>' },
    { action: 'codeblock', label: 'Code block', glyph: '{ }' },
  ],
  [
    { action: 'link', label: 'Link (⌘K)', glyph: '🔗' },
    { action: 'image', label: 'Insert image', glyph: '🖼' },
  ],
  [
    { action: 'h1', label: 'Heading 1', glyph: 'H1' },
    { action: 'h2', label: 'Heading 2', glyph: 'H2' },
    { action: 'h3', label: 'Heading 3', glyph: 'H3' },
    { action: 'quote', label: 'Blockquote', glyph: '❝' },
    { action: 'hr', label: 'Divider', glyph: '―' },
  ],
];

/** Markdown formatting toolbar with an Edit / Preview view toggle. */
export default function MarkdownToolbar({ mode, onMode, onAction }: MarkdownToolbarProps) {
  const disabled = mode === 'preview';
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Markdown formatting">
      {GROUPS.map((group, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && <span className={styles.tbSep} aria-hidden="true" />}
          {group.map((b) => (
            <button
              key={b.action}
              type="button"
              className={styles.tbBtn}
              aria-label={b.label}
              disabled={disabled}
              onClick={() => onAction(b.action)}
            >
              <span aria-hidden="true">{b.glyph}</span>
            </button>
          ))}
        </span>
      ))}
      <div className={styles.tbToggle} role="group" aria-label="View mode">
        <button
          type="button"
          className={`${styles.tbToggleBtn} ${mode === 'edit' ? styles.on : ''}`}
          aria-pressed={mode === 'edit'}
          onClick={() => onMode('edit')}
        >
          Edit
        </button>
        <span className={styles.tbToggleSep} aria-hidden="true" />
        <button
          type="button"
          className={`${styles.tbToggleBtn} ${mode === 'preview' ? styles.on : ''}`}
          aria-pressed={mode === 'preview'}
          onClick={() => onMode('preview')}
        >
          Preview
        </button>
      </div>
    </div>
  );
}
