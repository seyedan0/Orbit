import { useState, type FormEvent } from 'react';
import { TaskValidationError } from '../services/task-service';

export interface TaskFormProps {
  onSubmit: (title: string) => Promise<void>;
}

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const run = async () => {
      setError(undefined);
      await onSubmit(title);
      setTitle('');
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
    <>
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
    </>
  );
}
