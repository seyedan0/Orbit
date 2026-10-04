import type { TaskEntity } from '@orbit/shared-types';
import { TaskItem } from './TaskItem';

export interface TaskListProps {
  tasks: TaskEntity[];
  onToggleCompletion?: ((task: TaskEntity) => void) | undefined;
  onDelete?: ((task: TaskEntity) => void) | undefined;
  onRestore?: ((task: TaskEntity) => void) | undefined;
  disabled?: boolean | undefined;
}

export function TaskList({
  tasks,
  onToggleCompletion,
  onDelete,
  onRestore,
  disabled
}: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggleCompletion={onToggleCompletion}
          onDelete={onDelete}
          onRestore={onRestore}
          disabled={disabled}
        />
      ))}
    </ul>
  );
}
