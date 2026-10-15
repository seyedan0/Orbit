import type { TagEntity, TaskEntity, TaskPriority } from '@orbit/shared-types';

export interface OrbitBackupData {
  orbitVersion: string;
  exportedAt: string;
  tasks: TaskEntity[];
  tags?: TagEntity[];
}

export interface ImportResult {
  tasks: Array<
    Pick<TaskEntity, 'title'> &
      Partial<
        Omit<TaskEntity, 'id' | 'title' | 'createdAt' | 'updatedAt' | 'version' | 'localStatus'>
      >
  >;
  tags?: Array<Partial<TagEntity>>;
  format: 'ORBIT' | 'TODOIST' | 'TICKTICK' | 'UNKNOWN';
}

/**
 * Serializes tasks and tags into an Orbit JSON backup file format.
 */
export function exportTasksToJson(tasks: TaskEntity[], tags: TagEntity[] = []): string {
  const backup: OrbitBackupData = {
    orbitVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    tasks,
    tags
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Validates and converts external (Todoist, TickTick) or Orbit backup JSON into Orbit task inputs.
 */
export function importTasksFromJson(jsonString: string): ImportResult {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('فایل JSON ورودی معتبر نیست یا خالی است.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString.trim());
  } catch {
    throw new Error('فرمت JSON نامعتبر است.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('ساختار فایل پشتیبان باید یک آبجکت یا آرایه معتبر باشد.');
  }

  const raw = parsed as Record<string, any>;

  // Case 1: Native Orbit backup
  if (Array.isArray(raw.tasks) && (raw.orbitVersion || raw.version || raw.exportedAt)) {
    const tasks = raw.tasks.filter((t: any) => t && typeof t.title === 'string' && t.title.trim().length > 0);
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    return {
      tasks,
      tags,
      format: 'ORBIT'
    };
  }

  // Case 2: Array of raw tasks (Orbit or Generic)
  if (Array.isArray(parsed)) {
    // Check if Todoist items (have 'content' property instead of 'title')
    const isTodoist = parsed.some((item) => item && typeof item.content === 'string' && !item.title);
    if (isTodoist) {
      return parseTodoistItems(parsed);
    }

    // Default generic / TickTick task array
    return parseTickTickOrGenericItems(parsed);
  }

  // Case 3: Todoist export object { items: [...] }
  if (Array.isArray(raw.items)) {
    return parseTodoistItems(raw.items);
  }

  // Case 4: TickTick export object { tasks: [...] } or { items: [...] }
  if (Array.isArray(raw.tasks)) {
    return parseTickTickOrGenericItems(raw.tasks);
  }

  throw new Error('فرمت پشتیبان شناسایی نشد. لطفاً از خروجی‌های معتبر Orbit، Todoist یا TickTick استفاده کنید.');
}

function parseTodoistItems(items: any[]): ImportResult {
  const tasks: ImportResult['tasks'] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const title = (item.content || item.title || '').trim();
    if (!title) continue;

    // Todoist priority: 4=urgent(P5), 3=high(P3), 2=medium(P1), 1=normal(P0)
    let priority: TaskPriority = 0;
    if (item.priority === 4) priority = 5;
    else if (item.priority === 3) priority = 3;
    else if (item.priority === 2) priority = 1;
    else if (item.priority === 1) priority = 0;

    let dueDate: string | null = null;
    if (item.due?.date) {
      dueDate = new Date(item.due.date).toISOString();
    } else if (item.dueDate) {
      dueDate = new Date(item.dueDate).toISOString();
    }

    const tags: string[] = Array.isArray(item.labels) ? item.labels : [];

    tasks.push({
      title,
      content: item.description || '',
      priority,
      dueDate,
      tags,
      kind: 'TASK',
      isAllDay: item.due?.is_recurring ? false : true,
      completedAt: item.checked || item.is_completed ? new Date().toISOString() : null,
      reminders: []
    });
  }

  return {
    tasks,
    format: 'TODOIST'
  };
}

function parseTickTickOrGenericItems(items: any[]): ImportResult {
  const tasks: ImportResult['tasks'] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const title = (item.title || item.content || '').trim();
    if (!title) continue;

    // TickTick priority: 0=none, 1=low, 3=medium, 5=high
    let priority: TaskPriority = 0;
    if (item.priority === 5) priority = 5;
    else if (item.priority === 3) priority = 3;
    else if (item.priority === 1) priority = 1;

    let dueDate: string | null = null;
    if (item.dueDate) {
      dueDate = new Date(item.dueDate).toISOString();
    } else if (item.startDate) {
      dueDate = new Date(item.startDate).toISOString();
    }

    const tags: string[] = Array.isArray(item.tags)
      ? item.tags
      : Array.isArray(item.labels)
        ? item.labels
        : [];

    tasks.push({
      title,
      content: item.content || item.desc || '',
      priority,
      dueDate,
      tags,
      kind: 'TASK',
      isAllDay: Boolean(item.isAllDay ?? item.allDay ?? false),
      completedAt: item.completedTime || item.completedAt ? new Date(item.completedTime || item.completedAt).toISOString() : null,
      reminders: []
    });
  }

  return {
    tasks,
    format: 'TICKTICK'
  };
}
