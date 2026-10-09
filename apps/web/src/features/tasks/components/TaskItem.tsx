import type { TaskEntity } from '@orbit/shared-types';
import { formatJalaliDate, isoToJalali } from '../../../core/calendar/jalali';

export interface TaskItemProps {
  task: TaskEntity;
  onToggleCompletion?: ((task: TaskEntity) => void) | undefined;
  onDelete?: ((task: TaskEntity) => void) | undefined;
  onRestore?: ((task: TaskEntity) => void) | undefined;
  disabled?: boolean | undefined;
}

export function TaskItem({
  task,
  onToggleCompletion,
  onDelete,
  onRestore,
  disabled
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
    </li>
  );
}
