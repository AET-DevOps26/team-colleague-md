import { Link, useNavigate } from 'react-router-dom';
import styles from './NotFound.module.css';

/**
 * 404 (design/pages/Verita 404.html). Rendered inside AppLayout so a lost visitor keeps the
 * sidebar and can navigate out, rather than landing on a full-bleed dead end.
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main className={styles.page} data-testid="not-found">
      <div className={styles.card}>
        <p className={styles.kicker}>route not found · error 404</p>

        <div className={styles.numeral}>404</div>

        <h1 className={styles.headline}>This page has gone off the record.</h1>

        <p className={styles.body}>
          It may have moved, been removed, or never existed in the first place — much like the
          sources behind a poorly-cited claim.
        </p>

        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => navigate(-1)} data-testid="not-found-back">
            <svg className={styles.arrow} viewBox="0 0 16 16">
              <polyline points="10 3 5 8 10 13" />
            </svg>
            Go back
          </button>
          <Link to="/" className={styles.btnGhost} data-testid="not-found-home">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
