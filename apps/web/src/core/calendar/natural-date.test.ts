import { describe, expect, it } from 'vitest';
import {
  formatDetectedDateChip,
  parseNaturalDate,
  toLatinDigits
} from './natural-date';

describe('Natural Language Date Parser (P4-NLP-001)', () => {
  // Fixed reference date: Wednesday, October 7, 2026 at 09:00:00 UTC (۱۵ مهر ۱۴۰۵)
  // Day of week: Wednesday = JS 3
  const REF_DATE = new Date('2026-10-07T09:00:00.000Z');

  describe('toLatinDigits', () => {
    it('converts Persian and Arabic digits to Latin numbers', () => {
      expect(toLatinDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
      expect(toLatinDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
      expect(toLatinDigits('ساعت ۱۰:۳۰')).toBe('ساعت 10:30');
    });
  });

  describe('Persian relative dates', () => {
    it('detects «امروز» (today, 0 day offset)', () => {
      const result = parseNaturalDate('تماس با مدیر امروز', REF_DATE, 'jalali');
      expect(result.detectedDate).not.toBeNull();
      expect(result.detectedDate?.getDate()).toBe(7);
      expect(result.isAllDay).toBe(true);
      expect(result.cleanTitle).toBe('تماس با مدیر');
      expect(result.matchedText).toContain('امروز');
    });

    it('detects «فردا» (tomorrow, +1 day offset)', () => {
      const result = parseNaturalDate('خرید نان فردا', REF_DATE, 'jalali');
      expect(result.detectedDate).not.toBeNull();
      expect(result.detectedDate?.getDate()).toBe(8);
      expect(result.isAllDay).toBe(true);
      expect(result.cleanTitle).toBe('خرید نان');
      expect(result.matchedText).toBe('فردا');
    });

    it('detects «پسفردا» and «پس‌فردا» (+2 day offset)', () => {
      const r1 = parseNaturalDate('جلسه فنی پسفردا', REF_DATE, 'jalali');
      expect(r1.detectedDate?.getDate()).toBe(9);
      expect(r1.cleanTitle).toBe('جلسه فنی');

      const r2 = parseNaturalDate('گزارش نهایی پس‌فردا', REF_DATE, 'jalali');
      expect(r2.detectedDate?.getDate()).toBe(9);
      expect(r2.cleanTitle).toBe('گزارش نهایی');
    });

    it('detects «هفته بعد» (+7 day offset)', () => {
      const result = parseNaturalDate('بررسی حقوق هفته بعد', REF_DATE, 'jalali');
      expect(result.detectedDate?.getDate()).toBe(14);
      expect(result.isAllDay).toBe(true);
      expect(result.cleanTitle).toBe('بررسی حقوق');
    });
  });

  describe('Persian weekdays', () => {
    // REF_DATE is Wednesday (چهارشنبه, JS 3)
    it('detects upcoming «پنج‌شنبه» (tomorrow, Thursday, JS 4)', () => {
      const result = parseNaturalDate('تمرین شنا پنج‌شنبه', REF_DATE, 'jalali');
      expect(result.detectedDate?.getDate()).toBe(8);
      expect(result.cleanTitle).toBe('تمرین شنا');
    });

    it('detects upcoming «شنبه» (Saturday, JS 6)', () => {
      // Wednesday (7th) -> Saturday (10th) (+3 days)
      const result = parseNaturalDate('کلاس نقاشی شنبه', REF_DATE, 'jalali');
      expect(result.detectedDate?.getDate()).toBe(10);
      expect(result.cleanTitle).toBe('کلاس نقاشی');
    });

    it('detects «شنبه بعد» (following week Saturday, +10 days)', () => {
      // Wednesday (7th) -> Saturday next week (17th)
      const result = parseNaturalDate('امتحان نهایی شنبه بعد', REF_DATE, 'jalali');
      expect(result.detectedDate?.getDate()).toBe(17);
      expect(result.cleanTitle).toBe('امتحان نهایی');
    });

    it('detects «دوشنبه» (next Monday, +5 days)', () => {
      // Wednesday (7th) -> Monday (12th)
      const result = parseNaturalDate('جلسه سهامداران دوشنبه', REF_DATE, 'jalali');
      expect(result.detectedDate?.getDate()).toBe(12);
      expect(result.cleanTitle).toBe('جلسه سهامداران');
    });
  });

  describe('Persian times', () => {
    it('detects «ساعت ۱۰» (10:00)', () => {
      const result = parseNaturalDate('تماس تلفنی ساعت ۱۰', REF_DATE, 'jalali');
      expect(result.detectedDate?.getHours()).toBe(10);
      expect(result.detectedDate?.getMinutes()).toBe(0);
      expect(result.isAllDay).toBe(false);
      expect(result.cleanTitle).toBe('تماس تلفنی');
    });

    it('detects «ساعت 10:30» and «ساعت ۱۰:۳۰» (10:30)', () => {
      const r1 = parseNaturalDate('جلسه ساعت 10:30 با تیم', REF_DATE, 'jalali');
      expect(r1.detectedDate?.getHours()).toBe(10);
      expect(r1.detectedDate?.getMinutes()).toBe(30);
      expect(r1.cleanTitle).toBe('جلسه با تیم');

      const r2 = parseNaturalDate('جلسه ساعت ۱۰:۳۰ با تیم', REF_DATE, 'jalali');
      expect(r2.detectedDate?.getHours()).toBe(10);
      expect(r2.detectedDate?.getMinutes()).toBe(30);
      expect(r2.cleanTitle).toBe('جلسه با تیم');
    });

    it('detects «ساعت ۵ عصر» and «ساعت ۵ بعدازظهر» (17:00)', () => {
      const r1 = parseNaturalDate('دیدار دوستانه ساعت ۵ عصر', REF_DATE, 'jalali');
      expect(r1.detectedDate?.getHours()).toBe(17);
      expect(r1.detectedDate?.getMinutes()).toBe(0);
      expect(r1.cleanTitle).toBe('دیدار دوستانه');

      const r2 = parseNaturalDate('دیدار ساعت ۵ بعدازظهر', REF_DATE, 'jalali');
      expect(r2.detectedDate?.getHours()).toBe(17);
      expect(r2.cleanTitle).toBe('دیدار');

      const r3 = parseNaturalDate('دیدار ساعت ۵ بعد از ظهر', REF_DATE, 'jalali');
      expect(r3.detectedDate?.getHours()).toBe(17);
      expect(r3.cleanTitle).toBe('دیدار');
    });

    it('detects «ساعت ۹ صبح» (09:00)', () => {
      const result = parseNaturalDate('صبحانه کاری ساعت ۹ صبح', REF_DATE, 'jalali');
      expect(result.detectedDate?.getHours()).toBe(9);
      expect(result.detectedDate?.getMinutes()).toBe(0);
      expect(result.cleanTitle).toBe('صبحانه کاری');
    });

    it('detects «ساعت ۱۲ ظهر» (12:00) and «ساعت ۱۲ شب» (00:00)', () => {
      const r1 = parseNaturalDate('ناهار ساعت ۱۲ ظهر', REF_DATE, 'jalali');
      expect(r1.detectedDate?.getHours()).toBe(12);
      expect(r1.cleanTitle).toBe('ناهار');

      const r2 = parseNaturalDate('بکاپ سرور ساعت ۱۲ شب', REF_DATE, 'jalali');
      expect(r2.detectedDate?.getHours()).toBe(0);
      expect(r2.cleanTitle).toBe('بکاپ سرور');
    });
  });

  describe('Combined Persian date and time', () => {
    it('detects «فردا ساعت ۱۰» (+1 day, 10:00)', () => {
      const result = parseNaturalDate('جلسه هماهنگی فردا ساعت ۱۰ با مدیریت', REF_DATE, 'jalali');
      expect(result.detectedDate?.getDate()).toBe(8);
      expect(result.detectedDate?.getHours()).toBe(10);
      expect(result.detectedDate?.getMinutes()).toBe(0);
      expect(result.isAllDay).toBe(false);
      expect(result.cleanTitle).toBe('جلسه هماهنگی با مدیریت');
      expect(result.matchedText).toContain('فردا');
      expect(result.matchedText).toContain('ساعت ۱۰');
    });

    it('detects «پس‌فردا ساعت ۵ عصر» (+2 days, 17:00)', () => {
      const result = parseNaturalDate('ارائه پروژه پس‌فردا ساعت ۵ عصر', REF_DATE, 'jalali');
      expect(result.detectedDate?.getDate()).toBe(9);
      expect(result.detectedDate?.getHours()).toBe(17);
      expect(result.cleanTitle).toBe('ارائه پروژه');
    });
  });

  describe('English relative dates and weekdays', () => {
    it('detects today, tomorrow, and day after tomorrow', () => {
      const r1 = parseNaturalDate('Submit PR today', REF_DATE, 'gregorian');
      expect(r1.detectedDate?.getDate()).toBe(7);
      expect(r1.cleanTitle).toBe('Submit PR');

      const r2 = parseNaturalDate('Buy groceries tomorrow', REF_DATE, 'gregorian');
      expect(r2.detectedDate?.getDate()).toBe(8);
      expect(r2.cleanTitle).toBe('Buy groceries');

      const r3 = parseNaturalDate('Prepare presentation day after tomorrow', REF_DATE, 'gregorian');
      expect(r3.detectedDate?.getDate()).toBe(9);
      expect(r3.cleanTitle).toBe('Prepare presentation');
    });

    it('detects next week (+7 days)', () => {
      const result = parseNaturalDate('Sprint planning next week', REF_DATE, 'gregorian');
      expect(result.detectedDate?.getDate()).toBe(14);
      expect(result.cleanTitle).toBe('Sprint planning');
    });

    it('detects English weekdays and next weekday', () => {
      // Wednesday (7th) -> Friday (9th)
      const r1 = parseNaturalDate('Team retrospective friday', REF_DATE, 'gregorian');
      expect(r1.detectedDate?.getDate()).toBe(9);
      expect(r1.cleanTitle).toBe('Team retrospective');

      // Wednesday (7th) -> Next Monday (12th)
      const r2 = parseNaturalDate('Kickoff meeting next monday', REF_DATE, 'gregorian');
      expect(r2.detectedDate?.getDate()).toBe(12);
      expect(r2.cleanTitle).toBe('Kickoff meeting');
    });
  });

  describe('English times and combined date/time', () => {
    it('detects at 5pm and at 10:30am', () => {
      const r1 = parseNaturalDate('Dentist appointment at 5pm', REF_DATE, 'gregorian');
      expect(r1.detectedDate?.getHours()).toBe(17);
      expect(r1.detectedDate?.getMinutes()).toBe(0);
      expect(r1.isAllDay).toBe(false);
      expect(r1.cleanTitle).toBe('Dentist appointment');

      const r2 = parseNaturalDate('Standup at 10:30am', REF_DATE, 'gregorian');
      expect(r2.detectedDate?.getHours()).toBe(10);
      expect(r2.detectedDate?.getMinutes()).toBe(30);
      expect(r2.cleanTitle).toBe('Standup');
    });

    it('detects 24-hour time at 16:00', () => {
      const result = parseNaturalDate('Deploy release at 16:00', REF_DATE, 'gregorian');
      expect(result.detectedDate?.getHours()).toBe(16);
      expect(result.detectedDate?.getMinutes()).toBe(0);
      expect(result.cleanTitle).toBe('Deploy release');
    });

    it('detects combined tomorrow at 5pm', () => {
      const result = parseNaturalDate('Call client tomorrow at 5pm', REF_DATE, 'gregorian');
      expect(result.detectedDate?.getDate()).toBe(8);
      expect(result.detectedDate?.getHours()).toBe(17);
      expect(result.isAllDay).toBe(false);
      expect(result.cleanTitle).toBe('Call client');
      expect(result.matchedText).toBe('tomorrow at 5pm');
    });
  });

  describe('Title cleaning edge cases', () => {
    it('returns untouched title when no date/time tokens exist', () => {
      const result = parseNaturalDate('فقط یک تسک عادی بدون تاریخ');
      expect(result.detectedDate).toBeNull();
      expect(result.matchedText).toBeNull();
      expect(result.cleanTitle).toBe('فقط یک تسک عادی بدون تاریخ');
    });

    it('preserves title when input is solely the date keyword', () => {
      const r1 = parseNaturalDate('فردا', REF_DATE);
      expect(r1.detectedDate).not.toBeNull();
      expect(r1.cleanTitle).toBe('فردا'); // Does not empty out

      const r2 = parseNaturalDate('tomorrow', REF_DATE);
      expect(r2.detectedDate).not.toBeNull();
      expect(r2.cleanTitle).toBe('tomorrow');
    });

    it('strips prepositions like «برای» and "on" smoothly', () => {
      const r1 = parseNaturalDate('جلسه برای فردا ساعت ۱۰', REF_DATE);
      expect(r1.cleanTitle).toBe('جلسه');

      const r2 = parseNaturalDate('Design review on friday', REF_DATE);
      expect(r2.cleanTitle).toBe('Design review');
    });
  });

  describe('formatDetectedDateChip', () => {
    it('formats Persian chip labels accurately', () => {
      // Tomorrow at 10:00
      const tomorrow10am = new Date(REF_DATE);
      tomorrow10am.setDate(tomorrow10am.getDate() + 1);
      tomorrow10am.setHours(10, 0, 0, 0);

      const label = formatDetectedDateChip(tomorrow10am, false, 'jalali', REF_DATE);
      expect(label).toContain('🗓️');
      expect(label).toContain('فردا');
      expect(label).toContain('۱۰:۰۰');
    });

    it('formats English chip labels accurately', () => {
      const tomorrow5pm = new Date(REF_DATE);
      tomorrow5pm.setDate(tomorrow5pm.getDate() + 1);
      tomorrow5pm.setHours(17, 0, 0, 0);

      const label = formatDetectedDateChip(tomorrow5pm, false, 'gregorian', REF_DATE);
      expect(label).toBe('🗓️ Tomorrow at 17:00');
    });
  });
});
