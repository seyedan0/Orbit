import type { TaskEntity } from '@orbit/shared-types';
import { useState, type FC } from 'react';
import {
  getMonthViewDays,
  groupDaysIntoWeekRows,
  isSingleDayTaskOnDate,
  isSameCalendarDay,
  type CalendarSettings,
  type CalendarType,
  type TaskRibbonSegment
} from '../calendar-utils';
import styles from './MonthView.module.css';

export interface MonthViewProps {
  currentDate: Date;
  calendarType: CalendarType;
  tasks: TaskEntity[];
  onToggleCompletion?: (task: TaskEntity) => void;
  onAddTask?: (date: Date, isoDate: string) => void;
  onRescheduleTask?: (taskId: string, targetDate: Date, targetIsoDate: string) => void;
  onShiftTaskSpan?: (taskId: string, targetStartDate: Date) => void;
  onResizeTaskSpan?: (taskId: string, edge: 'start' | 'end', targetDate: Date) => void;
  onSelectTask?: (task: TaskEntity) => void;
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  today?: Date;
  settings?: CalendarSettings;
}

export const MonthView: FC<MonthViewProps> = ({
  currentDate,
  calendarType,
  tasks,
  onToggleCompletion,
  onAddTask,
  onRescheduleTask,
  onShiftTaskSpan,
  onResizeTaskSpan,
  onSelectTask,
  selectedDate,
  onSelectDate,
  today = new Date(),
  settings
}) => {
  const [dragOverIsoDate, setDragOverIsoDate] = useState<string | null>(null);

  const { weekdayHeaders, days } = getMonthViewDays(
    currentDate,
    calendarType,
    today
  );

  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  const weekRows = groupDaysIntoWeekRows(days, tasks, calendarType, today);

  const showSecondary = settings?.showSecondaryCalendar ?? true;
  const showWeekNum = settings?.showWeekNumbers ?? true;
  const showCompleted = settings?.showCompletedTasks ?? true;

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

      {/* Week Rows Container with Multi-Day Snake Ribbons */}
      <div className={styles.monthWeeksContainer} role="grid" aria-label="روزهای ماه">
        {weekRows.map((row, rowIdx) => (
          <div key={`week-row-${rowIdx}`} className={styles.weekRow}>
            {/* 7 Days in Week Row */}
            <div className={styles.weekDaysRowGrid}>
              {row.days.map((item, colIdx) => {
                const dayTasks = tasks.filter((t) =>
                  isSingleDayTaskOnDate(t, item.date)
                );
                const filteredDayTasks = showCompleted
                  ? dayTasks
                  : dayTasks.filter((t) => t.completedAt == null);

                const isDragOver = dragOverIsoDate === item.isoDate;
                const isSelected = isSameCalendarDay(selectedDate, item.date);

                const isPast =
                  new Date(item.date).getTime() < todayMidnight.getTime();

                return (
                  <div
                    key={item.isoDate + colIdx}
                    className={`${styles.dayCell} ${
                      item.isToday ? styles.todayCell : ''
                    } ${!item.isCurrentMonth ? styles.otherMonthCell : ''} ${
                      isSelected ? styles.selectedCell : ''
                    } ${isDragOver ? styles.dayCellDragOver : ''} ${
                      isPast ? styles.dayCellPast : ''
                    }`}
                    role="gridcell"
                    aria-label={`${item.dayNumber} ${item.monthName}`}
                    aria-current={item.isToday ? 'date' : undefined}
                    data-testid={`month-day-cell-${item.dayNum}`}
                    onClick={() => onSelectDate?.(item.date)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverIsoDate !== item.isoDate) {
                        setDragOverIsoDate(item.isoDate);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node))
                        return;
                      setDragOverIsoDate(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverIsoDate(null);
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
                        } else if (parsedAction.action === 'RIBBON_RESIZE_START') {
                          if (onResizeTaskSpan) {
                            onResizeTaskSpan(taskId, 'start', item.date);
                          }
                        } else if (parsedAction.action === 'RIBBON_RESIZE_END') {
                          if (onResizeTaskSpan) {
                            onResizeTaskSpan(taskId, 'end', item.date);
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
                          } ${
                            !item.isCurrentMonth
                              ? styles.otherMonthNumber
                              : ''
                          } ${isSelected ? styles.selectedNumber : ''}`}
                          data-testid={`month-day-number-${item.dayNum}`}
                        >
                          {item.dayNumber}
                        </span>

                        {showSecondary && item.secondaryDayNumber && (
                          <span
                            className={styles.secondaryDateBadge}
                            title={`تاریخ ثانویه: ${item.secondaryDayNumber} ${item.secondaryMonthName ?? ''}`}
                          >
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
                        aria-label={`افزودن تسک در ${item.dayNumber} ${item.monthName}`}
                        data-testid={`add-task-btn-${item.dayNum}`}
                        title="افزودن تسک"
                      >
                        +
                      </button>
                    </div>

                    {/* Spacer reserving height for multi-day ribbons overlay */}
                    {row.maxSlots > 0 && (
                      <div
                        className={styles.ribbonsSpacer}
                        style={{ height: `${row.maxSlots * 24}px` }}
                        aria-hidden="true"
                      />
                    )}

                    {/* Single-Day Tasks List for Day */}
                    {filteredDayTasks.length > 0 && (
                      <div
                        className={styles.dayTasksList}
                        data-testid={`day-tasks-${item.dayNum}`}
                      >
                        {filteredDayTasks.map((task) => {
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
                                {task.repeatFlag && '🔁 '}
                                {task.reminders &&
                                  task.reminders.length > 0 &&
                                  '🔔 '}
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

            {/* Multi-Day Snake Ribbon Track Overlay */}
            {row.multiDaySegments.length > 0 && (
              <div
                className={styles.ribbonsTrack}
                style={{
                  gridTemplateRows: `repeat(${row.maxSlots}, 22px)`
                }}
                data-testid={`ribbon-track-week-${rowIdx}`}
              >
                {row.multiDaySegments.map((seg: TaskRibbonSegment) => {
                  const isTaskCompleted = seg.task.completedAt != null;
                  if (!showCompleted && isTaskCompleted) return null;

                  return (
                    <div
                      key={`ribbon-${seg.taskId}-${rowIdx}`}
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
                      } ${isTaskCompleted ? styles.taskCompleted : ''}`}
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
                      data-testid={`ribbon-segment-${seg.taskId}-${rowIdx}`}
                      title={`${seg.taskTitle} (${seg.task.startDate?.slice(0, 10)} - ${seg.task.dueDate?.slice(0, 10)})`}
                    >
                      {/* Left Resize Handle */}
                      <span
                        className={styles.ribbonResizeHandleLeft}
                        draggable={true}
                        data-testid={`ribbon-resize-start-${seg.taskId}`}
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

                      <span
                        className={styles.ribbonTitle}
                        data-testid={`ribbon-title-${seg.taskId}`}
                      >
                        {seg.taskTitle}
                      </span>

                      {!seg.isEndOfTask && (
                        <span className={styles.ribbonContinuationRight}>▸</span>
                      )}

                      {/* Right Resize Handle */}
                      <span
                        className={styles.ribbonResizeHandleRight}
                        draggable={true}
                        data-testid={`ribbon-resize-end-${seg.taskId}`}
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
