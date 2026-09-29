import type { TaskEntity } from '@orbit/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import { EmptyState } from '../components/EmptyState';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import {
  INBOX_PROJECT_ID,
  createTask,
  completeTask,
  reopenTask,
  deleteTask,
  restoreTask
} from '../services/task-service';

export function InboxPage() {
  const { session } = useSession();
  const store = useStore();
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastDeletedTask, setLastDeletedTask] = useState<TaskEntity | null>(null);

  const reload = useCallback(async () => {
    const list = await store.listTasks(INBOX_PROJECT_ID);
    setTasks([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (title: string) => {
    if (session === undefined) return;
    setActionError(null);
    await createTask({ title }, { store, userId: session.userId });
    await reload();
  };

  const handleToggleCompletion = async (task: TaskEntity) => {
    if (session === undefined || task.kind !== 'TASK') return;
    setActionError(null);

    const isCurrentlyCompleted = task.completedAt != null;
    const previousTasks = tasks;

    // 1. Update local state immediately (optimistic UI)
    const optimisticTimestamp = new Date().toISOString();
    setTasks((current) =>
      current.map((t) => {
        if (t.id !== task.id) return t;
        return {
          ...t,
          completedAt: isCurrentlyCompleted ? null : optimisticTimestamp,
          updatedAt: optimisticTimestamp
        };
      })
    );

    try {
      if (isCurrentlyCompleted) {
        await reopenTask(task.id, { store, userId: session.userId });
      } else {
        await completeTask(task.id, { store, userId: session.userId });
      }
      await reload();
    } catch (err) {
      // Revert optimistic update on storage failure to prevent inconsistent UI state
      setTasks(previousTasks);
      setActionError(
        err instanceof Error ? err.message : 'خطا در به‌روزرسانی وضعیت تسک'
      );
    }
  };

  const handleDelete = async (task: TaskEntity) => {
    if (session === undefined) return;
    setActionError(null);

    const previousTasks = tasks;
    // 1. Optimistic UI update: remove task from normal inbox list
    setTasks((current) => current.filter((t) => t.id !== task.id));
    setLastDeletedTask(task);

    try {
      await deleteTask(task.id, { store, userId: session.userId });
      await reload();
    } catch (err) {
      // Revert optimistic update on storage failure to prevent inconsistent UI state
      setTasks(previousTasks);
      setLastDeletedTask(null);
      setActionError(
        err instanceof Error ? err.message : 'خطا در حذف تسک'
      );
    }
  };

  const handleRestore = async (task: TaskEntity) => {
    if (session === undefined) return;
    setActionError(null);

    const previousTasks = tasks;
    // 1. Optimistic UI update: re-add task to inbox list
    setTasks((current) => [task, ...current]);
    setLastDeletedTask(null);

    try {
      await restoreTask(task.id, { store, userId: session.userId });
      await reload();
    } catch (err) {
      // Revert optimistic update on storage failure to prevent inconsistent UI state
      setTasks(previousTasks);
      setActionError(
        err instanceof Error ? err.message : 'خطا در بازیابی تسک'
      );
    }
  };

  return (
    <section className="inbox">
      <h1>صندوق ورودی</h1>

      <TaskForm onSubmit={handleCreate} />
      {actionError && <p className="error-msg">{actionError}</p>}

      {lastDeletedTask && (
        <div className="banner-undo" role="status">
          <span>تسک «{lastDeletedTask.title}» حذف شد.</span>
          <button
            type="button"
            className="btn-undo"
            onClick={() => handleRestore(lastDeletedTask)}
          >
            بازیابی
          </button>
        </div>
      )}

      {loading ? (
        <p className="loading-msg">در حال بارگذاری…</p>
      ) : tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <TaskList
          tasks={tasks}
          onToggleCompletion={handleToggleCompletion}
          onDelete={handleDelete}
          onRestore={handleRestore}
        />
      )}
    </section>
  );
}
