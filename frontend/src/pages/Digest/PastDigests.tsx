import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../contexts/ModalContext';
import { contentService } from '../../services/content.service';
import type { DigestListItem } from '../../types';
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
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [isLoggedIn]);

  const todayDigest = contentService.getTodayDigest();
  const allDigests = contentService.getDigestList();
  const visible = allDigests.slice(0, visibleCount);
  const groups = groupByWeek(visible);
  const hasMore = visibleCount < allDigests.length;

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (!isLoggedIn) {
    return (
      <div className={styles.pastDigestsWrap}>
        <div className={styles.signinHero}>
          <div>
            <div className={styles.signinHeroEyebrow}>
              <span className={styles.signinHeroEyebrowDot} />
              Personalised Digest
            </div>
            <div className={styles.signinHeroTitle}>Sign in for your personalised digest</div>
            <div className={styles.signinHeroSub}>
              Get a tailored daily brief based on the topics you follow. New digest every morning at 6 AM.
            </div>
          </div>
          <div className={styles.signinHeroActions}>
            <button className={styles.signinHeroBtnPrimary} onClick={() => openAuth('login')}>Log in</button>
            <button className={styles.signinHeroBtnGhost} onClick={() => openAuth('signup')}>Create account</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pastDigestsWrap}>
      <div className={styles.todayHero}>
        <div className={styles.todayHeroInner}>
          <div className={styles.todayHeroText}>
            <div className={styles.todayLabel}>
              <span className={styles.todayLabelDot} />
              Today · {todayFormatted}
            </div>
            {todayDigest.status === 'generated' ? (
              <>
                <div className={styles.todayTitle}>{todayDigest.title}</div>
                <div className={styles.todaySubtitle}>{todayDigest.topStorySubtitle}</div>
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
              onClick={() => navigate(`/digest/${todayDigest.date}`, { state: { from: 'Digest' } })}
            >
              Read{' '}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

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
                key={item.date}
                item={item}
                onClick={() => navigate(`/digest/${item.date}`, { state: { from: 'Digest' } })}
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
