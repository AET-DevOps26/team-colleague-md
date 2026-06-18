import { useState, useCallback, useRef, useMemo } from 'react';
import { contentService } from '../../services/content.service';
import type { TopicCategory, TopicItem } from '../../types';
import Toast from '../../components/ui/Toast';
import { sortTopics } from './topicSort';
import styles from './Digest.module.css';

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}

interface ManageTopicsProps {
  followedTopics: Set<string>;
  onToggle: (tag: string) => void;
}

const DEFAULT_VISIBLE = 5;

export default function ManageTopics({ followedTopics, onToggle }: ManageTopicsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const rawCategories = useMemo(() => contentService.getTopicCategories(), []);

  // Per-category topic order: followed first, preserving relative order within each group
  const [catOrder, setCatOrder] = useState<Record<string, string[]>>(() => {
    const order: Record<string, string[]> = {};
    for (const cat of rawCategories) {
      const followed = cat.topics.filter(t => followedTopics.has(t.name)).map(t => t.name);
      const unfollowed = cat.topics.filter(t => !followedTopics.has(t.name)).map(t => t.name);
      order[cat.id] = [...followed, ...unfollowed];
    }
    return order;
  });

  const [justFollowedTag, setJustFollowedTag] = useState<string | null>(null);
  const [toastShow, setToastShow] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastPositive, setToastPositive] = useState(true);
  const pillRef = useRef<HTMLSpanElement>(null);

  const handleToggle = useCallback((tag: string) => {
    const willFollow = !followedTopics.has(tag);
    onToggle(tag);

    // Re-sort: [followedOthers, tag, unfollowedOthers]
    // follow  → tag lands at end of followed group
    // unfollow → tag lands at start of unfollowed group
    setCatOrder(prev => {
      const next = { ...prev };
      for (const cat of rawCategories) {
        if (!cat.topics.some(t => t.name === tag)) continue;
        const order = prev[cat.id] ?? cat.topics.map(t => t.name);
        next[cat.id] = sortTopics(order, tag, followedTopics);
        break;
      }
      return next;
    });

    if (willFollow) {
      setJustFollowedTag(tag);
      setTimeout(() => setJustFollowedTag(cur => (cur === tag ? null : cur)), 620);
    }

    // Bump pill animation (force-restart via reflow)
    const pill = pillRef.current;
    if (pill) {
      pill.classList.remove(styles.followPillBump);
      void pill.offsetWidth;
      pill.classList.add(styles.followPillBump);
    }

    const topic = rawCategories.flatMap(c => c.topics).find(t => t.name === tag);
    const dn = topic?.displayName ?? tag;
    setToastMsg(willFollow ? `Following #${dn}` : `Unfollowed #${dn}`);
    setToastPositive(willFollow);
    setToastShow(true);
  }, [followedTopics, onToggle, rawCategories]);

  const hideToast = useCallback(() => setToastShow(false), []);

  // Apply order, then filter by search
  const sortedCategories = rawCategories.map(cat => {
    const order = catOrder[cat.id] ?? cat.topics.map(t => t.name);
    const topicMap = new Map(cat.topics.map(t => [t.name, t]));
    return {
      ...cat,
      topics: order.map(n => topicMap.get(n)).filter((t): t is TopicItem => t !== undefined),
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
              Following <strong>{followedTopics.size}</strong>
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
                    key={topic.name}
                    topic={topic}
                    followed={followedTopics.has(topic.name)}
                    onToggle={handleToggle}
                    animateIn={isExpanded && i >= DEFAULT_VISIBLE}
                    animationDelay={isExpanded && i >= DEFAULT_VISIBLE ? (i - DEFAULT_VISIBLE) * 35 : 0}
                    justFollowed={justFollowedTag === topic.name}
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
  onToggle,
  animateIn,
  animationDelay,
  justFollowed,
}: {
  topic: TopicItem;
  followed: boolean;
  onToggle: (tag: string) => void;
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
          onClick={() => onToggle(topic.name)}
          aria-label={followed ? `Unfollow ${topic.displayName}` : `Follow ${topic.displayName}`}
        >
          {followed ? 'Following' : 'Follow'}
        </button>
        <span className={styles.followerCount}>{fmtCount(topic.followerCount)}</span>
      </div>
    </div>
  );
}
