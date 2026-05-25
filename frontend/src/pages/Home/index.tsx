import { useAuth } from '../../hooks/useAuth';
import { useFeed } from '../../hooks/useFeed';
import Topbar from '../../components/layout/Topbar';
import TagFilterBar from '../../components/feed/TagFilterBar';
import AuthBanner from '../../components/feed/AuthBanner';
import FeedGrid from '../../components/feed/FeedGrid';
import RefreshFAB from '../../components/feed/RefreshFAB';
import styles from './Home.module.css';

export default function Home() {
  const { isLoggedIn } = useAuth();
  const { posts, activeTag, setTag, loadMore, hasMore, loading, refresh, toggleLike } = useFeed();

  return (
    <>
      <Topbar
        bottomRow={
          <TagFilterBar activeTag={activeTag} onTagChange={setTag} />
        }
      />
      <section className={styles.feedWrap}>
        {!isLoggedIn && <AuthBanner />}
        <FeedGrid
          posts={posts}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={loadMore}
          onLike={toggleLike}
          onTagClick={setTag}
        />
      </section>
      <RefreshFAB onRefresh={refresh} />
    </>
  );
}
