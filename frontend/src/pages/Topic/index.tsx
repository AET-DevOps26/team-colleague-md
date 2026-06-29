import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../contexts/ModalContext';
import { useFollowedTopics } from '../../contexts/FollowedTopicsContext';
import PostDetailTopbar from '../../components/layout/PostDetailTopbar';
import ManageTopics from './ManageTopics';
import styles from './Topic.module.css';

/**
 * The single standing home for all Topic surfaces (ADR-0014). Login-gated, sibling to Digest.
 * Today it hosts only Topic-Subscription management; trends/radar land here later behind tabs.
 * The subscription set it manages is shared via FollowedTopicsContext, so it drives both Digest
 * generation and the Home Topic Filter.
 */
export default function Topic() {
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const { categories, followedTopics, toggleTopic } = useFollowedTopics();

  if (!isLoggedIn) {
    return (
      <>
        <PostDetailTopbar />
        <div className={styles.content}>
          <div className={styles.signinHero}>
            <div>
              <div className={styles.signinHeroEyebrow}>
                <span className={styles.signinHeroEyebrowDot} />
                Topics
              </div>
              <div className={styles.signinHeroTitle}>Follow the topics you care about</div>
              <div className={styles.signinHeroSub}>
                Sign in to subscribe to topics — they shape your personalised feed and daily digest.
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
      <PostDetailTopbar />
      <div className={styles.content}>
        <ManageTopics categories={categories} followedTopics={followedTopics} onToggle={toggleTopic} />
      </div>
    </>
  );
}
