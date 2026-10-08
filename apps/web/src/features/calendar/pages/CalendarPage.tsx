import type { TaskEntity } from '@orbit/shared-types';
import { useCallback, useEffect, useState, type FC, type FormEvent } from 'react';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import {
  formatJalaliDate,
  dateToJalali
} from '../../../core/calendar/jalali';
import {
  getCalendarMonthTitle,
  navigateMonth,
  navigateWeek,
  type CalendarType,
  type CalendarViewMode
} from '../calendar-utils';
import { MonthView } from '../components/MonthView';
import { WeekView } from '../components/WeekView';
import {
  createTask,
  completeTask,
  reopenTask
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

  const monthYearTitle = getCalendarMonthTitle(currentDate, calendarType);

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => navigateMonth(prev, -1, calendarType));
    } else {
      setCurrentDate((prev) => navigateWeek(prev, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => navigateMonth(prev, 1, calendarType));
    } else {
      setCurrentDate((prev) => navigateWeek(prev, 1));
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

  const handleOpenAddTaskModal = (date: Date, isoDate: string) => {
    setSelectedDay({ date, isoDate });
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
          isAllDay: true
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
    if (calendarType === 'jalali') {
      const j = dateToJalali(selectedDay.date);
      return formatJalaliDate(j, { format: 'full' });
    }
    return selectedDay.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
            {monthYearTitle}
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
        <div className={styles.actionError} role="alert">
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
      {viewMode === 'month' ? (
        <MonthView
          currentDate={currentDate}
          calendarType={calendarType}
          tasks={tasks}
          onToggleCompletion={handleToggleCompletion}
          onAddTask={handleOpenAddTaskModal}
        />
      ) : (
        <WeekView
          currentDate={currentDate}
          calendarType={calendarType}
          tasks={tasks}
          onToggleCompletion={handleToggleCompletion}
          onAddTask={handleOpenAddTaskModal}
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
