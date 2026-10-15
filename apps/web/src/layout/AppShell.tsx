import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { SmartFilterEntity, TaskEntity } from '@orbit/shared-types';
import { useSession } from '../core/auth/session-context';
import { useStore } from '../core/storage/store-context';
import { useSyncStatus } from '../core/sync/sync-context';
import { useReminders } from '../core/reminders/reminder-context';
import { formatReminderText } from '../core/reminders/reminder-utils';
import { filterTasks } from '../core/filters';
import {
  listAllSmartFilters,
  SYSTEM_FILTER_PRESETS
} from '../features/filters/services/filter-service';
import { SmartFilterModal } from '../features/filters/components/SmartFilterModal';
import {
  clearRecentSearches,
  getRecentSearches,
  saveRecentSearch,
  searchTasks
} from '../features/search/search-utils';
import styles from './AppShell.module.css';

const NAV_ITEMS = [
  { to: '/today', label: 'امروز' },
  { to: '/tomorrow', label: 'فردا' },
  { to: '/calendar', label: 'تقویم' },
  { to: '/timeline', label: 'تایملاین' },
  { to: '/matrix', label: 'ماتریس آیزنهاور' },
  { to: '/inbox', label: 'صندوق ورودی' },
  { to: '/archive', label: 'آرشیو' },
  { to: '/trash', label: 'سطل زباله' },
  { to: '/settings', label: 'تنظیمات' }
] as const;

const SYNC_LABELS = {
  IDLE: 'همگام',
  SYNCING: 'در حال همگام‌سازی...',
  ERROR: 'خطا در همگام‌سازی',
  OFFLINE: 'آفلاین'
} as const;

export function AppShell() {
  const { session, signOut } = useSession();
  const store = useStore();
  const location = useLocation();
  const { syncState, triggerSync } = useSyncStatus();
  const { activeAlerts, completeAlert, snoozeAlert, dismissAlert } = useReminders();

  const [filters, setFilters] = useState<SmartFilterEntity[]>(() =>
    SYSTEM_FILTER_PRESETS.map((p) => structuredClone(p))
  );
  const [filterCounts, setFilterCounts] = useState<Record<string, number>>({});
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterToEdit, setFilterToEdit] = useState<SmartFilterEntity | null>(null);

  // Search state (P5-SRC-001)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [allTasksForSearch, setAllTasksForSearch] = useState<TaskEntity[]>([]);

  const reloadFilters = useCallback(async () => {
    try {
      const userId = session?.userId ?? 'default';
      const allFilters = await listAllSmartFilters({ store, userId });
      setFilters(allFilters);

      const allTasks = await store.listTasks();
      setAllTasksForSearch(allTasks);

      const counts: Record<string, number> = {};
      for (const f of allFilters) {
        counts[f.id] = filterTasks(allTasks, f.rule, { calendarType: 'JALALI' }).length;
      }
      setFilterCounts(counts);
    } catch {
      // In test or non-interactive environments, default to presets
    }
  }, [session?.userId, store]);

  useEffect(() => {
    void reloadFilters();
  }, [reloadFilters, location.pathname, syncState]);

  const searchResults = searchQuery.trim() ? searchTasks(allTasksForSearch, searchQuery) : [];

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
        {/* Smart Filters (P5-SMT-001) */}
        <div className={styles.filtersSection} data-testid="sidebar-smart-filters">
          <div className={styles.filtersSectionHeader}>
            <span className={styles.filtersSectionTitle}>لیست‌های هوشمند</span>
            <button
              type="button"
              className={styles.addFilterBtn}
              onClick={() => {
                setFilterToEdit(null);
                setIsFilterModalOpen(true);
              }}
              title="افزودن لیست هوشمند جدید"
              aria-label="افزودن لیست هوشمند جدید"
              data-testid="add-smart-filter-btn"
            >
              +
            </button>
          </div>
          <ul className={styles.filtersList}>
            {filters.map((filter) => {
              const count = filterCounts[filter.id] ?? 0;
              return (
                <li key={filter.id}>
                  <NavLink
                    to={`/filters/${filter.id}`}
                    className={styles.filterLink ?? ''}
                    data-testid={`nav-filter-${filter.id}`}
                  >
                    <div className={styles.filterInfo}>
                      <span
                        className={styles.filterDot}
                        style={{ backgroundColor: filter.color || '#6366f1' }}
                        aria-hidden="true"
                      />
                      <span className={styles.filterName}>{filter.name}</span>
                    </div>
                    <span
                      className={styles.filterBadge}
                      data-testid={`badge-filter-${filter.id}`}
                    >
                      {count}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
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
      <div className={styles.mainWrapper}>
        <header className={styles.topBar} data-testid="app-top-header">
          <div className={styles.searchContainer}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="جستجو در تسک‌ها، برچسب‌ها و محتوا..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setIsSearchFocused(true);
                setRecentSearches(getRecentSearches());
              }}
              onBlur={() => {
                // Short timeout to allow click events inside dropdown to fire
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  const updated = saveRecentSearch(searchQuery);
                  setRecentSearches(updated);
                }
              }}
              data-testid="global-search-input"
              aria-label="جستجوی تسک‌ها"
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.searchClearBtn}
                onClick={() => setSearchQuery('')}
                data-testid="clear-search-btn"
                aria-label="پاک کردن جستجو"
              >
                ✕
              </button>
            )}

            {/* Auto-suggest recent searches dropdown */}
            {isSearchFocused && !searchQuery && recentSearches.length > 0 && (
              <div className={styles.recentDropdown} data-testid="search-recent-dropdown">
                <div className={styles.recentHeader}>
                  <span>جستجوهای اخیر</span>
                  <button
                    type="button"
                    className={styles.clearHistoryBtn}
                    onClick={() => {
                      clearRecentSearches();
                      setRecentSearches([]);
                    }}
                    data-testid="clear-recent-searches-btn"
                  >
                    پاکسازی تاریخچه
                  </button>
                </div>
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    className={styles.recentItem}
                    data-testid={`recent-search-${term}`}
                    onMouseDown={() => {
                      setSearchQuery(term);
                    }}
                  >
                    <span>🔍</span>
                    <span>{term}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Instant search results dropdown */}
            {searchQuery.trim().length > 0 && (
              <div className={styles.searchResultsDropdown} data-testid="search-results-dropdown">
                <div className={styles.searchResultsHeader}>
                  <span>نتایج برای «{searchQuery}» ({searchResults.length})</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className={styles.noResultsMessage}>موردی یافت نشد</div>
                ) : (
                  searchResults.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className={styles.searchResultItem}
                      data-testid={`search-result-${task.id}`}
                    >
                      <div className={styles.searchResultTitle}>{task.title}</div>
                      <div className={styles.searchResultMeta}>
                        {task.tags && task.tags.length > 0 && (
                          <span style={{ color: '#6366f1' }}>#{task.tags.join(' #')}</span>
                        )}
                        <span style={{ color: task.completedAt ? '#198754' : '#6c757d' }}>
                          {task.completedAt ? 'تکمیل شده' : 'باز'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {isFilterModalOpen && (
        <SmartFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => {
            setIsFilterModalOpen(false);
            setFilterToEdit(null);
          }}
          initialFilter={filterToEdit}
          onSaved={() => {
            void reloadFilters();
          }}
        />
      )}
    </div>
  );
}
