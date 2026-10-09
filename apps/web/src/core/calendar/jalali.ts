/**
 * Orbit Persian (Jalali / Solar Hijri) Calendar Engine
 *
 * Pure, dependency-light calendar utility providing accurate conversions
 * between Gregorian (Date/ISO-8601) and Persian Jalali systems.
 *
 * Algorithm:
 * Uses the astronomical/arithmetical 33-year cycle algorithm (Kazimierz M. Borkowski, 1996),
 * exact within the Jalali year range -61 to 3177.
 *
 * Calendar Rules:
 * - Persian year: Months 1..6 (Farvardin-Shahrivar) = 31 days.
 * - Months 7..11 (Mehr-Bahman) = 30 days.
 * - Month 12 (Esfand) = 29 days in a common year, 30 days in a leap year (کبیسه).
 * - Weekday index: Saturday (شنبه) is index 0 for fa-IR, Friday (جمعه) is index 6.
 * - All stored/synced timestamps in Orbit remain UTC ISO-8601 strings.
 */

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

export interface GregorianDate {
  year: number;
  month: number;
  day: number;
}

export type PersianWeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
] as const;

export const PERSIAN_WEEKDAY_NAMES = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه'
] as const;

export const PERSIAN_WEEKDAY_SHORT = [
  'ش',
  'ی',
  'د',
  'س',
  'چ',
  'پ',
  'ج'
] as const;

export const GREGORIAN_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

export const GREGORIAN_WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const;

export const GREGORIAN_WEEKDAY_SHORT = [
  'Su',
  'Mo',
  'Tu',
  'We',
  'Th',
  'Fr',
  'Sa'
] as const;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181,
  1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
] as const;

export const MIN_JALALI_YEAR = BREAKS[0];
export const MAX_JALALI_YEAR = (BREAKS[BREAKS.length - 1] as number) - 1;

function div(a: number, b: number): number {
  return ~~(a / b);
}

function mod(a: number, b: number): number {
  return a - ~~(a / b) * b;
}

/**
 * Determines whether a Jalali year is a leap year (سال کبیسه).
 * In a leap year, Esfand has 30 days instead of 29.
 */
export function isJalaliLeapYear(year: number): boolean {
  if (!Number.isFinite(year) || year < MIN_JALALI_YEAR || year > MAX_JALALI_YEAR) {
    throw new RangeError(
      `Invalid Jalali year ${year}: must be between ${MIN_JALALI_YEAR} and ${MAX_JALALI_YEAR}`
    );
  }

  let jp: number = BREAKS[0];
  let jump = 0;

  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i] as number;
    jump = jm - jp;
    if (year < jm) break;
    jp = jm;
  }

  const n = year - jp;
  let adjusted = n;
  if (jump - n < 6) {
    adjusted = n - jump + div(jump + 4, 33) * 33;
  }
  let leap = mod(mod(adjusted + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return leap === 0;
}

/**
 * Returns the number of days in the given Jalali month (1-indexed).
 * Farvardin-Shahrivar (1..6): 31 days
 * Mehr-Bahman (7..11): 30 days
 * Esfand (12): 30 days in leap years, 29 days otherwise
 */
export function getJalaliMonthLength(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new RangeError(`Invalid Jalali month ${month}: must be between 1 and 12`);
  }
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

/**
 * Core calculation for Gregorian year and March offset corresponding to Farvardin 1.
 */
function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const gy = jy + 621;
  let leapJ = -14;
  let jp: number = BREAKS[0];
  let jump = 0;

  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i] as number;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  const n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  let adjusted = n;
  if (jump - n < 6) {
    adjusted = n - jump + div(jump + 4, 33) * 33;
  }
  let leap = mod(mod(adjusted + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

/**
 * Converts Gregorian date (gy, gm 1..12, gd 1..31) to Julian Day number.
 */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/**
 * Converts Julian Day number to Gregorian date (gy, gm 1..12, gd 1..31).
 */
function d2g(jdn: number): GregorianDate {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { year: gy, month: gm, day: gd };
}

/**
 * Converts Jalali date (jy, jm 1..12, jd 1..31) to Julian Day number.
 */
function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

/**
 * Converts Julian Day number to Jalali date (jy, jm 1..12, jd 1..31).
 */
function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).year;
  let jy = Math.min(gy - 621, MAX_JALALI_YEAR);
  const r = jalCal(jy);
  const jdn1f = g2d(r.gy, 3, r.march);

  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      return { year: jy, month: 1 + div(k, 31), day: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { year: jy, month: 7 + div(k, 30), day: mod(k, 30) + 1 };
}

/**
 * Converts Gregorian year, month (1..12), and day (1..31) to JalaliDate.
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

/**
 * Converts Jalali year, month (1..12), and day (1..31) to GregorianDate.
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  return d2g(j2d(jy, jm, jd));
}

/**
 * Maps a standard Date to Persian weekday index:
 * 0: شنبه (Saturday)
 * 1: یک‌شنبه (Sunday)
 * 2: دوشنبه (Monday)
 * 3: سه‌شنبه (Tuesday)
 * 4: چهارشنبه (Wednesday)
 * 5: پنج‌شنبه (Thursday)
 * 6: جمعه (Friday)
 */
export function getPersianWeekday(date: Date): PersianWeekdayIndex {
  return ((date.getDay() + 1) % 7) as PersianWeekdayIndex;
}

/**
 * Converts a JavaScript Date object (in local time) to JalaliDate with Persian weekday index.
 */
export function dateToJalali(date: Date): JalaliDate & { weekday: PersianWeekdayIndex } {
  const jalali = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
  return {
    ...jalali,
    weekday: getPersianWeekday(date)
  };
}

/**
 * Converts Jalali year, month, and day to a local JavaScript Date object.
 */
export function jalaliToDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0
): Date {
  const g = jalaliToGregorian(year, month, day);
  return new Date(g.year, g.month - 1, g.day, hours, minutes, seconds, ms);
}

/**
 * Converts an ISO-8601 UTC string to Jalali representation in the specified or local timezone.
 */
export function isoToJalali(
  isoString: string
): JalaliDate & { hour: number; minute: number; weekday: PersianWeekdayIndex } {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new TypeError(`Invalid ISO date string: ${isoString}`);
  }
  const jalali = dateToJalali(date);
  return {
    ...jalali,
    hour: date.getHours(),
    minute: date.getMinutes()
  };
}

/**
 * Converts Jalali date components (and optional local time) to a canonical UTC ISO-8601 string.
 * If isAllDay is true, hours and minutes are zeroed (midnight).
 */
export function jalaliToIso(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  isAllDay = false
): string {
  const date = jalaliToDate(
    year,
    month,
    day,
    isAllDay ? 0 : hours,
    isAllDay ? 0 : minutes,
    0,
    0
  );
  return date.toISOString();
}

/**
 * Converts English digits (0-9) to Persian digits (۰-۹).
 */
export function toPersianDigits(input: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(input).replace(/[0-9]/g, (char) => persianDigits[Number(char)] ?? char);
}

/**
 * Formats a Jalali date into a readable string.
 * - 'numeric': '1405/07/13'
 * - 'full': 'دوشنبه، ۱۳ مهر ۱۴۰۵'
 * - 'short': '۱۳ مهر'
 */
export function formatJalaliDate(
  date: JalaliDate & { hour?: number; minute?: number },
  options: {
    format?: 'numeric' | 'full' | 'short';
    includeTime?: boolean;
    persianDigits?: boolean;
  } = {}
): string {
  const {
    format = 'numeric',
    includeTime = false,
    persianDigits = true
  } = options;

  const monthName = PERSIAN_MONTH_NAMES[date.month - 1] ?? '';
  let result = '';

  if (format === 'numeric') {
    const mm = String(date.month).padStart(2, '0');
    const dd = String(date.day).padStart(2, '0');
    result = `${date.year}/${mm}/${dd}`;
  } else if (format === 'full') {
    const localDate = jalaliToDate(date.year, date.month, date.day);
    const weekdayName = PERSIAN_WEEKDAY_NAMES[getPersianWeekday(localDate)];
    result = `${weekdayName}، ${date.day} ${monthName} ${date.year}`;
  } else if (format === 'short') {
    result = `${date.day} ${monthName}`;
  }

  if (includeTime && date.hour !== undefined && date.minute !== undefined) {
    const hh = String(date.hour).padStart(2, '0');
    const min = String(date.minute).padStart(2, '0');
    result = `${result} ${hh}:${min}`;
  }

  return persianDigits ? toPersianDigits(result) : result;
}

/**
 * Parses a Jalali date string (e.g. "1405/07/13" or "1405-07-13" with Persian or ASCII digits)
 * into a JalaliDate or null if invalid.
 */
export function parseJalaliDate(input: string): JalaliDate | null {
  if (!input || typeof input !== 'string') return null;

  // Convert Persian digits to English digits
  const normalized = input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .trim();

  const match = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;

  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10);
  const day = parseInt(match[3]!, 10);

  if (year < MIN_JALALI_YEAR || year > MAX_JALALI_YEAR) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > getJalaliMonthLength(year, month)) return null;

  return { year, month, day };
}
