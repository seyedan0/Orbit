import type { TaskEntity } from '@orbit/shared-types';
import { TaskItem } from './TaskItem';

export interface TaskListProps {
  tasks: TaskEntity[];
  onToggleCompletion?: ((task: TaskEntity) => void) | undefined;
  disabled?: boolean | undefined;
}

export function TaskList({ tasks, onToggleCompletion, disabled }: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggleCompletion={onToggleCompletion}
          disabled={disabled}
        />
      ))}
    </ul>
  );
}
