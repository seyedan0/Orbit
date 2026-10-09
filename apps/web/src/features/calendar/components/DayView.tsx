import type { TaskEntity } from '@orbit/shared-types';
import { useState, type FC } from 'react';
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
  onRescheduleTaskHour?: (taskId: string, hour: number, isAllDay?: boolean) => void;
  onResizeTaskDuration?: (taskId: string, newDurationMinutes: number) => void;
  today?: Date;
}

export const DayView: FC<DayViewProps> = ({
  currentDate,
  calendarType,
  tasks,
  onToggleCompletion,
  onAddTask,
  onRescheduleTaskHour,
  onResizeTaskDuration,
  today = new Date()
}) => {
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [isAllDayDragOver, setIsAllDayDragOver] = useState(false);
  const [resizingTask, setResizingTask] = useState<{ id: string; duration: number } | null>(null);

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

  const handleResizeMouseDown = (e: React.MouseEvent, task: TaskEntity) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const initialDuration = task.duration ?? 60;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const deltaY = moveEvt.clientY - startY;
      const deltaSteps = Math.round(deltaY / 14);
      const newDuration = Math.max(15, initialDuration + deltaSteps * 15);
      setResizingTask({ id: task.id, duration: newDuration });
    };

    const onMouseUp = (upEvt: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      const deltaY = upEvt.clientY - startY;
      const deltaSteps = Math.round(deltaY / 14);
      const finalDuration = Math.max(15, initialDuration + deltaSteps * 15);
      setResizingTask(null);
      if (finalDuration !== initialDuration) {
        onResizeTaskDuration?.(task.id, finalDuration);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      className={styles.dayViewContainer}
      role="region"
      aria-label="نمای روزانه تقویم"
      data-testid="day-view"
    >
      {/* Pinned All-Day Section */}
      <div
        className={`${styles.allDaySection} ${
          isAllDayDragOver ? styles.allDaySectionDragOver : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setIsAllDayDragOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsAllDayDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsAllDayDragOver(false);
          const taskId = e.dataTransfer.getData('text/plain');
          if (taskId) {
            onRescheduleTaskHour?.(taskId, 0, true);
          }
        }}
        data-testid="day-allday-section"
      >
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
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', task.id);
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({ taskId: task.id, isAllDay: true })
                    );
                    e.dataTransfer.effectAllowed = 'move';
                  }}
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
                    {task.repeatFlag && '🔁 '}
                    {task.reminders && task.reminders.length > 0 && '🔔 '}
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
          const isSlotDragOver = dragOverHour === slot.hour;

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
                className={`${styles.slotTrack} ${
                  isSlotDragOver ? styles.slotTrackDragOver : ''
                }`}
                onClick={() => {
                  const slotIso = getSlotIsoDate(slot.hour);
                  onAddTask?.(currentDate, slotIso, slot.hour);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverHour !== slot.hour) {
                    setDragOverHour(slot.hour);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDragOverHour(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverHour(null);
                  const taskId = e.dataTransfer.getData('text/plain');
                  if (taskId) {
                    onRescheduleTaskHour?.(taskId, slot.hour, false);
                  }
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

                  const effectiveDuration =
                    task.id === resizingTask?.id
                      ? resizingTask.duration
                      : (task.duration ?? 60);

                  const cardMinHeight = Math.max(
                    42,
                    Math.round((effectiveDuration / 60) * 56)
                  );

                  return (
                    <div
                      key={task.id}
                      className={`${styles.timedTaskCard} ${
                        isCompleted ? styles.taskCompleted : ''
                      } ${priorityClass}`}
                      style={{ minHeight: `${cardMinHeight}px` }}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', task.id);
                        e.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({
                            taskId: task.id,
                            isAllDay: false,
                            hour: slot.hour
                          })
                        );
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`day-task-${task.id}`}
                    >
                      <div className={styles.timedCardContent}>
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
                          {task.repeatFlag && '🔁 '}
                          {task.reminders && task.reminders.length > 0 && '🔔 '}
                          {task.title}
                        </span>
                        <span
                          className={styles.timeTag}
                          data-testid={`day-task-time-${task.id}`}
                        >
                          {formatTaskTime(task)}
                        </span>
                        <span
                          className={styles.durationBadge}
                          data-testid={`day-task-duration-${task.id}`}
                        >
                          {calendarType === 'jalali'
                            ? `${toPersianDigits(effectiveDuration)} دقیقه`
                            : `${effectiveDuration}m`}
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

                      {/* Bottom Resize Handle */}
                      <div
                        className={styles.resizeHandle}
                        onMouseDown={(e) => handleResizeMouseDown(e, task)}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextDuration =
                            effectiveDuration >= 120 ? 30 : effectiveDuration + 15;
                          onResizeTaskDuration?.(task.id, nextDuration);
                        }}
                        role="separator"
                        aria-label={`تغییر مدت‌زمان تسک ${task.title}`}
                        aria-valuenow={effectiveDuration}
                        data-testid={`resize-handle-${task.id}`}
                        title="تغییر مدت‌زمان (بکشید یا کلیک کنید)"
                      />
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
