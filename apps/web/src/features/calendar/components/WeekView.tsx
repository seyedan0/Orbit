import type { TaskEntity } from '@orbit/shared-types';
import type { FC } from 'react';
import {
  getWeekViewDays,
  isTaskOnDate,
  type CalendarType
} from '../calendar-utils';
import { toPersianDigits } from '../../../core/calendar/jalali';
import styles from './WeekView.module.css';

export interface WeekViewProps {
  currentDate: Date;
  calendarType: CalendarType;
  tasks: TaskEntity[];
  onToggleCompletion?: (task: TaskEntity) => void;
  onAddTask?: (date: Date, isoDate: string) => void;
  today?: Date;
}

export const WeekView: FC<WeekViewProps> = ({
  currentDate,
  calendarType,
  tasks,
  onToggleCompletion,
  onAddTask,
  today = new Date()
}) => {
  const weekDays = getWeekViewDays(currentDate, calendarType, today);

  const formatTaskTime = (task: TaskEntity): string | null => {
    if (task.isAllDay) return null;
    if (!task.dueDate) return null;
    const date = new Date(task.dueDate);
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
      <div className={styles.weekColumnsGrid}>
        {weekDays.map((col, idx) => {
          const colTasks = tasks.filter((t) => isTaskOnDate(t, col.date));

          return (
            <div
              key={col.isoDate}
              className={`${styles.dayColumn} ${col.isToday ? styles.todayColumn : ''}`}
              aria-label={`${col.weekdayName} ${col.dateLabel}`}
              aria-current={col.isToday ? 'date' : undefined}
              data-testid={`week-column-${idx}`}
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
                <span
                  className={styles.dateBadge}
                  data-testid={`week-date-badge-${idx}`}
                >
                  {col.dateLabel}
                </span>
              </div>

              {/* Column Tasks */}
              <div
                className={styles.columnTasksList}
                data-testid={`week-column-tasks-${idx}`}
              >
                {colTasks.length === 0 ? (
                  <div className={styles.emptyColumnMsg}>بدون تسک</div>
                ) : (
                  colTasks.map((task) => {
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
