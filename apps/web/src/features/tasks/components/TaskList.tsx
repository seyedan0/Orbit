import type { TaskEntity, TagEntity } from '@orbit/shared-types';
import { TaskItem } from './TaskItem';

export interface TaskListProps {
  tasks: TaskEntity[];
  onToggleCompletion?: ((task: TaskEntity) => void) | undefined;
  onDelete?: ((task: TaskEntity) => void) | undefined;
  onRestore?: ((task: TaskEntity) => void) | undefined;
  onStartFocus?: ((task: TaskEntity) => void) | undefined;
  onSelectTask?: ((task: TaskEntity) => void) | undefined;
  disabled?: boolean | undefined;
  availableTags?: TagEntity[] | undefined;
}

export function TaskList({
  tasks,
  onToggleCompletion,
  onDelete,
  onRestore,
  onStartFocus,
  onSelectTask,
  disabled,
  availableTags
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
          onStartFocus={onStartFocus}
          onSelectTask={onSelectTask}
          disabled={disabled}
          availableTags={availableTags}
        />
      ))}
    </ul>
  );
}
