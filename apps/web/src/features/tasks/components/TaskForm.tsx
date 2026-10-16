import { useState, useMemo, type FormEvent } from 'react';
import type { TagEntity, TaskPriority } from '@orbit/shared-types';
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

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: string; color: string }[] = [
  { value: 5, label: 'فوری و مهم (High)', icon: '🔴', color: '#ef4444' },
  { value: 3, label: 'مهم (Medium)', icon: '🟠', color: '#f59e0b' },
  { value: 1, label: 'پایین (Low)', icon: '🔵', color: '#3b82f6' },
  { value: 0, label: 'عادی (None)', icon: '⚪', color: '#9ca3af' }
];

/**
 * Parses NLP shortcut tokens from title:
 * - #tag: auto-detects and extracts tags (e.g. #work, #فوری)
 * - !priority: !high/!5/!!! -> 5, !med/!medium/!3/!2/!! -> 3, !low/!1/! -> 1
 * Strips matched tokens cleanly.
 */
export function parseTaskTitleShortcuts(rawTitle: string): {
  cleanTitle: string;
  detectedPriority: TaskPriority | null;
  detectedTags: string[];
} {
  let text = rawTitle;
  let detectedPriority: TaskPriority | null = null;
  const detectedTags: string[] = [];

  // Match #tag (Unicode letters, numbers, hyphens, underscores)
  const tagRegex = /(?:^|\s)#([\p{L}\p{N}_-]+)/gu;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(rawTitle)) !== null) {
    if (tagMatch[1]) {
      detectedTags.push(tagMatch[1]);
    }
  }
  text = text.replace(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu, ' ');

  // Match !priority
  const highRegex = /(?:^|\s)(?:!high|!5|!!!)(?=\s|$)/gi;
  const medRegex = /(?:^|\s)(?:!med|!medium|!3|!2|!!)(?=\s|$)/gi;
  const lowRegex = /(?:^|\s)(?:!low|!1|!(?!\S))(?=\s|$)/gi;

  if (highRegex.test(text)) {
    detectedPriority = 5;
    text = text.replace(highRegex, ' ');
  } else if (medRegex.test(text)) {
    detectedPriority = 3;
    text = text.replace(medRegex, ' ');
  } else if (lowRegex.test(text)) {
    detectedPriority = 1;
    text = text.replace(lowRegex, ' ');
  }

  return {
    cleanTitle: text.replace(/\s+/g, ' ').trim(),
    detectedPriority,
    detectedTags
  };
}

export interface TaskFormSubmitOptions {
  startDate?: string | null | undefined;
  dueDate?: string | null | undefined;
  isAllDay?: boolean | undefined;
  repeatFlag?: string | null | undefined;
  reminders?: string[] | undefined;
  tags?: string[] | undefined;
  priority?: TaskPriority | undefined;
  description?: string | null | undefined;
  desc?: string | null | undefined;
}

export interface TaskFormProps {
  onSubmit: (title: string, options?: TaskFormSubmitOptions) => Promise<void>;
  defaultTitle?: string;
  defaultStartDate?: string | null;
  defaultDueDate?: string | null;
  defaultIsAllDay?: boolean;
  defaultRepeatFlag?: string | null;
  defaultReminder?: string;
  defaultTags?: string[];
  defaultPriority?: TaskPriority;
  defaultDescription?: string;
  availableTags?: TagEntity[];
}

export function TaskForm({
  onSubmit,
  defaultTitle = '',
  defaultStartDate = null,
  defaultDueDate = null,
  defaultIsAllDay = true,
  defaultRepeatFlag = null,
  defaultReminder = 'NONE',
  defaultTags = [],
  defaultPriority = 0,
  defaultDescription = '',
  availableTags
}: TaskFormProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [startDate, setStartDate] = useState<string | null>(defaultStartDate);
  const [dueDate, setDueDate] = useState<string | null>(defaultDueDate);
  const [isAllDay, setIsAllDay] = useState<boolean>(defaultIsAllDay);
  const [isManualDueDate, setIsManualDueDate] = useState(false);
  const [repeatFlag, setRepeatFlag] = useState<string>(defaultRepeatFlag ?? '');
  const [reminder, setReminder] = useState<string>(defaultReminder);
  const [selectedTags, setSelectedTags] = useState<string[]>(defaultTags);
  const [priority, setPriority] = useState<TaskPriority>(defaultPriority);
  const [isManualPriority, setIsManualPriority] = useState(false);
  const [description, setDescription] = useState(defaultDescription);
  const [showDescription, setShowDescription] = useState(Boolean(defaultDescription));
  const [isRangeMode, setIsRangeMode] = useState(Boolean(defaultStartDate));
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

  // Real-time NLP shortcuts parsing (tags & priority)
  const shortcutsResult = useMemo(() => {
    if (!title.trim()) return null;
    return parseTaskTitleShortcuts(title);
  }, [title]);

  const effectivePriority: TaskPriority =
    !isManualPriority && shortcutsResult?.detectedPriority != null
      ? shortcutsResult.detectedPriority
      : priority;

  // Real-time natural language date and time parsing (performed on text with shortcuts stripped)
  const titleForNaturalDate = shortcutsResult?.cleanTitle ?? title;
  const naturalResult = useMemo(() => {
    if (!titleForNaturalDate.trim()) return null;
    return parseNaturalDate(titleForNaturalDate);
  }, [titleForNaturalDate]);

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

      // Extract NLP tags & priority
      const parsedShortcuts = parseTaskTitleShortcuts(title);
      let submitTitle = parsedShortcuts.cleanTitle;
      let submitDueDate = dueDate;
      let submitIsAllDay = isAllDay;

      const mergedTags = new Set([...selectedTags, ...parsedShortcuts.detectedTags]);

      const submitPriority: TaskPriority =
        !isManualPriority && parsedShortcuts.detectedPriority != null
          ? parsedShortcuts.detectedPriority
          : priority;

      if (isSmartDateActive && naturalResult?.detectedDate) {
        submitDueDate = naturalResult.detectedDate.toISOString();
        submitIsAllDay = naturalResult.isAllDay;
        submitTitle = naturalResult.cleanTitle;
      }

      await onSubmit(submitTitle, {
        startDate: isRangeMode ? startDate : null,
        dueDate: submitDueDate,
        isAllDay: submitIsAllDay,
        repeatFlag: repeatFlag.trim() ? repeatFlag : null,
        reminders: reminder !== 'NONE' && submitDueDate ? [reminder] : [],
        tags: mergedTags.size > 0 ? Array.from(mergedTags) : [],
        priority: submitPriority,
        description: description.trim() ? description.trim() : null,
        desc: description.trim() ? description.trim() : null
      });

      setTitle('');
      setStartDate(defaultStartDate);
      setDueDate(defaultDueDate);
      setIsAllDay(defaultIsAllDay);
      setIsManualDueDate(false);
      setRepeatFlag(defaultRepeatFlag ?? '');
      setReminder(defaultReminder);
      setSelectedTags(defaultTags);
      setPriority(defaultPriority);
      setIsManualPriority(false);
      setDescription('');
      setShowDescription(false);
      setIsRangeMode(false);
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
        <div className="task-form-controls">
          <div
            className="task-priority-selector"
            data-testid="task-priority-selector"
            aria-label="انتخاب اولویت"
          >
            {PRIORITY_OPTIONS.map((p) => {
              const isSelected = effectivePriority === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  className={`task-priority-pill ${isSelected ? 'active' : ''}`}
                  data-testid={`task-priority-btn-${p.value}`}
                  onClick={() => {
                    setIsManualPriority(true);
                    setPriority(p.value);
                  }}
                  aria-pressed={isSelected}
                  title={p.label}
                >
                  <span>{p.icon}</span>
                  <span className="task-priority-num">{p.value}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={`btn-toggle-range ${isRangeMode ? 'active' : ''}`}
            data-testid="btn-toggle-range"
            onClick={() => setIsRangeMode((prev) => !prev)}
            title="تغییر به بازه چندروزه"
          >
            🗓️ {isRangeMode ? 'بازه چندروزه' : 'تک‌روز'}
          </button>

          {isRangeMode ? (
            <div className="task-date-range-pickers">
              <DatePicker
                value={startDate}
                isAllDay={effectiveIsAllDay}
                onChange={(newDate) => setStartDate(newDate)}
                label="تاریخ شروع"
              />
              <span className="task-range-arrow">تا</span>
              <DatePicker
                value={effectiveDueDate}
                isAllDay={effectiveIsAllDay}
                onChange={(newDate, allDay) => {
                  setIsManualDueDate(true);
                  setDueDate(newDate);
                  setIsAllDay(allDay);
                }}
                label="تاریخ پایان"
              />
            </div>
          ) : (
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
          )}

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
        </div>

        <div className="task-desc-wrapper">
          {showDescription ? (
            <textarea
              className="task-description-textarea"
              data-testid="task-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیحات، یادداشت‌ها یا لینک‌ها..."
              rows={2}
              aria-label="توضیحات task"
            />
          ) : (
            <button
              type="button"
              className="btn-toggle-desc"
              data-testid="btn-toggle-desc"
              onClick={() => setShowDescription(true)}
              title="افزودن توضیحات"
            >
              📝 افزودن توضیحات...
            </button>
          )}
        </div>

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
