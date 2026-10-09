/**
 * Orbit Natural Language Date & Time Parser
 *
 * Lightweight, dependency-free date and time parsing engine with dual Persian (Jalali)
 * and English language support.
 *
 * Capabilities:
 * - Persian relative dates: «امروز», «فردا», «پسفردا», «پس‌فردا», «هفته بعد»
 * - Persian weekdays: «شنبه», «یکشنبه», «دوشنبه», «سه‌شنبه», «چهارشنبه», «پنج‌شنبه», «جمعه» (with optional «بعد» or «آینده»)
 * - Persian explicit month dates: «۱۵ مهر», «۲۰ اسفند»
 * - Persian times: «ساعت ۱۰», «ساعت 10:30», «ساعت ۱۰:۳۰», «ساعت ۵ عصر / بعدازظهر / بعد از ظهر», «ساعت ۹ صبح», «ساعت ۱۲ ظهر», «ساعت ۱۲ شب»
 * - English relative dates: 'today', 'tomorrow', 'day after tomorrow', 'next week'
 * - English weekdays: 'monday' ... 'sunday', 'next monday' ... 'next sunday'
 * - English explicit times: 'at 5pm', 'at 10:30am', 'at 16:00', '5pm', '10:30am'
 * - Clean title extraction stripping matched date/time tokens.
 */

import {
  GREGORIAN_MONTH_NAMES,
  GREGORIAN_WEEKDAY_NAMES,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAY_NAMES,
  dateToJalali,
  jalaliToDate,
  toPersianDigits
} from './jalali';

export interface ParsedNaturalDateResult {
  cleanTitle: string;
  detectedDate: Date | null;
  isAllDay: boolean;
  matchedText: string | null;
}

interface SpanMatch {
  start: number;
  end: number;
  text: string;
}

interface DateMatchResult extends SpanMatch {
  targetDate: Date;
}

interface TimeMatchResult extends SpanMatch {
  hour: number;
  minute: number;
}

/**
 * Converts Persian (۰-۹) and Arabic (٠-٩) digits to standard Latin (0-9) digits.
 */
export function toLatinDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

// Delimiters for Persian word boundary check
const BOUNDARY_PRE = '(?:^|(?<=[\\s،,.:؛!؟\\-"\'()[\\]{}]))';
const BOUNDARY_POST = '(?:$|(?=[\\s،,.:؛!؟\\-"\'()[\\]{}]))';

// Persian weekdays mapping to JavaScript getDay() index (0 = Sunday, ..., 6 = Saturday)
const PERSIAN_WEEKDAY_MAP: Record<string, number> = {
  شنبه: 6,
  یکشنبه: 0,
  'یک‌شنبه': 0,
  'یک شنبه': 0,
  دوشنبه: 1,
  'دو شنبه': 1,
  سهشنبه: 2,
  'سه‌شنبه': 2,
  'سه شنبه': 2,
  چهارشنبه: 3,
  'چهار شنبه': 3,
  پنجشنبه: 4,
  'پنج‌شنبه': 4,
  'پنج شنبه': 4,
  جمعه: 5
};

const ENGLISH_WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

/**
 * Calculates date offset for weekday.
 */
function calculateWeekdayTarget(
  targetJsDay: number,
  refDate: Date,
  isNext: boolean,
  isPersian = false
): Date {
  const currentJsDay = refDate.getDay();
  let diff = (targetJsDay - currentJsDay + 7) % 7;

  if (diff === 0) {
    diff = 7;
  } else if (isNext) {
    if (isPersian) {
      // In Persian, «شنبه بعد» or «دوشنبه بعد» refers to following week's occurrence
      diff += 7;
    } else {
      // In English: if day is later in current week (e.g. Wednesday -> next Friday), push to next week.
      // If day has already occurred this week (e.g. Wednesday -> next Monday), it is already next week.
      if (targetJsDay > currentJsDay) {
        diff += 7;
      }
    }
  }

  const result = new Date(refDate.getTime());
  result.setDate(result.getDate() + diff);
  return result;
}

/**
 * Detects Persian date token in the string.
 */
function matchPersianDate(input: string, refDate: Date): DateMatchResult | null {
  // 1. Relative dates: «پسفردا», «پس‌فردا», «فردا», «امروز», «هفته بعد»
  const relRegex = new RegExp(
    `${BOUNDARY_PRE}(?:(?:برای|در|تا)\\s+)?(پس[\\s\\u200c]?فردا|فردا|امروز|هفته[\\s\\u200c]?(?:ی\\s+|ٔ\\s+)?(?:بعد|آینده|اینده))${BOUNDARY_POST}`,
    'iu'
  );
  const relMatch = relRegex.exec(input);
  if (relMatch && relMatch.index !== undefined) {
    const rawWord = relMatch[1] ?? '';
    let offsetDays = 0;
    if (/^پس[\s\u200c]?فردا$/iu.test(rawWord)) {
      offsetDays = 2;
    } else if (rawWord === 'فردا') {
      offsetDays = 1;
    } else if (rawWord === 'امروز') {
      offsetDays = 0;
    } else if (/هفته/iu.test(rawWord)) {
      offsetDays = 7;
    }

    const target = new Date(refDate.getTime());
    target.setDate(target.getDate() + offsetDays);

    return {
      start: relMatch.index,
      end: relMatch.index + relMatch[0].length,
      text: relMatch[0],
      targetDate: target
    };
  }

  // 2. Persian weekdays: «شنبه», «یکشنبه», «دوشنبه», ..., «شنبه بعد»
  const weekdayRegex = new RegExp(
    `${BOUNDARY_PRE}(?:(?:برای|در|تا)\\s+)?(شنبه|یک[\\s\\u200c]?شنبه|دو[\\s\\u200c]?شنبه|سه[\\s\\u200c]?شنبه|چهار[\\s\\u200c]?شنبه|پنج[\\s\\u200c]?شنبه|جمعه)(?:[\\s\\u200c]+(?:ی\\s+|ٔ\\s+)?(بعد|آینده|اینده))?${BOUNDARY_POST}`,
    'iu'
  );
  const weekdayMatch = weekdayRegex.exec(input);
  if (weekdayMatch && weekdayMatch.index !== undefined) {
    const dayName = weekdayMatch[1] ?? '';
    const modifier = weekdayMatch[2];
    const isNext = Boolean(modifier);

    // Normalize weekday string for map lookup
    let normalizedDay = dayName.replace(/\s+/g, '');
    if (normalizedDay === 'یک‌شنبه') normalizedDay = 'یکشنبه';
    if (normalizedDay === 'سه‌شنبه') normalizedDay = 'سهشنبه';
    if (normalizedDay === 'پنج‌شنبه') normalizedDay = 'پنجشنبه';

    const targetJsDay = PERSIAN_WEEKDAY_MAP[normalizedDay] ?? PERSIAN_WEEKDAY_MAP[dayName];
    if (targetJsDay !== undefined) {
      const target = calculateWeekdayTarget(targetJsDay, refDate, isNext, true);
      return {
        start: weekdayMatch.index,
        end: weekdayMatch.index + weekdayMatch[0].length,
        text: weekdayMatch[0],
        targetDate: target
      };
    }
  }

  // 3. Explicit Persian month: «۱۵ مهر», «۲۰ اسفند»
  const monthNamesPattern = PERSIAN_MONTH_NAMES.join('|');
  const explicitRegex = new RegExp(
    `${BOUNDARY_PRE}(?:(?:برای|در|تا)\\s+)?([۰-۹0-9]{1,2})\\s+(${monthNamesPattern})(?:[\\s\\u200c]*ماه)?${BOUNDARY_POST}`,
    'iu'
  );
  const explicitMatch = explicitRegex.exec(input);
  if (explicitMatch && explicitMatch.index !== undefined) {
    const day = parseInt(toLatinDigits(explicitMatch[1] ?? '1'), 10);
    const monthName = explicitMatch[2] ?? '';
    const monthIndex = PERSIAN_MONTH_NAMES.indexOf(monthName as typeof PERSIAN_MONTH_NAMES[number]);
    if (monthIndex !== -1 && day >= 1 && day <= 31) {
      const jRef = dateToJalali(refDate);
      let year = jRef.year;
      // If month/day is already passed in current Jalali year, roll over to next year
      if (
        monthIndex + 1 < jRef.month ||
        (monthIndex + 1 === jRef.month && day < jRef.day)
      ) {
        year += 1;
      }
      const target = jalaliToDate(year, monthIndex + 1, day);
      return {
        start: explicitMatch.index,
        end: explicitMatch.index + explicitMatch[0].length,
        text: explicitMatch[0],
        targetDate: target
      };
    }
  }

  return null;
}

/**
 * Detects English date token in the string.
 */
function matchEnglishDate(input: string, refDate: Date): DateMatchResult | null {
  // 1. Relative English dates (prevent matching inside words with strict whitespace / start boundary)
  const relRegex =
    /(?:(?:^|\s)(?:on|for|by)\s+)?\b(day\s+after\s+tomorrow|tomorrow|today|next\s+week)\b/i;
  const relMatch = relRegex.exec(input);
  if (relMatch && relMatch.index !== undefined) {
    // Trim leading whitespace captured by (?:^|\s)
    let matchStart = relMatch.index;
    let matchText = relMatch[0];
    if (matchText.startsWith(' ')) {
      matchStart += 1;
      matchText = matchText.slice(1);
    }

    const rawWord = relMatch[1]?.toLowerCase() ?? '';
    let offsetDays = 0;
    if (rawWord === 'day after tomorrow') {
      offsetDays = 2;
    } else if (rawWord === 'tomorrow') {
      offsetDays = 1;
    } else if (rawWord === 'today') {
      offsetDays = 0;
    } else if (rawWord === 'next week') {
      offsetDays = 7;
    }

    const target = new Date(refDate.getTime());
    target.setDate(target.getDate() + offsetDays);

    return {
      start: matchStart,
      end: matchStart + matchText.length,
      text: matchText,
      targetDate: target
    };
  }

  // 2. English weekdays: 'monday' ... 'sunday', 'next monday' ...
  const weekdayRegex =
    /(?:(?:^|\s)(?:on|for|by)\s+)?\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
  const weekdayMatch = weekdayRegex.exec(input);
  if (weekdayMatch && weekdayMatch.index !== undefined) {
    let matchStart = weekdayMatch.index;
    let matchText = weekdayMatch[0];
    if (matchText.startsWith(' ')) {
      matchStart += 1;
      matchText = matchText.slice(1);
    }

    const isNext = Boolean(weekdayMatch[1]);
    const dayName = weekdayMatch[2]?.toLowerCase() ?? '';
    const targetJsDay = ENGLISH_WEEKDAY_MAP[dayName];
    if (targetJsDay !== undefined) {
      const target = calculateWeekdayTarget(targetJsDay, refDate, isNext, false);
      return {
        start: matchStart,
        end: matchStart + matchText.length,
        text: matchText,
        targetDate: target
      };
    }
  }

  // 3. English explicit dates: '15 october' or 'october 15'
  const monthNamesPattern = GREGORIAN_MONTH_NAMES.join('|');
  const explicitRegex = new RegExp(
    `(?:(?:^|\\s)(?:on|for|by)\\s+)?\\b(?:(\\d{1,2})\\s+(${monthNamesPattern})|(${monthNamesPattern})\\s+(\\d{1,2}))\\b`,
    'i'
  );
  const explicitMatch = explicitRegex.exec(input);
  if (explicitMatch && explicitMatch.index !== undefined) {
    let matchStart = explicitMatch.index;
    let matchText = explicitMatch[0];
    if (matchText.startsWith(' ')) {
      matchStart += 1;
      matchText = matchText.slice(1);
    }

    const dayStr = explicitMatch[1] ?? explicitMatch[4] ?? '1';
    const monthStr = explicitMatch[2] ?? explicitMatch[3] ?? '';
    const day = parseInt(dayStr, 10);
    const monthIndex = GREGORIAN_MONTH_NAMES.findIndex(
      (m) => m.toLowerCase() === monthStr.toLowerCase()
    );

    if (monthIndex !== -1 && day >= 1 && day <= 31) {
      let year = refDate.getFullYear();
      if (
        monthIndex < refDate.getMonth() ||
        (monthIndex === refDate.getMonth() && day < refDate.getDate())
      ) {
        year += 1;
      }
      const target = new Date(year, monthIndex, day);
      return {
        start: matchStart,
        end: matchStart + matchText.length,
        text: matchText,
        targetDate: target
      };
    }
  }

  return null;
}

/**
 * Detects Persian time token in the string.
 */
function matchPersianTime(input: string): TimeMatchResult | null {
  // Matches «ساعت ۱۰», «ساعت 10:30», «ساعت ۵ عصر / بعدازظهر», «ساعت ۹ صبح», «ساعت ۱۲ ظهر», «ساعت ۱۲ شب»
  // and also without «ساعت»: «۵ عصر», «۱۰:۳۰ صبح»
  const timeRegex = new RegExp(
    `${BOUNDARY_PRE}(?:(?:در|از|راس|رأس|تا)\\s+)?(?:ساعت\\s*)([۰-۹0-9]{1,2})(?:[:：]([۰-۹0-9]{1,2}))?\\s*(صبح|عصر|بعد[\\s\\u200c]*از[\\s\\u200c]*ظهر|بعدازظهر|شب|ظهر)?${BOUNDARY_POST}|${BOUNDARY_PRE}([۰-۹0-9]{1,2})(?:[:：]([۰-۹0-9]{1,2}))?\\s*(صبح|عصر|بعد[\\s\\u200c]*از[\\s\\u200c]*ظهر|بعدازظهر|شب|ظهر)${BOUNDARY_POST}`,
    'iu'
  );

  const match = timeRegex.exec(input);
  if (match && match.index !== undefined) {
    const rawHour = match[1] ?? match[4];
    const rawMin = match[2] ?? match[5];
    const period = match[3] ?? match[6];

    if (!rawHour) return null;

    let hour = parseInt(toLatinDigits(rawHour), 10);
    const minute = rawMin ? parseInt(toLatinDigits(rawMin), 10) : 0;

    if (isNaN(hour) || isNaN(minute) || minute < 0 || minute > 59) return null;

    if (period) {
      const p = period.replace(/[\s\u200c]+/g, '');
      if (p === 'صبح') {
        if (hour === 12) hour = 0;
      } else if (p === 'عصر' || p === 'بعدازظهر' || p === 'بعدازظهر') {
        if (hour < 12) hour += 12;
      } else if (p === 'ظهر') {
        if (hour < 12) hour = 12;
      } else if (p === 'شب') {
        if (hour === 12) hour = 0;
        else if (hour < 12 && hour >= 6) hour += 12;
      }
    }

    if (hour < 0 || hour > 23) return null;

    return {
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      hour,
      minute
    };
  }

  return null;
}

/**
 * Detects English time token in the string.
 */
function matchEnglishTime(input: string): TimeMatchResult | null {
  // Matches 'at 5pm', 'at 10:30am', 'at 16:00', '5pm', '10:30am', 'at 4'
  const timeRegex =
    /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\bat\s+(\d{1,2}):(\d{2})\b|\bat\s+(\d{1,2})\b/i;

  const match = timeRegex.exec(input);
  if (match && match.index !== undefined) {
    let hour = 0;
    let minute = 0;

    if (match[1] && match[3]) {
      // 5pm or at 10:30am
      hour = parseInt(match[1], 10);
      minute = match[2] ? parseInt(match[2], 10) : 0;
      const period = match[3].toLowerCase();
      if (period === 'pm' && hour < 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;
    } else if (match[4] && match[5]) {
      // at 16:00
      hour = parseInt(match[4], 10);
      minute = parseInt(match[5], 10);
    } else if (match[6]) {
      // at 4
      hour = parseInt(match[6], 10);
      minute = 0;
    } else {
      return null;
    }

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    return {
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      hour,
      minute
    };
  }

  return null;
}

/**
 * Strips matched date/time spans from the input title cleanly.
 */
function stripMatchedSpans(
  input: string,
  dateSpan: SpanMatch | null,
  timeSpan: SpanMatch | null
): { cleanTitle: string; matchedText: string | null } {
  if (!dateSpan && !timeSpan) {
    return { cleanTitle: input.trim(), matchedText: null };
  }

  let cleaned = '';
  let matchedText = '';

  if (dateSpan && timeSpan) {
    const firstSpan = dateSpan.start <= timeSpan.start ? dateSpan : timeSpan;
    const secondSpan = dateSpan.start <= timeSpan.start ? timeSpan : dateSpan;

    // Check if they are contiguous (separated only by whitespace or simple connectors like 'و', 'at', ',')
    const between = input.slice(firstSpan.end, secondSpan.start);
    const isContiguous = /^[\s,،وat]*$/i.test(between);

    if (isContiguous) {
      const fullStart = firstSpan.start;
      const fullEnd = secondSpan.end;
      matchedText = input.slice(fullStart, fullEnd).trim();
      cleaned = input.slice(0, fullStart) + ' ' + input.slice(fullEnd);
    } else {
      matchedText = `${dateSpan.text} ${timeSpan.text}`.trim();
      cleaned =
        input.slice(0, firstSpan.start) +
        ' ' +
        input.slice(firstSpan.end, secondSpan.start) +
        ' ' +
        input.slice(secondSpan.end);
    }
  } else if (dateSpan) {
    matchedText = dateSpan.text.trim();
    cleaned = input.slice(0, dateSpan.start) + ' ' + input.slice(dateSpan.end);
  } else if (timeSpan) {
    matchedText = timeSpan.text.trim();
    cleaned = input.slice(0, timeSpan.start) + ' ' + input.slice(timeSpan.end);
  }

  // Clean trailing or leading prepositions and clean up spaces
  let cleanTitle = cleaned
    .replace(/\s+/g, ' ')
    .trim();

  // Strip dangling connectors like «برای», «در», «تا», 'for', 'at', 'on', 'by' with word boundaries
  cleanTitle = cleanTitle
    .replace(/\b(?:on|for|by|at)\s*$/gi, '')
    .replace(/^\s*(?:on|for|by|at)\b\s*/gi, '')
    .replace(/(?:^|\s)(?:برای|در|تا)\s*$/gi, '')
    .replace(/^\s*(?:برای|در|تا)\s+/gi, '')
    .replace(/\s*[,،\-:]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If the cleaning completely emptied the title (e.g. user typed only "فردا"), fallback to original input
  if (!cleanTitle) {
    cleanTitle = input.trim();
  }

  return { cleanTitle, matchedText: matchedText || null };
}

/**
 * Pure bilingual Natural Language Date and Time parser.
 *
 * @param input Raw task title string
 * @param referenceDate Reference point in time (defaults to current Date)
 * @param _calendarType Preferred calendar system ('jalali' or 'gregorian')
 */
export function parseNaturalDate(
  input: string,
  referenceDate: Date = new Date(),
  _calendarType: 'jalali' | 'gregorian' = 'jalali'
): ParsedNaturalDateResult {
  if (!input || !input.trim()) {
    return {
      cleanTitle: '',
      detectedDate: null,
      isAllDay: true,
      matchedText: null
    };
  }

  // 1. Detect Date token (Persian or English)
  const dateMatch = matchPersianDate(input, referenceDate) ?? matchEnglishDate(input, referenceDate);

  // 2. Detect Time token (Persian or English)
  let timeMatch = matchPersianTime(input);
  if (!timeMatch) {
    timeMatch = matchEnglishTime(input);
  }

  // If timeMatch overlaps with dateMatch, ignore time match to prevent collision
  if (
    dateMatch &&
    timeMatch &&
    ((timeMatch.start >= dateMatch.start && timeMatch.start < dateMatch.end) ||
      (dateMatch.start >= timeMatch.start && dateMatch.start < timeMatch.end))
  ) {
    timeMatch = null;
  }

  // If neither date nor time was matched, return untouched
  if (!dateMatch && !timeMatch) {
    return {
      cleanTitle: input.trim(),
      detectedDate: null,
      isAllDay: true,
      matchedText: null
    };
  }

  // 3. Assemble target Date
  let targetDate: Date;
  let isAllDay = true;

  if (dateMatch) {
    targetDate = new Date(dateMatch.targetDate.getTime());
  } else {
    // Only time was matched; default day is today (referenceDate)
    targetDate = new Date(referenceDate.getTime());
  }

  if (timeMatch) {
    targetDate.setHours(timeMatch.hour, timeMatch.minute, 0, 0);
    isAllDay = false;
  } else {
    targetDate.setHours(0, 0, 0, 0);
    isAllDay = true;
  }

  // 4. Strip matched tokens cleanly
  const { cleanTitle, matchedText } = stripMatchedSpans(input, dateMatch, timeMatch);

  return {
    cleanTitle,
    detectedDate: targetDate,
    isAllDay,
    matchedText
  };
}

/**
 * Formats a localized chip label for visual feedback in TaskForm.
 * e.g. «🗓️ فردا ساعت ۱۰:۰۰» or «🗓️ Tomorrow at 10:00»
 */
export function formatDetectedDateChip(
  date: Date,
  isAllDay: boolean,
  calendarType: 'jalali' | 'gregorian' = 'jalali',
  referenceDate: Date = new Date()
): string {
  const refStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (dateStart.getTime() - refStart.getTime()) / (24 * 60 * 60 * 1000)
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (calendarType === 'jalali') {
    let dateLabel = '';
    if (diffDays === 0) {
      dateLabel = 'امروز';
    } else if (diffDays === 1) {
      dateLabel = 'فردا';
    } else if (diffDays === 2) {
      dateLabel = 'پس‌فردا';
    } else {
      const j = dateToJalali(date);
      dateLabel = `${PERSIAN_WEEKDAY_NAMES[j.weekday]} ${toPersianDigits(j.day)} ${PERSIAN_MONTH_NAMES[j.month - 1]}`;
    }

    const timeLabel = isAllDay ? '' : ` ساعت ${toPersianDigits(timeStr)}`;
    return `🗓️ ${dateLabel}${timeLabel}`;
  } else {
    let dateLabel = '';
    if (diffDays === 0) {
      dateLabel = 'Today';
    } else if (diffDays === 1) {
      dateLabel = 'Tomorrow';
    } else if (diffDays === 2) {
      dateLabel = 'Day after tomorrow';
    } else {
      const monthName = GREGORIAN_MONTH_NAMES[date.getMonth()];
      const dayName = GREGORIAN_WEEKDAY_NAMES[date.getDay()];
      dateLabel = `${dayName}, ${monthName} ${date.getDate()}`;
    }

    const timeLabel = isAllDay ? '' : ` at ${timeStr}`;
    return `🗓️ ${dateLabel}${timeLabel}`;
  }
}
