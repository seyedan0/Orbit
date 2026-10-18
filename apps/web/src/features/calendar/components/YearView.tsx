import type { TaskEntity } from '@orbit/shared-types';
import type { FC } from 'react';
import {
  getYearViewMonths,
  type CalendarSettings,
  type CalendarType,
  type YearMonthDayCell
} from '../calendar-utils';
import {
  PERSIAN_WEEKDAY_SHORT,
  GREGORIAN_WEEKDAY_SHORT,
  toPersianDigits
} from '../../../core/calendar/jalali';
import styles from './YearView.module.css';

export interface YearViewProps {
  currentDate: Date;
  calendarType: CalendarType;
  tasks: TaskEntity[];
  onSelectDate?: (date: Date) => void;
  onDrillDown?: (date: Date) => void;
  today?: Date;
  settings?: CalendarSettings;
}

export const YearView: FC<YearViewProps> = ({
  currentDate,
  calendarType,
  tasks,
  onSelectDate,
  onDrillDown,
  today = new Date(),
  settings
}) => {
  const months = getYearViewMonths(currentDate, calendarType, tasks, today);

  const weekdayShorts =
    calendarType === 'jalali' ? PERSIAN_WEEKDAY_SHORT : GREGORIAN_WEEKDAY_SHORT;

  const totalYearTasks = months.reduce((acc, m) => {
    return (
      acc +
      m.weeks.reduce(
        (wAcc, w) =>
          wAcc +
          w.days
            .filter((d) => d.isCurrentMonth)
            .reduce((dAcc, d) => dAcc + d.taskCount, 0),
        0
      )
    );
  }, 0);

  const showWeekNum = settings?.showWeekNumbers ?? true;

  const handleDayClick = (cell: YearMonthDayCell) => {
    if (!cell.isCurrentMonth) return;
    onSelectDate?.(cell.date);
    onDrillDown?.(cell.date);
  };

  return (
    <div
      className={styles.yearViewContainer}
      role="region"
      aria-label="نمای سالانه تقویم"
      data-testid="year-view"
    >
      {/* Header Bar */}
      <div className={styles.yearHeaderBar}>
        <div className={styles.yearTitle} data-testid="year-title">
          <span>{months[0]?.yearLabel ?? ''}</span>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              marginRight: '0.75rem',
              marginLeft: '0.75rem'
            }}
          >
            ({calendarType === 'jalali' ? toPersianDigits(totalYearTasks) : totalYearTasks} تسک ثبت‌شده در سال)
          </span>
        </div>

        {/* Heatmap Activity Legend */}
        <div className={styles.heatmapLegend}>
          <span>تراکم کارها: کمتر</span>
          <div className={styles.legendLevels}>
            <span
              className={`${styles.legendBox} ${styles.heatmapLevel0}`}
              title="۰ تسک"
            />
            <span
              className={`${styles.legendBox} ${styles.heatmapLevel1}`}
              title="۱ تا ۲ تسک"
            />
            <span
              className={`${styles.legendBox} ${styles.heatmapLevel2}`}
              title="۳ تا ۴ تسک"
            />
            <span
              className={`${styles.legendBox} ${styles.heatmapLevel3}`}
              title="۵+ تسک"
            />
          </div>
          <span>بیشتر</span>
        </div>
      </div>

      {/* 4x3 Grid of 12 Months */}
      <div className={styles.yearMonthsGrid}>
        {months.map((m, monthIdx) => {
          const monthTaskTotal = m.weeks.reduce(
            (acc, w) =>
              acc +
              w.days
                .filter((d) => d.isCurrentMonth)
                .reduce((dAcc, d) => dAcc + d.taskCount, 0),
            0
          );

          return (
            <div
              key={`year-month-${monthIdx}`}
              className={styles.monthCard}
              data-testid={`year-month-${monthIdx}`}
            >
              <div className={styles.monthCardHeader}>
                <span
                  className={styles.monthName}
                  data-testid={`year-month-title-${monthIdx}`}
                >
                  {m.monthName}
                </span>
                {monthTaskTotal > 0 && (
                  <span
                    className={styles.monthTaskCountBadge}
                    title={`${monthTaskTotal} تسک در این ماه`}
                  >
                    {calendarType === 'jalali'
                      ? toPersianDigits(monthTaskTotal)
                      : monthTaskTotal}
                  </span>
                )}
              </div>

              <table className={styles.monthTable}>
                <thead>
                  <tr>
                    {showWeekNum && (
                      <th className={styles.weekNumberCol} title="شماره هفته">
                        #
                      </th>
                    )}
                    {weekdayShorts.map((shortName, dayIdx) => (
                      <th
                        key={`th-${monthIdx}-${dayIdx}`}
                        className={styles.monthTableHeaderCol}
                      >
                        {shortName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.weeks.map((week, wIdx) => (
                    <tr key={`tr-${monthIdx}-${wIdx}`}>
                      {showWeekNum && (
                        <td
                          className={styles.weekNumberCol}
                          title={`هفته ${week.weekNumber}`}
                        >
                          {calendarType === 'jalali'
                            ? toPersianDigits(week.weekNumber)
                            : week.weekNumber}
                        </td>
                      )}
                      {week.days.map((cell, dIdx) => {
                        const levelClass =
                          cell.heatmapLevel === 3
                            ? styles.heatmapLevel3
                            : cell.heatmapLevel === 2
                              ? styles.heatmapLevel2
                              : cell.heatmapLevel === 1
                                ? styles.heatmapLevel1
                                : styles.heatmapLevel0;

                        return (
                          <td
                            key={`td-${monthIdx}-${wIdx}-${dIdx}`}
                            className={`${styles.dayCell} ${
                              !cell.isCurrentMonth
                                ? styles.dayCellOtherMonth
                                : levelClass
                            } ${cell.isToday ? styles.todayCell : ''}`}
                            onClick={() => handleDayClick(cell)}
                            title={
                              cell.isCurrentMonth
                                ? `${cell.dayNumber} ${m.monthName} (${cell.taskCount} تسک)`
                                : ''
                            }
                            data-testid={
                              cell.isToday
                                ? 'year-today-cell'
                                : `year-day-cell-${cell.isoDate.slice(0, 10)}`
                            }
                          >
                            {cell.dayNumber}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
};
