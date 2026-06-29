import { useState, useCallback, useRef, useEffect } from 'react';
import type { TopicCategory, TopicItem } from '../../types';
import Toast from '../../components/ui/Toast';
import { sortTopics } from './topicSort';
import styles from './Topic.module.css';

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}

interface ManageTopicsProps {
  categories: TopicCategory[];
  followedTopics: Set<string>;
  // Returns a promise so the optimistic toggle can surface a rollback error toast.
  onToggle: (topicId: string) => void | Promise<void>;
}

const DEFAULT_VISIBLE = 5;
// Mirrors recommendation-service's MAX_FOLLOWED_TOPICS; following more is rejected server-side.
const MAX_FOLLOWED = 10;

export default function ManageTopics({ categories, followedTopics, onToggle }: ManageTopicsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const rawCategories = categories;

  // Per-category topic order (by topic id): followed first, preserving relative order in each group.
  const [catOrder, setCatOrder] = useState<Record<string, string[]>>({});
  // Seed the order once the catalog arrives (and when it changes). Topics already followed sort first.
  useEffect(() => {
    setCatOrder((prev) => {
      const order: Record<string, string[]> = {};
      for (const cat of rawCategories) {
        if (prev[cat.id]) { order[cat.id] = prev[cat.id]; continue; }
        const followed = cat.topics.filter(t => followedTopics.has(t.id)).map(t => t.id);
        const unfollowed = cat.topics.filter(t => !followedTopics.has(t.id)).map(t => t.id);
        order[cat.id] = [...followed, ...unfollowed];
      }
      return order;
    });
    // followedTopics intentionally excluded: re-seeding on every toggle would undo the
    // settle-into-place animation ordering managed by handleToggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawCategories]);

  const [justFollowedTag, setJustFollowedTag] = useState<string | null>(null);
  const [toastShow, setToastShow] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastPositive, setToastPositive] = useState(true);
  const pillRef = useRef<HTMLSpanElement>(null);

  const handleToggle = useCallback((topicId: string) => {
    const willFollow = !followedTopics.has(topicId);
    const topic = rawCategories.flatMap(c => c.topics).find(t => t.id === topicId);
    const dn = topic?.displayName ?? topicId;

    // Block before the request when already at the cap, so the user gets a clear message
    // instead of a generic rollback toast from the rejected follow.
    if (willFollow && followedTopics.size >= MAX_FOLLOWED) {
      setToastMsg(`You can follow up to ${MAX_FOLLOWED} topics — unfollow one first`);
      setToastPositive(false);
      setToastShow(true);
      return;
    }

    // Fire the toggle (optimistic in the parent); roll the toast back if the request fails.
    Promise.resolve(onToggle(topicId)).catch(() => {
      setToastMsg(`Couldn't update #${dn} — try again`);
      setToastPositive(false);
      setToastShow(true);
    });

    // Re-sort: [followedOthers, topic, unfollowedOthers]
    // follow  → topic lands at end of followed group
    // unfollow → topic lands at start of unfollowed group
    setCatOrder(prev => {
      const next = { ...prev };
      for (const cat of rawCategories) {
        if (!cat.topics.some(t => t.id === topicId)) continue;
        const order = prev[cat.id] ?? cat.topics.map(t => t.id);
        next[cat.id] = sortTopics(order, topicId, followedTopics);
        break;
      }
      return next;
    });

    if (willFollow) {
      setJustFollowedTag(topicId);
      setTimeout(() => setJustFollowedTag(cur => (cur === topicId ? null : cur)), 620);
    }

    // Bump pill animation (force-restart via reflow)
    const pill = pillRef.current;
    if (pill) {
      pill.classList.remove(styles.followPillBump);
      void pill.offsetWidth;
      pill.classList.add(styles.followPillBump);
    }

    setToastMsg(willFollow ? `Following #${dn}` : `Unfollowed #${dn}`);
    setToastPositive(willFollow);
    setToastShow(true);
  }, [followedTopics, onToggle, rawCategories]);

  const hideToast = useCallback(() => setToastShow(false), []);

  const atLimit = followedTopics.size >= MAX_FOLLOWED;

  // Apply order, then filter by search
  const sortedCategories = rawCategories.map(cat => {
    const order = catOrder[cat.id] ?? cat.topics.map(t => t.id);
    const topicMap = new Map(cat.topics.map(t => [t.id, t]));
    return {
      ...cat,
      topics: order.map(id => topicMap.get(id)).filter((t): t is TopicItem => t !== undefined),
    };
  });

  const filteredCategories: TopicCategory[] = searchQuery
    ? sortedCategories
        .map(cat => ({
          ...cat,
          topics: cat.topics.filter(t =>
            t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter(cat => cat.topics.length > 0)
    : sortedCategories;

  function toggleCat(catId: string) {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  return (
    <>
      <div className={styles.topicsWrap}>
        <div className={styles.topicsHeader}>
          <div className={styles.topicsTitleWrap}>
            <span className={styles.topicsTitle}>Manage topics</span>
            <span
              ref={pillRef}
              className={`${styles.followPill} ${followedTopics.size > 0 ? styles.followPillActive : ''}`}
            >
              <span className={styles.followPillDot} />
              Following <strong>{followedTopics.size}</strong> / {MAX_FOLLOWED}
            </span>
          </div>
          <div className={styles.topicsSearchWrap}>
            <svg className={styles.topicsSearchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              className={styles.topicsSearch}
              type="text"
              placeholder="Filter topics…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setExpandedCats(new Set()); }}
            />
          </div>
        </div>

        {filteredCategories.map(cat => {
          const isExpanded = expandedCats.has(cat.id);
          const visible = isExpanded ? cat.topics : cat.topics.slice(0, DEFAULT_VISIBLE);
          const hiddenCount = cat.topics.length - DEFAULT_VISIBLE;

          return (
            <div key={cat.id} className={styles.catGroup}>
              <div className={styles.catHeader}>
                <span className={styles.catLabel}>{cat.label}</span>
                {cat.topics.length > DEFAULT_VISIBLE && (
                  <button className={styles.catMoreBtn} onClick={() => toggleCat(cat.id)}>
                    {isExpanded ? 'Show less ↑' : `More (${hiddenCount}) →`}
                  </button>
                )}
              </div>
              <div className={styles.topicRow}>
                {visible.map((topic, i) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    followed={followedTopics.has(topic.id)}
                    disabled={atLimit && !followedTopics.has(topic.id)}
                    onToggle={handleToggle}
                    animateIn={isExpanded && i >= DEFAULT_VISIBLE}
                    animationDelay={isExpanded && i >= DEFAULT_VISIBLE ? (i - DEFAULT_VISIBLE) * 35 : 0}
                    justFollowed={justFollowedTag === topic.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Toast message={toastMsg} show={toastShow} onHide={hideToast} neutral={!toastPositive} />
    </>
  );
}

function TopicCard({
  topic,
  followed,
  disabled,
  onToggle,
  animateIn,
  animationDelay,
  justFollowed,
}: {
  topic: TopicItem;
  followed: boolean;
  disabled: boolean;
  onToggle: (topicId: string) => void;
  animateIn: boolean;
  animationDelay: number;
  justFollowed: boolean;
}) {
  const cardClass = [
    styles.topicCard,
    followed ? styles.topicCardFollowed : '',
    justFollowed ? styles.topicCardJustFollowed : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClass}
      style={animateIn ? { animation: `cardAppear 180ms ease-out ${animationDelay}ms both` } : undefined}
    >
      <div className={styles.tagName}>
        <span className={styles.tagNameHash}>#</span>{topic.displayName}
      </div>
      <div className={styles.postCount}>{topic.postsThisWeek} posts this week</div>
      <div className={`${styles.trendingRow} ${!topic.isHot ? styles.trendingRowEmpty : ''}`}>
        {topic.isHot ? '↑ trending' : null}
      </div>
      <div className={styles.activityBarWrap}>
        <div
          className={`${styles.activityBar} ${followed ? styles.activityBarFollowed : ''}`}
          style={{ width: `${Math.round(topic.activityScore * 100)}%` }}
        />
      </div>
      <div className={styles.topicCardFooter}>
        <button
          className={`${styles.followBtn} ${followed ? styles.followBtnFollowed : ''}`}
          onClick={() => onToggle(topic.id)}
          disabled={disabled}
          title={disabled ? `You can follow up to ${MAX_FOLLOWED} topics` : undefined}
          aria-label={followed ? `Unfollow ${topic.displayName}` : `Follow ${topic.displayName}`}
        >
          {followed ? 'Following' : 'Follow'}
        </button>
        <span className={styles.followerCount}>{fmtCount(topic.followerCount)}</span>
      </div>
    </div>
  );
}
