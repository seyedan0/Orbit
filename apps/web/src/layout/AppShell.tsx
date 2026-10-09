import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../core/auth/session-context';
import { useSyncStatus } from '../core/sync/sync-context';
import { useReminders } from '../core/reminders/reminder-context';
import { formatReminderText } from '../core/reminders/reminder-utils';
import styles from './AppShell.module.css';

const NAV_ITEMS = [
  { to: '/today', label: 'امروز' },
  { to: '/tomorrow', label: 'فردا' },
  { to: '/calendar', label: 'تقویم' },
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
  const { activeAlerts, completeAlert, snoozeAlert, dismissAlert } = useReminders();

  return (
    <div className={styles.shell}>
      {/* In-App Reminder Toasts Banner */}
      {activeAlerts.length > 0 && (
        <div
          className={styles.reminderToastContainer}
          data-testid="reminder-toasts-container"
          aria-live="assertive"
        >
          {activeAlerts.map((alert) => (
            <div
              key={alert.alertId}
              className={styles.reminderBanner}
              role="alert"
              data-testid={`reminder-alert-${alert.task.id}`}
            >
              <div className={styles.reminderContent}>
                <span className={styles.reminderIcon} aria-hidden="true">
                  🔔
                </span>
                <div className={styles.reminderText}>
                  <strong
                    className={styles.reminderTitle}
                    data-testid={`reminder-title-${alert.task.id}`}
                  >
                    {alert.task.title}
                  </strong>
                  <span
                    className={styles.reminderSubtitle}
                    data-testid={`reminder-subtitle-${alert.task.id}`}
                  >
                    {formatReminderText(alert.reminder, 'fa')}
                  </span>
                </div>
              </div>
              <div className={styles.reminderActions}>
                <button
                  type="button"
                  className={styles.btnReminderComplete}
                  onClick={() => void completeAlert(alert.alertId)}
                  data-testid={`reminder-complete-${alert.task.id}`}
                >
                  تکمیل
                </button>
                <button
                  type="button"
                  className={styles.btnReminderSnooze}
                  onClick={() => void snoozeAlert(alert.alertId, 10)}
                  data-testid={`reminder-snooze-${alert.task.id}`}
                >
                  به تعویق انداختن (+۱۰ دقیقه)
                </button>
                <button
                  type="button"
                  className={styles.btnReminderDismiss}
                  onClick={() => dismissAlert(alert.alertId)}
                  aria-label="بستن اعلان"
                  data-testid={`reminder-dismiss-${alert.task.id}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <aside className={styles.sidebar}>
        <h1 className={styles.brand}>Orbit</h1>
        <nav aria-label="ناوبری اصلی">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  aria-label={item.label}
                  data-testid={`nav-${item.to.replace('/', '')}`}
                >
                  {item.label}
                </NavLink>
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
