import { useState, type FormEvent } from 'react';
import { DatePicker } from '../../calendar/components/DatePicker';
import { TaskValidationError } from '../services/task-service';
import { RECURRENCE_PRESETS } from '../../../core/recurrence/recurrence';
import { REMINDER_PRESETS } from '../../../core/reminders/reminder-utils';

export interface TaskFormSubmitOptions {
  dueDate?: string | null | undefined;
  isAllDay?: boolean | undefined;
  repeatFlag?: string | null | undefined;
  reminders?: string[] | undefined;
}

export interface TaskFormProps {
  onSubmit: (title: string, options?: TaskFormSubmitOptions) => Promise<void>;
  defaultDueDate?: string | null;
  defaultIsAllDay?: boolean;
  defaultRepeatFlag?: string | null;
  defaultReminder?: string;
}

export function TaskForm({
  onSubmit,
  defaultDueDate = null,
  defaultIsAllDay = true,
  defaultRepeatFlag = null,
  defaultReminder = 'NONE'
}: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(defaultDueDate);
  const [isAllDay, setIsAllDay] = useState<boolean>(defaultIsAllDay);
  const [repeatFlag, setRepeatFlag] = useState<string>(defaultRepeatFlag ?? '');
  const [reminder, setReminder] = useState<string>(defaultReminder);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const run = async () => {
      setError(undefined);
      await onSubmit(title, {
        dueDate,
        isAllDay,
        repeatFlag: repeatFlag.trim() ? repeatFlag : null,
        reminders: reminder !== 'NONE' && dueDate ? [reminder] : []
      });
      setTitle('');
      setDueDate(defaultDueDate);
      setIsAllDay(defaultIsAllDay);
      setRepeatFlag(defaultRepeatFlag ?? '');
      setReminder(defaultReminder);
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
        <select
          className="task-repeat-select"
          value={repeatFlag}
          onChange={(e) => setRepeatFlag(e.target.value)}
          aria-label="تکرار"
          data-testid="task-repeat-select"
        >
          {RECURRENCE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.rrule}>
              {preset.labelFa}
            </option>
          ))}
        </select>
        <select
          className="task-reminder-select"
          value={dueDate ? reminder : 'NONE'}
          onChange={(e) => setReminder(e.target.value)}
          disabled={!dueDate}
          aria-label="یادآور"
          data-testid="task-reminder-select"
          title={!dueDate ? 'ابتدا تاریخ سررسید را انتخاب کنید' : 'انتخاب یادآور'}
        >
          {REMINDER_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.labelFa}
            </option>
          ))}
        </select>
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
