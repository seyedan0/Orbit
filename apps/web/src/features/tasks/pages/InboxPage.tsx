import type { TaskEntity } from '@orbit/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import { EmptyState } from '../components/EmptyState';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import { INBOX_PROJECT_ID, createTask } from '../services/task-service';

export function InboxPage() {
  const { session } = useSession();
  const store = useStore();
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [loading, setLoading] = useState(true);

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
    await createTask({ title }, { store, userId: session.userId });
    await reload();
  };

  return (
    <section className="inbox">
      <h1>صندوق ورودی</h1>

      <TaskForm onSubmit={handleCreate} />

      {loading ? (
        <p className="loading-msg">در حال بارگذاری…</p>
      ) : tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <TaskList tasks={tasks} />
      )}
    </section>
  );
}
