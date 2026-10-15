import type { TaskEntity, TagEntity } from '@orbit/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import { EmptyState } from '../components/EmptyState';
import { TaskForm, type TaskFormSubmitOptions } from '../components/TaskForm';
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
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastDeletedTask, setLastDeletedTask] = useState<TaskEntity | null>(null);

  const reload = useCallback(async () => {
    const [list, tagList] = await Promise.all([
      store.listTasks(INBOX_PROJECT_ID),
      store.listTags ? store.listTags() : Promise.resolve([])
    ]);
    setTasks([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setTags(tagList);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (
    title: string,
    options?: TaskFormSubmitOptions
  ) => {
    if (session === undefined) return;
    setActionError(null);
    await createTask(
      {
        title,
        dueDate: options?.dueDate,
        isAllDay: options?.isAllDay,
        repeatFlag: options?.repeatFlag,
        reminders: options?.reminders,
        tags: options?.tags
      },
      { store, userId: session.userId }
    );
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

      <TaskForm onSubmit={handleCreate} availableTags={tags} />
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
          availableTags={tags}
        />
      )}
    </section>
  );
}
