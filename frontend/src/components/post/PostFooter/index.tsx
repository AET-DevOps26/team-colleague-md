import type { PostSource, Tag } from '../../../types';
import styles from './PostFooter.module.css';

interface PostFooterProps {
  tags: Tag[];
  sources: PostSource[];
}

export default function PostFooter({ tags, sources }: PostFooterProps) {
  return (
    <div className={styles.footer}>
      {tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map((tag) => (
            <span key={tag.id} className={styles.tagPill}>
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <div className={styles.sources}>
          <span className={styles.sourcesLabel}>Sources</span>
          {sources.map((src, i) => (
            <a key={i} href={src.url} className={styles.srcItem} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="m15 3 6 0 0 6" />
                <path d="M10 14 21 3" />
              </svg>
              {src.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
