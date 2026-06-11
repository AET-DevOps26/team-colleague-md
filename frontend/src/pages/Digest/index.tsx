import { useState, useCallback } from 'react';
import { contentService } from '../../services/content.service';
import PostDetailTopbar from '../../components/layout/PostDetailTopbar';
import Toast from '../../components/ui/Toast';
import PastDigests from './PastDigests';
import ManageTopics from './ManageTopics';
import styles from './Digest.module.css';

type Tab = 'past' | 'topics';

export default function Digest() {
  const [activeTab, setActiveTab] = useState<Tab>('past');
  const [followedTopics, setFollowedTopics] = useState<Set<string>>(
    () => new Set(contentService.getFollowedTopics())
  );
  const [toastVisible, setToastVisible] = useState(false);

  const handleToggle = useCallback((tag: string) => {
    contentService.toggleTopicFollow(tag);
    setFollowedTopics(new Set(contentService.getFollowedTopics()));
  }, []);

  const handleSave = useCallback(() => {
    contentService.saveTopicPreferences();
    setToastVisible(true);
  }, []);

  const handleReset = useCallback(() => {
    contentService.resetTopicPreferences();
    setFollowedTopics(new Set(contentService.getFollowedTopics()));
  }, []);

  const hideToast = useCallback(() => setToastVisible(false), []);

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

  return (
    <>
      <PostDetailTopbar tabs={tabs} />
      <div className={styles.content}>
        {activeTab === 'past' && <PastDigests />}
        {activeTab === 'topics' && (
          <ManageTopics
            followedTopics={followedTopics}
            onToggle={handleToggle}
            onSave={handleSave}
            onReset={handleReset}
          />
        )}
      </div>

      <Toast message="Preferences saved" show={toastVisible} onHide={hideToast} />
    </>
  );
}
