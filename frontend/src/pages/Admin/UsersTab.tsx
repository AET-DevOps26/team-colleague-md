import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/admin.service';
import type { AdminUser, UserRole } from '../../types';
import styles from './Admin.module.css';

const PAGE_SIZE = 20;
const ROLES: UserRole[] = ['USER', 'VERIFIED', 'ADMIN'];

const AVATAR_COLORS = ['#7C3AED', '#1D4ED8', '#0369A1', '#0F766E', '#166534', '#92400E', '#9D174D'];

function avatarColor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function rolePillClass(role: UserRole): string {
  if (role === 'ADMIN') return `${styles.rolePill} ${styles.rolePillAdmin}`;
  if (role === 'VERIFIED') return `${styles.rolePill} ${styles.rolePillVerified}`;
  return styles.rolePill;
}

interface UsersTabProps {
  onCountChange: (count: number) => void;
}

export default function UsersTab({ onCountChange }: UsersTabProps) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (q: string, p: number) => {
      setLoading(true);
      try {
        const result = await adminService.listUsers(q, p, PAGE_SIZE);
        setUsers(result.content);
        setTotalPages(result.totalPages);
        setTotalElements(result.totalElements);
        onCountChange(result.totalElements);
      } catch {
        showToast({ message: 'Could not load users.', variant: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [onCountChange, showToast],
  );

  // Search is server-side (the admin can only see one page at a time), so debounce the keystrokes
  // rather than filtering the loaded page client-side.
  useEffect(() => {
    const timer = setTimeout(() => load(query, page), 250);
    return () => clearTimeout(timer);
  }, [query, page, load]);

  const handleRoleChange = async (target: AdminUser, role: UserRole) => {
    try {
      const updated = await adminService.updateUserRole(target.id, role);
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, role: updated.role } : u)));
      showToast({ message: `@${target.username} is now ${role}.`, variant: 'success' });
    } catch {
      showToast({ message: `Could not change @${target.username}'s role.`, variant: 'error' });
    }
  };

  const handleBanToggle = async (target: AdminUser) => {
    const banned = !target.isBanned;
    try {
      const updated = await adminService.updateUserBanStatus(target.id, banned);
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, isBanned: updated.isBanned } : u)),
      );
      showToast({
        message: banned ? `@${target.username} has been banned.` : `@${target.username} has been unbanned.`,
        variant: banned ? 'warning' : 'success',
      });
    } catch {
      showToast({ message: `Could not update @${target.username}.`, variant: 'error' });
    }
  };

  return (
    <div data-testid="admin-users-tab">
      <div className={styles.sectionHd}>
        <div>
          <h2>User management</h2>
          <p>Change roles or ban accounts. Banned users cannot log in or post.</p>
        </div>
        <div className={styles.searchWrap}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            value={query}
            placeholder="Search by name or email…"
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            data-testid="admin-user-search"
          />
        </div>
      </div>

      <div className={styles.tblWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 220 }}>User</th>
              <th>Email</th>
              <th style={{ width: 110 }}>Role</th>
              <th style={{ width: 120 }}>Joined</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              // An admin acting on their own row could demote or lock themselves out; the server
              // rejects it too, this just keeps the impossible action from looking available.
              const isSelf = u.id === currentUser?.id;
              return (
                <tr key={u.id} data-testid="admin-user-row">
                  <td>
                    <div className={styles.userCell}>
                      {u.avatarUrl ? (
                        <img className={styles.avatar} src={u.avatarUrl} alt="" />
                      ) : (
                        <div className={styles.avatar} style={{ background: avatarColor(u.username) }}>
                          {initials(u.displayName || u.username)}
                        </div>
                      )}
                      <div>
                        <div className={styles.userName}>{u.displayName}</div>
                        <div className={styles.userHandle}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.emailCell}>{u.email}</span>
                  </td>
                  <td>
                    <span className={rolePillClass(u.role)}>{u.role}</span>
                  </td>
                  <td>
                    <span className={styles.dateCell}>{u.createdAt?.slice(0, 10)}</span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusPill} ${u.isBanned ? styles.statusPillBanned : ''}`}
                    >
                      {u.isBanned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <select
                        className={styles.roleSelect}
                        value={u.role}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot change your own role.' : undefined}
                        onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                        data-testid="admin-role-select"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        className={`${styles.btn} ${u.isBanned ? styles.btnSuccess : styles.btnWarn}`}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot ban yourself.' : undefined}
                        onClick={() => handleBanToggle(u)}
                        data-testid="admin-ban-button"
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && users.length === 0 && (
          <div className={styles.emptyState}>
            <strong>No users found</strong>
            Try a different search term.
          </div>
        )}
        {loading && users.length === 0 && <div className={styles.emptyState}>Loading users…</div>}
      </div>

      <div className={styles.pagination}>
        <span>
          {totalElements} user{totalElements === 1 ? '' : 's'}
        </span>
        <button className={styles.btn} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page + 1} of {Math.max(totalPages, 1)}
        </span>
        <button
          className={styles.btn}
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
