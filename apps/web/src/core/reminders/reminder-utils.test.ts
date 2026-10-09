import { describe, expect, it } from 'vitest';
import {
  calculateReminderDate,
  calculateSnoozeDueDate,
  formatReminderText,
  isReminderPresetId,
  REMINDER_PRESETS,
  shouldFireReminder
} from './reminder-utils';

describe('reminder-utils (P4-REM-001)', () => {
  const DUE_DATE = '2026-10-15T14:30:00.000Z';
  const BASE_TIME = new Date(DUE_DATE).getTime();

  describe('REMINDER_PRESETS', () => {
    it('defines standard presets including AT_TIME, 15_MIN_BEFORE, 30_MIN_BEFORE, 1_HOUR_BEFORE, 1_DAY_BEFORE', () => {
      const ids = REMINDER_PRESETS.map((p) => p.id);
      expect(ids).toContain('NONE');
      expect(ids).toContain('AT_TIME');
      expect(ids).toContain('15_MIN_BEFORE');
      expect(ids).toContain('30_MIN_BEFORE');
      expect(ids).toContain('1_HOUR_BEFORE');
      expect(ids).toContain('1_DAY_BEFORE');
    });

    it('identifies known preset IDs correctly with isReminderPresetId', () => {
      expect(isReminderPresetId('15_MIN_BEFORE')).toBe(true);
      expect(isReminderPresetId('AT_TIME')).toBe(true);
      expect(isReminderPresetId('CUSTOM_UNKNOWN')).toBe(false);
    });
  });

  describe('calculateReminderDate', () => {
    it('returns null for null, undefined, empty or NONE reminder', () => {
      expect(calculateReminderDate(DUE_DATE, null)).toBeNull();
      expect(calculateReminderDate(DUE_DATE, undefined)).toBeNull();
      expect(calculateReminderDate(DUE_DATE, '')).toBeNull();
      expect(calculateReminderDate(DUE_DATE, 'NONE')).toBeNull();
      expect(calculateReminderDate(null, 'AT_TIME')).toBeNull();
    });

    it('calculates AT_TIME (0 minutes offset)', () => {
      const res = calculateReminderDate(DUE_DATE, 'AT_TIME');
      expect(res).not.toBeNull();
      expect(res?.getTime()).toBe(BASE_TIME);
    });

    it('calculates 15_MIN_BEFORE (-15 minutes offset)', () => {
      const res = calculateReminderDate(DUE_DATE, '15_MIN_BEFORE');
      expect(res).not.toBeNull();
      expect(res?.getTime()).toBe(BASE_TIME - 15 * 60 * 1000);
    });

    it('calculates 30_MIN_BEFORE (-30 minutes offset)', () => {
      const res = calculateReminderDate(DUE_DATE, '30_MIN_BEFORE');
      expect(res).not.toBeNull();
      expect(res?.getTime()).toBe(BASE_TIME - 30 * 60 * 1000);
    });

    it('calculates 1_HOUR_BEFORE (-60 minutes offset)', () => {
      const res = calculateReminderDate(DUE_DATE, '1_HOUR_BEFORE');
      expect(res).not.toBeNull();
      expect(res?.getTime()).toBe(BASE_TIME - 60 * 60 * 1000);
    });

    it('calculates 1_DAY_BEFORE (-1440 minutes offset)', () => {
      const res = calculateReminderDate(DUE_DATE, '1_DAY_BEFORE');
      expect(res).not.toBeNull();
      expect(res?.getTime()).toBe(BASE_TIME - 24 * 60 * 60 * 1000);
    });

    it('supports custom ISO date strings directly', () => {
      const customIso = '2026-10-15T12:00:00.000Z';
      const res = calculateReminderDate(DUE_DATE, customIso);
      expect(res).not.toBeNull();
      expect(res?.toISOString()).toBe(customIso);
    });
  });

  describe('formatReminderText', () => {
    it('returns localized Persian labels for presets', () => {
      expect(formatReminderText('AT_TIME', 'fa')).toBe('در زمان سررسید');
      expect(formatReminderText('15_MIN_BEFORE', 'fa')).toBe('۱۵ دقیقه قبل');
      expect(formatReminderText('30_MIN_BEFORE', 'fa')).toBe('۳۰ دقیقه قبل');
      expect(formatReminderText('1_HOUR_BEFORE', 'fa')).toBe('۱ ساعت قبل');
      expect(formatReminderText('1_DAY_BEFORE', 'fa')).toBe('۱ روز قبل');
    });

    it('returns localized English labels for presets', () => {
      expect(formatReminderText('AT_TIME', 'en')).toBe('At time of event');
      expect(formatReminderText('15_MIN_BEFORE', 'en')).toBe('15 minutes before');
      expect(formatReminderText('1_HOUR_BEFORE', 'en')).toBe('1 hour before');
    });
  });

  describe('calculateSnoozeDueDate', () => {
    it('adds specified snooze minutes to a future due date', () => {
      const now = new Date('2026-10-15T14:00:00.000Z');
      const futureDue = '2026-10-15T14:30:00.000Z';
      const snoozed = calculateSnoozeDueDate(futureDue, 10, now);

      expect(snoozed).toBe('2026-10-15T14:40:00.000Z');
    });

    it('snoozes from current time if due date is in the past', () => {
      const now = new Date('2026-10-15T14:35:00.000Z');
      const pastDue = '2026-10-15T14:30:00.000Z';
      const snoozed = calculateSnoozeDueDate(pastDue, 10, now);

      expect(snoozed).toBe('2026-10-15T14:45:00.000Z');
    });
  });

  describe('shouldFireReminder', () => {
    const trigger = new Date('2026-10-15T14:15:00.000Z');

    it('returns false if trigger time is still in the future', () => {
      const now = new Date('2026-10-15T14:14:59.000Z');
      expect(shouldFireReminder(trigger, now)).toBe(false);
    });

    it('returns true if trigger time has arrived or just passed', () => {
      const exactNow = new Date('2026-10-15T14:15:00.000Z');
      const pastNow = new Date('2026-10-15T14:16:00.000Z');
      expect(shouldFireReminder(trigger, exactNow)).toBe(true);
      expect(shouldFireReminder(trigger, pastNow)).toBe(true);
    });

    it('returns false if reminder is older than maxOverdue window', () => {
      const ancientNow = new Date('2026-10-17T14:15:00.000Z'); // 48 hours later
      expect(shouldFireReminder(trigger, ancientNow, 24 * 60 * 60 * 1000)).toBe(false);
    });
  });
});
