import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/user.service';
import { timeAgo } from '../../utils/timeAgo';
import { getInitials } from '../../utils/getInitials';
import PostDetailTopbar from '../../components/layout/PostDetailTopbar';
import Toast from '../../components/ui/Toast';
import EditProfileModal from '../../components/modals/EditProfileModal';
import ImageCard from '../../components/feed/ImageCard';
import TextCard from '../../components/feed/TextCard';
import type { UserProfile, Post, DraftPost, UpdateUserRequest } from '../../types';
import styles from './UserProfile.module.css';

type TabId = 'posts' | 'bookmarks' | 'likes' | 'drafts';

const noop = () => {};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function formatJoinDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── Tab Icons ────────────────────────────────────
function IconPosts() {
  return (
    <svg className={styles.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  );
}
function IconBookmarks() {
  return (
    <svg className={styles.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconLikes() {
  return (
    <svg className={styles.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function IconDrafts() {
  return (
    <svg className={styles.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
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
        <DropdownMenu.Content className={styles.dropdownContent} align="end" sideOffset={6} onClick={(e) => e.stopPropagation()}>
          <DropdownMenu.Item className={styles.dropdownItem} onSelect={() => onEdit(postId)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9.5 2.5L11.5 4.5M2 12h2L10.5 4.5 8.5 2.5 2 9v3z" />
            </svg>
            Edit post
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.dropdownItem} onSelect={() => onUnpublish(postId)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="10" height="10" rx="2" />
            </svg>
            Unpublish
          </DropdownMenu.Item>
          <DropdownMenu.Separator className={styles.dropdownSep} />
          <DropdownMenu.Item className={`${styles.dropdownItem} ${styles.danger}`} onSelect={() => onDelete(postId)}>
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

// ── Saved badge overlay ──────────────────────────
function SavedBadge() {
  return (
    <span className={styles.savedBadge}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M2 2h7v9L5.5 9 2 11V2z" />
      </svg>
      Saved
    </span>
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
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('posts');
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [confirm, setConfirm] = useState<{
    action: 'delete-post' | 'unpublish' | 'delete-draft';
    id: string;
    title: string;
  } | null>(null);

  const isOwnProfile = !!authUser && authUser.username === username;

  useEffect(() => {
    if (!username) { navigate('/'); return; }
    setLoading(true);
    setLoadError(false);
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
    }).catch(() => {
      setLoadError(true);
    }).finally(() => {
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
      updateUser({ displayName: updated.displayName, avatarUrl: updated.avatarUrl ?? undefined });
    }
    showToast('Profile updated');
  }, [username, profile, isOwnProfile, updateUser, showToast]);

  const handlePostManageEdit = useCallback((postId: string) => {
    navigate(`/post/${postId}/edit`);
  }, [navigate]);

  const handlePostManageUnpublish = useCallback((postId: string) => {
    const post = posts.find((p) => p.id === postId);
    setConfirm({ action: 'unpublish', id: postId, title: post?.title ?? 'this post' });
  }, [posts]);

  const handlePostManageDelete = useCallback((postId: string) => {
    const post = posts.find((p) => p.id === postId);
    setConfirm({ action: 'delete-post', id: postId, title: post?.title ?? 'this post' });
  }, [posts]);

  const handleDraftDelete = useCallback((draftId: string) => {
    const draft = drafts.find((d) => d.id === draftId);
    setConfirm({ action: 'delete-draft', id: draftId, title: draft?.title ?? 'this draft' });
  }, [drafts]);

  const executeConfirm = useCallback(() => {
    if (!confirm) return;
    if (confirm.action === 'delete-post') {
      setPosts((prev) => prev.filter((p) => p.id !== confirm.id));
      showToast('Post deleted');
    } else if (confirm.action === 'unpublish') {
      setPosts((prev) => {
        const post = prev.find((p) => p.id === confirm.id);
        if (post) {
          const draft: DraftPost = {
            id: post.id,
            title: post.title,
            excerpt: post.excerpt ?? '',
            tags: post.tags,
            updatedAt: new Date().toISOString(),
          };
          setDrafts((prevDrafts) => [draft, ...prevDrafts]);
        }
        return prev.filter((p) => p.id !== confirm.id);
      });
      showToast('Post moved to Drafts');
    } else if (confirm.action === 'delete-draft') {
      setDrafts((prev) => prev.filter((d) => d.id !== confirm.id));
      showToast('Draft deleted');
    }
    setConfirm(null);
  }, [confirm, showToast]);

  if (loading) {
    return (
      <>
        <PostDetailTopbar />
        <div className={styles.loading}>Loading profile…</div>
      </>
    );
  }

  if (loadError || !profile) {
    return (
      <>
        <PostDetailTopbar />
        <div className={styles.loading}>Failed to load profile. Please try again.</div>
      </>
    );
  }

  const initials = getInitials(profile.displayName);

  const tabs: { id: TabId; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'posts',     label: 'Posts',     count: posts.length,      icon: <IconPosts /> },
    { id: 'bookmarks', label: 'Bookmarks', count: bookmarks.length,  icon: <IconBookmarks /> },
    { id: 'likes',     label: 'Likes',     count: likedPosts.length, icon: <IconLikes /> },
    ...(isOwnProfile ? [{ id: 'drafts' as TabId, label: 'Drafts', count: drafts.length, icon: <IconDrafts /> }] : []),
  ];

  function renderCard(post: Post, overlay?: React.ReactNode) {
    return post.coverImageUrl
      ? <ImageCard key={post.id} post={post} onLike={noop} topRightOverlay={overlay} className={styles.profileCard} />
      : <TextCard  key={post.id} post={post} onLike={noop} topRightOverlay={overlay} className={styles.profileCard} />;
  }

  function manageOverlay(post: Post) {
    return (
      <ManageDropdown postId={post.id} onEdit={handlePostManageEdit} onUnpublish={handlePostManageUnpublish} onDelete={handlePostManageDelete}>
        <button
          className={styles.managePill}
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
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
              {profile.organisation && (
                <div className={styles.metaItem} data-testid="profile-org">
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <circle cx="6.5" cy="5" r="2.5" /><path d="M2 11.5c0-2.485 2.015-4 4.5-4s4.5 1.515 4.5 4" />
                  </svg>
                  {profile.organisation}
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
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className={styles.metaLink} onClick={(e) => e.stopPropagation()}>
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
                {t.icon}
                {t.label}
                <span className={styles.tabCount}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Panels — always mounted, hidden via display:none so stagger fires once ── */}
        <div className={styles.tabPanels}>

          {/* Posts */}
          <div className={activeTab === 'posts' ? styles.tabPanelActive : styles.tabPanel} role="tabpanel">
            {posts.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No posts yet</strong>
                {isOwnProfile ? 'Start writing to share your work.' : `${profile.displayName} hasn't published anything yet.`}
              </div>
            ) : (
              <div className={styles.postsGrid} data-testid="posts-grid">
                {posts.map((post) => renderCard(post, isOwnProfile ? manageOverlay(post) : undefined))}
              </div>
            )}
          </div>

          {/* Bookmarks */}
          <div className={activeTab === 'bookmarks' ? styles.tabPanelActive : styles.tabPanel} role="tabpanel">
            {bookmarks.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No bookmarks</strong>
                {isOwnProfile ? 'Save posts to read them later.' : 'Nothing bookmarked yet.'}
              </div>
            ) : (
              <div className={styles.postsGrid}>
                {bookmarks.map((post) => renderCard(post, <SavedBadge />))}
              </div>
            )}
          </div>

          {/* Likes */}
          <div className={activeTab === 'likes' ? styles.tabPanelActive : styles.tabPanel} role="tabpanel">
            {likedPosts.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No likes yet</strong>
                {isOwnProfile ? 'Posts you like will appear here.' : `${profile.displayName} hasn't liked anything yet.`}
              </div>
            ) : (
              <div className={styles.postsGrid}>
                {likedPosts.map((post) => renderCard(post))}
              </div>
            )}
          </div>

          {/* Drafts — own profile only */}
          {isOwnProfile && (
            <div className={activeTab === 'drafts' ? styles.tabPanelActive : styles.tabPanel} role="tabpanel">
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

      <ConfirmDialog
        confirm={confirm}
        onConfirm={executeConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

// ── Confirm Dialog ───────────────────────────────
function ConfirmDialog({ confirm, onConfirm, onCancel }: {
  confirm: { action: 'delete-post' | 'unpublish' | 'delete-draft'; id: string; title: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isDelete = confirm?.action === 'delete-post' || confirm?.action === 'delete-draft';
  const isUnpublish = confirm?.action === 'unpublish';

  const title = isDelete ? 'Delete?' : 'Unpublish post?';
  const description = isDelete
    ? 'This action cannot be undone.'
    : 'The post will be moved to your Drafts.';
  const confirmLabel = isDelete ? 'Delete' : 'Unpublish';

  return (
    <Dialog.Root open={!!confirm} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.confirmOverlay} />
        <Dialog.Content className={styles.confirmContent} aria-describedby={undefined}>
          <div className={styles.confirmHeader}>
            <div className={`${styles.confirmIcon} ${isDelete ? styles.confirmIconDanger : styles.confirmIconWarn}`}>
              {isDelete ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4.5h14M6 4.5V3h6v1.5M14.5 4.5l-.9 10H4.4l-.9-10" />
                  <path d="M7 7.5v4.5M11 7.5v4.5" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="14" height="14" rx="2.5" />
                  <path d="M9 6v4M9 12v.5" />
                </svg>
              )}
            </div>
            <div>
              <Dialog.Title className={styles.confirmTitle}>{title}</Dialog.Title>
              <p className={styles.confirmDesc}>{description}</p>
            </div>
          </div>
          {confirm && (
            <div className={styles.confirmPostPreview}>{confirm.title}</div>
          )}
          <div className={styles.confirmFooter}>
            <button className={styles.confirmCancelBtn} onClick={onCancel}>Cancel</button>
            <button
              className={`${styles.confirmActionBtn} ${isDelete ? styles.confirmDanger : isUnpublish ? styles.confirmWarn : ''}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Draft Card ───────────────────────────────────
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
