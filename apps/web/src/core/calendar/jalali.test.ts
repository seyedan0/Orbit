import { describe, expect, it } from 'vitest';
import {
  dateToJalali,
  formatJalaliDate,
  getJalaliMonthLength,
  getPersianWeekday,
  gregorianToJalali,
  isJalaliLeapYear,
  isoToJalali,
  jalaliToDate,
  jalaliToGregorian,
  jalaliToIso,
  parseJalaliDate,
  toPersianDigits,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAY_NAMES
} from './jalali';

describe('Jalali Calendar Utility', () => {
  describe('Leap Year Calculation (سال‌های کبیسه)', () => {
    it('correctly identifies leap years in modern cycle', () => {
      // 1395, 1399, 1403, 1408 are leap years
      expect(isJalaliLeapYear(1395)).toBe(true);
      expect(isJalaliLeapYear(1399)).toBe(true);
      expect(isJalaliLeapYear(1403)).toBe(true);
      expect(isJalaliLeapYear(1408)).toBe(true);
    });

    it('correctly identifies non-leap (common) years', () => {
      // 1400, 1401, 1402, 1404, 1405 are non-leap
      expect(isJalaliLeapYear(1400)).toBe(false);
      expect(isJalaliLeapYear(1401)).toBe(false);
      expect(isJalaliLeapYear(1402)).toBe(false);
      expect(isJalaliLeapYear(1404)).toBe(false);
      expect(isJalaliLeapYear(1405)).toBe(false);
    });

    it('throws RangeError for out-of-range years', () => {
      expect(() => isJalaliLeapYear(-100)).toThrow(RangeError);
      expect(() => isJalaliLeapYear(4000)).toThrow(RangeError);
    });
  });

  describe('Month Lengths (طول ماه‌ها)', () => {
    it('returns 31 days for Farvardin through Shahrivar (months 1 to 6)', () => {
      for (let m = 1; m <= 6; m++) {
        expect(getJalaliMonthLength(1403, m)).toBe(31);
        expect(getJalaliMonthLength(1404, m)).toBe(31);
      }
    });

    it('returns 30 days for Mehr through Bahman (months 7 to 11)', () => {
      for (let m = 7; m <= 11; m++) {
        expect(getJalaliMonthLength(1403, m)).toBe(30);
        expect(getJalaliMonthLength(1404, m)).toBe(30);
      }
    });

    it('returns 30 days for Esfand (month 12) in a leap year', () => {
      expect(getJalaliMonthLength(1399, 12)).toBe(30);
      expect(getJalaliMonthLength(1403, 12)).toBe(30);
      expect(getJalaliMonthLength(1408, 12)).toBe(30);
    });

    it('returns 29 days for Esfand (month 12) in a common year', () => {
      expect(getJalaliMonthLength(1402, 12)).toBe(29);
      expect(getJalaliMonthLength(1404, 12)).toBe(29);
      expect(getJalaliMonthLength(1405, 12)).toBe(29);
    });

    it('throws RangeError for invalid month numbers', () => {
      expect(() => getJalaliMonthLength(1404, 0)).toThrow(RangeError);
      expect(() => getJalaliMonthLength(1404, 13)).toThrow(RangeError);
    });
  });

  describe('Weekday Alignment (شروع هفته از شنبه)', () => {
    it('maps Saturday (شنبه) to 0', () => {
      // 2026-10-03 is Saturday
      const saturday = new Date(2026, 9, 3);
      expect(getPersianWeekday(saturday)).toBe(0);
    });

    it('maps Sunday (یک‌شنبه) to 1', () => {
      const sunday = new Date(2026, 9, 4);
      expect(getPersianWeekday(sunday)).toBe(1);
    });

    it('maps Wednesday (چهارشنبه) to 4', () => {
      const wednesday = new Date(2026, 9, 7);
      expect(getPersianWeekday(wednesday)).toBe(4);
    });

    it('maps Friday (جمعه) to 6', () => {
      const friday = new Date(2026, 9, 9);
      expect(getPersianWeekday(friday)).toBe(6);
    });

    it('includes correct weekday in dateToJalali', () => {
      const sat = new Date(2026, 9, 3);
      const res = dateToJalali(sat);
      expect(res.weekday).toBe(0);
      expect(PERSIAN_WEEKDAY_NAMES[res.weekday]).toBe('شنبه');
    });
  });

  describe('Gregorian <-> Jalali Conversion', () => {
    it('converts known dates accurately', () => {
      // 2024-03-20 -> 1 Farvardin 1403 (leap year start)
      expect(gregorianToJalali(2024, 3, 20)).toEqual({ year: 1403, month: 1, day: 1 });
      expect(jalaliToGregorian(1403, 1, 1)).toEqual({ year: 2024, month: 3, day: 20 });

      // 2025-03-20 -> 30 Esfand 1403 (leap day)
      expect(gregorianToJalali(2025, 3, 20)).toEqual({ year: 1403, month: 12, day: 30 });
      expect(jalaliToGregorian(1403, 12, 30)).toEqual({ year: 2025, month: 3, day: 20 });

      // 2025-03-21 -> 1 Farvardin 1404
      expect(gregorianToJalali(2025, 3, 21)).toEqual({ year: 1404, month: 1, day: 1 });
      expect(jalaliToGregorian(1404, 1, 1)).toEqual({ year: 2025, month: 3, day: 21 });

      // 2026-10-05 -> 13 Mehr 1405
      expect(gregorianToJalali(2026, 10, 5)).toEqual({ year: 1405, month: 7, day: 13 });
      expect(jalaliToGregorian(1405, 7, 13)).toEqual({ year: 2026, month: 10, day: 5 });
    });

    it('handles round-tripping for sample dates across all months', () => {
      for (let m = 1; m <= 12; m++) {
        const jDate = { year: 1403, month: m, day: 15 };
        const gDate = jalaliToGregorian(jDate.year, jDate.month, jDate.day);
        const back = gregorianToJalali(gDate.year, gDate.month, gDate.day);
        expect(back).toEqual(jDate);
      }
    });
  });

  describe('ISO and Date interoperability', () => {
    it('converts between Jalali and Date objects', () => {
      const date = jalaliToDate(1405, 7, 13, 14, 30);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(9); // October
      expect(date.getDate()).toBe(5);
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);

      const jalaliBack = dateToJalali(date);
      expect(jalaliBack.year).toBe(1405);
      expect(jalaliBack.month).toBe(7);
      expect(jalaliBack.day).toBe(13);
      expect(jalaliBack.weekday).toBe(2); // Monday = دوشنبه = 2
    });

    it('converts between Jalali and ISO string', () => {
      const iso = jalaliToIso(1405, 7, 13, 10, 0, false);
      const parsed = isoToJalali(iso);
      expect(parsed.year).toBe(1405);
      expect(parsed.month).toBe(7);
      expect(parsed.day).toBe(13);
    });

    it('zeros hours and minutes when isAllDay is true', () => {
      const iso = jalaliToIso(1405, 7, 13, 15, 45, true);
      const date = new Date(iso);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
    });
  });

  describe('Formatting & Digits', () => {
    it('converts digits to Persian numbers', () => {
      expect(toPersianDigits(1405)).toBe('۱۴۰۵');
      expect(toPersianDigits('2026-10-05')).toBe('۲۰۲۶-۱۰-۰۵');
    });

    it('formats Jalali date in numeric format with Persian digits', () => {
      const formatted = formatJalaliDate({ year: 1405, month: 7, day: 13 });
      expect(formatted).toBe('۱۴۰۵/۰۷/۱۳');
    });

    it('formats Jalali date in numeric format with ASCII digits when requested', () => {
      const formatted = formatJalaliDate(
        { year: 1405, month: 7, day: 13 },
        { persianDigits: false }
      );
      expect(formatted).toBe('1405/07/13');
    });

    it('formats Jalali date in full format with weekday and month name', () => {
      const formatted = formatJalaliDate(
        { year: 1405, month: 7, day: 13 },
        { format: 'full' }
      );
      expect(formatted).toContain('مهر');
      expect(formatted).toContain('دوشنبه');
      expect(formatted).toContain('۱۴۰۵');
    });

    it('formats Jalali date in short format', () => {
      const formatted = formatJalaliDate(
        { year: 1405, month: 7, day: 13 },
        { format: 'short' }
      );
      expect(formatted).toBe('۱۳ مهر');
    });

    it('appends time when includeTime is true', () => {
      const formatted = formatJalaliDate(
        { year: 1405, month: 7, day: 13, hour: 14, minute: 30 },
        { includeTime: true, persianDigits: false }
      );
      expect(formatted).toBe('1405/07/13 14:30');
    });
  });

  describe('Parsing Jalali strings', () => {
    it('parses valid Jalali strings with Persian digits', () => {
      const res = parseJalaliDate('۱۴۰۵/۰۷/۱۳');
      expect(res).toEqual({ year: 1405, month: 7, day: 13 });
    });

    it('parses valid Jalali strings with ASCII digits and dashes', () => {
      const res = parseJalaliDate('1405-7-13');
      expect(res).toEqual({ year: 1405, month: 7, day: 13 });
    });

    it('rejects invalid or out-of-range dates', () => {
      expect(parseJalaliDate('')).toBeNull();
      expect(parseJalaliDate('invalid-date')).toBeNull();
      expect(parseJalaliDate('1404/13/01')).toBeNull(); // month > 12
      expect(parseJalaliDate('1404/12/30')).toBeNull(); // 1404 is not a leap year, Esfand has 29 days
      expect(parseJalaliDate('1403/12/30')).toEqual({ year: 1403, month: 12, day: 30 }); // 1403 is leap year!
    });
  });

  describe('Constants verification', () => {
    it('has 12 Persian month names starting with Farvardin and ending with Esfand', () => {
      expect(PERSIAN_MONTH_NAMES).toHaveLength(12);
      expect(PERSIAN_MONTH_NAMES[0]).toBe('فروردین');
      expect(PERSIAN_MONTH_NAMES[11]).toBe('اسفند');
    });

    it('has 7 Persian weekday names starting with Shanbeh', () => {
      expect(PERSIAN_WEEKDAY_NAMES).toHaveLength(7);
      expect(PERSIAN_WEEKDAY_NAMES[0]).toBe('شنبه');
      expect(PERSIAN_WEEKDAY_NAMES[6]).toBe('جمعه');
    });
  });
});
