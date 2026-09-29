import type { TaskEntity } from '@orbit/shared-types';

export interface TaskItemProps {
  task: TaskEntity;
}

export function TaskItem({ task }: TaskItemProps) {
  return (
    <li className="task-item">
      <span className="task-title">{task.title}</span>
    </li>
  );
}
