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

  const raw = parsed as Record<string, unknown>;

  // Case 1: Native Orbit backup
  if (Array.isArray(raw.tasks) && (raw.orbitVersion || raw.version || raw.exportedAt)) {
    const tasks = raw.tasks.filter(
      (t): t is TaskEntity =>
        Boolean(
          t &&
            typeof t === 'object' &&
            typeof (t as Record<string, unknown>).title === 'string' &&
            ((t as Record<string, unknown>).title as string).trim().length > 0
        )
    );
    const tags = Array.isArray(raw.tags) ? (raw.tags as TagEntity[]) : [];
    return {
      tasks,
      tags,
      format: 'ORBIT'
    };
  }

  // Case 2: Array of raw tasks (Orbit or Generic)
  if (Array.isArray(parsed)) {
    // Check if Todoist items (have 'content' property instead of 'title')
    const isTodoist = parsed.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).content === 'string' &&
        !(item as Record<string, unknown>).title
    );
    if (isTodoist) {
      return parseTodoistItems(parsed as Array<Record<string, unknown>>);
    }

    // Default generic / TickTick task array
    return parseTickTickOrGenericItems(parsed as Array<Record<string, unknown>>);
  }

  // Case 3: Todoist export object { items: [...] }
  if (Array.isArray(raw.items)) {
    return parseTodoistItems(raw.items as Array<Record<string, unknown>>);
  }

  // Case 4: TickTick export object { tasks: [...] } or { items: [...] }
  if (Array.isArray(raw.tasks)) {
    return parseTickTickOrGenericItems(raw.tasks as Array<Record<string, unknown>>);
  }

  throw new Error('فرمت پشتیبان شناسایی نشد. لطفاً از خروجی‌های معتبر Orbit، Todoist یا TickTick استفاده کنید.');
}

function parseTodoistItems(items: Array<Record<string, unknown>>): ImportResult {
  const tasks: ImportResult['tasks'] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const title = String(item.content || item.title || '').trim();
    if (!title) continue;

    // Todoist priority: 4=urgent(P5), 3=high(P3), 2=medium(P1), 1=normal(P0)
    let priority: TaskPriority = 0;
    if (item.priority === 4) priority = 5;
    else if (item.priority === 3) priority = 3;
    else if (item.priority === 2) priority = 1;
    else if (item.priority === 1) priority = 0;

    let dueDate: string | null = null;
    const dueObj = item.due as Record<string, unknown> | undefined;
    if (dueObj?.date) {
      dueDate = new Date(String(dueObj.date)).toISOString();
    } else if (item.dueDate) {
      dueDate = new Date(String(item.dueDate)).toISOString();
    }

    const tags: string[] = Array.isArray(item.labels)
      ? item.labels.map(String)
      : [];

    tasks.push({
      title,
      content: typeof item.description === 'string' ? item.description : '',
      priority,
      dueDate,
      tags,
      kind: 'TASK',
      isAllDay: dueObj?.is_recurring ? false : true,
      completedAt: item.checked || item.is_completed ? new Date().toISOString() : null,
      reminders: []
    });
  }

  return {
    tasks,
    format: 'TODOIST'
  };
}

function parseTickTickOrGenericItems(items: Array<Record<string, unknown>>): ImportResult {
  const tasks: ImportResult['tasks'] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const title = String(item.title || item.content || '').trim();
    if (!title) continue;

    // TickTick priority: 0=none, 1=low, 3=medium, 5=high
    let priority: TaskPriority = 0;
    if (item.priority === 5) priority = 5;
    else if (item.priority === 3) priority = 3;
    else if (item.priority === 1) priority = 1;

    let dueDate: string | null = null;
    if (item.dueDate) {
      dueDate = new Date(String(item.dueDate)).toISOString();
    } else if (item.startDate) {
      dueDate = new Date(String(item.startDate)).toISOString();
    }

    const tags: string[] = Array.isArray(item.tags)
      ? item.tags.map(String)
      : Array.isArray(item.labels)
        ? item.labels.map(String)
        : [];

    tasks.push({
      title,
      content: String(item.content || item.desc || ''),
      priority,
      dueDate,
      tags,
      kind: 'TASK',
      isAllDay: Boolean(item.isAllDay ?? item.allDay ?? false),
      completedAt: item.completedTime || item.completedAt ? new Date(String(item.completedTime || item.completedAt)).toISOString() : null,
      reminders: []
    });
  }

  return {
    tasks,
    format: 'TICKTICK'
  };
}
