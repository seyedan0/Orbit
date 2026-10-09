import type { TaskEntity } from '@orbit/shared-types';
import { calculateReminderDate, shouldFireReminder } from './reminder-utils';

export interface ReminderAlert {
  alertId: string;
  task: TaskEntity;
  triggerTime: string;
  reminder: string;
  firedAt: string;
}

const FIRED_STORAGE_KEY = 'orbit:fired_reminders';

class ReminderService {
  private firedKeys = new Set<string>();

  constructor() {
    this.loadFiredKeys();
  }

  private loadFiredKeys(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    try {
      const stored = window.sessionStorage.getItem(FIRED_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.firedKeys = new Set(parsed);
        }
      }
    } catch {
      // Ignore sessionStorage read errors
    }
  }

  private saveFiredKeys(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    try {
      window.sessionStorage.setItem(
        FIRED_STORAGE_KEY,
        JSON.stringify(Array.from(this.firedKeys))
      );
    } catch {
      // Ignore sessionStorage write errors
    }
  }

  /**
   * Generates a unique tracking key for a specific task and reminder trigger time.
   */
  public getReminderKey(taskId: string, triggerTimeIso: string): string {
    return `${taskId}:${triggerTimeIso}`;
  }

  public isReminderFired(taskId: string, triggerTimeIso: string): boolean {
    return this.firedKeys.has(this.getReminderKey(taskId, triggerTimeIso));
  }

  public markReminderFired(taskId: string, triggerTimeIso: string): void {
    this.firedKeys.add(this.getReminderKey(taskId, triggerTimeIso));
    this.saveFiredKeys();
  }

  public clearFiredKey(taskId: string, triggerTimeIso: string): void {
    this.firedKeys.delete(this.getReminderKey(taskId, triggerTimeIso));
    this.saveFiredKeys();
  }

  /**
   * Scans a list of tasks and returns alerts for any active, uncompleted task whose reminder is due now.
   */
  public findDueReminders(tasks: TaskEntity[], now: Date = new Date()): ReminderAlert[] {
    const dueAlerts: ReminderAlert[] = [];

    for (const task of tasks) {
      // Skip completed or soft-deleted tasks
      if (task.completedAt != null || task.deletedAt != null) {
        continue;
      }
      if (!task.dueDate || !task.reminders || task.reminders.length === 0) {
        continue;
      }

      for (const reminder of task.reminders) {
        const triggerDate = calculateReminderDate(task.dueDate, reminder);
        if (!triggerDate) {
          continue;
        }

        const triggerIso = triggerDate.toISOString();
        if (this.isReminderFired(task.id, triggerIso)) {
          continue; // Already fired
        }

        if (shouldFireReminder(triggerDate, now)) {
          dueAlerts.push({
            alertId: `${task.id}-${triggerIso}`,
            task,
            triggerTime: triggerIso,
            reminder,
            firedAt: now.toISOString()
          });
        }
      }
    }

    return dueAlerts;
  }

  /**
   * Requests desktop browser notification permission safely.
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  /**
   * Shows a native desktop notification if permission has been granted.
   */
  public showNativeNotification(
    title: string,
    options?: NotificationOptions
  ): Notification | null {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return null;
    }

    try {
      return new Notification(title, {
        icon: '/favicon.ico',
        ...options
      });
    } catch {
      return null;
    }
  }

  /**
   * Plays a gentle two-tone chime using Web Audio API without requiring external audio assets.
   */
  public playChimeSound(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Note 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.12);
      gain2.gain.setValueAtTime(0.18, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } catch {
      // Audio playback might be restricted before user gesture; fail gracefully
    }
  }
}

export const reminderService = new ReminderService();
