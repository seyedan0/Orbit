import type { TaskEntity } from '@orbit/shared-types';

export interface TaskItemProps {
  task: TaskEntity;
  onToggleCompletion?: ((task: TaskEntity) => void) | undefined;
  disabled?: boolean | undefined;
}

export function TaskItem({ task, onToggleCompletion, disabled }: TaskItemProps) {
  const isCompleted = task.completedAt != null;
  const isTask = task.kind === 'TASK';

  return (
    <li className={`task-item ${isCompleted ? 'completed' : ''}`}>
      {isTask && (
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
    </li>
  );
}
