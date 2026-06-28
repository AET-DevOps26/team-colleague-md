import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../contexts/ModalContext';
import { contentService } from '../../services/content.service';
import type { TopicCategory } from '../../types';
import PostDetailTopbar from '../../components/layout/PostDetailTopbar';
import PastDigests from './PastDigests';
import ManageTopics from './ManageTopics';
import styles from './Digest.module.css';

type Tab = 'past' | 'topics';

export default function Digest() {
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const [activeTab, setActiveTab] = useState<Tab>('past');
  const [categories, setCategories] = useState<TopicCategory[]>([]);
  const [followedTopics, setFollowedTopics] = useState<Set<string>>(() => new Set());

  // Follow state lives entirely in this page (no Home-feed leakage). Initialise from the real
  // subscription set + topic catalog once the user is known; the page already gates on login.
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    contentService.getTopicCategories().then((c) => { if (!cancelled) setCategories(c); }).catch(() => {});
    contentService.getFollowedTopicIds().then((ids) => { if (!cancelled) setFollowedTopics(ids); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Optimistic toggle by topic id: flip immediately, fire the request, roll back on failure.
  const handleToggle = useCallback((topicId: string): Promise<void> => {
    const wasFollowing = followedTopics.has(topicId);
    setFollowedTopics((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(topicId); else next.add(topicId);
      return next;
    });
    const op = wasFollowing ? contentService.unfollowTopic(topicId) : contentService.followTopic(topicId);
    return op.catch((err) => {
      setFollowedTopics((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(topicId); else next.delete(topicId);
        return next;
      });
      throw err;
    });
  }, [followedTopics]);

  const tabs = (
    <>
      <button
        className={`${styles.tabBtn} ${activeTab === 'past' ? styles.tabBtnActive : ''}`}
        role="tab"
        aria-selected={activeTab === 'past'}
        onClick={() => setActiveTab('past')}
      >
        Past Digests
      </button>
      <button
        className={`${styles.tabBtn} ${activeTab === 'topics' ? styles.tabBtnActive : ''}`}
        role="tab"
        aria-selected={activeTab === 'topics'}
        onClick={() => setActiveTab('topics')}
      >
        Manage Topics
      </button>
    </>
  );

  if (!isLoggedIn) {
    return (
      <>
        <PostDetailTopbar tabs={tabs} />
        <div className={styles.content}>
          <div className={styles.signinHero}>
            <div>
              <div className={styles.signinHeroEyebrow}>
                <span className={styles.signinHeroEyebrowDot} />
                AI Daily Digest
              </div>
              <div className={styles.signinHeroTitle}>Your personalised digest awaits</div>
              <div className={styles.signinHeroSub}>
                Sign in to get a daily briefing on AI news and research tailored to your topics.
              </div>
            </div>
            <div className={styles.signinHeroActions}>
              <button className={styles.signinHeroBtnPrimary} onClick={() => openAuth('login')}>
                Log in
              </button>
              <button className={styles.signinHeroBtnGhost} onClick={() => openAuth('signup')}>
                Create account
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PostDetailTopbar tabs={tabs} />
      <div className={styles.content}>
        {activeTab === 'past' && <PastDigests />}
        {activeTab === 'topics' && (
          <ManageTopics categories={categories} followedTopics={followedTopics} onToggle={handleToggle} />
        )}
      </div>
    </>
  );
}
