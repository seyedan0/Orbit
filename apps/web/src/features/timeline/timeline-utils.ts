import type { TaskEntity } from '@orbit/shared-types';
import { dateToJalali, formatJalaliDate } from '../../core/calendar/jalali';
import { getLocalDateKey } from '../tasks/services/task-service';

export type TimelineViewMode = 'DAY' | 'WEEK' | 'MONTH';

export interface TimelineDayColumn {
  date: Date;
  key: string;
  jalaliLabel: string;
  weekdayLabel: string;
  isToday: boolean;
  isWeekend: boolean;
}

export interface TimelineWindow {
  startDate: Date;
  endDate: Date;
  days: TimelineDayColumn[];
  viewMode: TimelineViewMode;
}

export interface TaskTimelineBar {
  leftPct: number;
  widthPct: number;
  isOverdue: boolean;
  hasStartAndEnd: boolean;
  isVisible: boolean;
}

/**
 * Calculates a timeline date window (days) relative to reference date.
 */
export function getTimelineDateWindow(
  referenceDate: Date = new Date(),
  viewMode: TimelineViewMode = 'WEEK',
  timeZone?: string
): TimelineWindow {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  let numDays = 7;
  let startOffset = 0;

  if (viewMode === 'DAY') {
    numDays = 3;
    startOffset = -1; // yesterday, today, tomorrow
  } else if (viewMode === 'WEEK') {
    numDays = 7;
    // Align with Saturday as start of week for Persian calendar (JS getDay(): 0=Sun, 6=Sat)
    const dayOfWeek = ref.getDay();
    const satOffset = (dayOfWeek + 1) % 7;
    startOffset = -satOffset;
  } else if (viewMode === 'MONTH') {
    numDays = 30;
    startOffset = 0;
  }

  const startDate = new Date(ref);
  startDate.setDate(startDate.getDate() + startOffset);

  const todayKey = getLocalDateKey(new Date(), timeZone);
  const days: TimelineDayColumn[] = [];

  for (let i = 0; i < numDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);

    const key = getLocalDateKey(d, timeZone);
    const jDate = dateToJalali(d);
    const formatted = formatJalaliDate(jDate, { format: 'short' });
    const monthName = formatted.split(' ')[1] || '';
    const weekday = d.getDay(); // 5 = Friday

    days.push({
      date: d,
      key,
      jalaliLabel: `${jDate.day} ${monthName}`.trim(),
      weekdayLabel: d.toLocaleDateString('fa-IR', { weekday: 'short' }),
      isToday: key === todayKey,
      isWeekend: weekday === 5
    });
  }

  const lastDay = days[days.length - 1]!;
  const endDate = new Date(lastDay.date);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate,
    endDate,
    days,
    viewMode
  };
}

/**
 * Calculates horizontal bar placement percentages for a task within the timeline window.
 */
export function calculateTaskTimelineBar(
  task: TaskEntity,
  windowStart: Date,
  windowEnd: Date,
  now: Date = new Date()
): TaskTimelineBar {
  const winStartMs = windowStart.getTime();
  const winEndMs = windowEnd.getTime();
  const totalDurationMs = winEndMs - winStartMs;

  if (totalDurationMs <= 0) {
    return {
      leftPct: 0,
      widthPct: 0,
      isOverdue: false,
      hasStartAndEnd: false,
      isVisible: false
    };
  }

  let taskStartMs: number | null = task.startDate ? new Date(task.startDate).getTime() : null;
  let taskEndMs: number | null = task.dueDate ? new Date(task.dueDate).getTime() : null;

  if (taskStartMs !== null && isNaN(taskStartMs)) taskStartMs = null;
  if (taskEndMs !== null && isNaN(taskEndMs)) taskEndMs = null;

  const hasStartAndEnd = taskStartMs !== null && taskEndMs !== null;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  if (taskStartMs === null && taskEndMs !== null) {
    taskStartMs = taskEndMs - ONE_DAY_MS;
  } else if (taskStartMs !== null && taskEndMs === null) {
    taskEndMs = task.duration ? taskStartMs + task.duration * 60 * 1000 : taskStartMs + ONE_DAY_MS;
  } else if (taskStartMs === null && taskEndMs === null) {
    return {
      leftPct: 0,
      widthPct: 0,
      isOverdue: false,
      hasStartAndEnd: false,
      isVisible: false
    };
  }

  if (taskEndMs! < taskStartMs!) {
    taskEndMs = taskStartMs! + ONE_DAY_MS;
  }

  const isOverdue = taskEndMs! < now.getTime() && task.completedAt == null;

  if (taskEndMs! < winStartMs || taskStartMs! > winEndMs) {
    return {
      leftPct: 0,
      widthPct: 0,
      isOverdue,
      hasStartAndEnd,
      isVisible: false
    };
  }

  const clampedStartMs = Math.max(winStartMs, taskStartMs!);
  const clampedEndMs = Math.min(winEndMs, taskEndMs!);

  const leftOffsetMs = clampedStartMs - winStartMs;
  const barDurationMs = Math.max(clampedEndMs - clampedStartMs, ONE_DAY_MS * 0.25);

  let leftPct = (leftOffsetMs / totalDurationMs) * 100;
  let widthPct = (barDurationMs / totalDurationMs) * 100;

  leftPct = Math.max(0, Math.min(100, leftPct));
  widthPct = Math.max(2, Math.min(100 - leftPct, widthPct));

  return {
    leftPct: Number(leftPct.toFixed(2)),
    widthPct: Number(widthPct.toFixed(2)),
    isOverdue,
    hasStartAndEnd,
    isVisible: true
  };
}

/**
 * Prepares reschedule update payload when moving or resizing a task bar horizontally.
 */
export function rescheduleTimelineTask(
  task: TaskEntity,
  newStartIso: string | null,
  newDueIso: string | null
): Partial<TaskEntity> {
  const updates: Partial<TaskEntity> = {
    startDate: newStartIso,
    dueDate: newDueIso
  };

  if (newStartIso && newDueIso) {
    const s = new Date(newStartIso).getTime();
    const d = new Date(newDueIso).getTime();
    if (d >= s) {
      updates.duration = Math.round((d - s) / (60 * 1000));
    }
  }

  return updates;
}
