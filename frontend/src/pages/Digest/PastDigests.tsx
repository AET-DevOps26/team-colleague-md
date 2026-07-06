import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentService } from '../../services/content.service';
import type { DigestListItem, TodayDigest } from '../../types';
import styles from './Digest.module.css';

const PAGE_SIZE = 10;

function getWeekLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return 'This week';  // covers diffDays <= 0 (future dates) as well
  if (diffDays < 14) return 'Last week';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function groupByWeek(items: DigestListItem[]): Array<{ label: string; items: DigestListItem[] }> {
  const groups: Array<{ label: string; items: DigestListItem[] }> = [];
  const seen = new Map<string, number>();
  for (const item of items) {
    const label = getWeekLabel(item.date);
    const idx = seen.get(label);
    if (idx === undefined) {
      seen.set(label, groups.length);
      groups.push({ label, items: [item] });
    } else {
      groups[idx].items.push(item);
    }
  }
  return groups;
}

export default function PastDigests() {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [todayDigest, setTodayDigest] = useState<TodayDigest | null>(null);
  const [allDigests, setAllDigests] = useState<DigestListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    contentService.getDigests()
      .then(({ today, items }) => {
        if (cancelled) return;
        setTodayDigest(today);
        setAllDigests(today ? items.filter((d) => d.date !== today.date) : items);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = allDigests.slice(0, visibleCount);
  const groups = groupByWeek(visible);
  const hasMore = visibleCount < allDigests.length;

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Until the digest generation pipeline lands (ADR-0013) this list is empty for everyone —
  // that is the expected state, not a bug.
  if (!loading && !todayDigest && allDigests.length === 0) {
    return (
      <div className={styles.pastDigestsWrap}>
        <div className={styles.todayHero}>
          <div className={styles.todayHeroInner}>
            <div className={styles.todayHeroText}>
              <div className={styles.todayLabel}>
                <span className={styles.todayLabelDot} />
                Today · {todayFormatted}
              </div>
              <div className={styles.todayTitle}>No digests yet</div>
              <div className={styles.todaySubtitle}>
                Check back once your daily briefing is generated — it’s built from the topics you follow.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pastDigestsWrap}>
      {todayDigest && (
      <div className={styles.todayHero}>
        <div className={styles.todayHeroInner}>
          <div className={styles.todayHeroText}>
            <div className={styles.todayLabel}>
              <span className={styles.todayLabelDot} />
              Today · {todayFormatted}
              <span className={styles.digestTypeBadge}>
                {todayDigest.digestType === 'PUBLIC' ? 'Community' : 'Personalized'}
              </span>
            </div>
            {todayDigest.status === 'generated' ? (
              <>
                <div className={styles.todayTitle}>{todayDigest.title}</div>
                <div className={styles.todaySubtitle}>{todayDigest.topStorySubtitle}</div>
                {todayDigest.digestType === 'PUBLIC' && (
                  <div className={styles.zeroSubHint}>
                    You follow no topics — you’ll only get the public digest.{' '}
                    <button type="button" onClick={() => navigate('/topics')}>Follow topics →</button>
                  </div>
                )}
                <div className={styles.todayMeta}>
                  <span>{todayDigest.eventCount} events</span>
                  <span className={styles.todayMetaDot}>·</span>
                  <span>~{todayDigest.readTimeMinutes} min read</span>
                  <span className={styles.todayMetaDot}>·</span>
                  <span>Generated {todayDigest.generatedAt}</span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.generatingState}>
                  <span className={styles.genSpinner} />
                  <span>Generating your digest — check back later</span>
                </div>
                <div className={styles.todayMeta} style={{ marginTop: 10 }}>
                  <span>~{todayDigest.readTimeMinutes} min read when ready</span>
                  <span className={styles.todayMetaDot}>·</span>
                  <span>Usually ready by 06:00 AM</span>
                </div>
              </>
            )}
          </div>
          {todayDigest.status === 'generated' && (
            <button
              className={styles.todayCta}
              onClick={() => navigate(`/digest/${todayDigest.id}`, { state: { from: 'Digest' } })}
            >
              Read{' '}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
      )}

      <div className={styles.historyHeader}>
        <h2>Past digests</h2>
        <span className={styles.historyCount}>{allDigests.length} digests</span>
      </div>

      {groups.map(group => (
        <div key={group.label} className={styles.digestGroup}>
          <div className={styles.digestGroupLabel}>{group.label}</div>
          <div className={styles.digestGrid}>
            {group.items.map(item => (
              <DigestCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/digest/${item.id}`, { state: { from: 'Digest' } })}
              />
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className={styles.loadMoreWrap}>
          <button
            className={styles.loadMoreBtn}
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          >
            Load more{' '}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function DigestCard({ item, onClick }: { item: DigestListItem; onClick: () => void }) {
  return (
    <div
      className={styles.histCard}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Read digest for ${item.displayDate}`}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.histCardBlock}>
        <div className={styles.histEyebrow}>
          <span className={styles.histDate}>{item.displayDate}</span>
          <span className={styles.digestTypeBadge}>
            {item.digestType === 'PUBLIC' ? 'Community' : 'Personalized'}
          </span>
          <span className={styles.histMetaInline}>{item.eventCount} events · ~{item.readTimeMinutes} min</span>
        </div>
        <blockquote className={styles.histPull}>{item.title}</blockquote>
      </div>
      <div className={styles.histBody}>
        <div className={styles.histFooter}>
          <span className={styles.histReadLink}>
            Read{' '}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
