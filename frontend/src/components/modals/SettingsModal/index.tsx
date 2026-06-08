import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useSettingsModal } from '../../../contexts/ModalContext';
import styles from './SettingsModal.module.css';

const ChevronRight = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const SignOutIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
    <path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3" />
  </svg>
);

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

          <div className={styles.modalHeader}>
            <Dialog.Title className={styles.modalTitle}>Settings</Dialog.Title>
            <Dialog.Close className={styles.closeBtn} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          <div className={styles.modalBody}>

            <section className={styles.section}>
              <h3 className={styles.sectionHeading}>Account</h3>
              <div className={styles.accountField}>
                <span className={styles.accountFieldLabel}>Email</span>
                <span className={styles.accountFieldValue} data-testid="settings-email">
                  {user?.email ?? '—'}
                </span>
              </div>
              <div className={styles.accountField} style={{ marginBottom: '14px' }}>
                <span className={styles.accountFieldLabel}>Username</span>
                <span className={styles.accountFieldValue} data-testid="settings-username">
                  @{user?.username ?? '—'}
                </span>
              </div>
              <Link
                to={`/profile/${user?.username}`}
                className={styles.settingsLink}
                data-testid="settings-edit-profile"
                onClick={close}
              >
                <div className={styles.settingsLinkText}>
                  <span>Edit Profile</span>
                  <span className={styles.settingsLinkDesc}>Update bio, avatar, and profile fields</span>
                </div>
                <span className={styles.linkArrow}><ChevronRight /></span>
              </Link>
              <button
                className={`${styles.settingsLink} ${styles.signoutLink}`}
                data-testid="settings-signout"
                onClick={() => { logout(); close(); }}
              >
                <div className={styles.settingsLinkText}>
                  <span>Sign out</span>
                  <span className={styles.settingsLinkDesc}>End your session on this device</span>
                </div>
                <span className={styles.linkArrow}><SignOutIcon /></span>
              </button>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionHeading}>Digest</h3>
              <span className={styles.freqLabel}>Email frequency</span>
              <div className={styles.freqControl} role="group" aria-label="Digest frequency">
                {(['Daily', 'Weekly', 'Off'] as const).map((f) => (
                  <button
                    key={f}
                    className={`${styles.freqBtn} ${digestFreq === f ? styles.freqActive : ''}`}
                    data-testid={`settings-freq-${f.toLowerCase()}`}
                    onClick={() => setDigestFreq(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <Link
                to="/digest"
                className={styles.settingsLink}
                data-testid="settings-manage-topics"
                onClick={close}
              >
                <div className={styles.settingsLinkText}>
                  <span>Manage Topics</span>
                  <span className={styles.settingsLinkDesc}>Subscribe or unsubscribe from digest topics</span>
                </div>
                <span className={styles.linkArrow}><ChevronRight /></span>
              </Link>
            </section>

            <section className={`${styles.section} ${styles.sectionLast}`}>
              <h3 className={styles.sectionHeading}>Privacy</h3>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Show my Bookmarks to others</span>
                  <span className={styles.toggleDesc}>Visible on your public profile</span>
                </div>
                <label className={styles.switch} aria-label="Show bookmarks to others">
                  <input
                    type="checkbox"
                    data-testid="settings-toggle-bookmarks"
                    checked={showBookmarks}
                    onChange={(e) => setShowBookmarks(e.target.checked)}
                  />
                  <div className={styles.switchTrack}>
                    <div className={styles.switchThumb} />
                  </div>
                </label>
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Show my Likes to others</span>
                  <span className={styles.toggleDesc}>Visible on your public profile</span>
                </div>
                <label className={styles.switch} aria-label="Show likes to others">
                  <input
                    type="checkbox"
                    data-testid="settings-toggle-likes"
                    checked={showLikes}
                    onChange={(e) => setShowLikes(e.target.checked)}
                  />
                  <div className={styles.switchTrack}>
                    <div className={styles.switchThumb} />
                  </div>
                </label>
              </div>
            </section>

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
