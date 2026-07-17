import { useCallback, useState } from 'react';
import OperationsTab from './OperationsTab';
import UsersTab from './UsersTab';
import styles from './Admin.module.css';

type Tab = 'users' | 'operations';

/**
 * Admin panel (ADR-0020) — user management plus GenAI operations.
 *
 * Renders inside AppLayout (the app shell and sidebar stay put) rather than the mockup's
 * standalone admin chrome. Access is gated by AdminRoute; every action behind these tabs is
 * additionally ADMIN-gated server-side, so this page is a convenience, never the security boundary.
 */
export default function Admin() {
  const [tab, setTab] = useState<Tab>('users');
  const [userCount, setUserCount] = useState<number | null>(null);

  // Memoised because it feeds UsersTab's load effect — a fresh callback each render would refetch.
  const handleCountChange = useCallback((count: number) => setUserCount(count), []);

  return (
    <div className={styles.page} data-testid="admin-page">
      <header className={styles.header}>
        <span className={styles.title}>Admin</span>
        <span className={styles.badge}>Admin role required</span>
      </header>

      <div className={styles.tabBar} role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'users'}
          className={`${styles.tabBtn} ${tab === 'users' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('users')}
          data-testid="admin-tab-users"
        >
          Users
          <span className={styles.tabCount}>{userCount ?? '—'}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'operations'}
          className={`${styles.tabBtn} ${tab === 'operations' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('operations')}
          data-testid="admin-tab-operations"
        >
          Operations
        </button>
      </div>

      <div className={styles.content}>
        {tab === 'users' ? <UsersTab onCountChange={handleCountChange} /> : <OperationsTab />}
      </div>
    </div>
  );
}
