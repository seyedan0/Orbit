import type { TaskEntity, TagEntity } from '@orbit/shared-types';
import { formatJalaliDate, isoToJalali } from '../../../core/calendar/jalali';
import { calculateSubtaskProgress } from '../../../core/tasks/subtask-tree';

export interface TaskItemProps {
  task: TaskEntity;
  onToggleCompletion?: ((task: TaskEntity) => void) | undefined;
  onDelete?: ((task: TaskEntity) => void) | undefined;
  onRestore?: ((task: TaskEntity) => void) | undefined;
  onStartFocus?: ((task: TaskEntity) => void) | undefined;
  onSelectTask?: ((task: TaskEntity) => void) | undefined;
  disabled?: boolean | undefined;
  availableTags?: TagEntity[] | undefined;
  tagsMap?: Record<string, TagEntity> | Map<string, TagEntity> | undefined;
}

const TAG_COLOR_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#6366f1'
];

function getTagColor(nameOrId: string, tagObj?: TagEntity): string {
  if (tagObj?.color) return tagObj.color;
  let hash = 0;
  for (let i = 0; i < nameOrId.length; i++) {
    hash = (hash << 5) - hash + nameOrId.charCodeAt(i);
  }
  return TAG_COLOR_PALETTE[Math.abs(hash) % TAG_COLOR_PALETTE.length] ?? '#6366f1';
}

const toPersianDigits = (val: number | string): string =>
  String(val).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);

export function TaskItem({
  task,
  onToggleCompletion,
  onDelete,
  onRestore,
  onStartFocus,
  onSelectTask,
  disabled,
  availableTags,
  tagsMap
}: TaskItemProps) {
  const isCompleted = task.completedAt != null;
  const isDeleted = task.deletedAt != null;
  const isTask = task.kind === 'TASK';

  const isMultiDay = Boolean(
    task.startDate &&
    task.dueDate &&
    task.startDate.slice(0, 10) !== task.dueDate.slice(0, 10)
  );

  const formattedSpan = isMultiDay && task.startDate && task.dueDate
    ? (() => {
        try {
          const startStr = formatJalaliDate(isoToJalali(task.startDate), {
            format: 'short',
            includeTime: false
          });
          const dueStr = formatJalaliDate(isoToJalali(task.dueDate), {
            format: 'short',
            includeTime: false
          });
          const dueMs = new Date(task.dueDate).getTime();
          const nowMs = Date.now();
          const diffDays = Math.ceil((dueMs - nowMs) / (1000 * 60 * 60 * 24));
          const remainingText =
            diffDays > 0
              ? `${diffDays} روز مانده`
              : diffDays === 0
              ? 'امروز سررسید'
              : `${Math.abs(diffDays)} روز گذشته`;
          return `🗓️ ${startStr} تا ${dueStr} (${remainingText})`;
        } catch {
          return null;
        }
      })()
    : null;

  const formattedDueDate = !isMultiDay && task.dueDate
    ? (() => {
        try {
          return formatJalaliDate(isoToJalali(task.dueDate), {
            format: 'short',
            includeTime: !task.isAllDay
          });
        } catch {
          return null;
        }
      })()
    : null;

  const subtaskStats = task.items && task.items.length > 0
    ? calculateSubtaskProgress(task.items)
    : null;

  const deliveryBadgeText = isCompleted && task.deliveryStatus
    ? (() => {
        if (task.deliveryStatus === 'EARLY') {
          const hours = task.completionVarianceHours ?? 0;
          const days = Math.round(hours / 24);
          const timeText = days >= 1 ? `${toPersianDigits(days)} روز` : `${toPersianDigits(Math.max(1, Math.round(hours)))} ساعت`;
          return `🟢 ${timeText} زودتر انجام شد`;
        }
        if (task.deliveryStatus === 'ON_TIME') {
          return '🟢 به موقع انجام شد';
        }
        if (task.deliveryStatus === 'OVERDUE') {
          const hours = Math.abs(task.completionVarianceHours ?? 0);
          const days = Math.round(hours / 24);
          const timeText = days >= 1 ? `${toPersianDigits(days)} روز` : `${toPersianDigits(Math.max(1, Math.round(hours)))} ساعت`;
          return `🔴 ${timeText} با تاخیر انجام شد`;
        }
        return null;
      })()
    : null;

  const priorityBadge = task.priority && task.priority > 0
    ? (() => {
        if (task.priority >= 5) return { label: 'فوری', icon: '🔴', color: '#ef4444' };
        if (task.priority >= 3) return { label: 'مهم', icon: '🟠', color: '#f59e0b' };
        return { label: 'پایین', icon: '🔵', color: '#3b82f6' };
      })()
    : null;

  return (
    <li
      className={`task-item ${isCompleted ? 'completed' : ''} ${
        isDeleted ? 'deleted' : ''
      } ${onSelectTask ? 'clickable' : ''}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('input, button, a')) return;
        onSelectTask?.(task);
      }}
      data-testid={`task-item-${task.id}`}
    >
      {isTask && !isDeleted && (
        <input
          type="checkbox"
          className="task-checkbox"
          checked={isCompleted}
          onChange={() => onToggleCompletion?.(task)}
          disabled={disabled}
          aria-label={`تکمیل ${task.title}`}
          data-testid={`task-checkbox-${task.id}`}
        />
      )}
      <span className={`task-title ${isCompleted ? 'completed' : ''}`}>
        {priorityBadge && !isDeleted && (
          <span
            className="task-priority-badge"
            data-testid={`task-priority-${task.id}`}
            title={`اولویت: ${priorityBadge.label}`}
            style={{ color: priorityBadge.color, marginInlineEnd: '0.35rem' }}
          >
            {priorityBadge.icon}
          </span>
        )}
        <span
          className="task-title-text"
          onClick={() => onSelectTask?.(task)}
          style={{ cursor: onSelectTask ? 'pointer' : 'inherit' }}
        >
          {task.title}
        </span>
        {task.repeatFlag && !isDeleted && (
          <span
            className="task-repeat-badge"
            data-testid={`task-repeat-${task.id}`}
            title="تکرارشونده"
          >
            🔁
          </span>
        )}
        {task.reminders && task.reminders.length > 0 && !isDeleted && (
          <span
            className="task-reminder-badge"
            data-testid={`task-reminder-${task.id}`}
            title="دارای یادآور"
          >
            🔔
          </span>
        )}
        {formattedSpan && !isDeleted && (
          <span
            className="task-span-badge"
            data-testid={`task-span-${task.id}`}
            title="بازه چندروزه"
          >
            {formattedSpan}
          </span>
        )}
        {formattedDueDate && !isDeleted && (
          <span className="task-due-badge" data-testid={`task-due-${task.id}`}>
            📅 {formattedDueDate}
          </span>
        )}
        {subtaskStats && !isDeleted && (
          <span
            className="task-subtasks-badge"
            data-testid={`task-subtasks-progress-${task.id}`}
            title={`پیشرفت زیرتسک‌ها: ${subtaskStats.percentage}%`}
          >
            <span className="task-subtasks-text">
              ☑ {subtaskStats.completed}/{subtaskStats.total} ({subtaskStats.percentage}%)
            </span>
            <span className="task-subtasks-bar-track">
              <span
                className="task-subtasks-bar-fill"
                style={{ width: `${subtaskStats.percentage}%` }}
              />
            </span>
          </span>
        )}
        {deliveryBadgeText && (
          <span
            className={`task-delivery-badge ${task.deliveryStatus?.toLowerCase()}`}
            data-testid={`task-delivery-${task.id}`}
          >
            {deliveryBadgeText}
          </span>
        )}
        {task.tags && task.tags.length > 0 && !isDeleted && (
          <span className="task-tags-badges" data-testid={`task-tags-${task.id}`}>
            {task.tags.map((tagRef) => {
              const tagObj =
                tagsMap instanceof Map
                  ? tagsMap.get(tagRef)
                  : tagsMap
                  ? tagsMap[tagRef]
                  : availableTags?.find((t) => t.id === tagRef || t.name === tagRef);
              const tagName = tagObj ? tagObj.name : tagRef;
              const color = getTagColor(tagRef, tagObj);
              return (
                <span
                  key={tagRef}
                  className="task-tag-badge"
                  data-testid={`task-tag-${task.id}-${tagRef}`}
                  style={{
                    backgroundColor: `${color}1a`,
                    borderColor: `${color}55`,
                    color: color
                  }}
                  title={`برچسب: ${tagName}`}
                >
                  #{tagName}
                </span>
              );
            })}
          </span>
        )}
      </span>
      {isDeleted ? (
        <button
          type="button"
          className="btn-restore"
          onClick={() => onRestore?.(task)}
          disabled={disabled}
          aria-label={`بازیابی ${task.title}`}
          data-testid={`task-restore-${task.id}`}
        >
          بازیابی
        </button>
      ) : (
        <button
          type="button"
          className="btn-delete"
          onClick={() => onDelete?.(task)}
          disabled={disabled}
          aria-label={`حذف ${task.title}`}
          data-testid={`task-delete-${task.id}`}
        >
          حذف
        </button>
      )}
      {!isDeleted && !isCompleted && isTask && (
        <a
          href={`/focus?taskId=${task.id}`}
          onClick={(e) => {
            if (onStartFocus) {
              e.preventDefault();
              onStartFocus(task);
            }
          }}
          className="btn-focus"
          title="شروع تمرکز (Focus)"
          aria-label={`شروع تمرکز روی ${task.title}`}
          data-testid={`task-focus-${task.id}`}
          style={{
            textDecoration: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0 0.35rem',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          🍅
        </a>
      )}
    </li>
  );
}
