import type { LocalStatus } from './task.js';

export type FilterFieldOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'within'
  | 'is_null'
  | 'is_not_null';

export type RelativeDateRange =
  | 'today'
  | 'tomorrow'
  | 'this_week'
  | 'next_week'
  | 'overdue'
  | 'no_date';

export type FilterTargetField =
  | 'title'
  | 'content'
  | 'desc'
  | 'kind'
  | 'priority'
  | 'tags'
  | 'projectId'
  | 'dueDate'
  | 'startDate'
  | 'isCompleted'
  | 'completedAt'
  | 'isAllDay'
  | 'repeatFlag'
  | (string & {});

export interface FieldRule {
  field: FilterTargetField;
  operator: FilterFieldOperator;
  value?: unknown;
}

export type LogicalOperator = 'AND' | 'OR';

export interface FilterGroupRule {
  operator: LogicalOperator;
  rules: FilterRule[];
}

export type FilterRule = FieldRule | FilterGroupRule;

export function isFilterGroupRule(rule: FilterRule): rule is FilterGroupRule {
  return 'operator' in rule && Array.isArray((rule as FilterGroupRule).rules);
}

export function isFieldRule(rule: FilterRule): rule is FieldRule {
  return 'field' in rule && 'operator' in rule && !('rules' in rule);
}

export interface SmartFilterEntity {
  id: string;
  userId: string;
  name: string;
  color?: string | undefined;
  icon?: string | null | undefined;
  rule: FilterRule;
  order?: number | undefined;
  version: number;
  localStatus: LocalStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null | undefined;
}
