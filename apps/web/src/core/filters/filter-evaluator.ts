import {
  isFieldRule,
  isFilterGroupRule,
  type FieldRule,
  type FilterFieldOperator,
  type FilterGroupRule,
  type FilterRule,
  type RelativeDateRange,
  type TaskEntity
} from '@orbit/shared-types';
import { getPersianWeekday } from '../calendar/jalali';

export interface FilterEvaluationContext {
  /** Reference timestamp for relative date evaluations. Defaults to new Date(). */
  now?: Date;
  /** Calendar system for week intervals. Defaults to 'JALALI'. */
  calendarType?: 'JALALI' | 'GREGORIAN';
  /** Timezone identifier (optional). */
  timeZone?: string;
}

/**
 * Pure evaluator that checks if a TaskEntity satisfies a FilterRule (FieldRule or FilterGroupRule).
 */
export function evaluateTaskFilter(
  task: TaskEntity,
  rule: FilterRule,
  context?: FilterEvaluationContext
): boolean {
  if (isFilterGroupRule(rule)) {
    return evaluateGroupRule(task, rule, context);
  }
  if (isFieldRule(rule)) {
    return evaluateFieldRule(task, rule, context);
  }
  return true;
}

/**
 * Filters a list of tasks against a FilterRule.
 */
export function filterTasks(
  tasks: TaskEntity[],
  rule: FilterRule,
  context?: FilterEvaluationContext
): TaskEntity[] {
  return tasks.filter((task) => evaluateTaskFilter(task, rule, context));
}

// ---- Group Evaluation ----

function evaluateGroupRule(
  task: TaskEntity,
  group: FilterGroupRule,
  context?: FilterEvaluationContext
): boolean {
  if (!group.rules || group.rules.length === 0) {
    // Empty AND group is trivially true; empty OR group is false
    return group.operator === 'AND';
  }

  if (group.operator === 'AND') {
    return group.rules.every((r) => evaluateTaskFilter(task, r, context));
  }

  if (group.operator === 'OR') {
    return group.rules.some((r) => evaluateTaskFilter(task, r, context));
  }

  return true;
}

// ---- Field Evaluation ----

function evaluateFieldRule(
  task: TaskEntity,
  rule: FieldRule,
  context?: FilterEvaluationContext
): boolean {
  const { field, operator, value } = rule;
  const taskValue = getTaskFieldValue(task, field);

  switch (operator) {
    case 'is_null':
      return isValueNullOrEmpty(taskValue);

    case 'is_not_null':
      return !isValueNullOrEmpty(taskValue);

    case 'within':
      return evaluateWithinOperator(
        task,
        field,
        taskValue,
        value as RelativeDateRange,
        context
      );

    case 'eq':
      return compareEquality(taskValue, value);

    case 'neq':
      return !compareEquality(taskValue, value);

    case 'contains':
      return evaluateContains(taskValue, value);

    case 'not_contains':
      return !evaluateContains(taskValue, value);

    case 'in':
      return evaluateIn(taskValue, value);

    case 'not_in':
      return !evaluateIn(taskValue, value);

    case 'gt':
      return compareNumericOrDate(taskValue, value, (a, b) => a > b);

    case 'gte':
      return compareNumericOrDate(taskValue, value, (a, b) => a >= b);

    case 'lt':
      return compareNumericOrDate(taskValue, value, (a, b) => a < b);

    case 'lte':
      return compareNumericOrDate(taskValue, value, (a, b) => a <= b);

    default:
      return true;
  }
}

// ---- Field Value Extraction ----

function getTaskFieldValue(task: TaskEntity, field: string): unknown {
  switch (field) {
    case 'isCompleted':
      return task.completedAt != null;
    case 'completedAt':
      return task.completedAt;
    case 'priority':
      return task.priority;
    case 'tags':
      return task.tags ?? [];
    case 'kind':
      return task.kind;
    case 'title':
      return task.title;
    case 'content':
    case 'desc':
      return task.content ?? task.desc ?? '';
    case 'dueDate':
      return task.dueDate;
    case 'startDate':
      return task.startDate;
    case 'projectId':
      return task.projectId;
    case 'isAllDay':
      return task.isAllDay;
    case 'repeatFlag':
      return task.repeatFlag;
    case 'reminders':
      return task.reminders;
    default:
      return (task as unknown as Record<string, unknown>)[field];
  }
}

// ---- Operator Helpers ----

function isValueNullOrEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
}

function compareEquality(actual: unknown, expected: unknown): boolean {
  if (actual === expected) return true;

  // Boolean comparison (e.g. isCompleted)
  if (typeof actual === 'boolean' || typeof expected === 'boolean') {
    return Boolean(actual) === Boolean(expected);
  }

  // Number comparison (allow string/number coercion like '3' === 3)
  if (
    typeof actual === 'number' &&
    (typeof expected === 'number' || typeof expected === 'string')
  ) {
    const numExpected = Number(expected);
    if (!Number.isNaN(numExpected)) {
      return actual === numExpected;
    }
  }

  // String comparison (case-insensitive & trimmed)
  if (typeof actual === 'string' && typeof expected === 'string') {
    return actual.trim().toLowerCase() === expected.trim().toLowerCase();
  }

  // Array comparison (e.g. tags equals single tag)
  if (Array.isArray(actual) && typeof expected === 'string') {
    return actual.some(
      (item) => String(item).toLowerCase() === expected.toLowerCase()
    );
  }

  return false;
}

function evaluateContains(actual: unknown, search: unknown): boolean {
  if (actual === null || actual === undefined || search === null || search === undefined) {
    return false;
  }

  // If actual is an array (e.g. tags)
  if (Array.isArray(actual)) {
    const searchStr = String(search).toLowerCase();
    return actual.some((item) => String(item).toLowerCase() === searchStr);
  }

  // If actual is string
  if (typeof actual === 'string') {
    return actual.toLowerCase().includes(String(search).toLowerCase());
  }

  return false;
}

function evaluateIn(actual: unknown, expectedList: unknown): boolean {
  if (!Array.isArray(expectedList)) return false;

  // If actual is an array (e.g. task tags) -> checks for any intersection
  if (Array.isArray(actual)) {
    const expectedLower = expectedList.map((e) => String(e).toLowerCase());
    return actual.some((item) => expectedLower.includes(String(item).toLowerCase()));
  }

  // If actual is scalar
  const actualStr = String(actual).toLowerCase();
  return expectedList.some((e) => {
    if (typeof actual === 'number' && typeof e === 'number') {
      return actual === e;
    }
    return String(e).toLowerCase() === actualStr;
  });
}

function compareNumericOrDate(
  actual: unknown,
  expected: unknown,
  comparator: (a: number, b: number) => boolean
): boolean {
  if (actual === null || actual === undefined || expected === null || expected === undefined) {
    return false;
  }

  // Try Date comparison
  const actualDate = parseDateValue(actual);
  const expectedDate = parseDateValue(expected);

  if (actualDate !== null && expectedDate !== null) {
    return comparator(actualDate.getTime(), expectedDate.getTime());
  }

  // Numeric comparison
  const numActual = Number(actual);
  const numExpected = Number(expected);
  if (!Number.isNaN(numActual) && !Number.isNaN(numExpected)) {
    return comparator(numActual, numExpected);
  }

  return false;
}

function parseDateValue(val: unknown): Date | null {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val;
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) {
      return d;
    }
  }
  return null;
}

// ---- Relative Date Range Evaluation ('within') ----

function evaluateWithinOperator(
  task: TaskEntity,
  field: string,
  taskValue: unknown,
  range: RelativeDateRange,
  context?: FilterEvaluationContext
): boolean {
  const refDate = context?.now ?? new Date();
  const calendarType = context?.calendarType ?? 'JALALI';

  // Range: no_date
  if (range === 'no_date') {
    return isValueNullOrEmpty(taskValue);
  }

  // If task has no date for this field, it cannot be within any active range
  if (isValueNullOrEmpty(taskValue)) {
    return false;
  }

  const taskDate = parseDateValue(taskValue);
  if (taskDate === null) {
    return false;
  }

  // Range: overdue
  if (range === 'overdue') {
    // Completed tasks are never overdue
    if (task.completedAt != null) {
      return false;
    }

    const startOfToday = getStartOfDay(refDate);

    // If task is all-day, it is only overdue if due date was before today's start
    if (task.isAllDay) {
      return taskDate.getTime() < startOfToday.getTime();
    }

    // For tasks with specific time: overdue if before now
    return taskDate.getTime() < refDate.getTime();
  }

  // Range: today
  if (range === 'today') {
    const startOfToday = getStartOfDay(refDate);
    const endOfToday = getEndOfDay(refDate);
    return isDateInRange(taskDate, startOfToday, endOfToday);
  }

  // Range: tomorrow
  if (range === 'tomorrow') {
    const tomorrow = new Date(refDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = getStartOfDay(tomorrow);
    const endOfTomorrow = getEndOfDay(tomorrow);
    return isDateInRange(taskDate, startOfTomorrow, endOfTomorrow);
  }

  // Range: this_week
  if (range === 'this_week') {
    const { startOfWeek, endOfWeek } = getWeekBounds(refDate, calendarType);
    return isDateInRange(taskDate, startOfWeek, endOfWeek);
  }

  // Range: next_week
  if (range === 'next_week') {
    const { startOfWeek, endOfWeek } = getWeekBounds(refDate, calendarType);
    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);
    return isDateInRange(taskDate, startOfNextWeek, endOfNextWeek);
  }

  return false;
}

// ---- Date Math Helpers ----

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isDateInRange(target: Date, start: Date, end: Date): boolean {
  const t = target.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function getWeekBounds(
  refDate: Date,
  calendarType: 'JALALI' | 'GREGORIAN'
): { startOfWeek: Date; endOfWeek: Date } {
  if (calendarType === 'JALALI') {
    // In Persian calendar, week starts on Saturday (شنبه: 0) and ends on Friday (جمعه: 6)
    const weekday = getPersianWeekday(refDate); // 0..6
    const start = getStartOfDay(refDate);
    start.setDate(start.getDate() - weekday);

    const end = getEndOfDay(start);
    end.setDate(end.getDate() + 6);

    return { startOfWeek: start, endOfWeek: end };
  }

  // Gregorian calendar: Week starts on Monday (1) and ends on Sunday (0)
  const day = refDate.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? 6 : day - 1;

  const start = getStartOfDay(refDate);
  start.setDate(start.getDate() - diffToMonday);

  const end = getEndOfDay(start);
  end.setDate(end.getDate() + 6);

  return { startOfWeek: start, endOfWeek: end };
}
