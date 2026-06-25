import styles from '../PostEditor.module.css';

interface ExitGuardModalProps {
  open: boolean;
  /** Primary save label, from {@link resolveExitScenario}. */
  primaryLabel: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/**
 * Shown when the author leaves with unsaved changes: offers to save (as a draft
 * or in-place, per scenario), discard, or keep editing.
 */
export default function ExitGuardModal({
  open,
  primaryLabel,
  onSave,
  onDiscard,
  onCancel,
}: ExitGuardModalProps) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="exitGuardTitle">
      <div className={styles.confirmCard}>
        <h2 className={styles.confirmTitle} id="exitGuardTitle">
          Leave with unsaved changes?
        </h2>
        <p className={styles.confirmSub}>
          You have edits that haven't been saved yet.
        </p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.confirmBtn} onClick={onCancel}>
            Keep editing
          </button>
          <button type="button" className={styles.confirmDanger} onClick={onDiscard}>
            Discard
          </button>
          <button type="button" className={styles.confirmPrimary} onClick={onSave}>
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
