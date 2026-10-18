import type { TaskEntity } from '@orbit/shared-types';
import type { FC } from 'react';
import {
  getMultiWeekRows,
  isSingleDayTaskOnDate,
  type CalendarSettings,
  type CalendarType,
  type TaskRibbonSegment
} from '../calendar-utils';
import {
  PERSIAN_WEEKDAY_NAMES,
  GREGORIAN_WEEKDAY_NAMES,
  toPersianDigits
} from '../../../core/calendar/jalali';
import styles from './MultiWeekView.module.css';

export interface MultiWeekViewProps {
  currentDate: Date;
  calendarType: CalendarType;
  tasks: TaskEntity[];
  weeksCount?: number;
  onToggleCompletion?: (task: TaskEntity) => void;
  onAddTask?: (date: Date, isoDate: string) => void;
  onRescheduleTask?: (taskId: string, targetDate: Date, targetIsoDate: string) => void;
  onShiftTaskSpan?: (taskId: string, targetStartDate: Date) => void;
  onSelectTask?: (task: TaskEntity) => void;
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  today?: Date;
  settings?: CalendarSettings;
}

export const MultiWeekView: FC<MultiWeekViewProps> = ({
  currentDate,
  calendarType,
  tasks,
  weeksCount = 2,
  onToggleCompletion,
  onAddTask,
  onRescheduleTask,
  onShiftTaskSpan,
  onSelectTask,
  selectedDate,
  onSelectDate,
  today = new Date(),
  settings
}) => {
  const weekRows = getMultiWeekRows(
    currentDate,
    weeksCount,
    calendarType,
    tasks,
    today
  );

  const weekdayHeaders =
    calendarType === 'jalali' ? PERSIAN_WEEKDAY_NAMES : GREGORIAN_WEEKDAY_NAMES;

  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  const showCompleted = settings?.showCompletedTasks ?? true;
  const showSecondary = settings?.showSecondaryCalendar ?? true;
  const showWeekNum = settings?.showWeekNumbers ?? true;

  return (
    <div
      className={styles.multiWeekContainer}
      role="region"
      aria-label="نمای چندهفته‌ای تقویم"
      data-testid="multi-week-view"
    >
      <div className={styles.multiWeekHeaderBar}>
        <span
          className={styles.multiWeekBadge}
          data-testid="multi-week-badge"
        >
          <span>📆</span>
          <span>
            نمای {calendarType === 'jalali' ? toPersianDigits(weeksCount) : weeksCount} هفته‌ای
          </span>
        </span>
      </div>

      {/* Weekday Headers */}
      <div className={styles.weekdayHeaderGrid} aria-hidden="true">
        {weekdayHeaders.map((header, idx) => (
          <div key={idx} className={styles.weekdayHeader}>
            {header}
          </div>
        ))}
      </div>

      {/* Weeks Rows */}
      <div className={styles.weeksRowsContainer}>
        {weekRows.map((row, rowIdx) => (
          <div
            key={`multi-week-row-${rowIdx}`}
            className={styles.weekRow}
            data-testid={`multi-week-row-${rowIdx}`}
          >
            {/* Multi-Day Ribbons Track */}
            {row.multiDaySegments.length > 0 && (
              <div
                className={styles.ribbonsTrack}
                style={{
                  gridTemplateRows: `repeat(${row.maxSlots}, 22px)`
                }}
              >
                {row.multiDaySegments.map((seg: TaskRibbonSegment) => {
                  const isTaskCompleted = seg.task.completedAt != null;
                  if (!showCompleted && isTaskCompleted) return null;

                  return (
                    <div
                      key={`multi-week-ribbon-${seg.taskId}-${rowIdx}`}
                      className={`${styles.ribbonItem} ${
                        seg.isStartOfTask
                          ? styles.ribbonRoundedStart
                          : styles.ribbonFlatStart
                      } ${
                        seg.isEndOfTask
                          ? styles.ribbonRoundedEnd
                          : styles.ribbonFlatEnd
                      } ${
                        seg.isPast
                          ? styles.ribbonPast
                          : styles.ribbonTodayOrFuture
                      }`}
                      style={{
                        gridColumn: `${seg.startColIndex + 1} / span ${seg.colSpan}`,
                        gridRow: seg.slotIndex + 1,
                        backgroundColor: seg.color
                      }}
                      draggable={true}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTask?.(seg.task);
                      }}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', seg.taskId);
                        e.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({
                            action: 'RIBBON_MOVE',
                            taskId: seg.taskId
                          })
                        );
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      title={seg.taskTitle}
                    >
                      {!seg.isStartOfTask && (
                        <span className={styles.ribbonContinuationLeft}>◂</span>
                      )}
                      <span className={styles.ribbonTitle}>{seg.taskTitle}</span>
                      {!seg.isEndOfTask && (
                        <span className={styles.ribbonContinuationRight}>▸</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Days in Row */}
            <div className={styles.weekDaysRowGrid}>
              {row.days.map((item, colIdx) => {
                const dayTasks = tasks.filter((t) =>
                  isSingleDayTaskOnDate(t, item.date)
                );
                const filteredTasks = showCompleted
                  ? dayTasks
                  : dayTasks.filter((t) => t.completedAt == null);

                const isSelected =
                  selectedDate != null &&
                  selectedDate.toISOString().slice(0, 10) ===
                    item.isoDate.slice(0, 10);
                const isPast =
                  new Date(item.date).getTime() < todayMidnight.getTime();

                return (
                  <div
                    key={item.isoDate + colIdx}
                    className={`${styles.dayCell} ${
                      item.isToday ? styles.todayCell : ''
                    } ${isSelected ? styles.selectedCell : ''} ${
                      isPast ? styles.dayCellPast : ''
                    }`}
                    onClick={() => onSelectDate?.(item.date)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const rawData = e.dataTransfer.getData('application/json');
                      let parsedAction: { action?: string; taskId?: string } = {};
                      try {
                        if (rawData) parsedAction = JSON.parse(rawData);
                      } catch {
                        // ignore
                      }
                      const taskId =
                        parsedAction.taskId || e.dataTransfer.getData('text/plain');
                      if (taskId) {
                        if (parsedAction.action === 'RIBBON_MOVE') {
                          if (onShiftTaskSpan) {
                            onShiftTaskSpan(taskId, item.date);
                          } else {
                            onRescheduleTask?.(taskId, item.date, item.isoDate);
                          }
                        } else {
                          onRescheduleTask?.(taskId, item.date, item.isoDate);
                        }
                      }
                    }}
                  >
                    <div className={styles.dayCellHeader}>
                      <div className={styles.dayNumberGroup}>
                        <span
                          className={`${styles.dayNumber} ${
                            item.isToday ? styles.todayNumber : ''
                          } ${isSelected ? styles.selectedNumber : ''}`}
                        >
                          {item.dayNumber}
                        </span>
                        {showSecondary && item.secondaryDayNumber && (
                          <span className={styles.secondaryDateBadge}>
                            {item.secondaryDayNumber}
                          </span>
                        )}
                        {showWeekNum && item.weekNumberLabel && (
                          <span className={styles.weekNumberBadge}>
                            {item.weekNumberLabel}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.addTaskBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddTask?.(item.date, item.isoDate);
                        }}
                        aria-label={`افزودن تسک در ${item.dayNumber}`}
                        title="افزودن تسک"
                      >
                        +
                      </button>
                    </div>

                    {filteredTasks.length > 0 && (
                      <div className={styles.dayTasksList}>
                        {filteredTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`${styles.taskItemCard} ${
                              task.completedAt != null ? styles.taskCompleted : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const target = e.target as HTMLElement;
                              if (target.closest('input')) return;
                              onSelectTask?.(task);
                            }}
                          >
                            <input
                              type="checkbox"
                              className={styles.taskCheckbox}
                              checked={task.completedAt != null}
                              onChange={() => onToggleCompletion?.(task)}
                              aria-label={`تکمیل ${task.title}`}
                            />
                            <span className={styles.taskTitle}>
                              {task.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
