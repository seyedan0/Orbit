import type { TaskEntity } from '@orbit/shared-types';
import type { FC } from 'react';
import {
  getMultiDayItems,
  isMultiDayTask,
  isTaskOnDate,
  type CalendarSettings,
  type CalendarType
} from '../calendar-utils';
import { toPersianDigits } from '../../../core/calendar/jalali';
import styles from './MultiDayView.module.css';

export interface MultiDayViewProps {
  currentDate: Date;
  calendarType: CalendarType;
  tasks: TaskEntity[];
  daysCount?: number;
  onToggleCompletion?: (task: TaskEntity) => void;
  onAddTask?: (date: Date, isoDate: string) => void;
  onRescheduleTask?: (taskId: string, targetDate: Date, targetIsoDate: string) => void;
  onShiftTaskSpan?: (taskId: string, targetStartDate: Date) => void;
  onSelectTask?: (task: TaskEntity) => void;
  today?: Date;
  settings?: CalendarSettings;
}

export const MultiDayView: FC<MultiDayViewProps> = ({
  currentDate,
  calendarType,
  tasks,
  daysCount = 3,
  onToggleCompletion,
  onAddTask,
  onRescheduleTask,
  onShiftTaskSpan,
  onSelectTask,
  today = new Date(),
  settings
}) => {
  const dayItems = getMultiDayItems(currentDate, daysCount, calendarType, today);
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  const showCompleted = settings?.showCompletedTasks ?? true;
  const showSecondary = settings?.showSecondaryCalendar ?? true;

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
      className={styles.multiDayContainer}
      role="region"
      aria-label="نمای چندروزه تقویم"
      data-testid="multi-day-view"
    >
      <div className={styles.multiDayHeaderBar}>
        <span className={styles.multiDayBadge} data-testid="multi-day-badge">
          <span>🗓️</span>
          <span>
            نمای {calendarType === 'jalali' ? toPersianDigits(daysCount) : daysCount} روزه
          </span>
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {dayItems[0]?.dateLabel} — {dayItems[dayItems.length - 1]?.dateLabel}
        </span>
      </div>

      <div
        className={styles.multiDayColumnsGrid}
        style={{
          gridTemplateColumns: `repeat(${daysCount}, 1fr)`
        }}
      >
        {dayItems.map((col, idx) => {
          const colTasks = tasks.filter((t) => {
            if (isMultiDayTask(t)) return false;
            return isTaskOnDate(t, col.date);
          });

          const filteredTasks = showCompleted
            ? colTasks
            : colTasks.filter((t) => t.completedAt == null);

          const isPast = new Date(col.date).getTime() < todayMidnight.getTime();

          return (
            <div
              key={col.isoDate}
              className={`${styles.dayColumn} ${
                col.isToday ? styles.todayColumn : ''
              } ${isPast ? styles.dayColumnPast : ''}`}
              data-testid={`multi-day-column-${idx}`}
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
                  } else {
                    onRescheduleTask?.(taskId, col.date, col.isoDate);
                  }
                }
              }}
            >
              <div className={styles.columnHeader}>
                <div className={styles.headerTopRow}>
                  <span className={styles.weekdayTitle}>{col.weekdayName}</span>
                  <button
                    type="button"
                    className={styles.addTaskBtn}
                    onClick={() => onAddTask?.(col.date, col.isoDate)}
                    aria-label={`افزودن تسک در ${col.weekdayName}`}
                    title="افزودن تسک"
                  >
                    +
                  </button>
                </div>
                <div>
                  <span className={styles.dateBadge}>{col.dateLabel}</span>
                  {showSecondary && col.secondaryDateLabel && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        marginInlineStart: '0.35rem'
                      }}
                    >
                      ({col.secondaryDateLabel})
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.columnTasksList}>
                {filteredTasks.length === 0 ? (
                  <div className={styles.emptyColumnMsg}>بدون تسک</div>
                ) : (
                  filteredTasks.map((task) => {
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
                        data-testid={`multi-day-task-${task.id}`}
                      >
                        <div className={styles.taskHeaderRow}>
                          <input
                            type="checkbox"
                            className={styles.taskCheckbox}
                            checked={isCompleted}
                            onChange={() => onToggleCompletion?.(task)}
                            aria-label={`تکمیل ${task.title}`}
                          />
                          <span className={styles.taskTitle}>
                            {task.repeatFlag && '🔁 '}
                            {task.reminders &&
                              task.reminders.length > 0 &&
                              '🔔 '}
                            {task.title}
                          </span>
                        </div>

                        <div className={styles.taskMetaRow}>
                          {task.isAllDay ? (
                            <span className={styles.allDayBadge}>تمام روز</span>
                          ) : timeStr ? (
                            <span className={styles.timeBadge}>{timeStr}</span>
                          ) : null}

                          {task.priority > 0 && (
                            <span className={styles.priorityBadge}>
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
