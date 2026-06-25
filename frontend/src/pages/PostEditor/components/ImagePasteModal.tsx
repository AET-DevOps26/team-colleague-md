import { useEffect, useMemo, useState } from 'react';
import styles from '../PostEditor.module.css';

interface ImagePasteModalProps {
  /** The image to confirm; `null` keeps the modal closed. */
  file: File | null;
  /** Called with the chosen alt text once the user confirms insertion. */
  onConfirm: (alt: string) => void;
  onCancel: () => void;
}

/** Strip the extension so the filename reads as a sensible default alt. */
function defaultAlt(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

/**
 * Confirmation preview for an inline image (toolbar pick or Ctrl+V paste).
 * Shows the picked file and an optional alt-text field defaulting to the
 * filename, so the inserted `![alt](url)` stays readable (ADR-0010).
 */
export default function ImagePasteModal({ file, onConfirm, onCancel }: ImagePasteModalProps) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [alt, setAlt] = useState('');

  useEffect(() => {
    if (file) setAlt(defaultAlt(file.name));
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!file) return null;

  function confirm() {
    onConfirm(alt.trim() || defaultAlt(file!.name));
  }

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Insert image">
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>Insert image</h2>
        {previewUrl && <img className={styles.modalPreviewImg} src={previewUrl} alt="Upload preview" />}
        <div className={styles.modalField}>
          <label htmlFor="imagePasteAlt">Alt text</label>
          <input
            id="imagePasteAlt"
            type="text"
            value={alt}
            placeholder="Describe the image…"
            onChange={(e) => setAlt(e.target.value)}
          />
        </div>
        <div className={styles.modalActions}>
          <button type="button" className={styles.modalCancel} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={styles.modalInsert} onClick={confirm}>
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
