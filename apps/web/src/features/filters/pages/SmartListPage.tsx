import type { SmartFilterEntity, TaskEntity } from '@orbit/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSession } from '../../../core/auth/session-context';
import { filterTasks } from '../../../core/filters';
import { useStore } from '../../../core/storage/store-context';
import { EmptyState } from '../../tasks/components/EmptyState';
import { TaskForm, type TaskFormSubmitOptions } from '../../tasks/components/TaskForm';
import { TaskList } from '../../tasks/components/TaskList';
import {
  completeTask,
  createTask,
  deleteTask,
  reopenTask,
  restoreTask
} from '../../tasks/services/task-service';
import {
  getSmartFilter,
  getSystemFilterById,
  isSystemFilterId
} from '../services/filter-service';
import styles from './SmartListPage.module.css';

export function SmartListPage() {
  const { filterId } = useParams<{ filterId: string }>();
  const { session } = useSession();
  const store = useStore();

  const [filter, setFilter] = useState<SmartFilterEntity | null>(() => {
    if (filterId && isSystemFilterId(filterId)) {
      return getSystemFilterById(filterId) ?? null;
    }
    return null;
  });
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNotFound, setFilterNotFound] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastDeletedTask, setLastDeletedTask] = useState<TaskEntity | null>(null);

  const reload = useCallback(async () => {
    if (!filterId || !session) return;
    setLoading(true);

    const filterEntity = await getSmartFilter(filterId, {
      store,
      userId: session.userId
    });

    if (!filterEntity) {
      setFilterNotFound(true);
      setFilter(null);
      setTasks([]);
      setLoading(false);
      return;
    }

    setFilterNotFound(false);
    setFilter(filterEntity);

    const allTasks = await store.listTasks();
    const matchingTasks = filterTasks(allTasks, filterEntity.rule, {
      calendarType: 'JALALI'
    });

    setTasks(matchingTasks);
    setLoading(false);
  }, [filterId, session, store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (title: string, options?: TaskFormSubmitOptions) => {
    if (session === undefined) return;
    setActionError(null);

    await createTask(
      {
        title,
        dueDate: options?.dueDate,
        isAllDay: options?.isAllDay ?? false,
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

  if (filterNotFound) {
    return (
      <section className={styles.container} data-testid="filter-not-found">
        <div className={styles.errorState}>
          <h2>فیلتر هوشمند یافت نشد</h2>
          <p>ممکن است این فیلتر حذف شده باشد یا دسترسی به آن امکان‌پذیر نباشد.</p>
          <Link to="/inbox" className="btn-primary">
            بازگشت به صندوق ورودی
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.container} data-testid="smart-list-page">
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span
            className={styles.filterBadge}
            style={{ backgroundColor: filter?.color || '#6366f1' }}
            aria-hidden="true"
          >
            {filter?.icon === 'alert-triangle' ? '⚠️' :
             filter?.icon === 'flag' ? '🚩' :
             filter?.icon === 'calendar-off' ? '📅' :
             filter?.icon === 'calendar-range' ? '🗓️' : '⚡'}
          </span>
          <div>
            <h1 className={styles.title} data-testid="filter-title">
              {filter?.name ?? 'فیلتر هوشمند'}
            </h1>
            {filter && isSystemFilterId(filter.id) && (
              <span className={styles.filterSystemTag}>فیلتر سیستمی</span>
            )}
          </div>
        </div>

        <span className={styles.countBadge} data-testid="filter-task-count">
          {tasks.length} تسک
        </span>
      </div>

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
        <p className={styles.loadingMsg}>در حال بارگذاری…</p>
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
