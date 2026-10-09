import { useState, useMemo, type FormEvent } from 'react';
import { DatePicker } from '../../calendar/components/DatePicker';
import { TaskValidationError } from '../services/task-service';
import { RECURRENCE_PRESETS } from '../../../core/recurrence/recurrence';
import { REMINDER_PRESETS } from '../../../core/reminders/reminder-utils';
import {
  parseNaturalDate,
  formatDetectedDateChip
} from '../../../core/calendar/natural-date';

export interface TaskFormSubmitOptions {
  dueDate?: string | null | undefined;
  isAllDay?: boolean | undefined;
  repeatFlag?: string | null | undefined;
  reminders?: string[] | undefined;
}

export interface TaskFormProps {
  onSubmit: (title: string, options?: TaskFormSubmitOptions) => Promise<void>;
  defaultTitle?: string;
  defaultDueDate?: string | null;
  defaultIsAllDay?: boolean;
  defaultRepeatFlag?: string | null;
  defaultReminder?: string;
}

export function TaskForm({
  onSubmit,
  defaultTitle = '',
  defaultDueDate = null,
  defaultIsAllDay = true,
  defaultRepeatFlag = null,
  defaultReminder = 'NONE'
}: TaskFormProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [dueDate, setDueDate] = useState<string | null>(defaultDueDate);
  const [isAllDay, setIsAllDay] = useState<boolean>(defaultIsAllDay);
  const [isManualDueDate, setIsManualDueDate] = useState(false);
  const [repeatFlag, setRepeatFlag] = useState<string>(defaultRepeatFlag ?? '');
  const [reminder, setReminder] = useState<string>(defaultReminder);
  const [error, setError] = useState<string | undefined>();

  // Real-time natural language date and time parsing
  const naturalResult = useMemo(() => {
    if (!title.trim()) return null;
    return parseNaturalDate(title);
  }, [title]);

  const detectedDate = naturalResult?.detectedDate ?? null;
  const isSmartDateActive = Boolean(detectedDate && !isManualDueDate);

  // Effective due date & all-day flag (smart date takes effect unless manually overridden)
  const effectiveDueDate =
    isSmartDateActive && detectedDate ? detectedDate.toISOString() : dueDate;
  const effectiveIsAllDay =
    isSmartDateActive && naturalResult ? naturalResult.isAllDay : isAllDay;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const run = async () => {
      setError(undefined);

      let submitTitle = title;
      let submitDueDate = dueDate;
      let submitIsAllDay = isAllDay;

      if (isSmartDateActive && naturalResult?.detectedDate) {
        submitDueDate = naturalResult.detectedDate.toISOString();
        submitIsAllDay = naturalResult.isAllDay;
        submitTitle = naturalResult.cleanTitle;
      }

      await onSubmit(submitTitle, {
        dueDate: submitDueDate,
        isAllDay: submitIsAllDay,
        repeatFlag: repeatFlag.trim() ? repeatFlag : null,
        reminders: reminder !== 'NONE' && submitDueDate ? [reminder] : []
      });

      setTitle('');
      setDueDate(defaultDueDate);
      setIsAllDay(defaultIsAllDay);
      setIsManualDueDate(false);
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
        <div className="task-input-wrapper">
          <input
            className="task-input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!e.target.value.trim()) {
                setIsManualDueDate(false);
              }
            }}
            placeholder="عنوان task جدید…"
            aria-label="عنوان task"
            autoComplete="off"
          />
            {isSmartDateActive && detectedDate && naturalResult && (
            <div
              className="smart-date-chip"
              data-testid="smart-date-chip"
              title="تاریخ تشخیص داده شده خودکار"
            >
              <span>{formatDetectedDateChip(detectedDate, naturalResult.isAllDay)}</span>
              <button
                type="button"
                className="smart-date-dismiss"
                onClick={() => setIsManualDueDate(true)}
                aria-label="حذف تاریخ خودکار"
                data-testid="smart-date-dismiss"
              >
                ×
              </button>
            </div>
          )}
        </div>
        <DatePicker
          value={effectiveDueDate}
          isAllDay={effectiveIsAllDay}
          onChange={(newDate, allDay) => {
            setIsManualDueDate(true);
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
          value={effectiveDueDate ? reminder : 'NONE'}
          onChange={(e) => setReminder(e.target.value)}
          disabled={!effectiveDueDate}
          aria-label="یادآور"
          data-testid="task-reminder-select"
          title={!effectiveDueDate ? 'ابتدا تاریخ سررسید را انتخاب کنید' : 'انتخاب یادآور'}
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
