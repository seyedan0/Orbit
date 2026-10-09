import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import type { TaskEntity } from '@orbit/shared-types';
import { useStore } from '../storage/store-context';
import { useSession } from '../auth/session-context';
import { completeTask, rescheduleTask } from '../../features/tasks/services/task-service';
import {
  calculateSnoozeDueDate,
  formatReminderText
} from './reminder-utils';
import {
  reminderService,
  type ReminderAlert
} from './reminder-service';

export interface ReminderContextValue {
  activeAlerts: ReminderAlert[];
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  dismissAlert: (alertId: string) => void;
  snoozeAlert: (alertId: string, minutes?: number) => Promise<void>;
  completeAlert: (alertId: string) => Promise<void>;
  scanReminders: (customTasks?: TaskEntity[]) => Promise<void>;
}

const ReminderContext = createContext<ReminderContextValue | undefined>(undefined);

export interface ReminderProviderProps {
  children: ReactNode;
  /** Polling interval in ms for background scanning (default: 10000ms / 10s) */
  pollIntervalMs?: number;
}

export function ReminderProvider({
  children,
  pollIntervalMs = 10000
}: ReminderProviderProps) {
  const store = useStore();
  const { user } = useSession();
  const [activeAlerts, setActiveAlerts] = useState<ReminderAlert[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    const perm = await reminderService.requestNotificationPermission();
    setPermission(perm);
    return perm;
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
  }, []);

  const scanReminders = useCallback(
    async (customTasks?: TaskEntity[]) => {
      try {
        const tasks = customTasks ?? (await store.listTasks());
        const due = reminderService.findDueReminders(tasks, new Date());

        if (due.length === 0) return;

        let shouldPlayChime = false;

        setActiveAlerts((prev) => {
          const existingIds = new Set(prev.map((a) => a.alertId));
          const newAlerts: ReminderAlert[] = [];

          for (const alert of due) {
            if (!existingIds.has(alert.alertId)) {
              newAlerts.push(alert);
              reminderService.markReminderFired(alert.task.id, alert.triggerTime);

              // Trigger desktop notification
              reminderService.showNativeNotification(alert.task.title, {
                body: formatReminderText(alert.reminder, 'fa'),
                tag: alert.alertId
              });
              shouldPlayChime = true;
            }
          }

          return [...prev, ...newAlerts];
        });

        if (shouldPlayChime) {
          reminderService.playChimeSound();
        }
      } catch {
        // Silently catch scan errors during offline or storage transient states
      }
    },
    [store]
  );

  const snoozeAlert = useCallback(
    async (alertId: string, minutes = 10) => {
      const alert = activeAlerts.find((a) => a.alertId === alertId);
      if (!alert) return;

      const nextDueIso = calculateSnoozeDueDate(alert.task.dueDate, minutes, new Date());

      // If task had startDate and duration, shift startDate appropriately
      let nextStartIso: string | null = null;
      if (alert.task.startDate && alert.task.dueDate) {
        const durationMs =
          new Date(alert.task.dueDate).getTime() - new Date(alert.task.startDate).getTime();
        nextStartIso = new Date(new Date(nextDueIso).getTime() - durationMs).toISOString();
      }

      await rescheduleTask(store, alert.task.id, {
        dueDate: nextDueIso,
        startDate: nextStartIso
      });

      dismissAlert(alertId);
    },
    [activeAlerts, store, dismissAlert]
  );

  const completeAlert = useCallback(
    async (alertId: string) => {
      const alert = activeAlerts.find((a) => a.alertId === alertId);
      if (!alert) return;

      const effectiveUserId = user?.id ?? alert.task.userId ?? 'local-user';
      await completeTask(alert.task.id, {
        store,
        userId: effectiveUserId
      });

      dismissAlert(alertId);
    },
    [activeAlerts, user, store, dismissAlert]
  );

  // Background reminder scheduler loop
  useEffect(() => {
    // Initial scan on mount
    void scanReminders();

    if (pollIntervalMs <= 0) return;

    const timer = setInterval(() => {
      void scanReminders();
    }, pollIntervalMs);

    return () => clearInterval(timer);
  }, [scanReminders, pollIntervalMs]);

  return (
    <ReminderContext.Provider
      value={{
        activeAlerts,
        permission,
        requestPermission,
        dismissAlert,
        snoozeAlert,
        completeAlert,
        scanReminders
      }}
    >
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders(): ReminderContextValue {
  const ctx = useContext(ReminderContext);
  if (!ctx) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return ctx;
}
