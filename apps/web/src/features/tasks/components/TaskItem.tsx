import type { TaskEntity, TagEntity } from '@orbit/shared-types';
import { formatJalaliDate, isoToJalali } from '../../../core/calendar/jalali';

export interface TaskItemProps {
  task: TaskEntity;
  onToggleCompletion?: ((task: TaskEntity) => void) | undefined;
  onDelete?: ((task: TaskEntity) => void) | undefined;
  onRestore?: ((task: TaskEntity) => void) | undefined;
  onStartFocus?: ((task: TaskEntity) => void) | undefined;
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

export function TaskItem({
  task,
  onToggleCompletion,
  onDelete,
  onRestore,
  onStartFocus,
  disabled,
  availableTags,
  tagsMap
}: TaskItemProps) {
  const isCompleted = task.completedAt != null;
  const isDeleted = task.deletedAt != null;
  const isTask = task.kind === 'TASK';

  const formattedDueDate = task.dueDate
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

  return (
    <li
      className={`task-item ${isCompleted ? 'completed' : ''} ${
        isDeleted ? 'deleted' : ''
      }`}
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
        {task.title}
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
        {formattedDueDate && !isDeleted && (
          <span className="task-due-badge" data-testid={`task-due-${task.id}`}>
            📅 {formattedDueDate}
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
