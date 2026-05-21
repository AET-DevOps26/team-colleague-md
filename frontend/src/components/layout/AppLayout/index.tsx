import { Outlet, useMatch } from 'react-router-dom';
import Sidebar from '../Sidebar';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const isReaderRoute = !!useMatch('/post/:id');

  return (
    <div className={styles.app} data-reader={isReaderRoute || undefined}>
      <Sidebar collapsed={isReaderRoute} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
