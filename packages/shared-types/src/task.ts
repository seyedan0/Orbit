export type TaskKind = 'TASK' | 'NOTE' | 'CHECKLIST';
export type TaskPriority = 0 | 1 | 3 | 5;
export type LocalStatus = 'SYNCED' | 'CREATED' | 'UPDATED' | 'DELETED';
export type ScheduleMode = 'DATE' | 'DURATION';

export const PRIORITY_NONE: TaskPriority = 0;
export const PRIORITY_LOW: TaskPriority = 1;
export const PRIORITY_MEDIUM: TaskPriority = 3;
export const PRIORITY_HIGH: TaskPriority = 5;

export interface TaskAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface TaskActivity {
  id: string;
  actionType: 'CREATED' | 'UPDATED' | 'COMPLETED' | 'WONT_DO' | 'MOVED';
  details: string;
  timestamp: string;
}

export interface SubTaskItem {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
  parentId?: string | null | undefined;
  children?: SubTaskItem[] | undefined;
  completedAt?: string | null | undefined;
}

export type TaskDeliveryStatus = 'EARLY' | 'ON_TIME' | 'OVERDUE';

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
  endDate?: string | null | undefined;
  duration?: number | null | undefined;
  scheduleMode?: ScheduleMode | undefined;
  timeZone: string;
  timezone?: string | null | undefined;
  repeatFlag?: string | null | undefined;
  reminders: string[];
  tags?: string[] | undefined;
  items: SubTaskItem[];
  parentTaskId?: string | null | undefined;
  isPinned?: boolean | undefined;
  isWontDo?: boolean | undefined;
  attachments?: TaskAttachment[] | undefined;
  comments?: TaskComment[] | undefined;
  activities?: TaskActivity[] | undefined;
  focusStats?: {
    totalPomodoros: number;
    totalFocusSeconds: number;
  } | undefined;
  position?: string | undefined;
  deliveryStatus?: TaskDeliveryStatus | null | undefined;
  completionVarianceHours?: number | null | undefined; // Positive = finished early, Negative = finished late
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


