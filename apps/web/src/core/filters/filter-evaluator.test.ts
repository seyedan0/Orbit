import { describe, expect, it } from 'vitest';
import type { TaskEntity, FieldRule, FilterGroupRule } from '@orbit/shared-types';
import { evaluateTaskFilter, filterTasks } from './filter-evaluator';

describe('filter-evaluator (P5-FLT-001)', () => {
  const createMockTask = (overrides: Partial<TaskEntity> = {}): TaskEntity => ({
    id: 'task-1',
    projectId: 'proj-1',
    userId: 'user-1',
    title: 'خرید تجهیزات سرور',
    content: 'بررسی فاکتور پرداختی و سرور اختصاصی',
    desc: 'بررسی فاکتور پرداختی و سرور اختصاصی',
    kind: 'TASK',
    priority: 3,
    isAllDay: false,
    startDate: null,
    dueDate: '2026-10-15T12:00:00.000Z',
    duration: 30,
    timeZone: 'Asia/Tehran',
    repeatFlag: null,
    reminders: [],
    tags: ['work', 'devops'],
    items: [],
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
    completedAt: null,
    ...overrides
  });

  const BASE_NOW = new Date('2026-10-15T10:00:00.000Z');

  describe('Field equality & negation (eq / neq)', () => {
    it('evaluates string title equality case-insensitively and trimmed', () => {
      const task = createMockTask({ title: 'جلسه بازبینی کد' });
      const eqRule: FieldRule = { field: 'title', operator: 'eq', value: '  جلسه بازبینی کد  ' };
      const neqRule: FieldRule = { field: 'title', operator: 'neq', value: 'دیگر' };

      expect(evaluateTaskFilter(task, eqRule)).toBe(true);
      expect(evaluateTaskFilter(task, neqRule)).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'title', operator: 'eq', value: 'متفاوت' })).toBe(false);
    });

    it('evaluates task kind equality and inequality', () => {
      const task = createMockTask({ kind: 'NOTE' });
      expect(evaluateTaskFilter(task, { field: 'kind', operator: 'eq', value: 'NOTE' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'kind', operator: 'neq', value: 'TASK' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'kind', operator: 'eq', value: 'TASK' })).toBe(false);
    });

    it('evaluates task priority equality (including numeric coercion)', () => {
      const task = createMockTask({ priority: 3 });
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'eq', value: 3 })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'eq', value: '3' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'neq', value: 1 })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'eq', value: 5 })).toBe(false);
    });

    it('evaluates isCompleted boolean flag via completedAt', () => {
      const activeTask = createMockTask({ completedAt: null });
      const completedTask = createMockTask({ completedAt: '2026-10-14T15:00:00.000Z' });

      expect(evaluateTaskFilter(activeTask, { field: 'isCompleted', operator: 'eq', value: false })).toBe(true);
      expect(evaluateTaskFilter(activeTask, { field: 'isCompleted', operator: 'eq', value: true })).toBe(false);

      expect(evaluateTaskFilter(completedTask, { field: 'isCompleted', operator: 'eq', value: true })).toBe(true);
      expect(evaluateTaskFilter(completedTask, { field: 'isCompleted', operator: 'eq', value: false })).toBe(false);
    });

    it('evaluates tags equality when target is a single tag string', () => {
      const task = createMockTask({ tags: ['frontend', 'react'] });
      expect(evaluateTaskFilter(task, { field: 'tags', operator: 'eq', value: 'frontend' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'tags', operator: 'eq', value: 'backend' })).toBe(false);
    });
  });

  describe('Substring and array contains (contains / not_contains)', () => {
    it('evaluates substring in title and content', () => {
      const task = createMockTask({
        title: 'گزارش هفتگی پایگاه داده',
        content: 'شامل بهینه‌سازی کوئری‌های کند'
      });

      expect(evaluateTaskFilter(task, { field: 'title', operator: 'contains', value: 'هفتگی' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'title', operator: 'not_contains', value: 'مالی' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'content', operator: 'contains', value: 'کوئری' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'content', operator: 'contains', value: 'ناموجود' })).toBe(false);
    });

    it('evaluates element presence in tags array', () => {
      const task = createMockTask({ tags: ['Urgent', 'Release'] });

      expect(evaluateTaskFilter(task, { field: 'tags', operator: 'contains', value: 'urgent' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'tags', operator: 'contains', value: 'release' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'tags', operator: 'contains', value: 'bug' })).toBe(false);
      expect(evaluateTaskFilter(task, { field: 'tags', operator: 'not_contains', value: 'bug' })).toBe(true);
    });
  });

  describe('Set inclusion (in / not_in)', () => {
    it('evaluates scalar fields in list of values', () => {
      const task = createMockTask({ priority: 3, kind: 'CHECKLIST' });

      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'in', value: [1, 3, 5] })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'in', value: [0, 1] })).toBe(false);
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'not_in', value: [0, 1] })).toBe(true);

      expect(evaluateTaskFilter(task, { field: 'kind', operator: 'in', value: ['NOTE', 'CHECKLIST'] })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'kind', operator: 'in', value: ['TASK'] })).toBe(false);
    });

    it('evaluates array fields (tags) intersecting with expected list', () => {
      const task = createMockTask({ tags: ['design', 'ui'] });

      expect(evaluateTaskFilter(task, { field: 'tags', operator: 'in', value: ['frontend', 'ui'] })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'tags', operator: 'in', value: ['backend', 'database'] })).toBe(false);
      expect(evaluateTaskFilter(task, { field: 'tags', operator: 'not_in', value: ['backend'] })).toBe(true);
    });
  });

  describe('Numeric & Date comparisons (gt, gte, lt, lte)', () => {
    it('compares numeric priorities', () => {
      const task = createMockTask({ priority: 3 });

      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'gt', value: 1 })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'gte', value: 3 })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'lt', value: 5 })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'lte', value: 3 })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'gt', value: 3 })).toBe(false);
      expect(evaluateTaskFilter(task, { field: 'priority', operator: 'lt', value: 3 })).toBe(false);
    });

    it('compares date strings chronologically', () => {
      const task = createMockTask({ dueDate: '2026-10-15T12:00:00.000Z' });

      expect(evaluateTaskFilter(task, { field: 'dueDate', operator: 'gt', value: '2026-10-14T00:00:00.000Z' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'dueDate', operator: 'lt', value: '2026-10-16T00:00:00.000Z' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'dueDate', operator: 'gte', value: '2026-10-15T12:00:00.000Z' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'dueDate', operator: 'lte', value: '2026-10-15T12:00:00.000Z' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'dueDate', operator: 'gt', value: '2026-10-16T00:00:00.000Z' })).toBe(false);
    });
  });

  describe('Null / Not Null checks (is_null, is_not_null)', () => {
    it('checks null or empty string fields', () => {
      const taskWithDesc = createMockTask({ content: 'توضیحات' });
      const taskEmptyDesc = createMockTask({ content: '', desc: '' });

      expect(evaluateTaskFilter(taskWithDesc, { field: 'content', operator: 'is_not_null' })).toBe(true);
      expect(evaluateTaskFilter(taskWithDesc, { field: 'content', operator: 'is_null' })).toBe(false);

      expect(evaluateTaskFilter(taskEmptyDesc, { field: 'content', operator: 'is_null' })).toBe(true);
      expect(evaluateTaskFilter(taskEmptyDesc, { field: 'content', operator: 'is_not_null' })).toBe(false);
    });

    it('checks null or empty tags array', () => {
      const taskWithTags = createMockTask({ tags: ['personal'] });
      const taskNoTags = createMockTask({ tags: [] });

      expect(evaluateTaskFilter(taskWithTags, { field: 'tags', operator: 'is_not_null' })).toBe(true);
      expect(evaluateTaskFilter(taskWithTags, { field: 'tags', operator: 'is_null' })).toBe(false);

      expect(evaluateTaskFilter(taskNoTags, { field: 'tags', operator: 'is_null' })).toBe(true);
      expect(evaluateTaskFilter(taskNoTags, { field: 'tags', operator: 'is_not_null' })).toBe(false);
    });

    it('checks null dueDate or completedAt', () => {
      const task = createMockTask({ dueDate: null, completedAt: null });

      expect(evaluateTaskFilter(task, { field: 'dueDate', operator: 'is_null' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'dueDate', operator: 'is_not_null' })).toBe(false);
      expect(evaluateTaskFilter(task, { field: 'completedAt', operator: 'is_null' })).toBe(true);
      expect(evaluateTaskFilter(task, { field: 'completedAt', operator: 'is_not_null' })).toBe(false);
    });
  });

  describe('Relative date ranges with within operator', () => {
    // 2026-10-15 is Thursday (پنج‌شنبه) in Gregorian/Jalali
    const ctx = { now: BASE_NOW, calendarType: 'JALALI' as const };

    it('matches today range correctly', () => {
      const taskToday = createMockTask({ dueDate: '2026-10-15T18:00:00.000Z' });
      const taskTomorrow = createMockTask({ dueDate: '2026-10-16T09:00:00.000Z' });

      expect(evaluateTaskFilter(taskToday, { field: 'dueDate', operator: 'within', value: 'today' }, ctx)).toBe(true);
      expect(evaluateTaskFilter(taskTomorrow, { field: 'dueDate', operator: 'within', value: 'today' }, ctx)).toBe(false);
    });

    it('matches tomorrow range correctly', () => {
      const taskToday = createMockTask({ dueDate: '2026-10-15T18:00:00.000Z' });
      const taskTomorrow = createMockTask({ dueDate: '2026-10-16T09:00:00.000Z' });

      expect(evaluateTaskFilter(taskTomorrow, { field: 'dueDate', operator: 'within', value: 'tomorrow' }, ctx)).toBe(true);
      expect(evaluateTaskFilter(taskToday, { field: 'dueDate', operator: 'within', value: 'tomorrow' }, ctx)).toBe(false);
    });

    it('matches this_week range in Jalali calendar (Saturday to Friday)', () => {
      // For reference 2026-10-15 (Thursday):
      // Jalali week starts Saturday (2026-10-10) and ends Friday (2026-10-16)
      const taskInWeek = createMockTask({ dueDate: '2026-10-11T10:00:00.000Z' }); // Sunday
      const taskNextWeek = createMockTask({ dueDate: '2026-10-18T10:00:00.000Z' }); // Next Sunday

      expect(evaluateTaskFilter(taskInWeek, { field: 'dueDate', operator: 'within', value: 'this_week' }, ctx)).toBe(true);
      expect(evaluateTaskFilter(taskNextWeek, { field: 'dueDate', operator: 'within', value: 'this_week' }, ctx)).toBe(false);
    });

    it('matches next_week range in Jalali calendar', () => {
      const taskNextWeek = createMockTask({ dueDate: '2026-10-18T10:00:00.000Z' });
      const taskThisWeek = createMockTask({ dueDate: '2026-10-15T14:00:00.000Z' });

      expect(evaluateTaskFilter(taskNextWeek, { field: 'dueDate', operator: 'within', value: 'next_week' }, ctx)).toBe(true);
      expect(evaluateTaskFilter(taskThisWeek, { field: 'dueDate', operator: 'within', value: 'next_week' }, ctx)).toBe(false);
    });

    it('matches this_week in Gregorian calendar (Monday to Sunday)', () => {
      const gregCtx = { now: BASE_NOW, calendarType: 'GREGORIAN' as const };
      // 2026-10-15 is Thursday. Week starts Monday 2026-10-12 and ends Sunday 2026-10-18.
      const taskMonday = createMockTask({ dueDate: '2026-10-12T08:00:00.000Z' });
      const taskPreviousSunday = createMockTask({ dueDate: '2026-10-11T20:00:00.000Z' });

      expect(evaluateTaskFilter(taskMonday, { field: 'dueDate', operator: 'within', value: 'this_week' }, gregCtx)).toBe(true);
      expect(evaluateTaskFilter(taskPreviousSunday, { field: 'dueDate', operator: 'within', value: 'this_week' }, gregCtx)).toBe(false);
    });

    it('evaluates overdue status with consideration of completedAt and isAllDay', () => {
      // 1. Task in past with specific time -> overdue
      const pastTask = createMockTask({
        dueDate: '2026-10-14T10:00:00.000Z',
        completedAt: null,
        isAllDay: false
      });
      expect(evaluateTaskFilter(pastTask, { field: 'dueDate', operator: 'within', value: 'overdue' }, ctx)).toBe(true);

      // 2. Completed task in past -> NEVER overdue
      const completedPastTask = createMockTask({
        dueDate: '2026-10-14T10:00:00.000Z',
        completedAt: '2026-10-14T11:00:00.000Z',
        isAllDay: false
      });
      expect(evaluateTaskFilter(completedPastTask, { field: 'dueDate', operator: 'within', value: 'overdue' }, ctx)).toBe(false);

      // 3. All-day task for today (2026-10-15) -> NOT overdue during today
      const allDayTodayTask = createMockTask({
        dueDate: '2026-10-15T00:00:00.000Z',
        completedAt: null,
        isAllDay: true
      });
      expect(evaluateTaskFilter(allDayTodayTask, { field: 'dueDate', operator: 'within', value: 'overdue' }, ctx)).toBe(false);

      // 4. All-day task for yesterday (2026-10-14) -> overdue
      const allDayYesterdayTask = createMockTask({
        dueDate: '2026-10-14T00:00:00.000Z',
        completedAt: null,
        isAllDay: true
      });
      expect(evaluateTaskFilter(allDayYesterdayTask, { field: 'dueDate', operator: 'within', value: 'overdue' }, ctx)).toBe(true);

      // 5. Future task -> not overdue
      const futureTask = createMockTask({
        dueDate: '2026-10-16T12:00:00.000Z',
        completedAt: null
      });
      expect(evaluateTaskFilter(futureTask, { field: 'dueDate', operator: 'within', value: 'overdue' }, ctx)).toBe(false);
    });

    it('evaluates no_date range', () => {
      const taskWithoutDate = createMockTask({ dueDate: null });
      const taskWithDate = createMockTask({ dueDate: '2026-10-15T12:00:00.000Z' });

      expect(evaluateTaskFilter(taskWithoutDate, { field: 'dueDate', operator: 'within', value: 'no_date' })).toBe(true);
      expect(evaluateTaskFilter(taskWithDate, { field: 'dueDate', operator: 'within', value: 'no_date' })).toBe(false);
    });
  });

  describe('Logical groups (AND / OR) & Nested Rules', () => {
    it('evaluates simple AND group where all conditions must hold', () => {
      const task = createMockTask({
        priority: 3,
        kind: 'TASK',
        completedAt: null
      });

      const andRule: FilterGroupRule = {
        operator: 'AND',
        rules: [
          { field: 'priority', operator: 'gte', value: 3 },
          { field: 'kind', operator: 'eq', value: 'TASK' },
          { field: 'isCompleted', operator: 'eq', value: false }
        ]
      };

      expect(evaluateTaskFilter(task, andRule)).toBe(true);

      const failingAndRule: FilterGroupRule = {
        operator: 'AND',
        rules: [
          { field: 'priority', operator: 'gte', value: 3 },
          { field: 'kind', operator: 'eq', value: 'NOTE' } // fails
        ]
      };

      expect(evaluateTaskFilter(task, failingAndRule)).toBe(false);
    });

    it('evaluates simple OR group where at least one condition must hold', () => {
      const task = createMockTask({
        priority: 1,
        kind: 'NOTE'
      });

      const orRule: FilterGroupRule = {
        operator: 'OR',
        rules: [
          { field: 'priority', operator: 'eq', value: 5 },
          { field: 'kind', operator: 'eq', value: 'NOTE' }
        ]
      };

      expect(evaluateTaskFilter(task, orRule)).toBe(true);

      const failingOrRule: FilterGroupRule = {
        operator: 'OR',
        rules: [
          { field: 'priority', operator: 'eq', value: 5 },
          { field: 'kind', operator: 'eq', value: 'TASK' }
        ]
      };

      expect(evaluateTaskFilter(task, failingOrRule)).toBe(false);
    });

    it('evaluates empty groups correctly (AND is true, OR is false)', () => {
      const task = createMockTask();

      expect(evaluateTaskFilter(task, { operator: 'AND', rules: [] })).toBe(true);
      expect(evaluateTaskFilter(task, { operator: 'OR', rules: [] })).toBe(false);
    });

    it('evaluates nested tree: (priority >= 3 AND (tags CONTAINS "work" OR kind == "NOTE"))', () => {
      const complexRule: FilterGroupRule = {
        operator: 'AND',
        rules: [
          { field: 'priority', operator: 'gte', value: 3 },
          {
            operator: 'OR',
            rules: [
              { field: 'tags', operator: 'contains', value: 'work' },
              { field: 'kind', operator: 'eq', value: 'NOTE' }
            ]
          }
        ]
      };

      // Case 1: Priority 3, tags include 'work' -> Match
      const task1 = createMockTask({ priority: 3, tags: ['work'], kind: 'TASK' });
      expect(evaluateTaskFilter(task1, complexRule)).toBe(true);

      // Case 2: Priority 5, tags empty, kind is 'NOTE' -> Match
      const task2 = createMockTask({ priority: 5, tags: [], kind: 'NOTE' });
      expect(evaluateTaskFilter(task2, complexRule)).toBe(true);

      // Case 3: Priority 1 (fails first AND clause) -> No match
      const task3 = createMockTask({ priority: 1, tags: ['work'], kind: 'NOTE' });
      expect(evaluateTaskFilter(task3, complexRule)).toBe(false);

      // Case 4: Priority 5, but neither tag is 'work' nor kind is 'NOTE' -> No match
      const task4 = createMockTask({ priority: 5, tags: ['home'], kind: 'TASK' });
      expect(evaluateTaskFilter(task4, complexRule)).toBe(false);
    });
  });

  describe('filterTasks utility', () => {
    it('filters a list of tasks returning only matching elements', () => {
      const tasks: TaskEntity[] = [
        createMockTask({ id: '1', priority: 5, tags: ['urgent'] }),
        createMockTask({ id: '2', priority: 1, tags: ['low'] }),
        createMockTask({ id: '3', priority: 5, tags: ['urgent', 'backend'] }),
        createMockTask({ id: '4', priority: 3, tags: ['urgent'] })
      ];

      const urgentHighRule: FilterGroupRule = {
        operator: 'AND',
        rules: [
          { field: 'priority', operator: 'eq', value: 5 },
          { field: 'tags', operator: 'contains', value: 'urgent' }
        ]
      };

      const result = filterTasks(tasks, urgentHighRule);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(['1', '3']);
    });

    it('returns empty array when no tasks match', () => {
      const tasks = [createMockTask({ priority: 1 })];
      const result = filterTasks(tasks, { field: 'priority', operator: 'eq', value: 5 });
      expect(result).toEqual([]);
    });

    it('returns entire array when rule matches all tasks', () => {
      const tasks = [
        createMockTask({ id: '1' }),
        createMockTask({ id: '2' })
      ];
      const result = filterTasks(tasks, { operator: 'AND', rules: [] });
      expect(result).toHaveLength(2);
    });
  });
});
