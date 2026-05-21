import { useState } from 'react';
import styles from './RefreshFAB.module.css';

interface Props {
  onRefresh: () => void;
}

export default function RefreshFAB({ onRefresh }: Props) {
  const [spinning, setSpinning] = useState(false);

  function handleClick() {
    if (spinning) return;
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 700);
  }

  return (
    <button
      className={styles.fab}
      onClick={handleClick}
      aria-label="Refresh feed"
    >
      <svg
        className={spinning ? styles.spinning : ''}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    </button>
  );
}
