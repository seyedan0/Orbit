import type { TaskEntity } from '@orbit/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import {
  dateToJalali,
  formatJalaliDate,
  jalaliToIso
} from '../../../core/calendar/jalali';
import { EmptyState } from '../components/EmptyState';
import { TaskForm, type TaskFormSubmitOptions } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import {
  createTask,
  completeTask,
  reopenTask,
  deleteTask,
  restoreTask,
  filterTasksDueTomorrow
} from '../services/task-service';

export function TomorrowPage() {
  const { session } = useSession();
  const store = useStore();
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastDeletedTask, setLastDeletedTask] = useState<TaskEntity | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowJalali = dateToJalali(tomorrow);
  const tomorrowIso = jalaliToIso(tomorrowJalali.year, tomorrowJalali.month, tomorrowJalali.day, 0, 0, true);
  const tomorrowDateLabel = formatJalaliDate(tomorrowJalali, { format: 'full' });

  const reload = useCallback(async () => {
    const allTasks = await store.listTasks();
    const tomorrowList = filterTasksDueTomorrow(allTasks);
    setTasks(tomorrowList);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (title: string, options?: TaskFormSubmitOptions) => {
    if (session === undefined) return;
    setActionError(null);
    const dueDate = options?.dueDate !== undefined ? options.dueDate : tomorrowIso;
    const isAllDay = options?.isAllDay !== undefined ? options.isAllDay : true;
    await createTask(
      {
        title,
        dueDate,
        isAllDay,
        repeatFlag: options?.repeatFlag,
        reminders: options?.reminders
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
    setTasks((current) => current.filter((t) => t.id !== task.id));
    setLastDeletedTask(task);

    try {
      await deleteTask(task.id, { store, userId: session.userId });
      await reload();
    } catch (err) {
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
    setTasks((current) => [task, ...current]);
    setLastDeletedTask(null);

    try {
      await restoreTask(task.id, { store, userId: session.userId });
      await reload();
    } catch (err) {
      setTasks(previousTasks);
      setActionError(
        err instanceof Error ? err.message : 'خطا در بازیابی تسک'
      );
    }
  };

  return (
    <section className="inbox" data-testid="tomorrow-page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>فردا</h1>
        <span style={{ color: '#8e8e93', fontSize: '0.95rem' }} data-testid="tomorrow-date-label">
          {tomorrowDateLabel}
        </span>
      </div>

      <TaskForm onSubmit={handleCreate} defaultDueDate={tomorrowIso} defaultIsAllDay={true} />
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
