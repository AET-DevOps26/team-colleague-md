import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/user.service';
import { timeAgo } from '../../utils/timeAgo';
import PostDetailTopbar from '../../components/layout/PostDetailTopbar';
import Toast from '../../components/ui/Toast';
import EditProfileModal from '../../components/modals/EditProfileModal';
import type { UserProfile, Post, DraftPost, UpdateUserRequest } from '../../types';
import styles from './UserProfile.module.css';

type TabId = 'posts' | 'bookmarks' | 'drafts' | 'likes';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatJoinDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

// ── Manage Dropdown ──────────────────────────────
function ManageDropdown({ postId, onEdit, onUnpublish, onDelete, children }: {
  postId: string;
  onEdit: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {children as React.ReactElement}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.dropdownContent} align="end" sideOffset={6}>
          <DropdownMenu.Item
            className={styles.dropdownItem}
            onSelect={() => onEdit(postId)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9.5 2.5L11.5 4.5M2 12h2L10.5 4.5 8.5 2.5 2 9v3z" />
            </svg>
            Edit post
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={styles.dropdownItem}
            onSelect={() => onUnpublish(postId)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="10" height="10" rx="2" />
            </svg>
            Unpublish
          </DropdownMenu.Item>
          <DropdownMenu.Separator className={styles.dropdownSep} />
          <DropdownMenu.Item
            className={`${styles.dropdownItem} ${styles.danger}`}
            onSelect={() => onDelete(postId)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3.5h10M5 3.5V2.5h4v1M11.5 3.5l-.7 8H3.2l-.7-8" />
              <path d="M5.5 6v3.5M8.5 6v3.5" />
            </svg>
            Delete post
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ── Main Page ────────────────────────────────────
export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: authUser, updateUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('posts');
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  const isOwnProfile = !!authUser && authUser.username === username;

  useEffect(() => {
    if (!username) { navigate('/'); return; }
    setLoading(true);
    setActiveTab('posts');

    Promise.all([
      userService.getProfile(username),
      userService.getUserPosts(username),
      userService.getUserBookmarks(username),
      userService.getUserDrafts(username),
      userService.getUserLikedPosts(username),
    ]).then(([p, userPosts, userBookmarks, userDrafts, liked]) => {
      setProfile(p);
      setPosts(userPosts);
      setBookmarks(userBookmarks);
      setDrafts(userDrafts as DraftPost[]);
      setLikedPosts(liked);
      setLoading(false);
    });
  }, [username, navigate]);

  const showToast = useCallback((message: string) => {
    setToast({ show: true, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast((t) => ({ ...t, show: false }));
  }, []);

  const handleSaveProfile = useCallback(async (data: UpdateUserRequest & { avatarUrl?: string | null }) => {
    if (!username || !profile) return;
    const updated = await userService.updateProfile(username, data);
    setProfile(updated);
    if (isOwnProfile) {
      updateUser({
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl ?? undefined,
      });
    }
    showToast('Profile updated');
  }, [username, profile, isOwnProfile, updateUser, showToast]);

  const handlePostManageEdit = useCallback((postId: string) => {
    navigate(`/post/${postId}/edit`);
  }, [navigate]);

  const handlePostManageUnpublish = useCallback((postId: string) => {
    showToast('Post unpublished');
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, [showToast]);

  const handlePostManageDelete = useCallback((postId: string) => {
    showToast('Post deleted');
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, [showToast]);

  const handleDraftDelete = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    showToast('Draft deleted');
  }, [showToast]);

  if (loading || !profile) {
    return (
      <>
        <PostDetailTopbar />
        <div className={styles.loading}>Loading profile…</div>
      </>
    );
  }

  const initials = getInitials(profile.displayName);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'posts', label: 'Posts', count: posts.length },
    { id: 'bookmarks', label: 'Bookmarks', count: bookmarks.length },
    ...(isOwnProfile ? [{ id: 'drafts' as TabId, label: 'Drafts', count: drafts.length }] : []),
    { id: 'likes', label: 'Likes', count: likedPosts.length },
  ];

  return (
    <>
      <PostDetailTopbar />

      <main className={styles.page} data-testid="profile-page">

        {/* ── Profile Header ── */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar} data-testid="profile-avatar">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} />
              ) : (
                initials
              )}
            </div>
            {isOwnProfile && (
              <button
                className={styles.avatarEditBtn}
                onClick={() => setEditOpen(true)}
                title="Edit photo"
                aria-label="Edit profile photo"
                data-testid="avatar-edit-btn"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.5 2.5l1 1L5 10l-2 .5.5-2z" />
                </svg>
              </button>
            )}
          </div>

          <div className={styles.info}>
            <div className={styles.nameRow}>
              <span className={styles.name} data-testid="profile-name">{profile.displayName}</span>
              {profile.role === 'VERIFIED' && (
                <span className={styles.verifiedBadge} data-testid="verified-badge">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M5.5 1L6.8 2.8 9 2.5 9.2 4.7 11 5.5 9.2 6.3 9 8.5 6.8 8.2 5.5 10 4.2 8.2 2 8.5 1.8 6.3 0 5.5 1.8 4.7 2 2.5 4.2 2.8 5.5 1z" fill="white" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            <div className={styles.handle} data-testid="profile-handle">@{profile.username}</div>

            {profile.bio && (
              <div className={styles.bio} data-testid="profile-bio">{profile.bio}</div>
            )}

            <div className={styles.meta}>
              {profile.organization && (
                <div className={styles.metaItem} data-testid="profile-org">
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <circle cx="6.5" cy="5" r="2.5" /><path d="M2 11.5c0-2.485 2.015-4 4.5-4s4.5 1.515 4.5 4" />
                  </svg>
                  {profile.organization}
                </div>
              )}
              <div className={styles.metaItem}>
                <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M6.5 1L8 5h4L8.5 7.5 10 11.5 6.5 9 3 11.5 4.5 7.5 1 5h4z" />
                </svg>
                Joined {formatJoinDate(profile.createdAt)}
              </div>
              {profile.website && (
                <div className={styles.metaItem}>
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <circle cx="6.5" cy="6.5" r="5" />
                    <path d="M4.5 6.5h4M6.5 4.5v4" />
                  </svg>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.metaLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>

            {profile.expertiseAreas && profile.expertiseAreas.length > 0 && (
              <div className={styles.interests} data-testid="profile-interests">
                {profile.expertiseAreas.slice(0, 6).map((area) => (
                  <span key={area} className={styles.interestTag}>{area}</span>
                ))}
              </div>
            )}

            <div className={styles.stats} data-testid="profile-stats">
              <div className={styles.stat}>
                <span className={styles.statCount}>{formatCount(profile.postCount)}</span>
                <span className={styles.statLabel}>Posts</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statCount}>{formatCount(profile.followerCount)}</span>
                <span className={styles.statLabel}>Followers</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statCount}>{formatCount(profile.followingCount)}</span>
                <span className={styles.statLabel}>Following</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statCount}>{formatCount(profile.likeReceivedCount)}</span>
                <span className={styles.statLabel}>Likes received</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabsWrap}>
          <div className={styles.tabs} role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(t.id)}
                data-testid={`tab-${t.id}`}
              >
                {t.label}
                <span className={styles.tabCount}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Panels — always mounted, hidden via display:none so stagger only runs once ── */}
        <div className={styles.tabPanels}>

          {/* Posts */}
          <div
            className={activeTab === 'posts' ? styles.tabPanelActive : styles.tabPanel}
            role="tabpanel"
            aria-labelledby="tab-posts"
          >
            {posts.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No posts yet</strong>
                {isOwnProfile ? 'Start writing to share your work.' : `${profile.displayName} hasn't published anything yet.`}
              </div>
            ) : (
              <div className={styles.postsGrid} data-testid="posts-grid">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    showManage={isOwnProfile}
                    onEdit={handlePostManageEdit}
                    onUnpublish={handlePostManageUnpublish}
                    onDelete={handlePostManageDelete}
                    onClick={() => navigate(`/post/${post.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bookmarks */}
          <div
            className={activeTab === 'bookmarks' ? styles.tabPanelActive : styles.tabPanel}
            role="tabpanel"
            aria-labelledby="tab-bookmarks"
          >
            {bookmarks.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No bookmarks</strong>
                {isOwnProfile ? 'Save posts to read them later.' : 'Nothing bookmarked yet.'}
              </div>
            ) : (
              <div className={styles.postsGrid}>
                {bookmarks.map((post) => (
                  <BookmarkCard
                    key={post.id}
                    post={post}
                    onClick={() => navigate(`/post/${post.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Drafts — own profile only */}
          {isOwnProfile && (
            <div
              className={activeTab === 'drafts' ? styles.tabPanelActive : styles.tabPanel}
              role="tabpanel"
              aria-labelledby="tab-drafts"
            >
              {drafts.length === 0 ? (
                <div className={styles.emptyState}>
                  <strong>No drafts</strong>
                  Start a new post to see it here.
                </div>
              ) : (
                <div className={styles.postsGrid} data-testid="drafts-grid">
                  {drafts.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      onPublish={() => showToast('Publish coming soon')}
                      onEdit={() => navigate(`/post/${draft.id}/edit`)}
                      onDelete={() => handleDraftDelete(draft.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Likes */}
          <div
            className={activeTab === 'likes' ? styles.tabPanelActive : styles.tabPanel}
            role="tabpanel"
            aria-labelledby="tab-likes"
          >
            {likedPosts.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No likes yet</strong>
                {isOwnProfile ? 'Posts you like will appear here.' : `${profile.displayName} hasn't liked anything yet.`}
              </div>
            ) : (
              <div className={styles.postsGrid}>
                {likedPosts.map((post) => (
                  <LikedCard
                    key={post.id}
                    post={post}
                    onClick={() => navigate(`/post/${post.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {isOwnProfile && (
        <EditProfileModal
          key={profile.updatedAt}
          profile={profile}
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={handleSaveProfile}
        />
      )}

      <Toast message={toast.message} show={toast.show} onHide={hideToast} />
    </>
  );
}

// ── Card Components ──────────────────────────────

type CardVariant = 'manage' | 'bookmark' | 'liked';

interface ProfilePostCardProps {
  post: Post;
  variant: CardVariant;
  onClick: () => void;
  onEdit?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function ProfilePostCard({ post, variant, onClick, onEdit, onUnpublish, onDelete }: ProfilePostCardProps) {
  const initials = getInitials(post.author.displayName);
  const hasImage = !!post.coverImageUrl;
  const isLiked = variant === 'liked';

  const coverOverlay = (() => {
    if (variant === 'manage' && onEdit && onUnpublish && onDelete) {
      return (
        <ManageDropdown postId={post.id} onEdit={onEdit} onUnpublish={onUnpublish} onDelete={onDelete}>
          <button
            className={styles.manageBtn}
            aria-label="Manage post"
            onClick={(e) => e.stopPropagation()}
            data-testid={`manage-btn-${post.id}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="7" cy="2.5" r="1.2" /><circle cx="7" cy="7" r="1.2" /><circle cx="7" cy="11.5" r="1.2" />
            </svg>
          </button>
        </ManageDropdown>
      );
    }
    if (variant === 'bookmark') {
      return (
        <div className={styles.bookmarkFlag}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 2h7v9L5.5 9 2 11V2z" />
          </svg>
          Saved
        </div>
      );
    }
    return null;
  })();

  const heartIcon = isLiked
    ? <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" stroke="none"><path d="M6 10.5S1 7.5 1 4.5C1 3 2.5 2 4 2.5c.8.3 1.5.9 2 1.5.5-.6 1.2-1.2 2-1.5C9.5 2 11 3 11 4.5c0 3-5 6-5 6z" /></svg>
    : <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M6 10.5S1 7.5 1 4.5C1 3 2.5 2 4 2.5c.8.3 1.5.9 2 1.5.5-.6 1.2-1.2 2-1.5C9.5 2 11 3 11 4.5c0 3-5 6-5 6z" /></svg>;

  const footer = (
    <div className={styles.cardFooter}>
      <div className={styles.cardAuthorAvatar}>{initials}</div>
      <span className={styles.cardAuthorName}>{post.author.displayName}</span>
      <div className={styles.cardMetaRight}>
        <span className={`${styles.cardLikes} ${isLiked ? styles.liked : ''}`}>
          {heartIcon}
          {formatCount(post.likeCount)}
        </span>
        <span className={styles.cardTime}>{timeAgo(post.createdAt)}</span>
      </div>
    </div>
  );

  const bodyContent = (
    <>
      {post.excerpt && (
        <div className={styles.cardSummary}>
          <span style={{ fontSize: 11, marginRight: 3 }}>✦</span>{post.excerpt}
        </div>
      )}
      <div className={styles.cardTags}>
        {post.tags.map((tag) => (
          <span key={tag.id} className={styles.cardTag}>{tag.name}</span>
        ))}
      </div>
    </>
  );

  if (!hasImage) {
    const inlineManageBtn = variant === 'manage' && onEdit && onUnpublish && onDelete ? (
      <ManageDropdown postId={post.id} onEdit={onEdit} onUnpublish={onUnpublish} onDelete={onDelete}>
        <button
          className={styles.manageBtnInline}
          aria-label="Manage post"
          onClick={(e) => e.stopPropagation()}
          data-testid={`manage-btn-${post.id}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="7" cy="2.5" r="1.2" /><circle cx="7" cy="7" r="1.2" /><circle cx="7" cy="11.5" r="1.2" />
          </svg>
        </button>
      </ManageDropdown>
    ) : null;

    return (
      <button
        className={`${styles.postCard} ${styles.textOnly}`}
        onClick={onClick}
        data-testid={`post-card-${post.id}`}
      >
        <div className={styles.cardBody}>
          <div className={styles.textTitleRow}>
            <div className={styles.cardTitle}>{post.title}</div>
            {inlineManageBtn}
            {variant === 'bookmark' && (
              <div style={{
                flexShrink: 0, background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4,
                fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <svg width="10" height="10" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M2 2h7v9L5.5 9 2 11V2z" />
                </svg>
                Saved
              </div>
            )}
          </div>
          {bodyContent}
        </div>
        {footer}
      </button>
    );
  }

  return (
    <button className={styles.postCard} onClick={onClick} data-testid={`post-card-${post.id}`}>
      <div className={styles.cardCover}>
        <img src={post.coverImageUrl!} alt="" className={styles.coverImg} />
        {post.tags[0] && <span className={`${styles.cardBadge} ${styles.cardBadgeType}`}>{post.tags[0].name}</span>}
        {post.readTimeMinutes && (
          <span className={`${styles.cardBadge} ${styles.cardBadgeTime}`}>{post.readTimeMinutes} min read</span>
        )}
        {coverOverlay}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>{post.title}</div>
        {bodyContent}
      </div>
      {footer}
    </button>
  );
}

function PostCard({ post, showManage, onEdit, onUnpublish, onDelete, onClick }: {
  post: Post; showManage: boolean;
  onEdit: (id: string) => void; onUnpublish: (id: string) => void; onDelete: (id: string) => void;
  onClick: () => void;
}) {
  return (
    <ProfilePostCard
      post={post} variant="manage" onClick={onClick}
      onEdit={showManage ? onEdit : undefined}
      onUnpublish={showManage ? onUnpublish : undefined}
      onDelete={showManage ? onDelete : undefined}
    />
  );
}

function BookmarkCard({ post, onClick }: { post: Post; onClick: () => void }) {
  return <ProfilePostCard post={post} variant="bookmark" onClick={onClick} />;
}

function LikedCard({ post, onClick }: { post: Post; onClick: () => void }) {
  return <ProfilePostCard post={post} variant="liked" onClick={onClick} />;
}

function DraftCard({ draft, onPublish, onEdit, onDelete }: {
  draft: DraftPost;
  onPublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={styles.draftCard} data-testid={`draft-card-${draft.id}`}>
      <div className={styles.draftBody}>
        <div className={styles.draftStatus}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2v4l2 2" /><circle cx="6" cy="6" r="5" />
          </svg>
          Draft · Last edited {timeAgo(draft.updatedAt)}
        </div>
        <div className={styles.draftTitle}>{draft.title}</div>
        <div className={styles.draftExcerpt}>{draft.excerpt}</div>
        <div className={styles.cardTags}>
          {draft.tags.map((tag) => (
            <span key={tag.id} className={styles.cardTag}>{tag.name}</span>
          ))}
        </div>
      </div>
      <div className={styles.draftActions}>
        <button className={`${styles.draftActionBtn} ${styles.publish}`} onClick={onPublish}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 6h8M7 3l3 3-3 3" />
          </svg>
          Publish
        </button>
        <button className={styles.draftActionBtn} onClick={onEdit}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2.5L10 4.5M2 10h2L9.5 4.5 7.5 2.5 2 8v2z" />
          </svg>
          Edit
        </button>
        <button className={`${styles.draftActionBtn} ${styles.danger}`} onClick={onDelete}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 3h8M4 3V2h4v1M10 3l-.5 7H2.5L2 3" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
