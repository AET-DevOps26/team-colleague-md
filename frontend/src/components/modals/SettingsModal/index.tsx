import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useSettingsModal } from '../../../contexts/ModalContext';
import styles from './SettingsModal.module.css';

export default function SettingsModal() {
  const { isOpen, close } = useSettingsModal();
  const { user, logout } = useAuth();
  const [digestFreq, setDigestFreq] = useState<'Daily' | 'Weekly' | 'Off'>('Daily');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showLikes, setShowLikes] = useState(false);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => { if (!o) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <Dialog.Title className={styles.title}>Settings</Dialog.Title>

          <section className={styles.section}>
            <h3 className={styles.sectionHeading}>Account</h3>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>{user?.email ?? '—'}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Username</span>
              <span className={styles.rowValue}>@{user?.username ?? '—'}</span>
            </div>
            <Link to={`/profile/${user?.username}`} className={styles.link} onClick={close}>
              Edit Profile →
            </Link>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeading}>Digest</h3>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Frequency</span>
              <div className={styles.segmented}>
                {(['Daily', 'Weekly', 'Off'] as const).map((f) => (
                  <button
                    key={f}
                    className={`${styles.segBtn} ${digestFreq === f ? styles.segActive : ''}`}
                    onClick={() => setDigestFreq(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <Link to="/digest" className={styles.link} onClick={close}>
              Manage Topics →
            </Link>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionHeading}>Privacy</h3>
            <label className={styles.toggle}>
              <span>Show my Bookmarks to others</span>
              <input type="checkbox" checked={showBookmarks} onChange={(e) => setShowBookmarks(e.target.checked)} />
              <span className={styles.toggleTrack} />
            </label>
            <label className={styles.toggle}>
              <span>Show my Likes to others</span>
              <input type="checkbox" checked={showLikes} onChange={(e) => setShowLikes(e.target.checked)} />
              <span className={styles.toggleTrack} />
            </label>
          </section>

          <section className={styles.section}>
            <button
              className={styles.logoutBtn}
              onClick={() => { logout(); close(); }}
            >
              Sign out
            </button>
          </section>

          <Dialog.Close className={styles.closeBtn} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
