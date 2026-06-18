import { useState } from 'react';
import { contentService } from '../../services/content.service';
import type { TopicCategory, TopicItem } from '../../types';
import styles from './Digest.module.css';

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}

interface ManageTopicsProps {
  followedTopics: Set<string>;
  onToggle: (tag: string) => void;
  onSave: () => void;
  onReset: () => void;
}

const DEFAULT_VISIBLE = 5;

export default function ManageTopics({ followedTopics, onToggle, onSave, onReset }: ManageTopicsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const allCategories = contentService.getTopicCategories();

  const filteredCategories: TopicCategory[] = searchQuery
    ? allCategories
        .map(cat => ({
          ...cat,
          topics: cat.topics.filter(t =>
            t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter(cat => cat.topics.length > 0)
    : allCategories;

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
          <span className={styles.topicsTitle}>Manage topics</span>
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
                    onToggle={onToggle}
                    animateIn={isExpanded && i >= DEFAULT_VISIBLE}
                    animationDelay={isExpanded && i >= DEFAULT_VISIBLE ? (i - DEFAULT_VISIBLE) * 35 : 0}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.saveBar}>
        <div className={styles.saveBarInfo}>
          Following <strong>{followedTopics.size}</strong> topics
        </div>
        <div className={styles.saveBarActions}>
          <button className={styles.saveBtnGhost} onClick={onReset}>Reset</button>
          <button className={styles.saveBtn} onClick={onSave}>Save preferences</button>
        </div>
      </div>
    </>
  );
}

function TopicCard({
  topic,
  followed,
  onToggle,
  animateIn,
  animationDelay,
}: {
  topic: TopicItem;
  followed: boolean;
  onToggle: (tag: string) => void;
  animateIn: boolean;
  animationDelay: number;
}) {
  return (
    <div
      className={`${styles.topicCard} ${followed ? styles.topicCardFollowed : ''}`}
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
