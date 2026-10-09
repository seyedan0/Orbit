import { describe, expect, it } from 'vitest';
import {
  parseRRule,
  buildRRule,
  formatRRuleText,
  getNextOccurrenceDate,
  RECURRENCE_PRESETS
} from './recurrence';
import { dateToJalali, jalaliToDate } from '../calendar/jalali';

describe('Recurrence Engine (P4-REC-001)', () => {
  describe('parseRRule & buildRRule', () => {
    it('parses simple daily RRULE string', () => {
      const parsed = parseRRule('RRULE:FREQ=DAILY;INTERVAL=1');
      expect(parsed.frequency).toBe('DAILY');
      expect(parsed.interval).toBe(1);
    });

    it('parses RRULE without RRULE: prefix', () => {
      const parsed = parseRRule('FREQ=WEEKLY;INTERVAL=2;CAL=GREGORIAN');
      expect(parsed.frequency).toBe('WEEKLY');
      expect(parsed.interval).toBe(2);
      expect(parsed.calendarType).toBe('gregorian');
    });

    it('parses BYDAY for Jalali week days (SA,SU,MO,TU,WE)', () => {
      const parsed = parseRRule('RRULE:FREQ=WEEKLY;BYDAY=SA,SU,MO,TU,WE;CAL=JALALI');
      expect(parsed.frequency).toBe('WEEKLY');
      expect(parsed.calendarType).toBe('jalali');
      expect(parsed.daysOfWeek).toEqual([0, 1, 2, 3, 4]);
    });

    it('parses BYDAY for Gregorian week days (MO,TU,WE,TH,FR)', () => {
      const parsed = parseRRule('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;CAL=GREGORIAN');
      expect(parsed.frequency).toBe('WEEKLY');
      expect(parsed.calendarType).toBe('gregorian');
      expect(parsed.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    });

    it('parses BYMONTHDAY, UNTIL, and COUNT', () => {
      const parsed = parseRRule(
        'RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15;UNTIL=2026-12-31T23:59:59.000Z;COUNT=10;CAL=JALALI'
      );
      expect(parsed.frequency).toBe('MONTHLY');
      expect(parsed.interval).toBe(1);
      expect(parsed.dayOfMonth).toBe(15);
      expect(parsed.until).toBe('2026-12-31T23:59:59.000Z');
      expect(parsed.count).toBe(10);
      expect(parsed.calendarType).toBe('jalali');
    });

    it('builds canonical RRULE string', () => {
      const rrule = buildRRule({
        frequency: 'WEEKLY',
        interval: 2,
        calendarType: 'jalali',
        daysOfWeek: [0, 2] // Saturday, Monday
      });
      expect(rrule).toBe('RRULE:FREQ=WEEKLY;INTERVAL=2;CAL=JALALI;BYDAY=SA,MO');
    });

    it('builds monthly RRULE with dayOfMonth and count', () => {
      const rrule = buildRRule({
        frequency: 'MONTHLY',
        interval: 1,
        calendarType: 'jalali',
        dayOfMonth: 20,
        count: 5
      });
      expect(rrule).toBe('RRULE:FREQ=MONTHLY;CAL=JALALI;BYMONTHDAY=20;COUNT=5');
    });
  });

  describe('formatRRuleText', () => {
    it('formats localized descriptions in Persian', () => {
      expect(formatRRuleText({ frequency: 'DAILY', interval: 1 }, 'fa')).toBe('روزانه');
      expect(formatRRuleText({ frequency: 'DAILY', interval: 3 }, 'fa')).toBe('هر ۳ روز');
      expect(formatRRuleText({ frequency: 'WEEKLY', interval: 1 }, 'fa')).toBe('هفتگی');
      expect(formatRRuleText({ frequency: 'WEEKLY', interval: 2 }, 'fa')).toBe('هر ۲ هفته');
      expect(
        formatRRuleText(
          { frequency: 'WEEKLY', daysOfWeek: [0, 1, 2, 3, 4], calendarType: 'jalali' },
          'fa'
        )
      ).toBe('روزهای کاری');
      expect(formatRRuleText({ frequency: 'MONTHLY', interval: 1 }, 'fa')).toBe('ماهانه');
      expect(formatRRuleText({ frequency: 'MONTHLY', interval: 6 }, 'fa')).toBe('هر ۶ ماه');
      expect(formatRRuleText({ frequency: 'YEARLY', interval: 1 }, 'fa')).toBe('سالانه');
    });

    it('formats localized descriptions in English', () => {
      expect(formatRRuleText({ frequency: 'DAILY', interval: 1 }, 'en')).toBe('Daily');
      expect(formatRRuleText({ frequency: 'DAILY', interval: 3 }, 'en')).toBe('Every 3 days');
      expect(formatRRuleText({ frequency: 'WEEKLY', interval: 1 }, 'en')).toBe('Weekly');
      expect(
        formatRRuleText(
          { frequency: 'WEEKLY', daysOfWeek: [1, 2, 3, 4, 5], calendarType: 'gregorian' },
          'en'
        )
      ).toBe('Weekdays');
      expect(formatRRuleText({ frequency: 'MONTHLY', interval: 1 }, 'en')).toBe('Monthly');
      expect(formatRRuleText({ frequency: 'YEARLY', interval: 1 }, 'en')).toBe('Yearly');
    });
  });

  describe('getNextOccurrenceDate', () => {
    it('calculates next occurrence for daily recurrence preserving time', () => {
      const base = new Date('2026-10-09T14:30:00.000Z');
      const next = getNextOccurrenceDate(base, { frequency: 'DAILY', interval: 1 });
      expect(next).not.toBeNull();
      expect(next?.getDate()).toBe(10);
      expect(next?.getHours()).toBe(base.getHours());
      expect(next?.getMinutes()).toBe(base.getMinutes());
    });

    it('calculates next occurrence with custom interval (every 3 days)', () => {
      const base = new Date('2026-10-09T10:00:00.000Z');
      const next = getNextOccurrenceDate(base, { frequency: 'DAILY', interval: 3 });
      expect(next).not.toBeNull();
      expect(next?.getDate()).toBe(12);
    });

    it('calculates next occurrence for weekly without byday', () => {
      const base = new Date('2026-10-09T10:00:00.000Z');
      const next = getNextOccurrenceDate(base, { frequency: 'WEEKLY', interval: 1 });
      expect(next).not.toBeNull();
      expect(next?.getDate()).toBe(16);
    });

    it('calculates next occurrence for Jalali workdays (شنبه تا چهارشنبه)', () => {
      // 2026-10-09 is a Friday (جمعه, index 6 in Jalali)
      // Workdays: [0, 1, 2, 3, 4]
      // Next occurrence from Friday (6) should be Saturday (0) (tomorrow, Oct 10)
      const friday = new Date(2026, 9, 9, 10, 0); // local Friday
      const next = getNextOccurrenceDate(friday, {
        frequency: 'WEEKLY',
        daysOfWeek: [0, 1, 2, 3, 4],
        calendarType: 'jalali'
      });
      expect(next).not.toBeNull();
      expect(next?.getDate()).toBe(10); // Saturday

      // From Saturday (0), next should be Sunday (1)
      const saturday = new Date(2026, 9, 10, 10, 0);
      const nextSun = getNextOccurrenceDate(saturday, {
        frequency: 'WEEKLY',
        daysOfWeek: [0, 1, 2, 3, 4],
        calendarType: 'jalali'
      });
      expect(nextSun?.getDate()).toBe(11); // Sunday

      // From Wednesday (4), next should skip Thursday(5) & Friday(6) to Saturday (0) (+3 days)
      const wednesday = new Date(2026, 9, 14, 10, 0);
      const nextSat = getNextOccurrenceDate(wednesday, {
        frequency: 'WEEKLY',
        daysOfWeek: [0, 1, 2, 3, 4],
        calendarType: 'jalali'
      });
      expect(nextSat?.getDate()).toBe(17); // Saturday (+3 days)
    });

    it('handles Jalali monthly recurrence across 31-day and 30-day boundaries', () => {
      // 31 Shahrivar 1405 (Shahrivar has 31 days)
      const shahrivar31 = jalaliToDate(1405, 6, 31, 10, 0);
      const nextMehr = getNextOccurrenceDate(shahrivar31, {
        frequency: 'MONTHLY',
        interval: 1,
        calendarType: 'jalali'
      });
      expect(nextMehr).not.toBeNull();
      const jMehr = dateToJalali(nextMehr!);
      expect(jMehr.year).toBe(1405);
      expect(jMehr.month).toBe(7); // Mehr
      expect(jMehr.day).toBe(30); // Mehr only has 30 days, capped cleanly!
      expect(nextMehr?.getHours()).toBe(10);
    });

    it('handles Jalali monthly recurrence in Esfand for regular years (29 days)', () => {
      // 30 Bahman 1405 -> next month is Esfand 1405 (regular year, 29 days)
      const bahman30 = jalaliToDate(1405, 11, 30, 9, 0);
      const nextEsfand = getNextOccurrenceDate(bahman30, {
        frequency: 'MONTHLY',
        interval: 1,
        calendarType: 'jalali'
      });
      expect(nextEsfand).not.toBeNull();
      const jEsfand = dateToJalali(nextEsfand!);
      expect(jEsfand.year).toBe(1405);
      expect(jEsfand.month).toBe(12);
      expect(jEsfand.day).toBe(29); // Esfand in 1405 has 29 days
    });

    it('handles Jalali monthly recurrence in Esfand for leap year 1408 (30 days)', () => {
      // 30 Bahman 1408 (1408 is a leap year in Jalali 33-year cycle)
      const bahman30Leap = jalaliToDate(1408, 11, 30, 9, 0);
      const nextEsfandLeap = getNextOccurrenceDate(bahman30Leap, {
        frequency: 'MONTHLY',
        interval: 1,
        calendarType: 'jalali'
      });
      expect(nextEsfandLeap).not.toBeNull();
      const jEsfandLeap = dateToJalali(nextEsfandLeap!);
      expect(jEsfandLeap.year).toBe(1408);
      expect(jEsfandLeap.month).toBe(12);
      expect(jEsfandLeap.day).toBe(30); // Leap year Esfand has 30 days
    });

    it('handles Jalali monthly year transition (Esfand to Farvardin)', () => {
      const esfand29 = jalaliToDate(1405, 12, 29, 12, 0);
      const nextFarvardin = getNextOccurrenceDate(esfand29, {
        frequency: 'MONTHLY',
        interval: 1,
        calendarType: 'jalali'
      });
      expect(nextFarvardin).not.toBeNull();
      const jFarvardin = dateToJalali(nextFarvardin!);
      expect(jFarvardin.year).toBe(1406);
      expect(jFarvardin.month).toBe(1);
      expect(jFarvardin.day).toBe(29);
    });

    it('handles Jalali yearly recurrence', () => {
      const date1405 = jalaliToDate(1405, 7, 15, 8, 30);
      const nextYear = getNextOccurrenceDate(date1405, {
        frequency: 'YEARLY',
        interval: 1,
        calendarType: 'jalali'
      });
      expect(nextYear).not.toBeNull();
      const jNext = dateToJalali(nextYear!);
      expect(jNext.year).toBe(1406);
      expect(jNext.month).toBe(7);
      expect(jNext.day).toBe(15);
      expect(nextYear?.getHours()).toBe(8);
      expect(nextYear?.getMinutes()).toBe(30);
    });

    it('returns null when next occurrence exceeds UNTIL date', () => {
      const base = new Date('2026-10-09T00:00:00.000Z');
      const next = getNextOccurrenceDate(base, {
        frequency: 'DAILY',
        interval: 5,
        until: '2026-10-12T00:00:00.000Z'
      });
      expect(next).toBeNull();
    });
  });

  describe('RECURRENCE_PRESETS', () => {
    it('has all standard presets with valid labels and rrules', () => {
      expect(RECURRENCE_PRESETS.length).toBeGreaterThanOrEqual(5);
      const daily = RECURRENCE_PRESETS.find((p) => p.id === 'daily');
      expect(daily?.labelFa).toBe('روزانه');
      expect(daily?.rrule).toContain('FREQ=DAILY');
    });
  });
});
