import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { TaskEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../storage/memory-local-store';
import { createTask, completeTask, rescheduleTask } from '../../features/tasks/services/task-service';
import { reminderService } from './reminder-service';
import { calculateSnoozeDueDate } from './reminder-utils';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 'test-reminder-task',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'Reminder test task',
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
    timeZone: 'UTC',
    reminders: [],
    items: [],
    version: 0,
    localStatus: 'CREATED',
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
    completedAt: null,
    deletedAt: null,
    ...overrides
  };
}

describe('reminderService (P4-REM-001)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findDueReminders', () => {
    it('finds uncompleted tasks whose reminder is due now', () => {
      const dueTask = makeTask({
        id: 'task-due',
        dueDate: '2026-10-15T12:00:00.000Z',
        reminders: ['15_MIN_BEFORE'] // Trigger at 11:45
      });

      const now = new Date('2026-10-15T11:46:00.000Z');
      const alerts = reminderService.findDueReminders([dueTask], now);

      expect(alerts).toHaveLength(1);
      expect(alerts[0]?.task.id).toBe('task-due');
      expect(alerts[0]?.triggerTime).toBe('2026-10-15T11:45:00.000Z');
      expect(alerts[0]?.reminder).toBe('15_MIN_BEFORE');
    });

    it('ignores completed tasks', () => {
      const completedTask = makeTask({
        id: 'task-completed',
        dueDate: '2026-10-15T12:00:00.000Z',
        reminders: ['AT_TIME'],
        completedAt: '2026-10-15T11:50:00.000Z'
      });

      const now = new Date('2026-10-15T12:05:00.000Z');
      const alerts = reminderService.findDueReminders([completedTask], now);

      expect(alerts).toHaveLength(0);
    });

    it('ignores soft-deleted tasks', () => {
      const deletedTask = makeTask({
        id: 'task-deleted',
        dueDate: '2026-10-15T12:00:00.000Z',
        reminders: ['AT_TIME'],
        deletedAt: '2026-10-15T11:00:00.000Z'
      });

      const now = new Date('2026-10-15T12:05:00.000Z');
      const alerts = reminderService.findDueReminders([deletedTask], now);

      expect(alerts).toHaveLength(0);
    });

    it('ignores tasks whose reminder is still in the future', () => {
      const futureTask = makeTask({
        id: 'task-future',
        dueDate: '2026-10-15T14:00:00.000Z',
        reminders: ['15_MIN_BEFORE'] // Trigger at 13:45
      });

      const now = new Date('2026-10-15T13:00:00.000Z');
      const alerts = reminderService.findDueReminders([futureTask], now);

      expect(alerts).toHaveLength(0);
    });

    it('does not re-fire already fired reminders', () => {
      const task = makeTask({
        id: 'task-once',
        dueDate: '2026-10-15T12:00:00.000Z',
        reminders: ['AT_TIME']
      });

      const triggerIso = '2026-10-15T12:00:00.000Z';
      reminderService.markReminderFired('task-once', triggerIso);

      const now = new Date('2026-10-15T12:05:00.000Z');
      const alerts = reminderService.findDueReminders([task], now);

      expect(alerts).toHaveLength(0);

      // Clean up for subsequent tests
      reminderService.clearFiredKey('task-once', triggerIso);
    });
  });

  describe('Audio Chime & Notification API', () => {
    it('safely executes playChimeSound without throwing', () => {
      expect(() => reminderService.playChimeSound()).not.toThrow();
    });

    it('handles requestNotificationPermission in environment gracefully', async () => {
      const perm = await reminderService.requestNotificationPermission();
      expect(['granted', 'denied', 'default']).toContain(perm);
    });
  });

  describe('Reminder Actions Integration (Snooze & Complete)', () => {
    it('snoozes a task by advancing dueDate +10 minutes', async () => {
      const store = new MemoryLocalStore();
      const task = await createTask(
        {
          title: 'Pay bills',
          dueDate: '2026-10-15T12:00:00.000Z',
          reminders: ['AT_TIME']
        },
        { store, userId: 'user-1' }
      );

      const now = new Date('2026-10-15T12:00:00.000Z');
      const nextDue = calculateSnoozeDueDate(task.dueDate, 10, now);
      expect(nextDue).toBe('2026-10-15T12:10:00.000Z');

      const updated = await rescheduleTask(store, task.id, {
        dueDate: nextDue
      });

      expect(updated.dueDate).toBe('2026-10-15T12:10:00.000Z');
      const fromStore = await store.getTask(task.id);
      expect(fromStore?.dueDate).toBe('2026-10-15T12:10:00.000Z');
    });

    it('completes a task from a reminder alert via completeTask', async () => {
      const store = new MemoryLocalStore();
      const task = await createTask(
        {
          title: 'Team standup',
          dueDate: '2026-10-15T09:00:00.000Z',
          reminders: ['15_MIN_BEFORE']
        },
        { store, userId: 'user-1' }
      );

      const completed = await completeTask(task.id, {
        store,
        userId: 'user-1'
      });

      expect(completed.completedAt).not.toBeNull();
      const fromStore = await store.getTask(task.id);
      expect(fromStore?.completedAt).not.toBeNull();
    });
  });
});
