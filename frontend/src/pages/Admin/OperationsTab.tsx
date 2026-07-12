import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { adminService, extractPostId } from '../../services/admin.service';
import type { FailedSummaryPost, LlmConfig, SummaryStatus } from '../../types';
import styles from './Admin.module.css';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;

/**
 * Known-good models per provider, offered as suggestions — the field stays free text because
 * provider catalogues move faster than this list does.
 *
 * A model being listed in a provider's catalogue does not mean the account may call it: NVIDIA
 * serves most of its catalogue only to orgs with "Public API Endpoints" enabled and answers the
 * rest with `404 Function not found for account`. These entries are ones verified callable.
 */
const MODEL_SUGGESTIONS: Record<string, string[]> = {
  nvidia: [
    'mistralai/mistral-large-3-675b-instruct-2512',
    'nvidia/nemotron-3-ultra-550b-a55b',
    'qwen/qwen3.5-397b-a17b',
    'deepseek-ai/deepseek-v4-pro',
    'nvidia/nemotron-3-super-120b-a12b',
    'z-ai/glm-5.2',
    'minimaxai/minimax-m3',
  ],
  logos: ['openai/gpt-oss-120b'],
};

/** Per-post summary state shown next to a re-trigger, driven by polling GET /posts/{id}/summary. */
type TrackedSummary = Record<string, SummaryStatus>;

function statusClass(status: SummaryStatus): string {
  if (status === 'PENDING') return `${styles.summaryStatus} ${styles.summaryStatusPending}`;
  if (status === 'COMPLETED') return `${styles.summaryStatus} ${styles.summaryStatusCompleted}`;
  if (status === 'FAILED') return `${styles.summaryStatus} ${styles.summaryStatusFailed}`;
  return styles.summaryStatus;
}

export default function OperationsTab() {
  const { showToast } = useToast();

  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [failed, setFailed] = useState<FailedSummaryPost[]>([]);
  const [pastedId, setPastedId] = useState('');
  const [tracked, setTracked] = useState<TrackedSummary>({});

  // Every in-flight poll, so unmounting the tab mid-poll doesn't leave timers running.
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const loadConfig = useCallback(async () => {
    try {
      const live = await adminService.getLlmConfig();
      setConfig(live);
      setProvider(live.provider);
      setModel(live.model);
    } catch {
      showToast({ message: 'Could not load the GenAI configuration.', variant: 'error' });
    }
  }, [showToast]);

  const loadFailed = useCallback(async () => {
    try {
      const page = await adminService.listFailedSummaries(0, 20);
      setFailed(page.content);
    } catch {
      showToast({ message: 'Could not load failed summaries.', variant: 'error' });
    }
  }, [showToast]);

  useEffect(() => {
    loadConfig();
    loadFailed();
  }, [loadConfig, loadFailed]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigError(null);
    try {
      const updated = await adminService.updateLlmConfig(provider, model);
      setConfig(updated);
      showToast({ message: `GenAI now uses ${updated.provider} / ${updated.model}.`, variant: 'success' });
    } catch {
      // The most likely 400 is a provider whose API key is missing on the GenAI host.
      setConfigError('Could not apply that configuration. The provider may have no API key configured.');
    } finally {
      setSavingConfig(false);
    }
  };

  /**
   * Polls the post's summary state until it settles. The trigger endpoint only returns 202 —
   * the retrying listener on the server is what eventually writes COMPLETED or FAILED.
   */
  const pollSummary = useCallback((postId: string) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const tick = async () => {
      try {
        const { status } = await adminService.getPostSummary(postId);
        setTracked((prev) => ({ ...prev, [postId]: status }));

        if (status === 'PENDING' && Date.now() < deadline) {
          timers.current.push(window.setTimeout(tick, POLL_INTERVAL_MS));
          return;
        }
        if (status === 'COMPLETED') {
          // It is no longer a failure, so drop it from the FAILED list.
          setFailed((prev) => prev.filter((p) => p.id !== postId));
        }
      } catch {
        setTracked((prev) => ({ ...prev, [postId]: 'FAILED' }));
      }
    };

    timers.current.push(window.setTimeout(tick, POLL_INTERVAL_MS));
  }, []);

  const triggerResummarize = async (postId: string) => {
    setTracked((prev) => ({ ...prev, [postId]: 'PENDING' }));
    try {
      await adminService.resummarizePost(postId);
      showToast({ message: 'Summarization queued.', variant: 'info' });
      pollSummary(postId);
    } catch {
      setTracked((prev) => ({ ...prev, [postId]: 'FAILED' }));
      showToast({ message: 'Could not queue summarization for that post.', variant: 'error' });
    }
  };

  const handlePastedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const postId = extractPostId(pastedId);
    if (!postId) {
      showToast({ message: 'Paste a post ID or a post URL.', variant: 'error' });
      return;
    }
    setPastedId('');
    triggerResummarize(postId);
  };

  return (
    <div className={styles.opsGrid} data-testid="admin-operations-tab">
      {/* ── LLM provider ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>LLM provider</h2>
        <p className={styles.cardHint}>
          Switches the model behind summaries and digests. The change applies immediately but is held
          in memory only — GenAI falls back to its configured default when it restarts.
        </p>

        {config && (
          <div className={styles.currentValue} data-testid="admin-llm-current">
            active: {config.provider} / {config.model} (temperature {config.temperature})
          </div>
        )}

        <form onSubmit={handleSaveConfig}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="llm-provider">
              Provider
            </label>
            <select
              id="llm-provider"
              className={styles.select}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              data-testid="admin-llm-provider"
            >
              {config?.availableProviders.map((p) => (
                // A provider with no API key would fail every call, so it cannot be picked.
                <option key={p.name} value={p.name} disabled={!p.configured}>
                  {p.name}
                  {p.configured ? '' : ' — no API key'}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="llm-model">
              Model
            </label>
            <input
              id="llm-model"
              className={styles.input}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              list="llm-model-suggestions"
              placeholder={MODEL_SUGGESTIONS[provider]?.[0] ?? 'provider/model-name'}
              data-testid="admin-llm-model"
            />
            <datalist id="llm-model-suggestions" data-testid="admin-llm-model-suggestions">
              {(MODEL_SUGGESTIONS[provider] ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={savingConfig || !provider || !model}
            data-testid="admin-llm-save"
          >
            {savingConfig ? 'Applying…' : 'Apply'}
          </button>

          {configError && <p className={styles.error}>{configError}</p>}
        </form>
      </section>

      {/* ── Re-summarize ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Re-summarize a post</h2>
        <p className={styles.cardHint}>
          Re-runs AI summarization. Posts land here when summarization failed after its retries — a
          bad model, a provider outage, or a transient error upstream.
        </p>

        <form className={styles.inlineForm} onSubmit={handlePastedSubmit}>
          <input
            className={styles.input}
            value={pastedId}
            onChange={(e) => setPastedId(e.target.value)}
            placeholder="Paste a post ID or URL…"
            data-testid="admin-resummarize-input"
          />
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} data-testid="admin-resummarize-submit">
            Re-summarize
          </button>
        </form>

        {Object.entries(tracked).length > 0 && (
          <div className={styles.statusRow} data-testid="admin-summary-status">
            {Object.entries(tracked).map(([postId, status]) => (
              <span key={postId} className={statusClass(status)}>
                {postId.slice(0, 8)}: {status}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Failed summaries ── */}
      <section>
        <div className={styles.sectionHd}>
          <div>
            <h2>Failed summaries</h2>
            <p>Posts the summarizer gave up on. Re-trigger once the provider is healthy again.</p>
          </div>
        </div>

        <div className={styles.tblWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Post</th>
                <th style={{ width: 140 }}>Failed at</th>
                <th style={{ width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {failed.map((post) => (
                <tr key={post.id} data-testid="admin-failed-row">
                  <td>
                    <div className={styles.postTitle}>{post.title}</div>
                    <div className={styles.userHandle}>{post.id}</div>
                  </td>
                  <td>
                    <span className={styles.dateCell}>{post.updatedAt?.slice(0, 10)}</span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.btn}
                        disabled={tracked[post.id] === 'PENDING'}
                        onClick={() => triggerResummarize(post.id)}
                        data-testid="admin-retrigger"
                      >
                        {tracked[post.id] === 'PENDING' ? 'Working…' : 'Re-trigger'}
                      </button>
                      {tracked[post.id] && (
                        <span className={statusClass(tracked[post.id])}>{tracked[post.id]}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {failed.length === 0 && (
            <div className={styles.emptyState}>
              <strong>No failed summaries</strong>
              Every post has been summarized.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
