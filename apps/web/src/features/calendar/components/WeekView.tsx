import type { TaskEntity } from '@orbit/shared-types';
import { useState, type FC } from 'react';
import {
  computeWeekSegments,
  getIsoWeekNumber,
  getJalaliWeekNumber,
  getWeekViewDays,
  isMultiDayTask,
  isTaskOnDate,
  type CalendarSettings,
  type CalendarType,
  type TaskRibbonSegment
} from '../calendar-utils';
import { toPersianDigits } from '../../../core/calendar/jalali';
import styles from './WeekView.module.css';

export interface WeekViewProps {
  currentDate: Date;
  calendarType: CalendarType;
  tasks: TaskEntity[];
  onToggleCompletion?: (task: TaskEntity) => void;
  onAddTask?: (date: Date, isoDate: string, hour?: number) => void;
  onRescheduleTask?: (taskId: string, targetDate: Date, targetIsoDate: string) => void;
  onShiftTaskSpan?: (taskId: string, targetStartDate: Date) => void;
  onResizeTaskSpan?: (taskId: string, edge: 'start' | 'end', targetDate: Date) => void;
  onSelectTask?: (task: TaskEntity) => void;
  today?: Date;
  settings?: CalendarSettings;
}

export const WeekView: FC<WeekViewProps> = ({
  currentDate,
  calendarType,
  tasks,
  onToggleCompletion,
  onAddTask,
  onRescheduleTask,
  onShiftTaskSpan,
  onResizeTaskSpan,
  onSelectTask,
  today = new Date(),
  settings
}) => {
  const [isEarlyHoursExpanded, setIsEarlyHoursExpanded] = useState(false);

  const weekDays = getWeekViewDays(currentDate, calendarType, today);
  const weekDates = weekDays.map((d) => d.date);

  const weekNum =
    calendarType === 'jalali'
      ? getJalaliWeekNumber(weekDates[0] ?? currentDate)
      : getIsoWeekNumber(weekDates[0] ?? currentDate);
  const weekNumLabel = `W${calendarType === 'jalali' ? toPersianDigits(weekNum) : weekNum}`;

  const multiDaySegments = computeWeekSegments(weekDates, tasks, today);

  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  const showSecondary = settings?.showSecondaryCalendar ?? true;
  const showWeekNum = settings?.showWeekNumbers ?? true;
  const showCompleted = settings?.showCompletedTasks ?? true;

  const formatTaskTime = (task: TaskEntity): string | null => {
    if (task.isAllDay) return null;
    const iso = task.dueDate || task.startDate;
    if (!iso) return null;
    const date = new Date(iso);
    if (isNaN(date.getTime())) return null;
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    return calendarType === 'jalali' ? toPersianDigits(timeStr) : timeStr;
  };

  return (
    <div
      className={styles.weekViewContainer}
      role="region"
      aria-label="نمای هفتگی تقویم"
      data-testid="week-view"
    >
      {/* Header Bar with Week Number */}
      <div className={styles.weekHeaderBar}>
        {showWeekNum && (
          <span
            className={styles.weekNumberBadge}
            data-testid="week-number-badge"
          >
            <span>📅</span>
            <span>{weekNumLabel}</span>
          </span>
        )}
        <span className={styles.weekRangeLabel}>
          {weekDays[0]?.dateLabel} — {weekDays[6]?.dateLabel}
        </span>
      </div>

      {/* Top Pinned All-Day & Multi-Day Snake Ribbon Section */}
      {multiDaySegments.length > 0 && (
        <div
          className={styles.allDayRibbonSection}
          data-testid="week-allday-ribbon-row"
        >
          <div className={styles.allDaySectionHeader}>
            <span>تسک‌های چندروزه و پیوسته</span>
            <span>{multiDaySegments.length} تسک</span>
          </div>
          <div className={styles.ribbonsTrack}>
            {multiDaySegments.map((seg: TaskRibbonSegment, idx) => {
              const isTaskCompleted = seg.task.completedAt != null;
              if (!showCompleted && isTaskCompleted) return null;

              return (
                <div
                  key={`week-ribbon-${seg.taskId}-${idx}`}
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
                  {/* Left Resize Handle */}
                  <span
                    className={styles.ribbonResizeHandleLeft}
                    draggable={true}
                    data-testid={`week-ribbon-resize-start-${seg.taskId}`}
                    title="تغییر تاریخ شروع"
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData('text/plain', seg.taskId);
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          action: 'RIBBON_RESIZE_START',
                          taskId: seg.taskId
                        })
                      );
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  />

                  {!seg.isStartOfTask && (
                    <span className={styles.ribbonContinuationLeft}>◂</span>
                  )}
                  <span className={styles.ribbonTitle}>{seg.taskTitle}</span>
                  {!seg.isEndOfTask && (
                    <span className={styles.ribbonContinuationRight}>▸</span>
                  )}

                  {/* Right Resize Handle */}
                  <span
                    className={styles.ribbonResizeHandleRight}
                    draggable={true}
                    data-testid={`week-ribbon-resize-end-${seg.taskId}`}
                    title="تغییر تاریخ پایان"
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData('text/plain', seg.taskId);
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          action: 'RIBBON_RESIZE_END',
                          taskId: seg.taskId
                        })
                      );
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compressed Early Hours Bar (12 AM - 7 AM) */}
      <div
        className={styles.earlyHoursBar}
        onClick={() => setIsEarlyHoursExpanded((prev) => !prev)}
        title="کلیک برای نمایش/مخفی‌سازی ساعات بامداد"
        data-testid="week-early-hours-row"
      >
        <div className={styles.earlyHoursTitle}>
          <span className={styles.earlyHoursIcon}>🌙</span>
          <span>
            ساعات بامداد (۰۰:۰۰ - ۰۷:۰۰)
            {isEarlyHoursExpanded ? ' [نمایش کامل]' : ' [فشرده]'}
          </span>
        </div>
        <span>{isEarlyHoursExpanded ? '▴ بستن' : '▾ باز کردن'}</span>
      </div>

      {/* 7 Columns Grid */}
      <div className={styles.weekColumnsGrid}>
        {weekDays.map((col, idx) => {
          const colTasks = tasks.filter((t) => {
            if (isMultiDayTask(t)) return false;
            return isTaskOnDate(t, col.date);
          });

          const filteredColTasks = showCompleted
            ? colTasks
            : colTasks.filter((t) => t.completedAt == null);

          const isPast = new Date(col.date).getTime() < todayMidnight.getTime();

          return (
            <div
              key={col.isoDate}
              className={`${styles.dayColumn} ${
                col.isToday ? styles.todayColumn : ''
              } ${isPast ? styles.dayColumnPast : ''}`}
              aria-label={`${col.weekdayName} ${col.dateLabel}`}
              aria-current={col.isToday ? 'date' : undefined}
              data-testid={`week-column-${idx}`}
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
                      onShiftTaskSpan(taskId, col.date);
                    } else {
                      onRescheduleTask?.(taskId, col.date, col.isoDate);
                    }
                  } else if (parsedAction.action === 'RIBBON_RESIZE_START') {
                    onResizeTaskSpan?.(taskId, 'start', col.date);
                  } else if (parsedAction.action === 'RIBBON_RESIZE_END') {
                    onResizeTaskSpan?.(taskId, 'end', col.date);
                  } else {
                    onRescheduleTask?.(taskId, col.date, col.isoDate);
                  }
                }
              }}
            >
              {/* Column Header */}
              <div className={styles.columnHeader}>
                <div className={styles.headerTopRow}>
                  <span
                    className={styles.weekdayTitle}
                    data-testid={`week-weekday-title-${idx}`}
                  >
                    {col.weekdayName}
                  </span>
                  <button
                    type="button"
                    className={styles.addTaskBtn}
                    onClick={() => onAddTask?.(col.date, col.isoDate)}
                    aria-label={`افزودن تسک در ${col.weekdayName}`}
                    data-testid={`week-add-task-btn-${idx}`}
                    title="افزودن تسک"
                  >
                    +
                  </button>
                </div>
                <div>
                  <span
                    className={styles.dateBadge}
                    data-testid={`week-date-badge-${idx}`}
                  >
                    {col.dateLabel}
                  </span>
                  {showSecondary && col.secondaryDateLabel && (
                    <span
                      className={styles.secondaryDateBadge}
                      title="تاریخ ثانویه"
                    >
                      ({col.secondaryDateLabel})
                    </span>
                  )}
                </div>
              </div>

              {/* Column Tasks Body */}
              <div
                className={styles.columnTasksList}
                data-testid={`week-column-tasks-${idx}`}
              >
                {filteredColTasks.length === 0 ? (
                  <div className={styles.emptyColumnMsg}>بدون تسک</div>
                ) : (
                  filteredColTasks.map((task) => {
                    const isCompleted = task.completedAt != null;
                    const timeStr = formatTaskTime(task);
                    const priorityClass =
                      task.priority === 5
                        ? styles.priorityP1
                        : task.priority === 3
                          ? styles.priorityP2
                          : task.priority === 1
                            ? styles.priorityP3
                            : '';

                    return (
                      <div
                        key={task.id}
                        className={`${styles.taskItemCard} ${
                          isCompleted ? styles.taskCompleted : ''
                        } ${priorityClass}`}
                        draggable={true}
                        onClick={(e) => {
                          e.stopPropagation();
                          const target = e.target as HTMLElement;
                          if (target.closest('input')) return;
                          onSelectTask?.(task);
                        }}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id);
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({ taskId: task.id })
                          );
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        data-testid={`week-task-${task.id}`}
                      >
                        <div className={styles.taskHeaderRow}>
                          <input
                            type="checkbox"
                            className={styles.taskCheckbox}
                            checked={isCompleted}
                            onChange={() => onToggleCompletion?.(task)}
                            aria-label={`تکمیل ${task.title}`}
                            data-testid={`week-task-checkbox-${task.id}`}
                          />
                          <span
                            className={styles.taskTitle}
                            data-testid={`week-task-title-${task.id}`}
                          >
                            {task.repeatFlag && '🔁 '}
                            {task.reminders &&
                              task.reminders.length > 0 &&
                              '🔔 '}
                            {task.title}
                          </span>
                        </div>

                        <div className={styles.taskMetaRow}>
                          {task.isAllDay ? (
                            <span
                              className={styles.allDayBadge}
                              data-testid={`week-task-allday-${task.id}`}
                            >
                              تمام روز
                            </span>
                          ) : timeStr ? (
                            <span
                              className={styles.timeBadge}
                              data-testid={`week-task-time-${task.id}`}
                            >
                              {timeStr}
                            </span>
                          ) : null}

                          {task.priority > 0 && (
                            <span
                              className={styles.priorityBadge}
                              data-testid={`week-task-priority-${task.id}`}
                            >
                              P{task.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
