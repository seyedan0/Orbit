import type { TaskEntity } from '@orbit/shared-types';

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
