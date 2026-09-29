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
  content?: string;
  desc?: string;
  kind: TaskKind;
  priority: TaskPriority;
  isAllDay: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone: string;
  repeatFlag?: string;
  reminders: string[];
  items: SubTaskItem[];
  version: number;
  localStatus: LocalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  deletedAt?: string | null;
}

export function isTaskCompleted(task: Pick<TaskEntity, 'completedAt'>): boolean {
  return task.completedAt != null;
}
