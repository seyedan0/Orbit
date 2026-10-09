import {
  dateToJalali,
  getJalaliMonthLength,
  getPersianWeekday,
  jalaliToDate,
  toPersianDigits
} from '../calendar/jalali';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type CalendarType = 'jalali' | 'gregorian';

export interface RecurrenceOptions {
  frequency: RecurrenceFrequency;
  interval?: number | undefined;
  /**
   * For Jalali: 0=Saturday (شنبه), 1=Sunday, ..., 6=Friday (جمعه).
   * For Gregorian: 0=Sunday, 1=Monday, ..., 6=Saturday.
   */
  daysOfWeek?: number[] | undefined;
  dayOfMonth?: number | undefined;
  calendarType?: CalendarType | undefined;
  until?: string | undefined;
  count?: number | undefined;
}

const JALALI_DAY_TO_CODE: Record<number, string> = {
  0: 'SA',
  1: 'SU',
  2: 'MO',
  3: 'TU',
  4: 'WE',
  5: 'TH',
  6: 'FR'
};

const CODE_TO_JALALI_DAY: Record<string, number> = {
  SA: 0,
  SU: 1,
  MO: 2,
  TU: 3,
  WE: 4,
  TH: 5,
  FR: 6
};

const GREGORIAN_DAY_TO_CODE: Record<number, string> = {
  0: 'SU',
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA'
};

const CODE_TO_GREGORIAN_DAY: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6
};

/**
 * Parses an iCalendar RRULE string (with optional custom CAL parameter)
 * into a typed RecurrenceOptions object.
 */
export function parseRRule(rruleString: string): RecurrenceOptions {
  const clean = rruleString.trim().replace(/^RRULE:/i, '');
  if (!clean) {
    return { frequency: 'DAILY', interval: 1, calendarType: 'jalali' };
  }

  const parts = clean.split(';');
  let frequency: RecurrenceFrequency = 'DAILY';
  let interval = 1;
  let calendarType: CalendarType = 'jalali';
  let daysOfWeek: number[] | undefined;
  let dayOfMonth: number | undefined;
  let until: string | undefined;
  let count: number | undefined;

  // First pass to determine calendar type
  for (const part of parts) {
    const [key, val] = part.split('=');
    if (!key || !val) continue;
    const upperKey = key.toUpperCase();
    const upperVal = val.toUpperCase();
    if (upperKey === 'CAL') {
      calendarType = upperVal === 'GREGORIAN' ? 'gregorian' : 'jalali';
    }
  }

  const codeToDay =
    calendarType === 'jalali' ? CODE_TO_JALALI_DAY : CODE_TO_GREGORIAN_DAY;

  for (const part of parts) {
    const [key, val] = part.split('=');
    if (!key || !val) continue;
    const upperKey = key.toUpperCase();
    const upperVal = val.toUpperCase();

    switch (upperKey) {
      case 'FREQ':
        if (
          upperVal === 'DAILY' ||
          upperVal === 'WEEKLY' ||
          upperVal === 'MONTHLY' ||
          upperVal === 'YEARLY'
        ) {
          frequency = upperVal;
        }
        break;
      case 'INTERVAL': {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) {
          interval = parsed;
        }
        break;
      }
      case 'BYDAY': {
        const dayCodes = val.split(',').map((c) => c.trim().toUpperCase());
        const mappedDays: number[] = [];
        for (const code of dayCodes) {
          if (code in codeToDay) {
            mappedDays.push(codeToDay[code] as number);
          }
        }
        if (mappedDays.length > 0) {
          daysOfWeek = mappedDays;
        }
        break;
      }
      case 'BYMONTHDAY': {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
          dayOfMonth = parsed;
        }
        break;
      }
      case 'UNTIL':
        until = val.trim();
        break;
      case 'COUNT': {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) {
          count = parsed;
        }
        break;
      }
    }
  }

  return {
    frequency,
    interval,
    calendarType,
    ...(daysOfWeek !== undefined ? { daysOfWeek } : {}),
    ...(dayOfMonth !== undefined ? { dayOfMonth } : {}),
    ...(until !== undefined ? { until } : {}),
    ...(count !== undefined ? { count } : {})
  };
}

/**
 * Builds an RFC 5545 compliant RRULE string (with optional CAL parameter)
 * from RecurrenceOptions.
 */
export function buildRRule(options: RecurrenceOptions): string {
  const parts: string[] = [`FREQ=${options.frequency}`];
  const interval = options.interval ?? 1;
  if (interval > 1) {
    parts.push(`INTERVAL=${interval}`);
  }

  const cal = options.calendarType ?? 'jalali';
  parts.push(`CAL=${cal.toUpperCase()}`);

  if (options.daysOfWeek && options.daysOfWeek.length > 0) {
    const dayToCode =
      cal === 'jalali' ? JALALI_DAY_TO_CODE : GREGORIAN_DAY_TO_CODE;
    const codes = options.daysOfWeek
      .map((d) => dayToCode[d])
      .filter((c): c is string => c !== undefined);
    if (codes.length > 0) {
      parts.push(`BYDAY=${codes.join(',')}`);
    }
  }

  if (options.dayOfMonth !== undefined) {
    parts.push(`BYMONTHDAY=${options.dayOfMonth}`);
  }

  if (options.until !== undefined) {
    parts.push(`UNTIL=${options.until}`);
  }

  if (options.count !== undefined) {
    parts.push(`COUNT=${options.count}`);
  }

  return `RRULE:${parts.join(';')}`;
}

/**
 * Formats a user-friendly localized description of recurrence in Persian or English.
 */
export function formatRRuleText(
  options: RecurrenceOptions,
  lang: 'fa' | 'en' = 'fa'
): string {
  const interval = options.interval ?? 1;
  const isJalali = (options.calendarType ?? 'jalali') === 'jalali';

  // Check for weekdays pattern
  const isJalaliWeekdays =
    options.frequency === 'WEEKLY' &&
    isJalali &&
    Array.isArray(options.daysOfWeek) &&
    options.daysOfWeek.length === 5 &&
    [0, 1, 2, 3, 4].every((d) => options.daysOfWeek?.includes(d));

  const isGregorianWeekdays =
    options.frequency === 'WEEKLY' &&
    !isJalali &&
    Array.isArray(options.daysOfWeek) &&
    options.daysOfWeek.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => options.daysOfWeek?.includes(d));

  if (isJalaliWeekdays || isGregorianWeekdays) {
    return lang === 'fa' ? 'روزهای کاری' : 'Weekdays';
  }

  if (lang === 'fa') {
    switch (options.frequency) {
      case 'DAILY':
        return interval === 1
          ? 'روزانه'
          : `هر ${toPersianDigits(interval)} روز`;
      case 'WEEKLY':
        return interval === 1
          ? 'هفتگی'
          : `هر ${toPersianDigits(interval)} هفته`;
      case 'MONTHLY':
        return interval === 1
          ? 'ماهانه'
          : `هر ${toPersianDigits(interval)} ماه`;
      case 'YEARLY':
        return interval === 1
          ? 'سالانه'
          : `هر ${toPersianDigits(interval)} سال`;
    }
  }

  switch (options.frequency) {
    case 'DAILY':
      return interval === 1 ? 'Daily' : `Every ${interval} days`;
    case 'WEEKLY':
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
    case 'MONTHLY':
      return interval === 1 ? 'Monthly' : `Every ${interval} months`;
    case 'YEARLY':
      return interval === 1 ? 'Yearly' : `Every ${interval} years`;
  }
}

/**
 * Computes the next occurrence Date for a recurring event based on a base date and RecurrenceOptions.
 * Handles Jalali leap years (کبیسه), month length boundaries (31/30/29 days), and weekday cycles.
 * Returns null if the recurrence has passed its UNTIL date.
 */
export function getNextOccurrenceDate(
  baseDate: Date,
  options: RecurrenceOptions
): Date | null {
  const interval = Math.max(1, options.interval ?? 1);
  const calendarType = options.calendarType ?? 'jalali';
  let nextDate: Date;

  switch (options.frequency) {
    case 'DAILY': {
      nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    }

    case 'WEEKLY': {
      if (!options.daysOfWeek || options.daysOfWeek.length === 0) {
        nextDate = new Date(baseDate);
        nextDate.setDate(nextDate.getDate() + interval * 7);
      } else {
        const sortedDays = [...new Set(options.daysOfWeek)].sort((a, b) => a - b);
        const currentDayIndex =
          calendarType === 'jalali'
            ? getPersianWeekday(baseDate)
            : baseDate.getDay();

        const laterDay = sortedDays.find((d) => d > currentDayIndex);
        if (laterDay !== undefined) {
          const daysToAdd = laterDay - currentDayIndex;
          nextDate = new Date(baseDate);
          nextDate.setDate(nextDate.getDate() + daysToAdd);
        } else {
          const firstDay = sortedDays[0] as number;
          const daysUntilEndOfWeek = 7 - currentDayIndex;
          const weeksToSkipDays = (interval - 1) * 7;
          const totalDays = daysUntilEndOfWeek + weeksToSkipDays + firstDay;
          nextDate = new Date(baseDate);
          nextDate.setDate(nextDate.getDate() + totalDays);
        }
      }
      break;
    }

    case 'MONTHLY': {
      if (calendarType === 'jalali') {
        const j = dateToJalali(baseDate);
        let nextMonth = j.month + interval;
        let nextYear = j.year;

        while (nextMonth > 12) {
          nextMonth -= 12;
          nextYear += 1;
        }

        const targetDay = options.dayOfMonth ?? j.day;
        const maxDays = getJalaliMonthLength(nextYear, nextMonth);
        const clampedDay = Math.min(targetDay, maxDays);

        nextDate = jalaliToDate(
          nextYear,
          nextMonth,
          clampedDay,
          baseDate.getHours(),
          baseDate.getMinutes(),
          baseDate.getSeconds(),
          baseDate.getMilliseconds()
        );
      } else {
        nextDate = new Date(baseDate);
        const targetDay = options.dayOfMonth ?? nextDate.getDate();
        nextDate.setMonth(nextDate.getMonth() + interval, 1);
        const maxDays = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate();
        nextDate.setDate(Math.min(targetDay, maxDays));
      }
      break;
    }

    case 'YEARLY': {
      if (calendarType === 'jalali') {
        const j = dateToJalali(baseDate);
        const nextYear = j.year + interval;
        const targetDay = options.dayOfMonth ?? j.day;
        const maxDays = getJalaliMonthLength(nextYear, j.month);
        const clampedDay = Math.min(targetDay, maxDays);

        nextDate = jalaliToDate(
          nextYear,
          j.month,
          clampedDay,
          baseDate.getHours(),
          baseDate.getMinutes(),
          baseDate.getSeconds(),
          baseDate.getMilliseconds()
        );
      } else {
        nextDate = new Date(baseDate);
        nextDate.setFullYear(nextDate.getFullYear() + interval);
      }
      break;
    }
  }

function parseUntilDate(val: string): Date | null {
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d;
  }
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/.exec(val);
  if (match) {
    const [, y, m, day, h = '00', min = '00', s = '00'] = match;
    const iso = `${y}-${m}-${day}T${h}:${min}:${s}Z`;
    const parsed = new Date(iso);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

  if (options.until) {
    const untilDate = parseUntilDate(options.until);
    if (untilDate && nextDate.getTime() > untilDate.getTime()) {
      return null;
    }
  }

  return nextDate;
}

export const RECURRENCE_PRESETS = [
  { id: 'none', labelFa: 'بدون تکرار', labelEn: 'Does not repeat', rrule: '' },
  {
    id: 'daily',
    labelFa: 'روزانه',
    labelEn: 'Daily',
    rrule: 'RRULE:FREQ=DAILY;INTERVAL=1'
  },
  {
    id: 'weekdays',
    labelFa: 'روزهای کاری',
    labelEn: 'Weekdays',
    rrule: 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU,MO,TU,WE;CAL=JALALI'
  },
  {
    id: 'weekly',
    labelFa: 'هفتگی',
    labelEn: 'Weekly',
    rrule: 'RRULE:FREQ=WEEKLY;INTERVAL=1'
  },
  {
    id: 'monthly',
    labelFa: 'ماهانه',
    labelEn: 'Monthly',
    rrule: 'RRULE:FREQ=MONTHLY;INTERVAL=1;CAL=JALALI'
  },
  {
    id: 'yearly',
    labelFa: 'سالانه',
    labelEn: 'Yearly',
    rrule: 'RRULE:FREQ=YEARLY;INTERVAL=1;CAL=JALALI'
  }
] as const;
