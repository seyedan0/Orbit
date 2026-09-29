import type { TaskEntity } from '@orbit/shared-types';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../auth/session-context';
import { useStore } from '../storage/store-context';
import { INBOX_PROJECT_ID, TaskValidationError, createTask } from '../tasks/task-service';

// ---- Sign-in ----

export function SignInPage() {
  const { session, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/inbox';

  if (session !== undefined) return <Navigate to={from} replace />;

  return (
    <section className="card">
      <h1>ورود به Orbit</h1>
      <p>احراز هویت واقعی در فاز ۳ اضافه می‌شود. فعلاً یک نشست محلی در همین مرورگر ساخته می‌شود.</p>
      <button
        type="button"
        onClick={() => {
          signIn();
          navigate(from, { replace: true });
        }}
      >
        شروع با نشست محلی
      </button>
    </section>
  );
}

// ---- Inbox ----

export function InboxPage() {
  const { session } = useSession();
  const store = useStore();
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await store.listTasks(INBOX_PROJECT_ID);
    setTasks([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (session === undefined) return;

    const run = async () => {
      setError(undefined);
      await createTask({ title }, { store, userId: session.userId });
      setTitle('');
      await reload();
    };

    run().catch((err: unknown) => {
      if (err instanceof TaskValidationError) {
        setError(err.message);
      } else {
        setError('خطا در ذخیره task');
      }
    });
  };

  return (
    <section className="inbox">
      <h1>صندوق ورودی</h1>

      <form className="task-form" onSubmit={handleSubmit}>
        <input
          className="task-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان task جدید…"
          aria-label="عنوان task"
          autoComplete="off"
        />
        <button type="submit" className="btn-primary">
          افزودن
        </button>
      </form>

      {error !== undefined && (
        <p className="error-msg" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="loading-msg">در حال بارگذاری…</p>
      ) : tasks.length === 0 ? (
        <p className="empty-state">هنوز taskی ندارید. اولین task را اضافه کنید.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id} className="task-item">
              <span className="task-title">{task.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---- Settings ----

export function SettingsPage() {
  const { session } = useSession();
  return (
    <section>
      <h1>تنظیمات</h1>
      <p>شناسه نشست محلی: {session?.userId}</p>
    </section>
  );
}

// ---- 404 ----

export function NotFoundPage() {
  return (
    <section>
      <h1>صفحه پیدا نشد</h1>
    </section>
  );
}
