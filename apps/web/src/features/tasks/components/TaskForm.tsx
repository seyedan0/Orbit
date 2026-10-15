import { useState, useMemo, type FormEvent } from 'react';
import type { TagEntity } from '@orbit/shared-types';
import { DatePicker } from '../../calendar/components/DatePicker';
import { TaskValidationError } from '../services/task-service';
import { RECURRENCE_PRESETS } from '../../../core/recurrence/recurrence';
import { REMINDER_PRESETS } from '../../../core/reminders/reminder-utils';
import {
  parseNaturalDate,
  formatDetectedDateChip
} from '../../../core/calendar/natural-date';

export const DEFAULT_SUGGESTED_TAGS: TagEntity[] = [
  { id: 'work', userId: '', name: 'کار', color: '#3b82f6', version: 0, localStatus: 'SYNCED', createdAt: '', updatedAt: '' },
  { id: 'personal', userId: '', name: 'شخصی', color: '#10b981', version: 0, localStatus: 'SYNCED', createdAt: '', updatedAt: '' },
  { id: 'urgent', userId: '', name: 'فوری', color: '#ef4444', version: 0, localStatus: 'SYNCED', createdAt: '', updatedAt: '' },
  { id: 'study', userId: '', name: 'یادگیری', color: '#8b5cf6', version: 0, localStatus: 'SYNCED', createdAt: '', updatedAt: '' }
];

export interface TaskFormSubmitOptions {
  dueDate?: string | null | undefined;
  isAllDay?: boolean | undefined;
  repeatFlag?: string | null | undefined;
  reminders?: string[] | undefined;
  tags?: string[] | undefined;
}

export interface TaskFormProps {
  onSubmit: (title: string, options?: TaskFormSubmitOptions) => Promise<void>;
  defaultTitle?: string;
  defaultDueDate?: string | null;
  defaultIsAllDay?: boolean;
  defaultRepeatFlag?: string | null;
  defaultReminder?: string;
  defaultTags?: string[];
  availableTags?: TagEntity[];
}

export function TaskForm({
  onSubmit,
  defaultTitle = '',
  defaultDueDate = null,
  defaultIsAllDay = true,
  defaultRepeatFlag = null,
  defaultReminder = 'NONE',
  defaultTags = [],
  availableTags
}: TaskFormProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [dueDate, setDueDate] = useState<string | null>(defaultDueDate);
  const [isAllDay, setIsAllDay] = useState<boolean>(defaultIsAllDay);
  const [isManualDueDate, setIsManualDueDate] = useState(false);
  const [repeatFlag, setRepeatFlag] = useState<string>(defaultRepeatFlag ?? '');
  const [reminder, setReminder] = useState<string>(defaultReminder);
  const [selectedTags, setSelectedTags] = useState<string[]>(defaultTags);
  const [error, setError] = useState<string | undefined>();

  const displayTags = useMemo(() => {
    if (availableTags && availableTags.length > 0) {
      return availableTags;
    }
    return DEFAULT_SUGGESTED_TAGS;
  }, [availableTags]);

  const handleToggleTag = (tagIdOrName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagIdOrName)
        ? prev.filter((t) => t !== tagIdOrName)
        : [...prev, tagIdOrName]
    );
  };

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
        reminders: reminder !== 'NONE' && submitDueDate ? [reminder] : [],
        tags: selectedTags.length > 0 ? selectedTags : []
      });

      setTitle('');
      setDueDate(defaultDueDate);
      setIsAllDay(defaultIsAllDay);
      setIsManualDueDate(false);
      setRepeatFlag(defaultRepeatFlag ?? '');
      setReminder(defaultReminder);
      setSelectedTags(defaultTags);
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
        <div
          className="task-tags-selector"
          data-testid="task-tags-selector"
          aria-label="انتخاب برچسب‌ها"
        >
          <span className="task-tags-icon" title="برچسب‌ها">🏷️</span>
          <div className="task-tags-chips">
            {displayTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id) || selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`task-tag-chip ${isSelected ? 'active' : ''}`}
                  data-testid={`task-tag-chip-${tag.id}`}
                  data-selected={isSelected}
                  onClick={() => handleToggleTag(tag.id)}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${tag.color ?? '#6366f1'}22`,
                          borderColor: tag.color ?? '#6366f1',
                          color: tag.color ?? '#6366f1'
                        }
                      : {
                          borderColor: tag.color ? `${tag.color}66` : undefined,
                          color: tag.color ?? undefined
                        }
                  }
                  aria-pressed={isSelected}
                  title={`برچسب ${tag.name}`}
                >
                  #{tag.name}
                </button>
              );
            })}
          </div>
        </div>
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
