import type { TaskEntity } from '@orbit/shared-types';
import { useState, type FC } from 'react';
import {
  getMonthViewDays,
  isTaskOnDate,
  type CalendarType
} from '../calendar-utils';
import styles from './MonthView.module.css';

export interface MonthViewProps {
  currentDate: Date;
  calendarType: CalendarType;
  tasks: TaskEntity[];
  onToggleCompletion?: (task: TaskEntity) => void;
  onAddTask?: (date: Date, isoDate: string) => void;
  onRescheduleTask?: (taskId: string, targetDate: Date, targetIsoDate: string) => void;
  today?: Date;
}

export const MonthView: FC<MonthViewProps> = ({
  currentDate,
  calendarType,
  tasks,
  onToggleCompletion,
  onAddTask,
  onRescheduleTask,
  today = new Date()
}) => {
  const [dragOverIsoDate, setDragOverIsoDate] = useState<string | null>(null);

  const { weekdayHeaders, days } = getMonthViewDays(
    currentDate,
    calendarType,
    today
  );

  return (
    <div
      className={styles.monthViewContainer}
      role="region"
      aria-label="نمای ماهانه تقویم"
      data-testid="month-view"
    >
      {/* Weekday Headers */}
      <div className={styles.weekdayHeaderGrid} aria-hidden="true">
        {weekdayHeaders.map((header, idx) => (
          <div
            key={idx}
            className={styles.weekdayHeader}
            data-testid={`weekday-header-${idx}`}
          >
            {header}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className={styles.daysGrid} role="grid" aria-label="روزهای ماه">
        {days.map((item, index) => {
          if (!item) {
            return (
              <div
                key={`empty-${index}`}
                className={styles.emptyCell}
                aria-hidden="true"
              />
            );
          }

          const dayTasks = tasks.filter((t) => isTaskOnDate(t, item.date));
          const isDragOver = dragOverIsoDate === item.isoDate;

          return (
            <div
              key={item.isoDate}
              className={`${styles.dayCell} ${item.isToday ? styles.todayCell : ''} ${
                isDragOver ? styles.dayCellDragOver : ''
              }`}
              role="gridcell"
              aria-label={`${item.dayNumber} ${item.monthName}`}
              aria-current={item.isToday ? 'date' : undefined}
              data-testid={`month-day-cell-${item.dayNum}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIsoDate !== item.isoDate) {
                  setDragOverIsoDate(item.isoDate);
                }
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverIsoDate(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverIsoDate(null);
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId) {
                  onRescheduleTask?.(taskId, item.date, item.isoDate);
                }
              }}
            >
              <div className={styles.dayCellHeader}>
                <span
                  className={`${styles.dayNumber} ${item.isToday ? styles.todayNumber : ''}`}
                  data-testid={`month-day-number-${item.dayNum}`}
                >
                  {item.dayNumber}
                </span>

                <button
                  type="button"
                  className={styles.addTaskBtn}
                  onClick={() => onAddTask?.(item.date, item.isoDate)}
                  aria-label={`افزودن تسک در ${item.dayNumber} ${item.monthName}`}
                  data-testid={`add-task-btn-${item.dayNum}`}
                  title="افزودن تسک"
                >
                  +
                </button>
              </div>

              {/* Tasks List for Day */}
              {dayTasks.length > 0 && (
                <div
                  className={styles.dayTasksList}
                  data-testid={`day-tasks-${item.dayNum}`}
                >
                  {dayTasks.map((task) => {
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
                        className={`${styles.taskItemCard} ${
                          isCompleted ? styles.taskCompleted : ''
                        } ${priorityClass}`}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id);
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({ taskId: task.id })
                          );
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        data-testid={`calendar-task-${task.id}`}
                      >
                        <input
                          type="checkbox"
                          className={styles.taskCheckbox}
                          checked={isCompleted}
                          onChange={() => onToggleCompletion?.(task)}
                          aria-label={`تکمیل ${task.title}`}
                          data-testid={`calendar-task-checkbox-${task.id}`}
                        />
                        <span
                          className={styles.taskTitle}
                          title={task.title}
                          data-testid={`calendar-task-title-${task.id}`}
                        >
                          {task.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
