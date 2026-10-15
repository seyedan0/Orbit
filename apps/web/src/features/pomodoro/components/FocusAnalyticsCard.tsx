import type { WeeklyFocusStats } from '../services/pomodoro-service';
import styles from './FocusAnalyticsCard.module.css';

export interface FocusAnalyticsCardProps {
  stats: WeeklyFocusStats;
  onClose?: () => void;
  className?: string;
}

export function FocusAnalyticsCard({ stats, onClose, className }: FocusAnalyticsCardProps) {
  // Format total hours
  const totalHours = (stats.totalFocusMinutes / 60).toFixed(1);

  // Maximum value for bar scaling (minimum baseline of 30 minutes to look natural)
  const maxDayMinutes = Math.max(
    ...stats.dailyStats.map((d) => d.focusMinutes),
    30
  );

  return (
    <div
      className={`${styles.card} ${className ?? ''}`}
      data-testid="focus-analytics-card"
      role="region"
      aria-label="گزارش آماری تمرکز هفتگی"
    >
      <div className={styles.cardHeader}>
        <div className={styles.titleArea}>
          <span className={styles.titleIcon} aria-hidden="true">
            📊
          </span>
          <h3 className={styles.title}>آمار و تحلیل تمرکز هفتگی</h3>
        </div>
        {onClose && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="بستن گزارش آماری"
            data-testid="close-analytics-btn"
          >
            ✕
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiItem}>
          <span
            className={`${styles.kpiValue} ${styles.kpiValueWork}`}
            data-testid="kpi-total-hours"
          >
            {totalHours}
          </span>
          <span className={styles.kpiLabel}>مجموع ساعت تمرکز</span>
        </div>

        <div className={styles.kpiItem}>
          <span className={styles.kpiValue} data-testid="kpi-daily-average">
            {stats.dailyAverageMinutes}
          </span>
          <span className={styles.kpiLabel}>میانگین روزانه (دقیقه)</span>
        </div>

        <div className={styles.kpiItem}>
          <span
            className={`${styles.kpiValue} ${styles.kpiValueStreak}`}
            data-testid="kpi-streak"
          >
            {stats.streakDays}
          </span>
          <span className={styles.kpiLabel}>روزهای استمرار (Streak)</span>
        </div>

        <div className={styles.kpiItem}>
          <span
            className={`${styles.kpiValue} ${styles.kpiValueRate}`}
            data-testid="kpi-completion-rate"
          >
            %{stats.completionRatePercent}
          </span>
          <span className={styles.kpiLabel}>نرخ تکمیل دوره‌ها</span>
        </div>
      </div>

      {/* 7-Day Bar Chart */}
      <div className={styles.chartSection}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>روند ۷ روز گذشته (دقیقه در روز)</h4>
        </div>
        <div
          className={styles.chartContainer}
          role="img"
          aria-label="نمودار میله‌ای تمرکز ۷ روز گذشته"
          data-testid="analytics-barchart"
        >
          {stats.dailyStats.map((day, index) => {
            const isToday = index === stats.dailyStats.length - 1;
            const heightPercent = Math.min(
              100,
              Math.round((day.focusMinutes / maxDayMinutes) * 100)
            );

            return (
              <div
                key={day.date}
                className={styles.chartColumn}
                title={`${day.dayLabel} (${day.date}): ${day.focusMinutes} دقیقه تمرکز (${day.completedPomodoros} پومودورو)`}
                data-testid={`bar-col-${index}`}
              >
                <span className={styles.barValue}>
                  {day.focusMinutes > 0 ? `${day.focusMinutes}m` : '-'}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${isToday ? styles.barFillActive : ''}`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span
                  className={`${styles.dayLabel} ${isToday ? styles.dayLabelToday : ''}`}
                >
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown Grid: Top Tasks & Tags */}
      <div className={styles.breakdownGrid}>
        {/* Top Tasks */}
        <div className={styles.breakdownCard} data-testid="top-tasks-section">
          <div className={styles.breakdownTitle}>
            <span>🎯</span>
            <span>بیشترین تسک‌های متمرکز</span>
          </div>
          {stats.topTasks.length === 0 ? (
            <p className={styles.emptyState}>تسک ثبت‌شده‌ای در این هفته وجود ندارد</p>
          ) : (
            <ul className={styles.taskList} data-testid="top-tasks-list">
              {stats.topTasks.slice(0, 4).map((task) => (
                <li key={task.taskId} className={styles.taskItem}>
                  <span className={styles.taskName} title={task.taskTitle}>
                    {task.taskTitle}
                  </span>
                  <div className={styles.taskStats}>
                    <span>{task.focusMinutes} دقیقه</span>
                    <span className={styles.pomodoroBadge} title="دوره‌های کامل‌شده">
                      {task.pomodoroCount} 🍅
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tag Distribution */}
        <div className={styles.breakdownCard} data-testid="tag-distribution-section">
          <div className={styles.breakdownTitle}>
            <span>🏷️</span>
            <span>توزیع زمانی برچسب‌ها</span>
          </div>
          {stats.tagDistribution.length === 0 ? (
            <p className={styles.emptyState}>برچسبی در تسک‌ها یافت نشد</p>
          ) : (
            <div className={styles.tagPills} data-testid="tag-distribution">
              {stats.tagDistribution.slice(0, 8).map((t) => (
                <span key={t.tag} className={styles.tagPill}>
                  <span>#{t.tag}</span>
                  <span>({t.focusMinutes}m)</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
