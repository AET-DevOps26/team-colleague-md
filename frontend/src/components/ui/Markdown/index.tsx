import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import styles from './Markdown.module.css';

/**
 * Renders a Markdown string with GFM support, styled to match the Verita
 * article look. Used by the Post Editor preview for now; PostDetail keeps its
 * own renderer until a later PR adopts this component.
 *
 * Math is enabled via KaTeX: `$x=y$` inline, `$$x=y$$` block. A literal dollar
 * sign in prose must be escaped as `\$`.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className={styles.md}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
