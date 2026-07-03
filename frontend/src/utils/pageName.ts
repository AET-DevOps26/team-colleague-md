/**
 * Maps a route pathname to the human-readable label shown next to the ← back button.
 * Used to render a dynamic "back to <previous page>" label instead of a hardcoded one.
 * Falls back to 'Explore' (the Home feed) for unknown or unlabeled routes.
 */
export function pageNameFromPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, ''); // strip trailing slash

  if (path === '' || path === '/') return 'Explore';
  if (path === '/digest') return 'Digest';
  if (path.startsWith('/digest/')) {
    const date = decodeURIComponent(path.slice('/digest/'.length));
    return date ? `Digest: ${date}` : 'Digest';
  }
  if (path === '/topics') return 'Topics';
  if (path === '/search') return 'Search';
  if (path === '/admin') return 'Admin';
  if (path.startsWith('/profile/')) {
    const username = decodeURIComponent(path.slice('/profile/'.length));
    return username ? `Profile: ${username}` : 'Profile';
  }
  if (path === '/post/new') return 'New Post';
  if (path.startsWith('/post/')) return 'Post';

  return 'Explore';
}
