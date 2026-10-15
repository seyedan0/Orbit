import type { TaskEntity, TaskPriority } from '@orbit/shared-types';

export const RECENT_SEARCHES_STORAGE_KEY = 'orbit.recent_searches.v1';
export const MAX_RECENT_SEARCHES = 10;

export type SortByOption = 'dueDate' | 'priority' | 'title' | 'position';
export type SortOrder = 'asc' | 'desc';
export type GroupByOption = 'dueDate' | 'priority' | 'tag' | 'projectId' | 'none';

/**
 * Searches tasks across title, content/desc, tags, and dueDate.
 */
export function searchTasks(tasks: TaskEntity[], query: string): TaskEntity[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return tasks.filter((t) => t.deletedAt == null);
  }

  return tasks.filter((t) => {
    if (t.deletedAt != null) return false;

    // Check title
    if (t.title.toLowerCase().includes(q)) return true;

    // Check content or desc
    if (t.content?.toLowerCase().includes(q)) return true;
    if (t.desc?.toLowerCase().includes(q)) return true;

    // Check tags
    if (t.tags?.some((tag) => tag.toLowerCase().includes(q))) return true;

    // Check dueDate
    if (t.dueDate?.toLowerCase().includes(q)) return true;

    return false;
  });
}

/**
 * Sorts tasks dynamically by dueDate, priority, title, or LexoRank position.
 */
export function sortTasks(
  tasks: TaskEntity[],
  sortBy: SortByOption = 'position',
  sortOrder: SortOrder = 'asc'
): TaskEntity[] {
  const result = [...tasks];
  const orderFactor = sortOrder === 'asc' ? 1 : -1;

  result.sort((a, b) => {
    if (sortBy === 'priority') {
      const pA = a.priority ?? 0;
      const pB = b.priority ?? 0;
      return (pA - pB) * orderFactor;
    }

    if (sortBy === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1; // nulls always at the end
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate) * orderFactor;
    }

    if (sortBy === 'title') {
      return a.title.localeCompare(b.title, 'fa') * orderFactor;
    }

    if (sortBy === 'position') {
      const posA = a.position ?? '';
      const posB = b.position ?? '';
      if (!posA && !posB) return a.createdAt.localeCompare(b.createdAt) * orderFactor;
      if (!posA) return 1;
      if (!posB) return -1;
      return posA.localeCompare(posB) * orderFactor;
    }

    return 0;
  });

  return result;
}

/**
 * Groups tasks by dueDate, priority, tag, projectId, or none.
 */
export function groupTasks(
  tasks: TaskEntity[],
  groupBy: GroupByOption = 'none',
  now: Date = new Date()
): Record<string, TaskEntity[]> {
  const activeTasks = tasks.filter((t) => t.deletedAt == null);

  if (groupBy === 'none') {
    return { all: activeTasks };
  }

  const groups: Record<string, TaskEntity[]> = {};

  if (groupBy === 'priority') {
    const priorityLabels: Record<TaskPriority, string> = {
      5: 'بسیار بالا (P5)',
      3: 'بالا (P3)',
      1: 'عادی (P1)',
      0: 'بدون اولویت (P0)'
    };

    // Initialize all priority keys so order is deterministic
    groups[priorityLabels[5]] = [];
    groups[priorityLabels[3]] = [];
    groups[priorityLabels[1]] = [];
    groups[priorityLabels[0]] = [];

    for (const task of activeTasks) {
      const label = priorityLabels[task.priority] ?? priorityLabels[0];
      groups[label]!.push(task);
    }

    return groups;
  }

  if (groupBy === 'projectId') {
    for (const task of activeTasks) {
      const key = task.projectId || 'inbox';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    }
    return groups;
  }

  if (groupBy === 'tag') {
    const NO_TAG_KEY = 'بدون برچسب';
    groups[NO_TAG_KEY] = [];

    for (const task of activeTasks) {
      if (!task.tags || task.tags.length === 0) {
        groups[NO_TAG_KEY].push(task);
      } else {
        for (const tag of task.tags) {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(task);
        }
      }
    }
    return groups;
  }

  if (groupBy === 'dueDate') {
    const OVERDUE = 'گذشته / معوق';
    const TODAY = 'امروز';
    const TOMORROW = 'فردا';
    const UPCOMING = 'آینده';
    const NO_DATE = 'بدون تاریخ سررسید';

    groups[OVERDUE] = [];
    groups[TODAY] = [];
    groups[TOMORROW] = [];
    groups[UPCOMING] = [];
    groups[NO_DATE] = [];

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const dayAfterTomorrowStart = new Date(tomorrowStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);

    for (const task of activeTasks) {
      if (!task.dueDate) {
        groups[NO_DATE]!.push(task);
        continue;
      }

      const due = new Date(task.dueDate);
      if (isNaN(due.getTime())) {
        groups[NO_DATE]!.push(task);
        continue;
      }

      if (due.getTime() < todayStart.getTime()) {
        groups[OVERDUE]!.push(task);
      } else if (due.getTime() < tomorrowStart.getTime()) {
        groups[TODAY]!.push(task);
      } else if (due.getTime() < dayAfterTomorrowStart.getTime()) {
        groups[TOMORROW]!.push(task);
      } else {
        groups[UPCOMING]!.push(task);
      }
    }

    return groups;
  }

  return { all: activeTasks };
}

/**
 * Reads recent searches from localStorage.
 */
export function getRecentSearches(): string[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Saves a new search query to recent searches in localStorage.
 */
export function saveRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();

  try {
    const current = getRecentSearches();
    const updated = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(
      0,
      MAX_RECENT_SEARCHES
    );

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch {
    return [];
  }
}

/**
 * Clears recent searches from localStorage.
 */
export function clearRecentSearches(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}
