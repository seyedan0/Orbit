/**
 * Reminder calculation and helper utilities for Orbit task reminders.
 * Supports standard presets:
 * - 'AT_TIME' (0 minutes before due date)
 * - '15_MIN_BEFORE' (-15m)
 * - '30_MIN_BEFORE' (-30m)
 * - '1_HOUR_BEFORE' (-60m)
 * - '1_DAY_BEFORE' (-1440m)
 * Also supports custom ISO timestamp strings for absolute reminders.
 */

export type ReminderPresetId =
  | 'NONE'
  | 'AT_TIME'
  | '15_MIN_BEFORE'
  | '30_MIN_BEFORE'
  | '1_HOUR_BEFORE'
  | '1_DAY_BEFORE';

export interface ReminderPreset {
  id: ReminderPresetId;
  offsetMinutes: number;
  labelFa: string;
  labelEn: string;
}

export const REMINDER_PRESETS: ReminderPreset[] = [
  { id: 'NONE', offsetMinutes: 0, labelFa: 'بدون یادآور', labelEn: 'No reminder' },
  { id: 'AT_TIME', offsetMinutes: 0, labelFa: 'در زمان سررسید', labelEn: 'At time of event' },
  { id: '15_MIN_BEFORE', offsetMinutes: -15, labelFa: '۱۵ دقیقه قبل', labelEn: '15 minutes before' },
  { id: '30_MIN_BEFORE', offsetMinutes: -30, labelFa: '۳۰ دقیقه قبل', labelEn: '30 minutes before' },
  { id: '1_HOUR_BEFORE', offsetMinutes: -60, labelFa: '۱ ساعت قبل', labelEn: '1 hour before' },
  { id: '1_DAY_BEFORE', offsetMinutes: -1440, labelFa: '۱ روز قبل', labelEn: '1 day before' }
];

const PRESET_MAP = new Map<string, ReminderPreset>(
  REMINDER_PRESETS.map((p) => [p.id, p])
);

/**
 * Checks if a string is a known reminder preset ID.
 */
export function isReminderPresetId(val: string): val is ReminderPresetId {
  return PRESET_MAP.has(val);
}

/**
 * Calculates absolute trigger Date from a dueDate string and reminder specification.
 * The reminder specification can be a preset ID ('15_MIN_BEFORE') or an ISO date string.
 * Returns null if dueDate is missing or if reminder is 'NONE' or invalid.
 */
export function calculateReminderDate(
  dueDate: string | Date | null | undefined,
  reminder: string | null | undefined
): Date | null {
  if (!dueDate || !reminder || reminder.trim() === '' || reminder === 'NONE') {
    return null;
  }

  const baseDate = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (isNaN(baseDate.getTime())) {
    return null;
  }

  const preset = PRESET_MAP.get(reminder);
  if (preset) {
    if (preset.id === 'NONE') {
      return null;
    }
    return new Date(baseDate.getTime() + preset.offsetMinutes * 60 * 1000);
  }

  // If not a preset, check if it's an absolute ISO date
  const parsedDate = new Date(reminder);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return null;
}

/**
 * Formats a localized human-readable label for a reminder.
 */
export function formatReminderText(
  reminder: string,
  lang: 'fa' | 'en' = 'fa'
): string {
  const preset = PRESET_MAP.get(reminder);
  if (preset) {
    return lang === 'fa' ? preset.labelFa : preset.labelEn;
  }

  const parsed = new Date(reminder);
  if (!isNaN(parsed.getTime())) {
    return lang === 'fa'
      ? `یادآور در ${parsed.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`
      : `Reminder at ${parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return reminder;
}

/**
 * Calculates a new dueDate after snoozing by specified minutes (default +10m).
 * If the original dueDate is already in the past, snoozes from current time.
 */
export function calculateSnoozeDueDate(
  dueDate: string | null | undefined,
  snoozeMinutes = 10,
  now: Date = new Date()
): string {
  const snoozeMs = snoozeMinutes * 60 * 1000;
  if (!dueDate) {
    return new Date(now.getTime() + snoozeMs).toISOString();
  }

  const due = new Date(dueDate);
  if (isNaN(due.getTime())) {
    return new Date(now.getTime() + snoozeMs).toISOString();
  }

  // If due date is already in the past, snooze from now; otherwise add to due date
  const baseTime = due.getTime() < now.getTime() ? now.getTime() : due.getTime();
  return new Date(baseTime + snoozeMs).toISOString();
}

/**
 * Checks whether a reminder trigger Date should fire given current time.
 * Fires if triggerDate <= now.
 * Optional maxOverdueMs prevents firing ancient reminders from months ago on initial app launch.
 */
export function shouldFireReminder(
  triggerDate: Date,
  now: Date = new Date(),
  maxOverdueMs = 24 * 60 * 60 * 1000 // 24 hours overdue window
): boolean {
  const triggerTime = triggerDate.getTime();
  const nowTime = now.getTime();

  if (triggerTime > nowTime) {
    return false; // Still in the future
  }

  // Don't alert if older than the maxOverdue window
  if (nowTime - triggerTime > maxOverdueMs) {
    return false;
  }

  return true;
}
