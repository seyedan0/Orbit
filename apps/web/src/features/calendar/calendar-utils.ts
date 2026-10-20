import type { TaskEntity } from '@orbit/shared-types';
import {
  GREGORIAN_MONTH_NAMES,
  GREGORIAN_WEEKDAY_NAMES,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAY_NAMES,
  dateToJalali,
  formatJalaliDate,
  getJalaliMonthLength,
  getPersianWeekday,
  jalaliToDate,
  toPersianDigits
} from '../../core/calendar/jalali';
import { getLocalDateKey } from '../tasks/services/task-service';

export type CalendarType = 'jalali' | 'gregorian';
export type CalendarViewMode =
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'agenda'
  | 'multi-day'
  | 'multi-week';

export interface CalendarSettings {
  weekStartDay: 0 | 1 | 6; // 6 = Saturday (fa-IR default), 0 = Sunday, 1 = Monday
  showWeekNumbers: boolean;
  showCompletedTasks: boolean;
  showSecondaryCalendar: boolean;
}

export interface CalendarDayItem {
  date: Date;
  isoDate: string;
  dayNumber: string;
  dayNum: number;
  monthName: string;
  isToday: boolean;
  isCurrentMonth?: boolean | undefined;
  weekNumberLabel?: string | undefined;
  secondaryDayNumber?: string | undefined;
  secondaryMonthName?: string | undefined;
}

export interface TaskRibbonSegment {
  taskId: string;
  taskTitle: string;
  color: string;
  startColIndex: number; // 0..6
  endColIndex: number; // 0..6
  colSpan: number; // endColIndex - startColIndex + 1
  slotIndex: number; // vertical lane index (0, 1, 2...)
  isStartOfTask: boolean; // rounded start vs flat continuation
  isEndOfTask: boolean; // rounded end vs flat continuation
  isPast: boolean;
  task: TaskEntity;
}

export interface CalendarWeekRow {
  weekNumber: number;
  days: CalendarDayItem[];
  multiDaySegments: TaskRibbonSegment[];
  maxSlots: number;
}

export interface YearMonthDayCell {
  date: Date;
  isoDate: string;
  dayNum: number;
  dayNumber: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  taskCount: number;
  heatmapLevel: 0 | 1 | 2 | 3;
}

export interface YearMonthItem {
  monthIndex: number;
  monthName: string;
  year: number;
  yearLabel: string;
  weeks: Array<{
    weekNumber: number;
    days: YearMonthDayCell[];
  }>;
}

export interface TimeBlockTaskLayout {
  task: TaskEntity;
  startMinutes: number;
  durationMinutes: number;
  endMinutes: number;
  topPercent: number;
  heightPercent: number;
  colIndex: number;
  totalCols: number;
  timeRangeLabel: string;
  isPast: boolean;
  color: string;
}

export interface WeekDayItem extends CalendarDayItem {
  weekdayName: string;
  dateLabel: string;
  secondaryDateLabel?: string;
}

export interface HourSlot {
  hour: number;
  label: string;
}

export interface AgendaDayGroup {
  date: Date;
  isoDate: string;
  dayLabel: string;
  weekdayName: string;
  isToday: boolean;
  tasks: TaskEntity[];
}

/**
 * Returns formatted month and year label according to calendar type (e.g. «مهر ۱۴۰۵» or "October 2026").
 */
export function getCalendarMonthTitle(date: Date, type: CalendarType): string {
  if (type === 'jalali') {
    const j = dateToJalali(date);
    return `${PERSIAN_MONTH_NAMES[j.month - 1]} ${toPersianDigits(j.year)}`;
  }
  return `${GREGORIAN_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Returns formatted full day label according to calendar type (e.g. «دوشنبه، ۱۳ مهر ۱۴۰۵» or "Monday, October 5, 2026").
 */
export function getCalendarDayTitle(date: Date, type: CalendarType): string {
  if (type === 'jalali') {
    const j = dateToJalali(date);
    return formatJalaliDate(j, { format: 'full' });
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Navigates by month forward or backward for Jalali or Gregorian calendar systems.
 */
export function navigateMonth(
  currentDate: Date,
  direction: 1 | -1,
  type: CalendarType
): Date {
  if (type === 'jalali') {
    const j = dateToJalali(currentDate);
    let newYear = j.year;
    let newMonth = j.month + direction;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    return jalaliToDate(newYear, newMonth, 1, 12, 0, 0);
  }
  return new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + direction,
    1,
    12,
    0,
    0
  );
}

/**
 * Navigates by week (7 days) forward or backward.
 */
export function navigateWeek(currentDate: Date, direction: 1 | -1): Date {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + direction * 7);
  return next;
}

/**
 * Navigates by a single day forward or backward.
 */
export function navigateDay(currentDate: Date, direction: 1 | -1): Date {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + direction);
  return next;
}

/**
 * Navigates agenda view forward or backward by 14 days.
 */
export function navigateAgenda(currentDate: Date, direction: 1 | -1): Date {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + direction * 14);
  return next;
}

/**
 * Checks whether an active, non-deleted task is scheduled on a given target calendar date.
 */
export function isTaskOnDate(task: TaskEntity, targetDate: Date): boolean {
  if (task.deletedAt != null) return false;
  const scheduledIso = task.dueDate || task.startDate;
  if (!scheduledIso) return false;
  const taskDate = new Date(scheduledIso);
  if (isNaN(taskDate.getTime())) return false;

  // Direct date prefix match (e.g. '2026-10-05')
  const isoDatePrefix = scheduledIso.slice(0, 10);
  const targetKey = getLocalDateKey(targetDate);
  if (isoDatePrefix === targetKey) return true;

  // Timezone-aware comparison
  const targetTz = task.timeZone;
  if (
    getLocalDateKey(taskDate, targetTz) ===
    getLocalDateKey(targetDate, targetTz)
  ) {
    return true;
  }

  return getLocalDateKey(taskDate) === getLocalDateKey(targetDate);
}

/**
 * Extracts hour (0..23) from a task's scheduled time, or null if all-day or unscheduled.
 */
export function getTaskHour(task: TaskEntity): number | null {
  if (task.isAllDay) return null;
  const iso = task.dueDate || task.startDate;
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.getHours();
}

/**
 * Takes an original ISO timestamp and shifts its calendar date to targetDate,
 * preserving existing hours, minutes, seconds, and milliseconds.
 */
export function rescheduleDatePreservingTime(
  originalIso: string | null | undefined,
  targetDate: Date
): string {
  const target = new Date(targetDate);
  if (!originalIso) {
    target.setHours(0, 0, 0, 0);
    return target.toISOString();
  }
  const orig = new Date(originalIso);
  if (isNaN(orig.getTime())) {
    target.setHours(0, 0, 0, 0);
    return target.toISOString();
  }
  target.setHours(
    orig.getHours(),
    orig.getMinutes(),
    orig.getSeconds(),
    orig.getMilliseconds()
  );
  return target.toISOString();
}

/**
 * Computes startDate and dueDate for scheduling a task onto a target day and hour.
 */
export function rescheduleTaskToHour(
  targetDate: Date,
  hour: number,
  durationMinutes: number = 60
): { startDate: string; dueDate: string } {
  const start = new Date(targetDate);
  start.setHours(hour, 0, 0, 0);

  const durationMs = Math.max(15, durationMinutes) * 60 * 1000;
  const due = new Date(start.getTime() + durationMs);

  return {
    startDate: start.toISOString(),
    dueDate: due.toISOString()
  };
}

/**
 * Generates the 24 hourly slots (00:00 to 23:00) with localized digits.
 */
export function getDayHourSlots(type: CalendarType): HourSlot[] {
  const slots: HourSlot[] = [];
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, '0');
    const label = `${hh}:00`;
    slots.push({
      hour: h,
      label: type === 'jalali' ? toPersianDigits(label) : label
    });
  }
  return slots;
}

/**
 * Computes standard ISO week number for a Gregorian date (1..53).
 */
export function getIsoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Computes Jalali week of the year (1..53).
 */
export function getJalaliWeekNumber(date: Date): number {
  const j = dateToJalali(date);
  const dayOfYear = (j.month <= 6 ? (j.month - 1) * 31 : 186 + (j.month - 7) * 30) + j.day;
  return Math.ceil(dayOfYear / 7);
}

/**
 * Normalizes a date to UTC midnight ISO string (YYYY-MM-DDT00:00:00.000Z)
 * matching its local calendar date components.
 */
export function toDayUtcIso(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
  ).toISOString();
}

/**
 * Checks if two dates refer to the exact same local calendar day (Year, Month, Day).
 */
export function isSameCalendarDay(
  a: Date | null | undefined,
  b: Date | null | undefined
): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Computes all day cells and headers for Month view, including leading and trailing days and week numbers.
 */
export function getMonthViewDays(
  currentDate: Date,
  type: CalendarType,
  today: Date = new Date()
): {
  weekdayHeaders: readonly string[];
  days: CalendarDayItem[];
} {
  const todayJalali = dateToJalali(today);

  if (type === 'jalali') {
    const j = dateToJalali(currentDate);
    const daysInMonth = getJalaliMonthLength(j.year, j.month);
    const firstDay = jalaliToDate(j.year, j.month, 1, 12, 0, 0);
    const startWeekday = getPersianWeekday(firstDay); // 0 (Sat) to 6 (Fri)

    const days: CalendarDayItem[] = [];

    // Leading days from previous Jalali month
    if (startWeekday > 0) {
      let prevYear = j.year;
      let prevMonth = j.month - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevMonthLength = getJalaliMonthLength(prevYear, prevMonth);
      const startDay = prevMonthLength - startWeekday + 1;
      for (let d = startDay; d <= prevMonthLength; d++) {
        const date = jalaliToDate(prevYear, prevMonth, d, 12, 0, 0);
        const isoDate = toDayUtcIso(date);
        const isToday =
          todayJalali.year === prevYear &&
          todayJalali.month === prevMonth &&
          todayJalali.day === d;
        days.push({
          date,
          isoDate,
          dayNumber: toPersianDigits(d),
          dayNum: d,
          monthName: PERSIAN_MONTH_NAMES[prevMonth - 1] ?? '',
          secondaryDayNumber: String(date.getDate()),
          secondaryMonthName: GREGORIAN_MONTH_NAMES[date.getMonth()] ?? '',
          isToday,
          isCurrentMonth: false
        });
      }
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = jalaliToDate(j.year, j.month, d, 12, 0, 0);
      const isoDate = toDayUtcIso(date);
      const isToday =
        todayJalali.year === j.year &&
        todayJalali.month === j.month &&
        todayJalali.day === d;

      days.push({
        date,
        isoDate,
        dayNumber: toPersianDigits(d),
        dayNum: d,
        monthName: PERSIAN_MONTH_NAMES[j.month - 1] ?? '',
        secondaryDayNumber: String(date.getDate()),
        secondaryMonthName: GREGORIAN_MONTH_NAMES[date.getMonth()] ?? '',
        isToday,
        isCurrentMonth: true
      });
    }

    // Trailing days from next month to complete full grid (35 or 42 cells)
    const targetLength = days.length <= 35 ? 35 : 42;
    const trailingCount = targetLength - days.length;
    if (trailingCount > 0) {
      let nextYear = j.year;
      let nextMonth = j.month + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      for (let d = 1; d <= trailingCount; d++) {
        const date = jalaliToDate(nextYear, nextMonth, d, 12, 0, 0);
        const isoDate = toDayUtcIso(date);
        const isToday =
          todayJalali.year === nextYear &&
          todayJalali.month === nextMonth &&
          todayJalali.day === d;

        days.push({
          date,
          isoDate,
          dayNumber: toPersianDigits(d),
          dayNum: d,
          monthName: PERSIAN_MONTH_NAMES[nextMonth - 1] ?? '',
          secondaryDayNumber: String(date.getDate()),
          secondaryMonthName: GREGORIAN_MONTH_NAMES[date.getMonth()] ?? '',
          isToday,
          isCurrentMonth: false
        });
      }
    }

    // Add week number label to first day of each week row (index 0, 7, 14, 21, 28, 35)
    for (let i = 0; i < days.length; i += 7) {
      const item = days[i];
      if (item) {
        const wn = getJalaliWeekNumber(item.date);
        item.weekNumberLabel = `W${toPersianDigits(wn)}`;
      }
    }

    return {
      weekdayHeaders: PERSIAN_WEEKDAY_NAMES,
      days
    };
  }

  // Gregorian
  const gYear = currentDate.getFullYear();
  const gMonth = currentDate.getMonth() + 1;
  const daysInMonth = new Date(gYear, gMonth, 0).getDate();
  const firstDay = new Date(gYear, gMonth - 1, 1, 12, 0, 0);
  const startWeekday = firstDay.getDay(); // 0 (Sun) to 6 (Sat)

  const days: CalendarDayItem[] = [];

  // Leading days from previous Gregorian month
  if (startWeekday > 0) {
    const prevMonthLastDate = new Date(gYear, gMonth - 1, 0);
    const prevMonthLength = prevMonthLastDate.getDate();
    const prevYear = prevMonthLastDate.getFullYear();
    const prevMonth = prevMonthLastDate.getMonth() + 1;
    const startDay = prevMonthLength - startWeekday + 1;
    for (let d = startDay; d <= prevMonthLength; d++) {
      const date = new Date(prevYear, prevMonth - 1, d, 12, 0, 0);
      const isoDate = new Date(Date.UTC(prevYear, prevMonth - 1, d, 0, 0, 0)).toISOString();
      const isToday =
        today.getFullYear() === prevYear &&
        today.getMonth() + 1 === prevMonth &&
        today.getDate() === d;
      const j = dateToJalali(date);
      days.push({
        date,
        isoDate,
        dayNumber: String(d),
        dayNum: d,
        monthName: GREGORIAN_MONTH_NAMES[prevMonth - 1] ?? '',
        secondaryDayNumber: toPersianDigits(j.day),
        secondaryMonthName: PERSIAN_MONTH_NAMES[j.month - 1] ?? '',
        isToday,
        isCurrentMonth: false
      });
    }
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(gYear, gMonth - 1, d, 12, 0, 0);
    const isoDate = new Date(
      Date.UTC(gYear, gMonth - 1, d, 0, 0, 0)
    ).toISOString();
    const isToday =
      today.getFullYear() === gYear &&
      today.getMonth() + 1 === gMonth &&
      today.getDate() === d;
    const j = dateToJalali(date);

    days.push({
      date,
      isoDate,
      dayNumber: String(d),
      dayNum: d,
      monthName: GREGORIAN_MONTH_NAMES[gMonth - 1] ?? '',
      secondaryDayNumber: toPersianDigits(j.day),
      secondaryMonthName: PERSIAN_MONTH_NAMES[j.month - 1] ?? '',
      isToday,
      isCurrentMonth: true
    });
  }

  // Trailing days from next Gregorian month
  const targetLength = days.length <= 35 ? 35 : 42;
  const trailingCount = targetLength - days.length;
  if (trailingCount > 0) {
    const nextDate = new Date(gYear, gMonth, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = nextDate.getMonth() + 1;
    for (let d = 1; d <= trailingCount; d++) {
      const date = new Date(nextYear, nextMonth - 1, d, 12, 0, 0);
      const isoDate = new Date(Date.UTC(nextYear, nextMonth - 1, d, 0, 0, 0)).toISOString();
      const isToday =
        today.getFullYear() === nextYear &&
        today.getMonth() + 1 === nextMonth &&
        today.getDate() === d;
      const j = dateToJalali(date);
      days.push({
        date,
        isoDate,
        dayNumber: String(d),
        dayNum: d,
        monthName: GREGORIAN_MONTH_NAMES[nextMonth - 1] ?? '',
        secondaryDayNumber: toPersianDigits(j.day),
        secondaryMonthName: PERSIAN_MONTH_NAMES[j.month - 1] ?? '',
        isToday,
        isCurrentMonth: false
      });
    }
  }

  // Add week number label to first day of each week row (index 0, 7, 14, 21, 28, 35)
  for (let i = 0; i < days.length; i += 7) {
    const item = days[i];
    if (item) {
      const wn = getIsoWeekNumber(item.date);
      item.weekNumberLabel = `W${wn}`;
    }
  }

  return {
    weekdayHeaders: GREGORIAN_WEEKDAY_NAMES,
    days
  };
}

/**
 * Computes the 7 days of the active week for Week view.
 */
export function getWeekViewDays(
  currentDate: Date,
  type: CalendarType,
  today: Date = new Date()
): WeekDayItem[] {
  const todayJalali = dateToJalali(today);

  if (type === 'jalali') {
    const offset = getPersianWeekday(currentDate); // 0 (Sat) to 6 (Fri)
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - offset);
    weekStart.setHours(12, 0, 0, 0);

    const items: WeekDayItem[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const jd = dateToJalali(date);
      const isToday =
        todayJalali.year === jd.year &&
        todayJalali.month === jd.month &&
        todayJalali.day === jd.day;

      items.push({
        date,
        isoDate: toDayUtcIso(date),
        dayNumber: toPersianDigits(jd.day),
        dayNum: jd.day,
        monthName: PERSIAN_MONTH_NAMES[jd.month - 1] ?? '',
        weekdayName: PERSIAN_WEEKDAY_NAMES[i] ?? '',
        dateLabel: `${toPersianDigits(jd.day)} ${PERSIAN_MONTH_NAMES[jd.month - 1]}`,
        secondaryDayNumber: String(date.getDate()),
        secondaryMonthName: GREGORIAN_MONTH_NAMES[date.getMonth()] ?? '',
        secondaryDateLabel: `${(GREGORIAN_MONTH_NAMES[date.getMonth()] ?? '').slice(0, 3)} ${date.getDate()}`,
        isToday
      });
    }
    return items;
  }

  // Gregorian
  const offset = currentDate.getDay(); // 0 (Sun) to 6 (Sat)
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - offset);
  weekStart.setHours(12, 0, 0, 0);

  const items: WeekDayItem[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const isToday =
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate();

    const mName = GREGORIAN_MONTH_NAMES[date.getMonth()] ?? '';
    const jd = dateToJalali(date);
    items.push({
      date,
      isoDate: new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
      ).toISOString(),
      dayNumber: String(date.getDate()),
      dayNum: date.getDate(),
      monthName: mName,
      weekdayName: GREGORIAN_WEEKDAY_NAMES[i] ?? '',
      dateLabel: `${mName.slice(0, 3)} ${date.getDate()}`,
      secondaryDayNumber: toPersianDigits(jd.day),
      secondaryMonthName: PERSIAN_MONTH_NAMES[jd.month - 1] ?? '',
      secondaryDateLabel: `${toPersianDigits(jd.day)} ${PERSIAN_MONTH_NAMES[jd.month - 1]}`,
      isToday
    });
  }
  return items;
}

/**
 * Filters and groups tasks into chronological days for Agenda view.
 */
export function getAgendaDayGroups(
  tasks: TaskEntity[],
  startDate: Date,
  daysCount: number = 14,
  type: CalendarType = 'jalali',
  today: Date = new Date()
): AgendaDayGroup[] {
  const groups: AgendaDayGroup[] = [];
  const base = new Date(startDate);
  base.setHours(12, 0, 0, 0);

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);

    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();

    const dayTasks = tasks
      .filter((t) => isTaskOnDate(t, d))
      .sort((a, b) => {
        // Uncompleted tasks first
        const aCompleted = a.completedAt != null;
        const bCompleted = b.completedAt != null;
        if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

        // Higher priority first
        if (b.priority !== a.priority) return b.priority - a.priority;

        // Time comparison
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return aTime - bTime;
      });

    let dayLabel: string;
    let weekdayName: string;
    let isoDate: string;

    if (type === 'jalali') {
      const jd = dateToJalali(d);
      dayLabel = `${toPersianDigits(jd.day)} ${PERSIAN_MONTH_NAMES[jd.month - 1]} ${toPersianDigits(jd.year)}`;
      weekdayName = PERSIAN_WEEKDAY_NAMES[getPersianWeekday(d)] ?? '';
      isoDate = toDayUtcIso(d);
    } else {
      dayLabel = `${GREGORIAN_MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      weekdayName = GREGORIAN_WEEKDAY_NAMES[d.getDay()] ?? '';
      isoDate = d.toISOString();
    }

    groups.push({
      date: d,
      isoDate,
      dayLabel,
      weekdayName,
      isToday,
      tasks: dayTasks
    });
  }

  return groups;
}

/**
 * Checks whether an active task is a multi-day task (e.g. Duration mode spanning multiple calendar dates).
 */
export function isMultiDayTask(task: TaskEntity): boolean {
  if (task.deletedAt != null) return false;
  if (!task.startDate || !task.dueDate) return false;
  const start = new Date(task.startDate);
  const due = new Date(task.dueDate);
  if (isNaN(start.getTime()) || isNaN(due.getTime())) return false;
  if (due.getTime() <= start.getTime()) return false;

  const startKey = getLocalDateKey(start, task.timeZone);
  const dueKey = getLocalDateKey(due, task.timeZone);
  return startKey !== dueKey;
}

/**
 * Checks if a task is scheduled on a single date (not a multi-day span).
 */
export function isSingleDayTaskOnDate(task: TaskEntity, targetDate: Date): boolean {
  if (isMultiDayTask(task)) return false;
  return isTaskOnDate(task, targetDate);
}

/**
 * Resolves color for a task block/ribbon based on priority or custom task color.
 */
export function getTaskColor(task: TaskEntity): string {
  const customColor = (task as unknown as { color?: string }).color;
  if (customColor) return customColor;
  switch (task.priority) {
    case 5:
      return '#f43f5e'; // High / Urgent
    case 3:
      return '#f59e0b'; // Medium / Schedule
    case 1:
      return '#3b82f6'; // Low / Delegate
    default:
      return '#10b981'; // Primary Emerald
  }
}

function getCalendarDayUtc(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffCalendarDays(targetDate: Date, baseDate: Date): number {
  return Math.round((getCalendarDayUtc(targetDate) - getCalendarDayUtc(baseDate)) / 86400000);
}

/**
 * Computes multi-day continuous ribbon segments across a 7-day week row
 * according to the snake ribbon spanning rules:
 * 1. Filters tasks whose [startDate, dueDate] intersects [weekStart, weekEnd].
 * 2. Sorts tasks by startDate ascending, then duration descending.
 * 3. Assigns startColIndex, endColIndex, colSpan, isStartOfTask, isEndOfTask, isPast.
 * 4. Allocates stable horizontal slot index (lane) across days.
 */
export function computeWeekSegments(
  weekDays: Date[],
  tasks: TaskEntity[],
  today: Date = new Date()
): TaskRibbonSegment[] {
  if (weekDays.length === 0) return [];

  const firstWeekDay = weekDays[0]!;
  const lastWeekDay = weekDays[weekDays.length - 1]!;
  const firstDayUtc = getCalendarDayUtc(firstWeekDay);
  const lastDayUtc = getCalendarDayUtc(lastWeekDay);

  const todayMidnightUtc = getCalendarDayUtc(today);

  // 1. Filter multi-day tasks intersecting this week
  const intersectingTasks = tasks.filter((t) => {
    if (!isMultiDayTask(t)) return false;
    const s = new Date(t.startDate!);
    const d = new Date(t.dueDate!);
    const sUtc = getCalendarDayUtc(s);
    const dUtc = getCalendarDayUtc(d);
    return sUtc <= lastDayUtc && dUtc >= firstDayUtc;
  });

  // 2. Sort: earlier startDate first, then longer duration first
  intersectingTasks.sort((a, b) => {
    const aStart = new Date(a.startDate!).getTime();
    const bStart = new Date(b.startDate!).getTime();
    if (aStart !== bStart) return aStart - bStart;

    const aDur = new Date(a.dueDate!).getTime() - aStart;
    const bDur = new Date(b.dueDate!).getTime() - bStart;
    return bDur - aDur;
  });

  // Matrix to track occupied slots for 7 days
  const occupiedSlots: boolean[][] = Array.from({ length: 7 }, () => []);
  const segments: TaskRibbonSegment[] = [];

  for (const task of intersectingTasks) {
    const s = new Date(task.startDate!);
    const d = new Date(task.dueDate!);

    const diffStart = diffCalendarDays(s, firstWeekDay);
    const diffEnd = diffCalendarDays(d, firstWeekDay);

    const startColIndex = Math.max(0, Math.min(6, diffStart));
    const endColIndex = Math.max(0, Math.min(6, diffEnd));

    if (endColIndex < startColIndex) continue;

    const colSpan = endColIndex - startColIndex + 1;
    const isStartOfTask = diffStart >= 0;
    const isEndOfTask = diffEnd <= 6;
    const isPast = getCalendarDayUtc(d) < todayMidnightUtc;

    // Find first free slotIndex across startColIndex..endColIndex
    let slotIndex = 0;
    while (true) {
      let isFree = true;
      for (let c = startColIndex; c <= endColIndex; c++) {
        if (occupiedSlots[c]?.[slotIndex]) {
          isFree = false;
          break;
        }
      }
      if (isFree) break;
      slotIndex++;
    }

    // Reserve slot
    for (let c = startColIndex; c <= endColIndex; c++) {
      if (!occupiedSlots[c]) occupiedSlots[c] = [];
      occupiedSlots[c]![slotIndex] = true;
    }

    segments.push({
      taskId: task.id,
      taskTitle: task.title,
      color: getTaskColor(task),
      startColIndex,
      endColIndex,
      colSpan,
      slotIndex,
      isStartOfTask,
      isEndOfTask,
      isPast,
      task
    });
  }

  return segments;
}

/**
 * Splits MonthView's 35 or 42 day cells into 5 or 6 week rows, computing multiDaySegments for each row.
 */
export function groupDaysIntoWeekRows(
  days: CalendarDayItem[],
  tasks: TaskEntity[],
  type: CalendarType = 'jalali',
  today: Date = new Date()
): CalendarWeekRow[] {
  const rows: CalendarWeekRow[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    if (chunk.length === 0) continue;

    const chunkDates = chunk.map((c) => c.date);
    const multiDaySegments = computeWeekSegments(chunkDates, tasks, today);

    let maxSlots = 0;
    for (const seg of multiDaySegments) {
      if (seg.slotIndex + 1 > maxSlots) {
        maxSlots = seg.slotIndex + 1;
      }
    }

    const firstDate = chunk[0]?.date ?? new Date();
    const weekNumber =
      type === 'jalali' ? getJalaliWeekNumber(firstDate) : getIsoWeekNumber(firstDate);

    rows.push({
      weekNumber,
      days: chunk,
      multiDaySegments,
      maxSlots
    });
  }
  return rows;
}

/**
 * Computes time-blocking layout for a day's timed tasks with collision and overlap resolution.
 * Side-by-side split width when tasks overlap.
 */
export function computeTimeBlockLayout(
  tasks: TaskEntity[],
  dayDate: Date,
  type: CalendarType = 'jalali',
  today: Date = new Date()
): TimeBlockTaskLayout[] {
  const dayTasks = tasks.filter(
    (t) => !t.isAllDay && !isMultiDayTask(t) && isTaskOnDate(t, dayDate)
  );

  if (dayTasks.length === 0) return [];

  interface ParsedItem {
    task: TaskEntity;
    startMin: number;
    endMin: number;
    durationMin: number;
  }

  const parsed: ParsedItem[] = dayTasks.map((task) => {
    let startMin = 9 * 60; // 09:00 default
    const iso = task.dueDate || task.startDate;
    if (iso) {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        startMin = d.getHours() * 60 + d.getMinutes();
      }
    }
    const durationMin = task.duration && task.duration > 0 ? task.duration : 60;
    const endMin = Math.min(1440, startMin + durationMin);
    return { task, startMin, endMin, durationMin };
  });

  // Sort by startMin asc, durationMin desc
  parsed.sort((a, b) => a.startMin - b.startMin || b.durationMin - a.durationMin);

  // Group into overlapping clusters
  const clusters: ParsedItem[][] = [];
  let currentCluster: ParsedItem[] = [];
  let clusterEnd = -1;

  for (const item of parsed) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endMin;
    } else if (item.startMin < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMin;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const results: TimeBlockTaskLayout[] = [];

  const dayMidnight = new Date(dayDate);
  dayMidnight.setHours(0, 0, 0, 0);
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  for (const cluster of clusters) {
    const lanes: ParsedItem[][] = [];
    for (const item of cluster) {
      let placed = false;
      for (let l = 0; l < lanes.length; l++) {
        const lastInLane = lanes[l]![lanes[l]!.length - 1]!;
        if (item.startMin >= lastInLane.endMin) {
          lanes[l]!.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push([item]);
      }
    }

    const totalCols = lanes.length;
    for (let colIndex = 0; colIndex < lanes.length; colIndex++) {
      const laneItems = lanes[colIndex]!;
      for (const item of laneItems) {
        const topPercent = (item.startMin / 1440) * 100;
        const heightPercent = Math.max((item.durationMin / 1440) * 100, 1.8);

        const sH = String(Math.floor(item.startMin / 60)).padStart(2, '0');
        const sM = String(item.startMin % 60).padStart(2, '0');
        const eH = String(Math.floor(item.endMin / 60)).padStart(2, '0');
        const eM = String(item.endMin % 60).padStart(2, '0');

        let timeRangeLabel = `${sH}:${sM} - ${eH}:${eM}`;
        if (type === 'jalali') {
          timeRangeLabel = toPersianDigits(timeRangeLabel);
        }

        const isPast =
          dayMidnight.getTime() < todayMidnight.getTime() ||
          (dayMidnight.getTime() === todayMidnight.getTime() &&
            item.endMin <= today.getHours() * 60 + today.getMinutes());

        results.push({
          task: item.task,
          startMinutes: item.startMin,
          durationMinutes: item.durationMin,
          endMinutes: item.endMin,
          topPercent,
          heightPercent,
          colIndex,
          totalCols,
          timeRangeLabel,
          isPast,
          color: getTaskColor(item.task)
        });
      }
    }
  }

  return results;
}

/**
 * Computes all 12 months for the Year view with activity heatmap shading levels.
 */
export function getYearViewMonths(
  currentDate: Date,
  type: CalendarType,
  tasks: TaskEntity[],
  today: Date = new Date()
): YearMonthItem[] {
  const result: YearMonthItem[] = [];

  if (type === 'jalali') {
    const j = dateToJalali(currentDate);
    const year = j.year;
    const yearLabel = toPersianDigits(year);

    for (let month = 1; month <= 12; month++) {
      const monthLength = getJalaliMonthLength(year, month);
      const firstDay = jalaliToDate(year, month, 1, 12, 0, 0);
      const startWeekday = getPersianWeekday(firstDay); // 0 (Sat) to 6 (Fri)

      const days: YearMonthDayCell[] = [];

      // Leading days
      if (startWeekday > 0) {
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth < 1) {
          prevMonth = 12;
          prevYear -= 1;
        }
        const prevMonthLen = getJalaliMonthLength(prevYear, prevMonth);
        const startDay = prevMonthLen - startWeekday + 1;
        for (let d = startDay; d <= prevMonthLen; d++) {
          const date = jalaliToDate(prevYear, prevMonth, d, 12, 0, 0);
          const isoDate = toDayUtcIso(date);
          days.push({
            date,
            isoDate,
            dayNum: d,
            dayNumber: toPersianDigits(d),
            isToday: false,
            isCurrentMonth: false,
            taskCount: 0,
            heatmapLevel: 0
          });
        }
      }

      // Current month days
      for (let d = 1; d <= monthLength; d++) {
        const date = jalaliToDate(year, month, d, 12, 0, 0);
        const isoDate = toDayUtcIso(date);
        const isToday =
          today.getFullYear() === date.getFullYear() &&
          today.getMonth() === date.getMonth() &&
          today.getDate() === date.getDate();

        const matchingTasks = tasks.filter((t) => {
          if (t.deletedAt != null) return false;
          if (isMultiDayTask(t)) {
            const s = new Date(t.startDate!);
            s.setHours(0, 0, 0, 0);
            const due = new Date(t.dueDate!);
            due.setHours(23, 59, 59, 999);
            return date.getTime() >= s.getTime() && date.getTime() <= due.getTime();
          }
          return isTaskOnDate(t, date);
        });

        const count = matchingTasks.length;
        const heatmapLevel: 0 | 1 | 2 | 3 =
          count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : 3;

        days.push({
          date,
          isoDate,
          dayNum: d,
          dayNumber: toPersianDigits(d),
          isToday,
          isCurrentMonth: true,
          taskCount: count,
          heatmapLevel
        });
      }

      // Trailing days
      const remainder = days.length % 7;
      if (remainder > 0) {
        const trailingCount = 7 - remainder;
        let nextYear = year;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear += 1;
        }
        for (let d = 1; d <= trailingCount; d++) {
          const date = jalaliToDate(nextYear, nextMonth, d, 12, 0, 0);
          const isoDate = toDayUtcIso(date);
          days.push({
            date,
            isoDate,
            dayNum: d,
            dayNumber: toPersianDigits(d),
            isToday: false,
            isCurrentMonth: false,
            taskCount: 0,
            heatmapLevel: 0
          });
        }
      }

      // Group into weeks
      const weeks: Array<{ weekNumber: number; days: YearMonthDayCell[] }> = [];
      for (let i = 0; i < days.length; i += 7) {
        const weekDays = days.slice(i, i + 7);
        const wDate = weekDays[0]?.date ?? new Date();
        const wn = getJalaliWeekNumber(wDate);
        weeks.push({
          weekNumber: wn,
          days: weekDays
        });
      }

      result.push({
        monthIndex: month - 1,
        monthName: PERSIAN_MONTH_NAMES[month - 1] ?? '',
        year,
        yearLabel,
        weeks
      });
    }

    return result;
  }

  // Gregorian
  const year = currentDate.getFullYear();
  const yearLabel = String(year);

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1, 12, 0, 0);
    const startWeekday = firstDay.getDay(); // 0 Sun to 6 Sat

    const days: YearMonthDayCell[] = [];

    // Leading days
    if (startWeekday > 0) {
      const prevLastDate = new Date(year, month, 0);
      const prevLen = prevLastDate.getDate();
      const prevYear = prevLastDate.getFullYear();
      const prevMonth = prevLastDate.getMonth();
      const startDay = prevLen - startWeekday + 1;
      for (let d = startDay; d <= prevLen; d++) {
        const date = new Date(prevYear, prevMonth, d, 12, 0, 0);
        days.push({
          date,
          isoDate: date.toISOString(),
          dayNum: d,
          dayNumber: String(d),
          isToday: false,
          isCurrentMonth: false,
          taskCount: 0,
          heatmapLevel: 0
        });
      }
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d, 12, 0, 0);
      const isToday =
        today.getFullYear() === date.getFullYear() &&
        today.getMonth() === date.getMonth() &&
        today.getDate() === date.getDate();

      const matchingTasks = tasks.filter((t) => {
        if (t.deletedAt != null) return false;
        if (isMultiDayTask(t)) {
          const s = new Date(t.startDate!);
          s.setHours(0, 0, 0, 0);
          const due = new Date(t.dueDate!);
          due.setHours(23, 59, 59, 999);
          return date.getTime() >= s.getTime() && date.getTime() <= due.getTime();
        }
        return isTaskOnDate(t, date);
      });

      const count = matchingTasks.length;
      const heatmapLevel: 0 | 1 | 2 | 3 =
        count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : 3;

      days.push({
        date,
        isoDate: date.toISOString(),
        dayNum: d,
        dayNumber: String(d),
        isToday,
        isCurrentMonth: true,
        taskCount: count,
        heatmapLevel
      });
    }

    // Trailing days
    const remainder = days.length % 7;
    if (remainder > 0) {
      const trailingCount = 7 - remainder;
      for (let d = 1; d <= trailingCount; d++) {
        const date = new Date(year, month + 1, d, 12, 0, 0);
        days.push({
          date,
          isoDate: date.toISOString(),
          dayNum: d,
          dayNumber: String(d),
          isToday: false,
          isCurrentMonth: false,
          taskCount: 0,
          heatmapLevel: 0
        });
      }
    }

    // Group into weeks
    const weeks: Array<{ weekNumber: number; days: YearMonthDayCell[] }> = [];
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      const wDate = weekDays[0]?.date ?? new Date();
      const wn = getIsoWeekNumber(wDate);
      weeks.push({
        weekNumber: wn,
        days: weekDays
      });
    }

    result.push({
      monthIndex: month,
      monthName: GREGORIAN_MONTH_NAMES[month] ?? '',
      year,
      yearLabel,
      weeks
    });
  }

  return result;
}

/**
 * Returns configurable days items (e.g. 3 or 4 days) for Multi-Day view.
 */
export function getMultiDayItems(
  currentDate: Date,
  daysCount: number = 3,
  type: CalendarType = 'jalali',
  today: Date = new Date()
): WeekDayItem[] {
  const items: WeekDayItem[] = [];
  const base = new Date(currentDate);
  base.setHours(12, 0, 0, 0);

  for (let i = 0; i < daysCount; i++) {
    const date = new Date(base);
    date.setDate(date.getDate() + i);

    const isToday =
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate();

    if (type === 'jalali') {
      const jd = dateToJalali(date);
      items.push({
        date,
        isoDate: toDayUtcIso(date),
        dayNumber: toPersianDigits(jd.day),
        dayNum: jd.day,
        monthName: PERSIAN_MONTH_NAMES[jd.month - 1] ?? '',
        weekdayName: PERSIAN_WEEKDAY_NAMES[getPersianWeekday(date)] ?? '',
        dateLabel: `${toPersianDigits(jd.day)} ${PERSIAN_MONTH_NAMES[jd.month - 1]}`,
        secondaryDayNumber: String(date.getDate()),
        secondaryMonthName: GREGORIAN_MONTH_NAMES[date.getMonth()] ?? '',
        secondaryDateLabel: `${(GREGORIAN_MONTH_NAMES[date.getMonth()] ?? '').slice(0, 3)} ${date.getDate()}`,
        isToday
      });
    } else {
      const mName = GREGORIAN_MONTH_NAMES[date.getMonth()] ?? '';
      const jd = dateToJalali(date);
      items.push({
        date,
        isoDate: date.toISOString(),
        dayNumber: String(date.getDate()),
        dayNum: date.getDate(),
        monthName: mName,
        weekdayName: GREGORIAN_WEEKDAY_NAMES[date.getDay()] ?? '',
        dateLabel: `${mName.slice(0, 3)} ${date.getDate()}`,
        secondaryDayNumber: toPersianDigits(jd.day),
        secondaryMonthName: PERSIAN_MONTH_NAMES[jd.month - 1] ?? '',
        secondaryDateLabel: `${toPersianDigits(jd.day)} ${PERSIAN_MONTH_NAMES[jd.month - 1]}`,
        isToday
      });
    }
  }

  return items;
}

/**
 * Returns week rows (2 or 3 weeks) with snake ribbon multi-day segments for Multi-Week view.
 */
export function getMultiWeekRows(
  currentDate: Date,
  weeksCount: number = 2,
  type: CalendarType = 'jalali',
  tasks: TaskEntity[] = [],
  today: Date = new Date()
): CalendarWeekRow[] {
  const rows: CalendarWeekRow[] = [];
  const baseWeek = getWeekViewDays(currentDate, type, today);
  const startDate = baseWeek[0]?.date ?? currentDate;

  for (let w = 0; w < weeksCount; w++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + w * 7);

    const weekDays = getWeekViewDays(weekStart, type, today);
    const dayItems: CalendarDayItem[] = weekDays.map((wd) => ({
      date: wd.date,
      isoDate: wd.isoDate,
      dayNumber: wd.dayNumber,
      dayNum: wd.dayNum,
      monthName: wd.monthName,
      secondaryDayNumber: wd.secondaryDayNumber,
      secondaryMonthName: wd.secondaryMonthName,
      isToday: wd.isToday,
      isCurrentMonth: true,
      weekNumberLabel: `W${type === 'jalali' ? toPersianDigits(getJalaliWeekNumber(wd.date)) : getIsoWeekNumber(wd.date)}`
    }));

    const segments = computeWeekSegments(
      weekDays.map((d) => d.date),
      tasks,
      today
    );
    let maxSlots = 0;
    for (const seg of segments) {
      if (seg.slotIndex + 1 > maxSlots) {
        maxSlots = seg.slotIndex + 1;
      }
    }

    const firstDate = dayItems[0]?.date ?? new Date();
    const weekNumber =
      type === 'jalali' ? getJalaliWeekNumber(firstDate) : getIsoWeekNumber(firstDate);

    rows.push({
      weekNumber,
      days: dayItems,
      multiDaySegments: segments,
      maxSlots
    });
  }

  return rows;
}

/**
 * Navigates by year forward or backward.
 */
export function navigateYear(
  currentDate: Date,
  direction: 1 | -1,
  type: CalendarType
): Date {
  if (type === 'jalali') {
    const j = dateToJalali(currentDate);
    return jalaliToDate(j.year + direction, j.month, 1, 12, 0, 0);
  }
  return new Date(
    currentDate.getFullYear() + direction,
    currentDate.getMonth(),
    1,
    12,
    0,
    0
  );
}

/**
 * Navigates multi-day view forward or backward.
 */
export function navigateMultiDay(
  currentDate: Date,
  direction: 1 | -1,
  daysCount: number = 3
): Date {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + direction * daysCount);
  return next;
}

/**
 * Navigates multi-week view forward or backward.
 */
export function navigateMultiWeek(
  currentDate: Date,
  direction: 1 | -1,
  weeksCount: number = 2
): Date {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + direction * weeksCount * 7);
  return next;
}

/**
 * Computes dynamic header title for all 7 calendar view modes.
 */
export function getCalendarHeaderTitle(
  currentDate: Date,
  viewMode: CalendarViewMode,
  type: CalendarType,
  multiDayCount: number = 3
): string {
  if (viewMode === 'year') {
    if (type === 'jalali') {
      const j = dateToJalali(currentDate);
      return toPersianDigits(j.year);
    }
    return String(currentDate.getFullYear());
  }

  if (viewMode === 'day') {
    return getCalendarDayTitle(currentDate, type);
  }

  if (viewMode === 'multi-day') {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    end.setDate(end.getDate() + multiDayCount - 1);
    if (type === 'jalali') {
      const js = dateToJalali(start);
      const je = dateToJalali(end);
      return `${toPersianDigits(js.day)} ${PERSIAN_MONTH_NAMES[js.month - 1]} - ${toPersianDigits(je.day)} ${PERSIAN_MONTH_NAMES[je.month - 1]} ${toPersianDigits(je.year)}`;
    }
    const startM = GREGORIAN_MONTH_NAMES[start.getMonth()] ?? '';
    const endM = GREGORIAN_MONTH_NAMES[end.getMonth()] ?? '';
    return `${startM.slice(0, 3)} ${start.getDate()} - ${endM.slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
  }

  if (viewMode === 'multi-week') {
    const weeksDays = getWeekViewDays(currentDate, type);
    const start = weeksDays[0]?.date ?? currentDate;
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    if (type === 'jalali') {
      const js = dateToJalali(start);
      const je = dateToJalali(end);
      return `${toPersianDigits(js.day)} ${PERSIAN_MONTH_NAMES[js.month - 1]} - ${toPersianDigits(je.day)} ${PERSIAN_MONTH_NAMES[je.month - 1]} ${toPersianDigits(je.year)}`;
    }
    const startM = GREGORIAN_MONTH_NAMES[start.getMonth()] ?? '';
    const endM = GREGORIAN_MONTH_NAMES[end.getMonth()] ?? '';
    return `${startM.slice(0, 3)} ${start.getDate()} - ${endM.slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
  }

  return getCalendarMonthTitle(currentDate, type);
}

/**
 * Shifts the entire multi-day span of a task when dragged to a new start date.
 */
export function shiftTaskDuration(
  task: TaskEntity,
  targetStartDate: Date
): { startDate: string; dueDate: string } {
  const origStart = task.startDate ? new Date(task.startDate) : new Date();
  const origDue = task.dueDate ? new Date(task.dueDate) : new Date(origStart.getTime() + 86400000);
  const durationMs = Math.max(86400000, origDue.getTime() - origStart.getTime());

  const newStart = new Date(targetStartDate);
  newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);

  const newDue = new Date(newStart.getTime() + durationMs);

  return {
    startDate: newStart.toISOString(),
    dueDate: newDue.toISOString()
  };
}

/**
 * Resizes the start or end edge of a multi-day task.
 */
export function resizeTaskSpan(
  task: TaskEntity,
  edge: 'start' | 'end',
  newDate: Date
): { startDate: string; dueDate: string } {
  const origStart = task.startDate ? new Date(task.startDate) : new Date();
  const origDue = task.dueDate ? new Date(task.dueDate) : new Date();

  if (edge === 'start') {
    const candidateStart = new Date(newDate);
    candidateStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
    // ensure start <= due
    if (candidateStart.getTime() >= origDue.getTime()) {
      candidateStart.setTime(origDue.getTime() - 86400000);
    }
    return {
      startDate: candidateStart.toISOString(),
      dueDate: origDue.toISOString()
    };
  }

  const candidateDue = new Date(newDate);
  candidateDue.setHours(origDue.getHours(), origDue.getMinutes(), 0, 0);
  if (candidateDue.getTime() <= origStart.getTime()) {
    candidateDue.setTime(origStart.getTime() + 86400000);
  }
  return {
    startDate: origStart.toISOString(),
    dueDate: candidateDue.toISOString()
  };
}

