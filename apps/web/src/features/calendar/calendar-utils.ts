import type { TaskEntity } from '@orbit/shared-types';
import {
  GREGORIAN_MONTH_NAMES,
  GREGORIAN_WEEKDAY_NAMES,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAY_NAMES,
  dateToJalali,
  getJalaliMonthLength,
  getPersianWeekday,
  jalaliToDate,
  jalaliToIso,
  toPersianDigits
} from '../../core/calendar/jalali';
import { getLocalDateKey } from '../tasks/services/task-service';

export type CalendarType = 'jalali' | 'gregorian';
export type CalendarViewMode = 'month' | 'week';

export interface CalendarDayItem {
  date: Date;
  isoDate: string;
  dayNumber: string;
  dayNum: number;
  monthName: string;
  isToday: boolean;
}

export interface WeekDayItem extends CalendarDayItem {
  weekdayName: string;
  dateLabel: string;
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
  const targetIsoPrefix = targetDate.toISOString().slice(0, 10);
  if (isoDatePrefix === targetIsoPrefix) return true;

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
 * Computes all day cells and headers for Month view.
 */
export function getMonthViewDays(
  currentDate: Date,
  type: CalendarType,
  today: Date = new Date()
): {
  weekdayHeaders: readonly string[];
  days: (CalendarDayItem | null)[];
} {
  const todayJalali = dateToJalali(today);

  if (type === 'jalali') {
    const j = dateToJalali(currentDate);
    const daysInMonth = getJalaliMonthLength(j.year, j.month);
    const firstDay = jalaliToDate(j.year, j.month, 1, 12, 0, 0);
    const startWeekday = getPersianWeekday(firstDay); // 0 (Sat) to 6 (Fri)

    const days: (CalendarDayItem | null)[] = [];
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = jalaliToDate(j.year, j.month, d, 12, 0, 0);
      const isoDate = jalaliToIso(j.year, j.month, d, 0, 0, true);
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
        isToday
      });
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

  const days: (CalendarDayItem | null)[] = [];
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(gYear, gMonth - 1, d, 12, 0, 0);
    const isoDate = new Date(
      Date.UTC(gYear, gMonth - 1, d, 0, 0, 0)
    ).toISOString();
    const isToday =
      today.getFullYear() === gYear &&
      today.getMonth() + 1 === gMonth &&
      today.getDate() === d;

    days.push({
      date,
      isoDate,
      dayNumber: String(d),
      dayNum: d,
      monthName: GREGORIAN_MONTH_NAMES[gMonth - 1] ?? '',
      isToday
    });
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
        isoDate: jalaliToIso(jd.year, jd.month, jd.day, 0, 0, true),
        dayNumber: toPersianDigits(jd.day),
        dayNum: jd.day,
        monthName: PERSIAN_MONTH_NAMES[jd.month - 1] ?? '',
        weekdayName: PERSIAN_WEEKDAY_NAMES[i] ?? '',
        dateLabel: `${toPersianDigits(jd.day)} ${PERSIAN_MONTH_NAMES[jd.month - 1]}`,
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
      isToday
    });
  }
  return items;
}
