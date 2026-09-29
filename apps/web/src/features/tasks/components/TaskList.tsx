import type { TaskEntity } from '@orbit/shared-types';
import { TaskItem } from './TaskItem';

export interface TaskListProps {
  tasks: TaskEntity[];
}

export function TaskList({ tasks }: TaskListProps) {
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}
