import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import * as Dialog from '@radix-ui/react-dialog';
import type { UserProfile, UpdateUserRequest } from '../../../types';
import { getInitials } from '../../../utils/getInitials';
import styles from './EditProfileModal.module.css';

const BIO_MAX = 250;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

async function getCroppedImg(src: string, pixelCrop: Area): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Image failed to load'));
    i.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

interface Props {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UpdateUserRequest & { avatarUrl?: string | null }) => Promise<void>;
}

export default function EditProfileModal({ profile, isOpen, onClose, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [organization, setOrganization] = useState(profile.organization ?? '');
  const [website, setWebsite] = useState(profile.website ?? '');
  const [expertise, setExpertise] = useState((profile.expertiseAreas ?? []).join(', '));
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 2 MB.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCropConfirm = useCallback(async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    try {
      const cropped = await getCroppedImg(cropSrc, croppedAreaPixels);
      setAvatarPreview(cropped);
      setCropSrc(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setCropSrc(null);
      if (fileRef.current) fileRef.current.value = '';
      setAvatarError('Could not process image. Please try a different file.');
    }
  }, [cropSrc, croppedAreaPixels]);

  const handleCropCancel = useCallback(() => {
    setCropSrc(null);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleSave = useCallback(async () => {
    let normalizedWebsite = website.trim();
    if (normalizedWebsite) {
      if (!/^https?:\/\//i.test(normalizedWebsite)) {
        normalizedWebsite = 'https://' + normalizedWebsite;
      }
      let urlValid = false;
      try {
        const parsed = new URL(normalizedWebsite);
        // Only allow http(s), must have a real domain (label.tld, TLD ≥ 2 chars)
        const hostname = parsed.hostname;
        const validHostname = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(hostname);
        urlValid = /^https?:$/.test(parsed.protocol) && validHostname;
      } catch {
        urlValid = false;
      }
      if (!urlValid) {
        setWebsiteError('Please enter a valid URL (e.g. https://example.com)');
        return;
      }
      setWebsiteError(null);
    } else {
      setWebsiteError(null);
    }

    setSaving(true);
    try {
      const expertiseAreas = expertise
        .split(',')
        .map((s) => s.trim().slice(0, 30))
        .filter(Boolean)
        .slice(0, 6);
      await onSave({
        displayName: displayName.trim() || profile.displayName,
        bio: bio.trim() || null,
        organization: organization.trim() || null,
        website: normalizedWebsite || null,
        expertiseAreas: expertiseAreas.length > 0 ? expertiseAreas : null,
        avatarUrl: avatarPreview,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [displayName, bio, organization, website, expertise, avatarPreview, profile.displayName, onSave, onClose]);

  const initials = getInitials(profile.displayName);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>

          <div className={styles.header}>
            <Dialog.Title className={styles.title}>
              {cropSrc ? 'Crop Photo' : 'Edit Profile'}
            </Dialog.Title>
            {!cropSrc && (
              <Dialog.Close className={styles.closeBtn} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </Dialog.Close>
            )}
          </div>

          {cropSrc ? (
            /* ── Crop view ── */
            <>
              <div className={styles.cropArea}>
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_: Area, pixels: Area) => setCroppedAreaPixels(pixels)}
                  zoomSpeed={0.3}
                />
              </div>
              <div className={styles.cropControls}>
                <label className={styles.zoomLabel}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6M11 8v6" />
                  </svg>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className={styles.zoomSlider}
                    aria-label="Zoom"
                  />
                </label>
              </div>
              <div className={styles.footer}>
                <button className={styles.btnOutline} onClick={handleCropCancel} type="button">
                  Cancel
                </button>
                <button className={styles.btnPrimary} onClick={handleCropConfirm} type="button">
                  Apply Crop
                </button>
              </div>
            </>
          ) : (
            /* ── Edit form ── */
            <>
              <div className={styles.body}>

                <div className={styles.avatarSection}>
                  <div className={styles.avatarLarge}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={profile.displayName} />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className={styles.avatarActions}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className={styles.fileInput}
                      onChange={handleFileChange}
                      data-testid="avatar-file-input"
                    />
                    <button
                      className={styles.btnOutline}
                      onClick={() => fileRef.current?.click()}
                      type="button"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M7 2v10M2 7h10" />
                      </svg>
                      Upload Photo
                    </button>
                    {avatarError
                      ? <span className={styles.avatarError}>{avatarError}</span>
                      : <span className={styles.avatarHint}>JPG or PNG · Max 2 MB</span>
                    }
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Display Name</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      data-testid="edit-display-name"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Username</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={profile.username}
                      readOnly
                      title="Username cannot be changed"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Bio</label>
                  <textarea
                    className={styles.textarea}
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                    placeholder="Tell people about yourself and your work…"
                    data-testid="edit-bio"
                  />
                  <span className={styles.hint}>
                    <span>Shown on your profile and in search.</span>
                    <span className={bio.length > BIO_MAX * 0.9 ? styles.hintWarn : ''}>
                      {bio.length}/{BIO_MAX}
                    </span>
                  </span>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Organization</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. DeepMind"
                      data-testid="edit-organization"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Website</label>
                    <input
                      className={`${styles.input}${websiteError ? ` ${styles.inputError}` : ''}`}
                      type="text"
                      value={website}
                      onChange={(e) => { setWebsite(e.target.value); setWebsiteError(null); }}
                      placeholder="https://example.com"
                      data-testid="edit-website"
                    />
                    {websiteError && <span className={styles.fieldError}>{websiteError}</span>}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Research Interests</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    placeholder="e.g. Transformers, RLHF, Interpretability"
                    data-testid="edit-expertise"
                  />
                  {(() => {
                    const count = expertise.split(',').map(s => s.trim()).filter(Boolean).length;
                    const over = count > 6;
                    return (
                      <span className={styles.hint}>
                        <span>Up to 6, 30 chars each. Comma-separated.</span>
                        <span className={over ? styles.hintWarn : ''}>{count}/6</span>
                      </span>
                    );
                  })()}
                </div>

              </div>

              <div className={styles.footer}>
                <button className={styles.btnOutline} onClick={onClose} type="button">
                  Cancel
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={handleSave}
                  disabled={saving}
                  type="button"
                  data-testid="edit-save-btn"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </>
          )}

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
