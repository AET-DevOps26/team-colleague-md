import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AdminRoute from '../../../src/components/layout/AdminRoute';
import { AuthContext } from '../../../src/contexts/AuthContext';
import type { AuthUser } from '../../../src/types';

/** Guard behaviour for /admin (ADR-0020): only ADMIN renders; everyone else lands on Home. */

const ADMIN: AuthUser = {
  id: 'a1',
  username: 'root',
  displayName: 'Root',
  role: 'ADMIN',
  email: 'root@verita.dev',
};

const PLAIN_USER: AuthUser = { ...ADMIN, id: 'u1', username: 'reader', role: 'USER' };

function renderGuard(user: AuthUser | null, isRestoring: boolean) {
  const value = {
    user,
    isLoggedIn: user !== null,
    isRestoring,
    login: async () => user as AuthUser,
    signup: async () => user as AuthUser,
    logout: () => {},
    updateUser: () => {},
  };

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<p>home page</p>} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <p>admin panel</p>
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('AdminRoute', () => {
  it('renders the panel for an admin', () => {
    renderGuard(ADMIN, false);

    expect(screen.getByText('admin panel')).toBeInTheDocument();
  });

  it('redirects a non-admin to Home', () => {
    renderGuard(PLAIN_USER, false);

    expect(screen.getByText('home page')).toBeInTheDocument();
    expect(screen.queryByText('admin panel')).not.toBeInTheDocument();
  });

  it('redirects an anonymous visitor to Home', () => {
    renderGuard(null, false);

    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('waits for session restore instead of bouncing an admin mid-refresh', () => {
    // The user object arrives a tick after mount on a hard refresh; deciding now would redirect
    // a real admin off their own page.
    renderGuard(null, true);

    expect(screen.queryByText('home page')).not.toBeInTheDocument();
    expect(screen.queryByText('admin panel')).not.toBeInTheDocument();
  });
});
