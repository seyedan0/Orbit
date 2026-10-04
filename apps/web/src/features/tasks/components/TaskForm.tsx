import { useState, type FormEvent } from 'react';
import { DatePicker } from '../../calendar/components/DatePicker';
import { TaskValidationError } from '../services/task-service';

export interface TaskFormSubmitOptions {
  dueDate?: string | null;
  isAllDay?: boolean;
}

export interface TaskFormProps {
  onSubmit: (title: string, options?: TaskFormSubmitOptions) => Promise<void>;
  defaultDueDate?: string | null;
  defaultIsAllDay?: boolean;
}

export function TaskForm({
  onSubmit,
  defaultDueDate = null,
  defaultIsAllDay = true
}: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(defaultDueDate);
  const [isAllDay, setIsAllDay] = useState<boolean>(defaultIsAllDay);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const run = async () => {
      setError(undefined);
      await onSubmit(title, { dueDate, isAllDay });
      setTitle('');
      setDueDate(defaultDueDate);
      setIsAllDay(defaultIsAllDay);
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
        <DatePicker
          value={dueDate}
          isAllDay={isAllDay}
          onChange={(newDate, allDay) => {
            setDueDate(newDate);
            setIsAllDay(allDay);
          }}
          label="انتخاب تاریخ سررسید"
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
