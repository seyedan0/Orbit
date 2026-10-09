import type { TaskEntity } from '@orbit/shared-types';
import { useCallback, useEffect, useState, type FC, type FormEvent } from 'react';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import {
  formatJalaliDate,
  dateToJalali,
  toPersianDigits
} from '../../../core/calendar/jalali';
import {
  getCalendarMonthTitle,
  getCalendarDayTitle,
  navigateMonth,
  navigateWeek,
  navigateDay,
  navigateAgenda,
  rescheduleDatePreservingTime,
  rescheduleTaskToHour,
  type CalendarType,
  type CalendarViewMode
} from '../calendar-utils';
import { MonthView } from '../components/MonthView';
import { WeekView } from '../components/WeekView';
import { DayView } from '../components/DayView';
import { AgendaView } from '../components/AgendaView';
import {
  createTask,
  completeTask,
  reopenTask,
  rescheduleTask
} from '../../tasks/services/task-service';
import styles from './CalendarPage.module.css';

export interface CalendarPageProps {
  initialDate?: Date;
  initialCalendarType?: CalendarType;
  initialViewMode?: CalendarViewMode;
  initialTasks?: TaskEntity[];
}

export const CalendarPage: FC<CalendarPageProps> = ({
  initialDate,
  initialCalendarType = 'jalali',
  initialViewMode = 'month',
  initialTasks
}) => {
  const { session } = useSession();
  const store = useStore();

  const [currentDate, setCurrentDate] = useState<Date>(
    () => initialDate ?? new Date()
  );
  const [calendarType, setCalendarType] =
    useState<CalendarType>(initialCalendarType);
  const [viewMode, setViewMode] = useState<CalendarViewMode>(initialViewMode);
  const [tasks, setTasks] = useState<TaskEntity[]>(() => initialTasks ?? []);
  const [loading, setLoading] = useState<boolean>(initialTasks === undefined);
  const [actionError, setActionError] = useState<string | null>(null);

  // Quick Task Creation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    isoDate: string;
    hour?: number | undefined;
  } | null>(null);
  const [modalTaskTitle, setModalTaskTitle] = useState('');

  const reload = useCallback(async () => {
    try {
      const allTasks = await store.listTasks();
      setTasks(allTasks);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'خطا در بارگذاری تسک‌ها'
      );
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const headerTitle =
    viewMode === 'day'
      ? getCalendarDayTitle(currentDate, calendarType)
      : getCalendarMonthTitle(currentDate, calendarType);

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => navigateMonth(prev, -1, calendarType));
    } else if (viewMode === 'week') {
      setCurrentDate((prev) => navigateWeek(prev, -1));
    } else if (viewMode === 'day') {
      setCurrentDate((prev) => navigateDay(prev, -1));
    } else if (viewMode === 'agenda') {
      setCurrentDate((prev) => navigateAgenda(prev, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => navigateMonth(prev, 1, calendarType));
    } else if (viewMode === 'week') {
      setCurrentDate((prev) => navigateWeek(prev, 1));
    } else if (viewMode === 'day') {
      setCurrentDate((prev) => navigateDay(prev, 1));
    } else if (viewMode === 'agenda') {
      setCurrentDate((prev) => navigateAgenda(prev, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleToggleCompletion = async (task: TaskEntity) => {
    const userId = session?.userId ?? 'user-default';
    if (task.kind !== 'TASK') return;
    setActionError(null);

    const isCurrentlyCompleted = task.completedAt != null;
    const previousTasks = tasks;

    const optimisticTimestamp = new Date().toISOString();
    setTasks((current) =>
      current.map((t) => {
        if (t.id !== task.id) return t;
        return {
          ...t,
          completedAt: isCurrentlyCompleted ? null : optimisticTimestamp,
          updatedAt: optimisticTimestamp
        };
      })
    );

    try {
      if (isCurrentlyCompleted) {
        await reopenTask(task.id, { store, userId });
      } else {
        await completeTask(task.id, { store, userId });
      }
      await reload();
    } catch (err) {
      setTasks(previousTasks);
      setActionError(
        err instanceof Error ? err.message : 'خطا در به‌روزرسانی وضعیت تسک'
      );
    }
  };

  const handleRescheduleMonth = async (
    taskId: string,
    targetDate: Date,
    _targetIsoDate: string
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setActionError(null);

    const previousTasks = tasks;
    const nowIso = new Date().toISOString();

    const newDueDate = rescheduleDatePreservingTime(task.dueDate, targetDate);
    const newStartDate = task.startDate
      ? rescheduleDatePreservingTime(task.startDate, targetDate)
      : (task.startDate ?? null);

    // Optimistic UI update (<50ms)
    setTasks((current) =>
      current.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          dueDate: newDueDate,
          startDate: newStartDate,
          updatedAt: nowIso
        };
      })
    );

    try {
      await rescheduleTask(
        store,
        taskId,
        {
          dueDate: newDueDate,
          startDate: newStartDate
        },
        { userId: session?.userId ?? 'user-default' }
      );
      await reload();
    } catch (err) {
      setTasks(previousTasks);
      setActionError(
        err instanceof Error ? err.message : 'خطا در جابه‌جایی تاریخ تسک'
      );
    }
  };

  const handleRescheduleDayHour = async (
    taskId: string,
    hour: number,
    toAllDay: boolean = false
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setActionError(null);

    const previousTasks = tasks;
    const nowIso = new Date().toISOString();

    let newIsAllDay = toAllDay;
    let newStartDate: string | null = null;
    let newDueDate: string | null = null;
    let newDuration: number | null = null;

    if (toAllDay) {
      newIsAllDay = true;
      const base = new Date(currentDate);
      base.setHours(0, 0, 0, 0);
      newDueDate = base.toISOString();
      newStartDate = null;
      newDuration = null;
    } else {
      newIsAllDay = false;
      const durationMinutes = task.duration ?? 60;
      const scheduled = rescheduleTaskToHour(currentDate, hour, durationMinutes);
      newStartDate = scheduled.startDate;
      newDueDate = scheduled.dueDate;
      newDuration = durationMinutes;
    }

    // Optimistic update (<50ms)
    setTasks((current) =>
      current.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          isAllDay: newIsAllDay,
          allDay: newIsAllDay,
          startDate: newStartDate,
          dueDate: newDueDate,
          duration: newDuration,
          updatedAt: nowIso
        };
      })
    );

    try {
      await rescheduleTask(
        store,
        taskId,
        {
          isAllDay: newIsAllDay,
          startDate: newStartDate,
          dueDate: newDueDate,
          duration: newDuration
        },
        { userId: session?.userId ?? 'user-default' }
      );
      await reload();
    } catch (err) {
      setTasks(previousTasks);
      setActionError(
        err instanceof Error ? err.message : 'خطا در تنظیم ساعت تسک'
      );
    }
  };

  const handleResizeDayDuration = async (
    taskId: string,
    newDurationMinutes: number
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setActionError(null);

    const previousTasks = tasks;
    const nowIso = new Date().toISOString();

    let newDueDate: string | null = task.dueDate ?? null;
    if (task.startDate) {
      const s = new Date(task.startDate);
      if (!isNaN(s.getTime())) {
        newDueDate = new Date(
          s.getTime() + newDurationMinutes * 60 * 1000
        ).toISOString();
      }
    } else if (task.dueDate) {
      const d = new Date(task.dueDate);
      if (!isNaN(d.getTime())) {
        newDueDate = new Date(
          d.getTime() + newDurationMinutes * 60 * 1000
        ).toISOString();
      }
    }

    // Optimistic update (<50ms)
    setTasks((current) =>
      current.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          duration: newDurationMinutes,
          dueDate: newDueDate,
          updatedAt: nowIso
        };
      })
    );

    try {
      await rescheduleTask(
        store,
        taskId,
        {
          duration: newDurationMinutes,
          dueDate: newDueDate
        },
        { userId: session?.userId ?? 'user-default' }
      );
      await reload();
    } catch (err) {
      setTasks(previousTasks);
      setActionError(
        err instanceof Error ? err.message : 'خطا در تغییر مدت‌زمان تسک'
      );
    }
  };

  const handleOpenAddTaskModal = (date: Date, isoDate: string, hour?: number) => {
    setSelectedDay(hour !== undefined ? { date, isoDate, hour } : { date, isoDate });
    setModalTaskTitle('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
    setModalTaskTitle('');
  };

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalTaskTitle.trim() || !selectedDay) return;
    const userId = session?.userId ?? 'user-default';

    setActionError(null);
    try {
      await createTask(
        {
          title: modalTaskTitle.trim(),
          dueDate: selectedDay.isoDate,
          isAllDay: selectedDay.hour === undefined
        },
        { store, userId }
      );
      handleCloseModal();
      await reload();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'خطا در ایجاد تسک'
      );
    }
  };

  const getModalDateFormatted = (): string => {
    if (!selectedDay) return '';
    const dateStr =
      calendarType === 'jalali'
        ? formatJalaliDate(dateToJalali(selectedDay.date), { format: 'full' })
        : selectedDay.date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

    if (selectedDay.hour !== undefined) {
      const hh = String(selectedDay.hour).padStart(2, '0') + ':00';
      const timeStr = calendarType === 'jalali' ? toPersianDigits(hh) : hh;
      return `${dateStr} - ${timeStr}`;
    }

    return dateStr;
  };

  return (
    <div
      className={styles.calendarPageContainer}
      data-testid="calendar-page"
    >
      {/* Top Toolbar */}
      <header className={styles.calendarToolbar}>
        <div className={styles.leftControls}>
          <h2
            className={styles.monthYearHeading}
            data-testid="calendar-month-year-label"
          >
            {headerTitle}
          </h2>

          <div className={styles.navGroup} role="group" aria-label="پیمایش تقویم">
            <button
              type="button"
              className={styles.navButton}
              onClick={handlePrev}
              aria-label="قبلی"
              data-testid="calendar-prev-btn"
            >
              قبلی
            </button>
            <button
              type="button"
              className={`${styles.navButton} ${styles.navButtonToday}`}
              onClick={handleToday}
              aria-label="امروز"
              data-testid="calendar-today-btn"
            >
              امروز
            </button>
            <button
              type="button"
              className={styles.navButton}
              onClick={handleNext}
              aria-label="بعدی"
              data-testid="calendar-next-btn"
            >
              بعدی
            </button>
          </div>
        </div>

        <div className={styles.rightControls}>
          {/* View Mode Toggle */}
          <div
            className={styles.toggleGroup}
            role="group"
            aria-label="نوع نمایش"
          >
            <button
              type="button"
              className={`${styles.toggleBtn} ${
                viewMode === 'month' ? styles.toggleBtnActive : ''
              }`}
              onClick={() => setViewMode('month')}
              aria-pressed={viewMode === 'month'}
              data-testid="view-month-btn"
            >
              ماه
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${
                viewMode === 'week' ? styles.toggleBtnActive : ''
              }`}
              onClick={() => setViewMode('week')}
              aria-pressed={viewMode === 'week'}
              data-testid="view-week-btn"
            >
              هفته
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${
                viewMode === 'day' ? styles.toggleBtnActive : ''
              }`}
              onClick={() => setViewMode('day')}
              aria-pressed={viewMode === 'day'}
              data-testid="view-day-btn"
            >
              روز
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${
                viewMode === 'agenda' ? styles.toggleBtnActive : ''
              }`}
              onClick={() => setViewMode('agenda')}
              aria-pressed={viewMode === 'agenda'}
              data-testid="view-agenda-btn"
            >
              دستورکار
            </button>
          </div>

          {/* Calendar System Switch */}
          <div
            className={styles.toggleGroup}
            role="group"
            aria-label="سیستم تقویم"
          >
            <button
              type="button"
              className={`${styles.toggleBtn} ${
                calendarType === 'jalali' ? styles.toggleBtnActive : ''
              }`}
              onClick={() => setCalendarType('jalali')}
              aria-pressed={calendarType === 'jalali'}
              data-testid="calendar-type-jalali"
            >
              شمسی
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${
                calendarType === 'gregorian' ? styles.toggleBtnActive : ''
              }`}
              onClick={() => setCalendarType('gregorian')}
              aria-pressed={calendarType === 'gregorian'}
              data-testid="calendar-type-gregorian"
            >
              میلادی
            </button>
          </div>
        </div>
      </header>

      {/* Action Error Banner */}
      {actionError && (
        <div
          className={styles.actionError}
          role="alert"
          data-testid="calendar-action-error"
        >
          {actionError}
        </div>
      )}

      {/* Loading Message */}
      {loading && (
        <div className={styles.loadingMsg} data-testid="calendar-loading">
          در حال بارگذاری تقویم...
        </div>
      )}

      {/* Main View Area */}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          calendarType={calendarType}
          tasks={tasks}
          onToggleCompletion={handleToggleCompletion}
          onAddTask={(date, isoDate) => handleOpenAddTaskModal(date, isoDate)}
          onRescheduleTask={handleRescheduleMonth}
        />
      )}

      {viewMode === 'week' && (
        <WeekView
          currentDate={currentDate}
          calendarType={calendarType}
          tasks={tasks}
          onToggleCompletion={handleToggleCompletion}
          onAddTask={(date, isoDate) => handleOpenAddTaskModal(date, isoDate)}
        />
      )}

      {viewMode === 'day' && (
        <DayView
          currentDate={currentDate}
          calendarType={calendarType}
          tasks={tasks}
          onToggleCompletion={handleToggleCompletion}
          onAddTask={(date, isoDate, hour) =>
            handleOpenAddTaskModal(date, isoDate, hour)
          }
          onRescheduleTaskHour={handleRescheduleDayHour}
          onResizeTaskDuration={handleResizeDayDuration}
        />
      )}

      {viewMode === 'agenda' && (
        <AgendaView
          currentDate={currentDate}
          calendarType={calendarType}
          tasks={tasks}
          onToggleCompletion={handleToggleCompletion}
          onAddTask={(date, isoDate) => handleOpenAddTaskModal(date, isoDate)}
        />
      )}

      {/* Quick Task Creation Modal */}
      {isModalOpen && selectedDay && (
        <div
          className={styles.modalBackdrop}
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-label="ایجاد تسک جدید در تقویم"
          data-testid="calendar-task-modal"
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>افزودن تسک جدید</h3>
            <span
              className={styles.modalDateLabel}
              data-testid="calendar-modal-date-label"
            >
              {getModalDateFormatted()}
            </span>

            <form onSubmit={handleModalSubmit}>
              <input
                type="text"
                className={styles.modalInput}
                placeholder="عنوان تسک..."
                value={modalTaskTitle}
                onChange={(e) => setModalTaskTitle(e.target.value)}
                autoFocus
                required
                data-testid="calendar-task-input"
              />

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={handleCloseModal}
                  data-testid="calendar-modal-cancel"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={styles.modalSubmitBtn}
                  data-testid="calendar-task-submit"
                >
                  افزودن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
