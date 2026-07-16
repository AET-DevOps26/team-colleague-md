import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

/**
 * ADMIN-only route guard (ADR-0020). Non-admins and logged-out visitors are redirected Home
 * rather than shown an "access denied" panel — the panel simply does not exist for them.
 *
 * Rendering nothing while the session is still being restored is load-bearing: on a hard refresh
 * the user object arrives one tick after mount, so deciding early would bounce a real admin off
 * their own page (the same trap the digest pages had to work around).
 */
export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isRestoring } = useAuth();

  if (isRestoring) return null;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;

  return <>{children}</>;
}
