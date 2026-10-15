import { describe, expect, it } from 'vitest';
import type { TaskEntity } from '@orbit/shared-types';
import {
  categorizeTaskIntoQuadrant,
  getEisenhowerMatrixGroups,
  getQuadrantTargetUpdates,
  QUADRANT_CONFIGS
} from './matrix-utils';

describe('Eisenhower Matrix Logic (P5-MTX-001)', () => {
  const refDate = new Date('2026-10-15T12:00:00.000Z');
  const pastIso = '2026-10-14T08:00:00.000Z';
  const todayIso = '2026-10-15T10:00:00.000Z';
  const tomorrowIso = '2026-10-16T10:00:00.000Z';
  const futureIso = '2026-10-25T10:00:00.000Z';

  const makeTask = (overrides: Partial<TaskEntity> = {}): TaskEntity => ({
    id: 'task-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'تسک نمونه',
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
    startDate: null,
    dueDate: null,
    duration: null,
    timeZone: 'UTC',
    repeatFlag: null,
    reminders: [],
    tags: [],
    items: [],
    version: 0,
    localStatus: 'CREATED',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
    completedAt: null,
    deletedAt: null,
    ...overrides
  });

  describe('categorizeTaskIntoQuadrant', () => {
    it('categorizes priority >= 3 with overdue, today, or tomorrow due date as Q1 (فوری و مهم)', () => {
      // Priority 5, past
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 5, dueDate: pastIso }),
          refDate,
          'UTC'
        )
      ).toBe('Q1');

      // Priority 3, today
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 3, dueDate: todayIso }),
          refDate,
          'UTC'
        )
      ).toBe('Q1');

      // Priority 3, tomorrow
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 3, dueDate: tomorrowIso }),
          refDate,
          'UTC'
        )
      ).toBe('Q1');
    });

    it('categorizes priority >= 3 with far future due date or no due date as Q2 (مهم و غیرفوری)', () => {
      // Priority 5, future
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 5, dueDate: futureIso }),
          refDate,
          'UTC'
        )
      ).toBe('Q2');

      // Priority 3, no due date
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 3, dueDate: null }),
          refDate,
          'UTC'
        )
      ).toBe('Q2');
    });

    it('categorizes priority === 1 with overdue or today due date as Q3 (فوری و کم‌اهمیت)', () => {
      // Priority 1, past
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 1, dueDate: pastIso }),
          refDate,
          'UTC'
        )
      ).toBe('Q3');

      // Priority 1, today
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 1, dueDate: todayIso }),
          refDate,
          'UTC'
        )
      ).toBe('Q3');
    });

    it('categorizes priority === 0 or non-urgent priority === 1 as Q4 (نه فوری و نه مهم)', () => {
      // Priority 1, tomorrow (not urgent, not important)
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 1, dueDate: tomorrowIso }),
          refDate,
          'UTC'
        )
      ).toBe('Q4');

      // Priority 1, future
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 1, dueDate: futureIso }),
          refDate,
          'UTC'
        )
      ).toBe('Q4');

      // Priority 1, no due date
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 1, dueDate: null }),
          refDate,
          'UTC'
        )
      ).toBe('Q4');

      // Priority 0, today
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 0, dueDate: todayIso }),
          refDate,
          'UTC'
        )
      ).toBe('Q4');

      // Priority 0, no due date
      expect(
        categorizeTaskIntoQuadrant(
          makeTask({ priority: 0, dueDate: null }),
          refDate,
          'UTC'
        )
      ).toBe('Q4');
    });
  });

  describe('getEisenhowerMatrixGroups', () => {
    it('groups tasks correctly into 4 quadrants', () => {
      const tasks: TaskEntity[] = [
        makeTask({ id: 't1', priority: 5, dueDate: todayIso }), // Q1
        makeTask({ id: 't2', priority: 3, dueDate: null }), // Q2
        makeTask({ id: 't3', priority: 1, dueDate: todayIso }), // Q3
        makeTask({ id: 't4', priority: 0, dueDate: null }), // Q4
        makeTask({ id: 't5', priority: 3, dueDate: pastIso }) // Q1
      ];

      const groups = getEisenhowerMatrixGroups(tasks, refDate, 'UTC');

      expect(groups.Q1.map((t) => t.id)).toEqual(['t1', 't5']);
      expect(groups.Q2.map((t) => t.id)).toEqual(['t2']);
      expect(groups.Q3.map((t) => t.id)).toEqual(['t3']);
      expect(groups.Q4.map((t) => t.id)).toEqual(['t4']);
    });

    it('excludes soft-deleted tasks', () => {
      const tasks: TaskEntity[] = [
        makeTask({ id: 't1', priority: 3, dueDate: todayIso }),
        makeTask({
          id: 't2',
          priority: 3,
          dueDate: todayIso,
          deletedAt: '2026-10-15T09:00:00.000Z'
        })
      ];

      const groups = getEisenhowerMatrixGroups(tasks, refDate, 'UTC');
      expect(groups.Q1.map((t) => t.id)).toEqual(['t1']);
    });

    it('filters out completed tasks when includeCompleted is false', () => {
      const tasks: TaskEntity[] = [
        makeTask({ id: 't1', priority: 3, dueDate: todayIso }),
        makeTask({
          id: 't2',
          priority: 3,
          dueDate: todayIso,
          completedAt: '2026-10-15T11:00:00.000Z'
        })
      ];

      const groupsWithCompleted = getEisenhowerMatrixGroups(tasks, refDate, 'UTC', {
        includeCompleted: true
      });
      expect(groupsWithCompleted.Q1).toHaveLength(2);

      const groupsWithoutCompleted = getEisenhowerMatrixGroups(tasks, refDate, 'UTC', {
        includeCompleted: false
      });
      expect(groupsWithoutCompleted.Q1).toHaveLength(1);
      expect(groupsWithoutCompleted.Q1[0]?.id).toBe('t1');
    });

    it('sorts uncompleted tasks before completed ones and respects priority', () => {
      const tasks: TaskEntity[] = [
        makeTask({
          id: 'comp-high',
          priority: 5,
          dueDate: todayIso,
          completedAt: '2026-10-15T11:00:00.000Z'
        }),
        makeTask({ id: 'uncomp-low', priority: 3, dueDate: todayIso }),
        makeTask({ id: 'uncomp-high', priority: 5, dueDate: todayIso })
      ];

      const groups = getEisenhowerMatrixGroups(tasks, refDate, 'UTC');
      expect(groups.Q1.map((t) => t.id)).toEqual([
        'uncomp-high',
        'uncomp-low',
        'comp-high'
      ]);
    });
  });

  describe('getQuadrantTargetUpdates', () => {
    it('computes target updates for Q1', () => {
      // Dropping task without priority or due date into Q1
      const initialTask = makeTask({ priority: 0, dueDate: null });
      const updates = getQuadrantTargetUpdates('Q1', initialTask, refDate, 'UTC');

      expect(updates.priority).toBe(3);
      expect(updates.dueDate).toBe('2026-10-15T00:00:00.000Z');
      expect(updates.isAllDay).toBe(true);

      // Dropping task that already has priority 5 and due today
      const highPriorityTask = makeTask({ priority: 5, dueDate: todayIso });
      const updates2 = getQuadrantTargetUpdates('Q1', highPriorityTask, refDate, 'UTC');
      expect(updates2.priority).toBe(5);
      expect(updates2.dueDate).toBe(todayIso);
    });

    it('computes target updates for Q2', () => {
      // Moving urgent task to Q2 clears urgent due date and promotes priority to 3
      const urgentTask = makeTask({ priority: 1, dueDate: todayIso });
      const updates = getQuadrantTargetUpdates('Q2', urgentTask, refDate, 'UTC');

      expect(updates.priority).toBe(3);
      expect(updates.dueDate).toBeNull();

      // Moving task with existing far future date to Q2 preserves future date
      const futureTask = makeTask({ priority: 3, dueDate: futureIso });
      const updates2 = getQuadrantTargetUpdates('Q2', futureTask, refDate, 'UTC');
      expect(updates2.priority).toBe(3);
      expect(updates2.dueDate).toBe(futureIso);
    });

    it('computes target updates for Q3', () => {
      // Moving important task with no due date to Q3 sets priority 1 and today's date
      const importantTask = makeTask({ priority: 3, dueDate: null });
      const updates = getQuadrantTargetUpdates('Q3', importantTask, refDate, 'UTC');

      expect(updates.priority).toBe(1);
      expect(updates.dueDate).toBe('2026-10-15T00:00:00.000Z');
      expect(updates.isAllDay).toBe(true);

      // Task already due today preserves its dueDate
      const dueTodayTask = makeTask({ priority: 3, dueDate: todayIso });
      const updates2 = getQuadrantTargetUpdates('Q3', dueTodayTask, refDate, 'UTC');
      expect(updates2.priority).toBe(1);
      expect(updates2.dueDate).toBe(todayIso);
    });

    it('computes target updates for Q4', () => {
      // Moving task to Q4 sets priority 0 and removes urgent date
      const urgentTask = makeTask({ priority: 5, dueDate: todayIso });
      const updates = getQuadrantTargetUpdates('Q4', urgentTask, refDate, 'UTC');

      expect(updates.priority).toBe(0);
      expect(updates.dueDate).toBeNull();
    });

    it('computes default updates for empty creation in each quadrant', () => {
      const q1 = getQuadrantTargetUpdates('Q1', undefined, refDate, 'UTC');
      expect(q1.priority).toBe(3);
      expect(q1.dueDate).toBe('2026-10-15T00:00:00.000Z');

      const q2 = getQuadrantTargetUpdates('Q2', undefined, refDate, 'UTC');
      expect(q2.priority).toBe(3);
      expect(q2.dueDate).toBeNull();

      const q3 = getQuadrantTargetUpdates('Q3', undefined, refDate, 'UTC');
      expect(q3.priority).toBe(1);
      expect(q3.dueDate).toBe('2026-10-15T00:00:00.000Z');

      const q4 = getQuadrantTargetUpdates('Q4', undefined, refDate, 'UTC');
      expect(q4.priority).toBe(0);
      expect(q4.dueDate).toBeNull();
    });
  });

  describe('QUADRANT_CONFIGS metadata', () => {
    it('defines configs for all 4 quadrants with valid properties', () => {
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4'] as const) {
        const config = QUADRANT_CONFIGS[q];
        expect(config.id).toBe(q);
        expect(config.name.length).toBeGreaterThan(0);
        expect(config.strategy.length).toBeGreaterThan(0);
        expect(config.badge.length).toBeGreaterThan(0);
        expect(config.color.length).toBeGreaterThan(0);
      }
    });
  });
});
