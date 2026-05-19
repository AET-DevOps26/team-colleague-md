import { useState } from 'react';
import styles from './AISummaryPanel.module.css';

interface AISummaryBullet {
  html: string;
}

interface AISummaryPanelProps {
  bullets: AISummaryBullet[];
  generatedLabel?: string;
}

export default function AISummaryPanel({ bullets, generatedLabel = 'generated · 4h ago' }: AISummaryPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={`${styles.toggle} ${open ? styles.toggleOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        type="button"
      >
        <svg className={styles.spark} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        </svg>
        <span>AI summary</span>
        <svg className={`${styles.chev} ${open ? styles.chevOpen : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div className={`${styles.panelWrap} ${open ? styles.panelWrapOpen : ''}`} aria-hidden={!open}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
            </svg>
            <span className={styles.panelLabel}>Key points</span>
            <span className={styles.panelTag}>{generatedLabel}</span>
          </div>

          <ul className={styles.bullets}>
            {bullets.map((b, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: b.html }} />
            ))}
          </ul>

          <div className={styles.panelFoot}>
            <span>Sourced from §3, §4.2, Fig. 5</span>
            <span className={styles.dot} />
            <button className={styles.regenerate} type="button">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
