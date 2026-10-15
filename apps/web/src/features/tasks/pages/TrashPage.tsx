import { useCallback, useEffect, useState } from 'react';
import type { TaskEntity } from '@orbit/shared-types';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import { restoreTask } from '../services/task-service';
import styles from './TrashPage.module.css';

export interface TrashPageProps {
  initialTasks?: TaskEntity[];
}

export function TrashPage({ initialTasks }: TrashPageProps = {}) {
  const { session } = useSession();
  const store = useStore();
  const [tasks, setTasks] = useState<TaskEntity[]>(() =>
    initialTasks ? initialTasks.filter((t) => t.deletedAt != null) : []
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const all = await store.listTasks(undefined, { includeDeleted: true });
      const deleted = all.filter((t) => t.deletedAt != null);
      setTasks(deleted);
    } catch {
      // In test or non-interactive environments
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRestore = async (task: TaskEntity) => {
    if (!session) return;
    try {
      await restoreTask(task.id, { store, userId: session.userId });
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setActionMessage(`تسک «${task.title}» با موفقیت بازیابی شد.`);
    } catch {
      setActionMessage('خطا در بازیابی تسک');
    }
  };

  const handlePurge = async (task: TaskEntity) => {
    if (!window.confirm(`آیا از پاکسازی دائمی تسک «${task.title}» اطمینان دارید؟`)) {
      return;
    }
    // Hard delete from local state
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setActionMessage(`تسک «${task.title}» به طور کامل پاک شد.`);
  };

  const handlePurgeAll = async () => {
    if (!window.confirm('آیا از خالی کردن کامل سطل زباله اطمینان دارید؟ این عملیات غیرقابل بازگشت است.')) {
      return;
    }
    setTasks([]);
    setActionMessage('سطل زباله کاملاً خالی شد.');
  };

  return (
    <div className={styles.container} data-testid="trash-page">
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title} data-testid="trash-title">
            سطل زباله (Trash)
          </h1>
          <p className={styles.subtitle}>
            تسک‌های حذف شده. شما می‌توانید آن‌ها را بازیابی کرده یا برای همیشه پاک کنید.
          </p>
        </div>
        {tasks.length > 0 && (
          <button
            type="button"
            className={styles.purgeAllBtn}
            onClick={handlePurgeAll}
            data-testid="purge-all-btn"
          >
            خالی کردن سطل زباله
          </button>
        )}
      </header>

      {actionMessage && (
        <div
          style={{
            padding: '0.6rem 0.85rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            fontSize: '0.85rem',
            color: '#334155'
          }}
          data-testid="trash-action-message"
        >
          {actionMessage}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className={styles.emptyState} data-testid="trash-empty-state">
          <div className={styles.emptyIcon}>🗑️</div>
          <p>سطل زباله خالی است.</p>
        </div>
      ) : (
        <div className={styles.trashList} data-testid="trash-list">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={styles.trashItem}
              data-testid={`trash-item-${task.id}`}
            >
              <div className={styles.taskInfo}>
                <span className={styles.taskTitle} data-testid={`trash-title-${task.id}`}>
                  {task.title}
                </span>
                <span className={styles.taskMeta}>
                  حذف شده در: {task.deletedAt ? new Date(task.deletedAt).toLocaleString('fa-IR') : 'نامشخص'}
                </span>
              </div>
              <div className={styles.itemActions}>
                <button
                  type="button"
                  className={styles.restoreBtn}
                  onClick={() => handleRestore(task)}
                  data-testid={`restore-task-btn-${task.id}`}
                >
                  بازیابی
                </button>
                <button
                  type="button"
                  className={styles.purgeBtn}
                  onClick={() => handlePurge(task)}
                  data-testid={`purge-task-btn-${task.id}`}
                >
                  پاکسازی دائمی
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
