export type TaskKind = 'TASK' | 'NOTE' | 'CHECKLIST';
export type TaskPriority = 0 | 1 | 3 | 5;
export type LocalStatus = 'SYNCED' | 'CREATED' | 'UPDATED' | 'DELETED';

export interface SubTaskItem {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface TaskEntity {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  content?: string | undefined;
  desc?: string | undefined;
  kind: TaskKind;
  priority: TaskPriority;
  isAllDay: boolean;
  allDay?: boolean | undefined;
  startDate?: string | null | undefined;
  dueDate?: string | null | undefined;
  duration?: number | null | undefined;
  timeZone: string;
  timezone?: string | null | undefined;
  repeatFlag?: string | null | undefined;
  reminders: string[];
  items: SubTaskItem[];
  version: number;
  localStatus: LocalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null | undefined;
  deletedAt?: string | null | undefined;
}

export function isTaskCompleted(task: Pick<TaskEntity, 'completedAt'>): boolean {
  return task.completedAt != null;
}
