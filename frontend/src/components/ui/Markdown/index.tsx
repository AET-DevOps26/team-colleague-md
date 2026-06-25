import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Markdown.module.css';

/**
 * Renders a Markdown string with GFM support, styled to match the Verita
 * article look. Used by the Post Editor preview for now; PostDetail keeps its
 * own renderer until a later PR adopts this component.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className={styles.md}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
