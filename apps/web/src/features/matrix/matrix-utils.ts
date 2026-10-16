import type { TaskEntity, TaskPriority } from '@orbit/shared-types';
import { getLocalDateKey } from '../tasks/services/task-service';

export type EisenhowerQuadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface QuadrantConfig {
  id: EisenhowerQuadrant;
  name: string;
  strategy: string;
  description: string;
  actionText: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  defaultPriority: TaskPriority;
}

export const QUADRANT_CONFIGS: Record<EisenhowerQuadrant, QuadrantConfig> = {
  Q1: {
    id: 'Q1',
    name: 'فوری و مهم',
    strategy: 'انجام فوری (Do First)',
    description: 'کارهای بحرانی با ضرب‌الاجل نزدیک که باید بی‌درنگ انجام شوند',
    actionText: 'انجام در اولویت',
    badge: 'بحرانی',
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    defaultPriority: 3
  },
  Q2: {
    id: 'Q2',
    name: 'مهم و غیرفوری',
    strategy: 'برنامه‌ریزی (Schedule)',
    description: 'کارهای استراتژیک، رشد و هدفمند که نیاز به زمان‌بندی دقیق دارند',
    actionText: 'برنامه‌ریزی دقیق',
    badge: 'هدفمند',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    defaultPriority: 3
  },
  Q3: {
    id: 'Q3',
    name: 'فوری و کم‌اهمیت',
    strategy: 'واگذاری (Delegate)',
    description: 'امور ناگهانی و روتین که ارزش بالایی ندارند و بهتر است واگذار شوند',
    actionText: 'واگذاری یا خودکارسازی',
    badge: 'فوریت سطحی',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    defaultPriority: 1
  },
  Q4: {
    id: 'Q4',
    name: 'نه فوری و نه مهم',
    strategy: 'حذف یا بایگانی (Eliminate)',
    description: 'کارهای اتلاف وقت یا کم‌اثر که باید حذف، رد یا به تعویق انداخته شوند',
    actionText: 'حذف یا بایگانی',
    badge: 'کم‌ارزش',
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.35)',
    defaultPriority: 0
  }
};

/**
 * Pure classification of a TaskEntity into one of the 4 Eisenhower Quadrants:
 * - Q1: فوری و مهم (priority >= 3 و سررسید گذشته/امروز/فردا)
 * - Q2: مهم و غیرفوری (priority >= 3 و سررسید آینده دورتر یا بدون سررسید)
 * - Q3: فوری و کم‌اهمیت (priority === 1 و سررسید گذشته/امروز)
 * - Q4: نه فوری و نه مهم (priority === 0 یا سایر تسک‌های اولویت پایین و غیرفوری)
 */
export function categorizeTaskIntoQuadrant(
  task: TaskEntity,
  referenceDate: Date = new Date(),
  timeZone?: string
): EisenhowerQuadrant {
  const tz = timeZone ?? task.timeZone;
  const todayKey = getLocalDateKey(referenceDate, tz);

  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getLocalDateKey(tomorrow, tz);

  const dueKey = task.dueDate
    ? (() => {
        const d = new Date(task.dueDate);
        return isNaN(d.getTime()) ? null : getLocalDateKey(d, tz);
      })()
    : null;

  const isImportant = task.priority >= 3;

  if (isImportant) {
    const isUrgent = dueKey !== null && dueKey <= tomorrowKey;
    return isUrgent ? 'Q1' : 'Q2';
  }

  if (task.priority === 1) {
    const isUrgent = dueKey !== null && dueKey <= todayKey;
    return isUrgent ? 'Q3' : 'Q4';
  }

  return 'Q4';
}

export interface EisenhowerMatrixGroups {
  Q1: TaskEntity[];
  Q2: TaskEntity[];
  Q3: TaskEntity[];
  Q4: TaskEntity[];
}

export interface GetEisenhowerMatrixGroupsOptions {
  includeCompleted?: boolean;
}

/**
 * Groups and sorts tasks into the 4 Eisenhower Quadrants.
 * Filters out soft-deleted tasks (deletedAt != null).
 * Optionally filters completed tasks.
 */
export function getEisenhowerMatrixGroups(
  tasks: TaskEntity[],
  referenceDate: Date = new Date(),
  timeZone?: string,
  options: GetEisenhowerMatrixGroupsOptions = {}
): EisenhowerMatrixGroups {
  const { includeCompleted = true } = options;
  const groups: EisenhowerMatrixGroups = {
    Q1: [],
    Q2: [],
    Q3: [],
    Q4: []
  };

  const activeTasks = tasks.filter((task) => {
    if (task.deletedAt != null) return false;
    if (!includeCompleted && task.completedAt != null) return false;
    return true;
  });

  for (const task of activeTasks) {
    const quadrant = categorizeTaskIntoQuadrant(task, referenceDate, timeZone);
    groups[quadrant].push(task);
  }

  const sortComparator = (a: TaskEntity, b: TaskEntity): number => {
    if (Boolean(a.completedAt) !== Boolean(b.completedAt)) {
      return a.completedAt ? 1 : -1;
    }
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    return b.createdAt.localeCompare(a.createdAt);
  };

  groups.Q1.sort(sortComparator);
  groups.Q2.sort(sortComparator);
  groups.Q3.sort(sortComparator);
  groups.Q4.sort(sortComparator);

  return groups;
}

export interface QuadrantTargetUpdates {
  priority: TaskPriority;
  dueDate: string | null;
  isAllDay: boolean;
}

/**
 * Computes automated priority and due date updates when dropping a task
 * into a new quadrant or initializing quick-creation for that quadrant.
 */
export function getQuadrantTargetUpdates(
  targetQuadrant: EisenhowerQuadrant,
  currentTask?: TaskEntity,
  referenceDate: Date = new Date(),
  timeZone?: string
): QuadrantTargetUpdates {
  const tz = timeZone ?? currentTask?.timeZone;
  const todayKey = getLocalDateKey(referenceDate, tz);
  const todayIso = `${todayKey}T00:00:00.000Z`;

  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getLocalDateKey(tomorrow, tz);

  const currentDueKey = currentTask?.dueDate
    ? (() => {
        const d = new Date(currentTask.dueDate);
        return isNaN(d.getTime()) ? null : getLocalDateKey(d, tz);
      })()
    : null;

  switch (targetQuadrant) {
    case 'Q1': {
      const priority: TaskPriority = (currentTask && currentTask.priority >= 3)
        ? (currentTask.priority as 3 | 5)
        : 3;
      const isUrgentDue = currentDueKey !== null && currentDueKey <= tomorrowKey;
      return {
        priority,
        dueDate: isUrgentDue && currentTask?.dueDate ? currentTask.dueDate : todayIso,
        isAllDay: isUrgentDue ? (currentTask?.isAllDay ?? true) : true
      };
    }
    case 'Q2': {
      const priority: TaskPriority = (currentTask && currentTask.priority >= 3)
        ? (currentTask.priority as 3 | 5)
        : 3;
      const isFutureBeyondTomorrow = currentDueKey !== null && currentDueKey > tomorrowKey;
      return {
        priority,
        dueDate: isFutureBeyondTomorrow && currentTask?.dueDate ? currentTask.dueDate : null,
        isAllDay: isFutureBeyondTomorrow ? (currentTask?.isAllDay ?? true) : true
      };
    }
    case 'Q3': {
      const isUrgentDue = currentDueKey !== null && currentDueKey <= todayKey;
      return {
        priority: 1,
        dueDate: isUrgentDue && currentTask?.dueDate ? currentTask.dueDate : todayIso,
        isAllDay: isUrgentDue ? (currentTask?.isAllDay ?? true) : true
      };
    }
    case 'Q4': {
      const isUrgentDue = currentDueKey !== null && currentDueKey <= tomorrowKey;
      return {
        priority: 0,
        dueDate: isUrgentDue ? null : (currentTask?.dueDate ?? null),
        isAllDay: currentTask?.isAllDay ?? true
      };
    }
  }
}
