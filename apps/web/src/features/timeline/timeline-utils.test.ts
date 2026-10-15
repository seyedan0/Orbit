import { describe, expect, it } from 'vitest';
import type { TaskEntity } from '@orbit/shared-types';
import {
  calculateTaskTimelineBar,
  getTimelineDateWindow,
  rescheduleTimelineTask
} from './timeline-utils';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 'task-1',
    projectId: 'inbox',
    userId: 'u-1',
    title: 'تسک تستی',
    content: '',
    kind: 'TASK',
    priority: 3,
    isAllDay: false,
    timeZone: 'Asia/Tehran',
    tags: [],
    items: [],
    reminders: [],
    localStatus: 'SYNCED',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
    version: 1,
    completedAt: null,
    deletedAt: null,
    ...overrides
  };
}

describe('timeline-utils', () => {
  describe('getTimelineDateWindow', () => {
    it('returns 7 days for WEEK view mode with Saturday alignment for Jalali', () => {
      // 2026-10-15 is Thursday
      const ref = new Date('2026-10-15T12:00:00.000Z');
      const win = getTimelineDateWindow(ref, 'WEEK');

      expect(win.viewMode).toBe('WEEK');
      expect(win.days).toHaveLength(7);
      expect(win.startDate.getTime()).toBeLessThan(win.endDate.getTime());
      expect(win.days[0]!.weekdayLabel).toBeDefined();
    });

    it('returns 3 days for DAY view mode (yesterday, today, tomorrow)', () => {
      const ref = new Date('2026-10-15T12:00:00.000Z');
      const win = getTimelineDateWindow(ref, 'DAY');

      expect(win.viewMode).toBe('DAY');
      expect(win.days).toHaveLength(3);
    });

    it('returns 30 days for MONTH view mode', () => {
      const ref = new Date('2026-10-15T12:00:00.000Z');
      const win = getTimelineDateWindow(ref, 'MONTH');

      expect(win.viewMode).toBe('MONTH');
      expect(win.days).toHaveLength(30);
    });
  });

  describe('calculateTaskTimelineBar', () => {
    const windowStart = new Date('2026-10-10T00:00:00.000Z');
    const windowEnd = new Date('2026-10-17T00:00:00.000Z'); // 7 days

    it('returns isVisible: false when task has no dates', () => {
      const task = makeTask({ startDate: null, dueDate: null });
      const bar = calculateTaskTimelineBar(task, windowStart, windowEnd);

      expect(bar.isVisible).toBe(false);
    });

    it('returns isVisible: false when task is completely outside window', () => {
      const task = makeTask({
        startDate: '2026-09-01T00:00:00.000Z',
        dueDate: '2026-09-05T00:00:00.000Z'
      });
      const bar = calculateTaskTimelineBar(task, windowStart, windowEnd);

      expect(bar.isVisible).toBe(false);
    });

    it('calculates proper leftPct and widthPct for task inside window', () => {
      // Window is 7 days. Task spans from 2026-10-12 to 2026-10-14 (2 days out of 7, starting 2 days in)
      const task = makeTask({
        startDate: '2026-10-12T00:00:00.000Z',
        dueDate: '2026-10-14T00:00:00.000Z'
      });
      const bar = calculateTaskTimelineBar(task, windowStart, windowEnd);

      expect(bar.isVisible).toBe(true);
      expect(bar.hasStartAndEnd).toBe(true);
      // 2 / 7 ~ 28.57%
      expect(bar.leftPct).toBeGreaterThanOrEqual(28);
      expect(bar.leftPct).toBeLessThanOrEqual(29);
      expect(bar.widthPct).toBeGreaterThanOrEqual(28);
      expect(bar.widthPct).toBeLessThanOrEqual(29);
    });

    it('handles tasks with only dueDate by defaulting start date 1 day before', () => {
      const task = makeTask({
        startDate: null,
        dueDate: '2026-10-14T00:00:00.000Z'
      });
      const bar = calculateTaskTimelineBar(task, windowStart, windowEnd);

      expect(bar.isVisible).toBe(true);
      expect(bar.hasStartAndEnd).toBe(false);
      expect(bar.leftPct).toBeGreaterThan(0);
      expect(bar.widthPct).toBeGreaterThan(0);
    });

    it('flags overdue tasks when dueDate is past reference now', () => {
      const now = new Date('2026-10-16T12:00:00.000Z');
      const task = makeTask({
        startDate: '2026-10-11T00:00:00.000Z',
        dueDate: '2026-10-13T00:00:00.000Z',
        completedAt: null
      });
      const bar = calculateTaskTimelineBar(task, windowStart, windowEnd, now);

      expect(bar.isOverdue).toBe(true);
    });
  });

  describe('rescheduleTimelineTask', () => {
    it('updates startDate, dueDate, and computes duration in minutes', () => {
      const task = makeTask();
      const updates = rescheduleTimelineTask(
        task,
        '2026-10-15T09:00:00.000Z',
        '2026-10-15T11:30:00.000Z'
      );

      expect(updates.startDate).toBe('2026-10-15T09:00:00.000Z');
      expect(updates.dueDate).toBe('2026-10-15T11:30:00.000Z');
      // 2.5 hours = 150 minutes
      expect(updates.duration).toBe(150);
    });
  });
});
