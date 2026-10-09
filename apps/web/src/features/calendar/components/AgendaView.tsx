import type { TaskEntity } from '@orbit/shared-types';
import type { FC } from 'react';
import {
  getAgendaDayGroups,
  type CalendarType
} from '../calendar-utils';
import { toPersianDigits } from '../../../core/calendar/jalali';
import styles from './AgendaView.module.css';

export interface AgendaViewProps {
  currentDate: Date;
  calendarType: CalendarType;
  tasks: TaskEntity[];
  onToggleCompletion?: (task: TaskEntity) => void;
  onAddTask?: (date: Date, isoDate: string) => void;
  today?: Date;
  daysCount?: number;
}

export const AgendaView: FC<AgendaViewProps> = ({
  currentDate,
  calendarType,
  tasks,
  onToggleCompletion,
  onAddTask,
  today = new Date(),
  daysCount = 14
}) => {
  const groups = getAgendaDayGroups(
    tasks,
    currentDate,
    daysCount,
    calendarType,
    today
  );

  const totalTasksCount = groups.reduce(
    (acc, group) => acc + group.tasks.length,
    0
  );

  const formatTaskTime = (task: TaskEntity): string | null => {
    if (task.isAllDay) return null;
    if (!task.dueDate) return null;
    const d = new Date(task.dueDate);
    if (isNaN(d.getTime())) return null;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const str = `${hh}:${mm}`;
    return calendarType === 'jalali' ? toPersianDigits(str) : str;
  };

  return (
    <div
      className={styles.agendaViewContainer}
      role="region"
      aria-label="نمای دستورکار تقویم"
      data-testid="agenda-view"
    >
      {totalTasksCount === 0 && (
        <div
          className={styles.emptyAgendaState}
          data-testid="agenda-empty-state"
        >
          هیچ تسکی برای این بازه زمانی برنامه‌ریزی نشده است.
        </div>
      )}

      {groups.map((group, idx) => (
        <div
          key={group.isoDate}
          className={`${styles.daySectionCard} ${
            group.isToday ? styles.todaySectionCard : ''
          }`}
          data-testid={`agenda-day-group-${idx}`}
        >
          <div className={styles.dayHeader}>
            <div className={styles.dayTitleGroup}>
              <span
                className={styles.weekdayName}
                data-testid={`agenda-weekday-${idx}`}
              >
                {group.weekdayName}
              </span>
              <span
                className={styles.dateLabel}
                data-testid={`agenda-datelabel-${idx}`}
              >
                {group.dayLabel}
              </span>
              {group.isToday && (
                <span
                  className={styles.todayBadge}
                  data-testid="agenda-today-badge"
                >
                  امروز
                </span>
              )}
            </div>

            <button
              type="button"
              className={styles.addTaskBtn}
              onClick={() => onAddTask?.(group.date, group.isoDate)}
              aria-label={`افزودن تسک در ${group.weekdayName}`}
              data-testid={`agenda-add-task-${idx}`}
            >
              + افزودن تسک
            </button>
          </div>

          <div
            className={styles.taskList}
            data-testid={`agenda-tasklist-${idx}`}
          >
            {group.tasks.length === 0 ? (
              <div
                className={styles.emptyDayMsg}
                data-testid={`agenda-empty-day-${idx}`}
              >
                بدون تسک
              </div>
            ) : (
              group.tasks.map((task) => {
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
                    data-testid={`agenda-task-${task.id}`}
                  >
                    <div className={styles.taskLeftCol}>
                      <input
                        type="checkbox"
                        className={styles.taskCheckbox}
                        checked={isCompleted}
                        onChange={() => onToggleCompletion?.(task)}
                        aria-label={`تکمیل ${task.title}`}
                        data-testid={`agenda-task-checkbox-${task.id}`}
                      />
                      <span
                        className={styles.taskTitle}
                        data-testid={`agenda-task-title-${task.id}`}
                      >
                        {task.repeatFlag && '🔁 '}
                        {task.reminders && task.reminders.length > 0 && '🔔 '}
                        {task.title}
                      </span>
                    </div>

                    <div className={styles.taskRightCol}>
                      {task.isAllDay ? (
                        <span
                          className={styles.allDayTag}
                          data-testid={`agenda-task-allday-${task.id}`}
                        >
                          تمام روز
                        </span>
                      ) : timeStr ? (
                        <span
                          className={styles.timeTag}
                          data-testid={`agenda-task-time-${task.id}`}
                        >
                          {timeStr}
                        </span>
                      ) : null}

                      {task.priority > 0 && (
                        <span
                          className={styles.priorityBadge}
                          data-testid={`agenda-task-priority-${task.id}`}
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
      ))}
    </div>
  );
};
