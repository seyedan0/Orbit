import type { TaskEntity } from '@orbit/shared-types';
import type { FC } from 'react';
import {
  getDayHourSlots,
  getTaskHour,
  isTaskOnDate,
  type CalendarType
} from '../calendar-utils';
import { toPersianDigits, jalaliToIso, dateToJalali } from '../../../core/calendar/jalali';
import styles from './DayView.module.css';

export interface DayViewProps {
  currentDate: Date;
  calendarType: CalendarType;
  tasks: TaskEntity[];
  onToggleCompletion?: (task: TaskEntity) => void;
  onAddTask?: (date: Date, isoDate: string, hour?: number) => void;
  today?: Date;
}

export const DayView: FC<DayViewProps> = ({
  currentDate,
  calendarType,
  tasks,
  onToggleCompletion,
  onAddTask,
  today = new Date()
}) => {
  const isToday =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getDate() === today.getDate();

  const slots = getDayHourSlots(calendarType);

  // Filter tasks belonging to current day
  const dayTasks = tasks.filter((t) => isTaskOnDate(t, currentDate));
  const allDayTasks = dayTasks.filter((t) => t.isAllDay === true);
  const timedTasks = dayTasks.filter((t) => !t.isAllDay);

  // Current time position percentage (minutes from 00:00 out of 1440)
  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  const currentTimePercent = Math.min(
    Math.max((currentMinutes / 1440) * 100, 0),
    100
  );

  const getSlotIsoDate = (hour: number): string => {
    if (calendarType === 'jalali') {
      const jd = dateToJalali(currentDate);
      return jalaliToIso(jd.year, jd.month, jd.day, hour, 0, false);
    }
    const d = new Date(currentDate);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const formatTaskTime = (task: TaskEntity): string => {
    if (!task.dueDate) return '';
    const d = new Date(task.dueDate);
    if (isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const str = `${hh}:${mm}`;
    return calendarType === 'jalali' ? toPersianDigits(str) : str;
  };

  return (
    <div
      className={styles.dayViewContainer}
      role="region"
      aria-label="نمای روزانه تقویم"
      data-testid="day-view"
    >
      {/* Pinned All-Day Section */}
      <div className={styles.allDaySection} data-testid="day-allday-section">
        <div className={styles.allDayHeader}>
          <span className={styles.allDayTitle}>
            <span>تمام روز</span>
            <span className={styles.allDayBadge}>
              {calendarType === 'jalali'
                ? toPersianDigits(allDayTasks.length)
                : allDayTasks.length}
            </span>
          </span>
          <button
            type="button"
            className={styles.quickAddBtn}
            style={{ position: 'static', opacity: 1 }}
            onClick={() => {
              const iso = getSlotIsoDate(12);
              onAddTask?.(currentDate, iso, undefined);
            }}
            aria-label="افزودن تسک تمام‌روز"
            data-testid="add-allday-task-btn"
          >
            + افزودن تمام‌روز
          </button>
        </div>

        {allDayTasks.length > 0 && (
          <div className={styles.allDayTasksList} data-testid="allday-tasks-list">
            {allDayTasks.map((task) => {
              const isCompleted = task.completedAt != null;
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
                  className={`${styles.allDayCard} ${
                    isCompleted ? styles.taskCompleted : ''
                  } ${priorityClass}`}
                  data-testid={`day-task-${task.id}`}
                >
                  <input
                    type="checkbox"
                    className={styles.taskCheckbox}
                    checked={isCompleted}
                    onChange={() => onToggleCompletion?.(task)}
                    aria-label={`تکمیل ${task.title}`}
                    data-testid={`day-task-checkbox-${task.id}`}
                  />
                  <span
                    className={styles.taskTitle}
                    data-testid={`day-task-title-${task.id}`}
                  >
                    {task.title}
                  </span>
                  {task.priority > 0 && (
                    <span
                      className={styles.priorityBadge}
                      data-testid={`day-task-priority-${task.id}`}
                    >
                      P{task.priority}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hourly Timeline */}
      <div className={styles.timelineWrapper} data-testid="timeline-wrapper">
        {/* Current Time Indicator Red Line */}
        {isToday && (
          <div
            className={styles.currentTimeIndicator}
            style={{ top: `${currentTimePercent}%` }}
            role="status"
            aria-label="زمان کنونی"
            data-testid="current-time-indicator"
          >
            <div className={styles.currentTimeDot} />
            <span className={styles.currentTimeLabel}>
              {calendarType === 'jalali' ? 'هم‌اکنون' : 'Now'}
            </span>
          </div>
        )}

        {/* 24 Hour Slots */}
        {slots.map((slot) => {
          const slotTasks = timedTasks.filter(
            (t) => getTaskHour(t) === slot.hour
          );

          return (
            <div
              key={slot.hour}
              className={styles.hourSlotRow}
              data-testid={`hour-slot-${slot.hour}`}
            >
              <div className={styles.timeCol} data-testid={`time-label-${slot.hour}`}>
                {slot.label}
              </div>

              <div
                className={styles.slotTrack}
                onClick={() => {
                  const slotIso = getSlotIsoDate(slot.hour);
                  onAddTask?.(currentDate, slotIso, slot.hour);
                }}
                data-testid={`slot-track-${slot.hour}`}
              >
                {slotTasks.map((task) => {
                  const isCompleted = task.completedAt != null;
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
                      className={`${styles.timedTaskCard} ${
                        isCompleted ? styles.taskCompleted : ''
                      } ${priorityClass}`}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`day-task-${task.id}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.taskCheckbox}
                        checked={isCompleted}
                        onChange={() => onToggleCompletion?.(task)}
                        aria-label={`تکمیل ${task.title}`}
                        data-testid={`day-task-checkbox-${task.id}`}
                      />
                      <span
                        className={styles.taskTitle}
                        data-testid={`day-task-title-${task.id}`}
                      >
                        {task.title}
                      </span>
                      <span
                        className={styles.timeTag}
                        data-testid={`day-task-time-${task.id}`}
                      >
                        {formatTaskTime(task)}
                      </span>
                      {task.priority > 0 && (
                        <span
                          className={styles.priorityBadge}
                          data-testid={`day-task-priority-${task.id}`}
                        >
                          P{task.priority}
                        </span>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  className={styles.quickAddBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    const slotIso = getSlotIsoDate(slot.hour);
                    onAddTask?.(currentDate, slotIso, slot.hour);
                  }}
                  aria-label={`افزودن تسک در ساعت ${slot.label}`}
                  data-testid={`slot-add-btn-${slot.hour}`}
                  title="افزودن تسک در این ساعت"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
