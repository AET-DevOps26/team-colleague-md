import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import styles from './AppLayout.module.css';

const MODE_B_PREFIXES = ['/post/', '/digest', '/topics', '/profile/', '/admin'];

export default function AppLayout() {
  const { pathname } = useLocation();
  const isModeB =
    pathname === '/post/new' ||
    MODE_B_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <div className={styles.app} data-mode={isModeB ? 'b' : undefined}>
      <Sidebar collapsed={isModeB} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
