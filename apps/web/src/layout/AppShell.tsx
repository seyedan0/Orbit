import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../core/auth/session-context';
import { useSyncStatus } from '../core/sync/sync-context';
import styles from './AppShell.module.css';

const NAV_ITEMS = [
  { to: '/inbox', label: 'صندوق ورودی' },
  { to: '/settings', label: 'تنظیمات' }
] as const;

const SYNC_LABELS = {
  IDLE: 'همگام',
  SYNCING: 'در حال همگام‌سازی...',
  ERROR: 'خطا در همگام‌سازی',
  OFFLINE: 'آفلاین'
} as const;

export function AppShell() {
  const { signOut } = useSession();
  const { syncState, triggerSync } = useSyncStatus();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <h1 className={styles.brand}>Orbit</h1>
        <nav aria-label="ناوبری اصلی">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.syncSection}>
          <div className={styles.syncHeader}>
            <span
              className={`${styles.syncBadge} ${styles[syncState.toLowerCase() as 'idle' | 'syncing' | 'error' | 'offline']}`}
              data-testid="sync-status"
              role="status"
            >
              {SYNC_LABELS[syncState]}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void triggerSync()}
            disabled={syncState === 'SYNCING'}
            className={styles.syncButton}
            data-testid="sync-button"
          >
            {syncState === 'SYNCING' ? 'در حال ارسال...' : 'همگام‌سازی'}
          </button>
        </div>
        <button type="button" onClick={signOut}>
          خروج
        </button>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
