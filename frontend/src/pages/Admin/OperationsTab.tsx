import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { adminService, extractPostId } from '../../services/admin.service';
import type {
  AdminUser,
  DigestGenerationJob,
  FailedSummaryPost,
  LlmConfig,
  SummaryStatus,
} from '../../types';
import styles from './Admin.module.css';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;

/** Digest generation waits on GenAI plus external news fetches, so it far outlasts a summary. */
const DIGEST_POLL_TIMEOUT_MS = 300_000;

const USER_SEARCH_LIMIT = 6;

/**
 * Yesterday, as `YYYY-MM-DD`. The default because today's Platform Day is still accumulating news:
 * the day an admin actually wants to (re)generate is the last complete one.
 */
function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

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

function statusClass(status: SummaryStatus | DigestGenerationJob['status']): string {
  if (status === 'PENDING') return `${styles.summaryStatus} ${styles.summaryStatusPending}`;
  if (status === 'COMPLETED') return `${styles.summaryStatus} ${styles.summaryStatusCompleted}`;
  if (status === 'FAILED') return `${styles.summaryStatus} ${styles.summaryStatusFailed}`;
  // SKIPPED lands here on purpose: nothing was generated, but nothing went wrong either.
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

  // Digest generation: who for, which Platform Day, and the job the panel is following.
  const [userQuery, setUserQuery] = useState('');
  const [matches, setMatches] = useState<AdminUser[]>([]);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [digestDate, setDigestDate] = useState(yesterdayIso());
  const [digestForce, setDigestForce] = useState(false);
  const [digestJob, setDigestJob] = useState<DigestGenerationJob | null>(null);
  const [startingDigest, setStartingDigest] = useState(false);

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

  // Users are searched server-side (an admin cannot see them all), so debounce the keystrokes.
  // Once a user is picked the query holds their name, which must not re-open the suggestions.
  useEffect(() => {
    if (target || userQuery.trim().length < 2) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const page = await adminService.listUsers(userQuery.trim(), 0, USER_SEARCH_LIMIT);
        setMatches(page.content);
      } catch {
        setMatches([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [userQuery, target]);

  /**
   * Follows the generation job to its terminal state. Unlike a summary — whose status hangs on the
   * post row — a digest only exists once generation succeeds, so the job is what reports the outcome.
   */
  const pollDigestJob = useCallback((jobId: string) => {
    const deadline = Date.now() + DIGEST_POLL_TIMEOUT_MS;

    const tick = async () => {
      try {
        const job = await adminService.getDigestJob(jobId);
        setDigestJob(job);
        if (job.status === 'PENDING' && Date.now() < deadline) {
          timers.current.push(window.setTimeout(tick, POLL_INTERVAL_MS));
        }
      } catch {
        setDigestJob((prev) =>
          prev && prev.id === jobId
            ? { ...prev, status: 'FAILED', message: 'Lost track of the job.' }
            : prev,
        );
      }
    };

    timers.current.push(window.setTimeout(tick, POLL_INTERVAL_MS));
  }, []);

  const handleGenerateDigest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;

    setStartingDigest(true);
    try {
      const job = await adminService.generateUserDigest(target.id, digestDate, digestForce);
      setDigestJob(job);
      pollDigestJob(job.id);
    } catch {
      showToast({ message: `Could not start digest generation for @${target.username}.`, variant: 'error' });
    } finally {
      setStartingDigest(false);
    }
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

      {/* ── Generate a user digest ── */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Generate a user digest</h2>
        <p className={styles.cardHint}>
          Runs the same orchestration as the nightly job, for one user and one day. It waits on GenAI
          and external news, so it takes a minute — the status below follows it to the end.
        </p>

        <form onSubmit={handleGenerateDigest}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="digest-user">
              User
            </label>
            <div className={styles.comboWrap}>
              <input
                id="digest-user"
                className={styles.input}
                value={userQuery}
                onChange={(e) => {
                  setUserQuery(e.target.value);
                  setTarget(null);
                }}
                placeholder="Search by name or email…"
                autoComplete="off"
                data-testid="admin-digest-user-search"
              />
              {matches.length > 0 && (
                <ul className={styles.comboList} data-testid="admin-digest-user-options">
                  {matches.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={styles.comboOption}
                        onClick={() => {
                          setTarget(u);
                          setUserQuery(`@${u.username}`);
                          setMatches([]);
                        }}
                        data-testid="admin-digest-user-option"
                      >
                        <span className={styles.userName}>{u.displayName}</span>
                        <span className={styles.userHandle}>@{u.username}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="digest-date">
              Day
            </label>
            <input
              id="digest-date"
              type="date"
              className={styles.input}
              value={digestDate}
              onChange={(e) => setDigestDate(e.target.value)}
              data-testid="admin-digest-date"
            />
            <p className={styles.fieldHint}>
              Defaults to yesterday, the last complete day. Older days generate from thinner news.
            </p>
          </div>

          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={digestForce}
              onChange={(e) => setDigestForce(e.target.checked)}
              data-testid="admin-digest-force"
            />
            Force (regenerate if the user already has one for that day)
          </label>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!target || startingDigest || digestJob?.status === 'PENDING'}
            data-testid="admin-digest-submit"
          >
            {digestJob?.status === 'PENDING' ? 'Generating…' : 'Generate'}
          </button>
        </form>

        {digestJob && (
          <div className={styles.statusRow} data-testid="admin-digest-status">
            <span className={statusClass(digestJob.status)}>
              {digestJob.digestDate}: {digestJob.status}
            </span>
            {digestJob.message && <span className={styles.fieldHint}>{digestJob.message}</span>}
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
