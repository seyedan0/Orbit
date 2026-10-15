import { useCallback, useEffect, useState } from 'react';
import type { TaskEntity } from '@orbit/shared-types';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import { reopenTask } from '../services/task-service';
import styles from './ArchivePage.module.css';

export interface ArchivePageProps {
  initialTasks?: TaskEntity[];
}

export function ArchivePage({ initialTasks }: ArchivePageProps = {}) {
  const { session } = useSession();
  const store = useStore();
  const [tasks, setTasks] = useState<TaskEntity[]>(() =>
    initialTasks ? initialTasks.filter((t) => t.completedAt != null && t.deletedAt == null) : []
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const all = await store.listTasks();
      const completed = all.filter((t) => t.completedAt != null && t.deletedAt == null);
      setTasks(completed);
    } catch {
      // In test or non-interactive environments
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleReopen = async (task: TaskEntity) => {
    if (!session) return;
    try {
      await reopenTask(task.id, { store, userId: session.userId });
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setActionMessage(`تسک «${task.title}» مجدداً بازگشایی شد.`);
    } catch {
      setActionMessage('خطا در بازگشایی تسک');
    }
  };

  return (
    <div className={styles.container} data-testid="archive-page">
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title} data-testid="archive-title">
            آرشیو تسک‌های تکمیل شده (Archive)
          </h1>
          <p className={styles.subtitle}>
            تمام کارهایی که تا به حال به پایان رسانده‌اید.
          </p>
        </div>
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
          data-testid="archive-action-message"
        >
          {actionMessage}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className={styles.emptyState} data-testid="archive-empty-state">
          <div className={styles.emptyIcon}>📦</div>
          <p>هنوز تسک تکمیل شده‌ای در آرشیو ثبت نشده است.</p>
        </div>
      ) : (
        <div className={styles.archiveList} data-testid="archive-list">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={styles.archiveItem}
              data-testid={`archive-item-${task.id}`}
            >
              <div className={styles.taskInfo}>
                <span className={styles.taskTitle} data-testid={`archive-title-${task.id}`}>
                  {task.title}
                </span>
                <span className={styles.taskMeta}>
                  تکمیل شده در: {task.completedAt ? new Date(task.completedAt).toLocaleString('fa-IR') : 'نامشخص'}
                </span>
              </div>
              <div className={styles.itemActions}>
                <button
                  type="button"
                  className={styles.reopenBtn}
                  onClick={() => handleReopen(task)}
                  data-testid={`reopen-task-btn-${task.id}`}
                >
                  بازگشایی مجدد
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
