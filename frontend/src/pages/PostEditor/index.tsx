import Markdown from '../../components/ui/Markdown';
import Toast from '../../components/ui/Toast';
import MarkdownToolbar from './components/MarkdownToolbar';
import TagInput from './components/TagInput';
import ImagePasteModal from './components/ImagePasteModal';
import ExitGuardModal from './components/ExitGuardModal';
import { usePostEditor } from './usePostEditor';
import { useNavigationHistory } from '../../contexts/NavigationHistoryContext';
import { pageNameFromPath } from '../../utils/pageName';
import styles from './PostEditor.module.css';

export default function PostEditor() {
  const {
    post,
    loading,
    saving,
    view,
    dirty,
    wordCount,
    publishable,
    pasteFile,
    publishOpen,
    exitOpen,
    exitScenario,
    textareaRef,
    inlineImageInputRef,
    coverInputRef,
    uploading,
    toast,
    dismissToast,
    setView,
    setTitle,
    setContent,
    setTopics,
    setCoverImageUrl,
    updateSource,
    addSource,
    removeSource,
    onToolbarAction,
    onCoverSelected,
    onInlineImageSelected,
    confirmInlineImage,
    cancelInlineImage,
    onPaste,
    openPublish,
    closePublish,
    confirmPublish,
    requestExit,
    saveAndExit,
    discardAndExit,
    cancelExit,
    searchTopics,
  } = usePostEditor();

  const { previousPath } = useNavigationHistory();
  const backLabel = previousPath ? pageNameFromPath(previousPath) : 'Explore';

  if (loading) {
    return <div className={styles.editorCanvas}>Loading…</div>;
  }

  const sources = post.sources.length ? post.sources : [''];
  const statusLabel = post.status === 'PUBLISHED' ? 'Published' : 'Draft';

  return (
    <main className={styles.main}>
      <header className={styles.topbar}>
        <button type="button" className={styles.backBtn} onClick={requestExit} aria-label={`Back to ${backLabel}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>{backLabel}</span>
        </button>
        <div className={styles.spacer} />
        <span className={styles.statPill}>
          {wordCount === 0
            ? '0 words'
            : `${wordCount.toLocaleString()} words · ${Math.max(1, Math.round(wordCount / 200))} min read`}
        </span>
        <div className={`${styles.statusPill} ${dirty ? styles.saving : styles.saved}`}>
          <span className={styles.statusDot} />
          <span>{statusLabel}</span>
        </div>
        {dirty && (
          <button type="button" className={styles.discardBtn} onClick={requestExit}>
            Discard
          </button>
        )}
        <button
          type="button"
          className={styles.publishBtn}
          disabled={!publishable || saving}
          onClick={openPublish}
        >
          Publish
        </button>
      </header>

      <div className={styles.editorCanvas}>
        <div className={styles.editorInner}>
          {/* Cover */}
          <div className={styles.coverZone}>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              data-testid="cover-input"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                if (f) void onCoverSelected(f);
              }}
            />
            {post.coverImageUrl ? (
              <div className={styles.coverPreview}>
                <img src={post.coverImageUrl} alt="Cover" />
                <button
                  type="button"
                  className={styles.coverRemove}
                  onClick={() => setCoverImageUrl(null)}
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.coverAddBtn}
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Add cover image'}
              </button>
            )}
          </div>

          {/* Title */}
          <textarea
            className={styles.titleInput}
            rows={1}
            placeholder="Post title…"
            aria-label="Post title"
            value={post.title}
            onChange={(ev) => setTitle(ev.target.value)}
          />

          {/* Toolbar */}
          <MarkdownToolbar mode={view} onMode={setView} onAction={onToolbarAction} />
          <input
            ref={inlineImageInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenInput}
            data-testid="inline-image-input"
            onChange={(ev) => onInlineImageSelected(ev.target.files?.[0] ?? null)}
          />

          {/* Editor / Preview */}
          {view === 'edit' ? (
            <textarea
              ref={textareaRef}
              className={styles.edTextarea}
              placeholder="Write in Markdown…"
              aria-label="Post body"
              value={post.content}
              onChange={(ev) => setContent(ev.target.value)}
              onPaste={onPaste}
            />
          ) : (
            <div className={styles.edPreview}>
              <div className={styles.previewBadge}>Preview</div>
              {post.content.trim() ? (
                <Markdown>{post.content}</Markdown>
              ) : (
                <p className={styles.previewEmpty}>
                  Nothing to preview yet — switch to Edit and start writing.
                </p>
              )}
            </div>
          )}

          {/* Meta */}
          <div className={styles.metaSection}>
            <div className={styles.metaField}>
              <span className={styles.metaLabel}>Sources</span>
              <div className={styles.sourcesList}>
                {sources.map((src, i) => (
                  <div className={styles.sourceRow} key={i}>
                    <input
                      className={styles.metaInput}
                      type="url"
                      placeholder="https://…"
                      aria-label={`Source URL ${i + 1}`}
                      value={src}
                      onChange={(ev) => updateSource(i, ev.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.sourceRemoveBtn}
                      aria-label={`Remove source ${i + 1}`}
                      onClick={() => removeSource(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className={styles.sourceAddBtn} onClick={addSource}>
                + Add source URL
              </button>
            </div>

            <div className={styles.metaField}>
              <span className={styles.metaLabel}>Tags</span>
              <TagInput tags={post.topics} onChange={setTopics} searchTopics={searchTopics} />
            </div>
          </div>
        </div>
      </div>

      <ImagePasteModal file={pasteFile} onConfirm={confirmInlineImage} onCancel={cancelInlineImage} />

      <Toast
        message={toast?.message ?? ''}
        show={toast !== null}
        error={toast?.error ?? false}
        onHide={dismissToast}
      />

      <ExitGuardModal
        open={exitOpen}
        primaryLabel={exitScenario.primaryLabel}
        onSave={saveAndExit}
        onDiscard={discardAndExit}
        onCancel={cancelExit}
      />

      {publishOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Confirm publish">
          <div className={styles.confirmCard}>
            <h2 className={styles.confirmTitle}>Ready to publish?</h2>
            <p className={styles.confirmSub}>
              Your post will be visible to the Verita community. You can edit it afterwards.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.confirmBtn} onClick={closePublish}>
                Keep editing
              </button>
              <button type="button" className={styles.confirmPrimary} onClick={confirmPublish}>
                Publish now
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
