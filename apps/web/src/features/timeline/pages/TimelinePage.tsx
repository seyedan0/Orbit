import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TaskEntity } from '@orbit/shared-types';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import {
  completeTask,
  createTask,
  reopenTask
} from '../../tasks/services/task-service';
import {
  calculateTaskTimelineBar,
  getTimelineDateWindow,
  type TimelineViewMode
} from '../timeline-utils';
import styles from './TimelinePage.module.css';

export interface TimelinePageProps {
  initialTasks?: TaskEntity[];
  initialRefDate?: Date;
  initialViewMode?: TimelineViewMode;
}

export function TimelinePage({
  initialTasks,
  initialRefDate,
  initialViewMode = 'WEEK'
}: TimelinePageProps = {}) {
  const { session } = useSession();
  const store = useStore();

  const [refDate, setRefDate] = useState<Date>(() => initialRefDate ?? new Date());
  const [viewMode, setViewMode] = useState<TimelineViewMode>(initialViewMode);
  const [tasks, setTasks] = useState<TaskEntity[]>(() => initialTasks ?? []);
  const [quickTitle, setQuickTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const allTasks = await store.listTasks();
      setTasks(allTasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تسک‌ها');
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const timelineWindow = useMemo(() => {
    return getTimelineDateWindow(refDate, viewMode);
  }, [refDate, viewMode]);

  const visibleTasksWithBars = useMemo(() => {
    return tasks
      .filter((t) => t.deletedAt == null)
      .map((t) => {
        const bar = calculateTaskTimelineBar(
          t,
          timelineWindow.startDate,
          timelineWindow.endDate
        );
        return { task: t, bar };
      })
      .filter((item) => item.bar.isVisible);
  }, [tasks, timelineWindow]);

  const handlePrev = () => {
    setRefDate((prev) => {
      const next = new Date(prev);
      const step = viewMode === 'DAY' ? 1 : viewMode === 'WEEK' ? 7 : 30;
      next.setDate(next.getDate() - step);
      return next;
    });
  };

  const handleNext = () => {
    setRefDate((prev) => {
      const next = new Date(prev);
      const step = viewMode === 'DAY' ? 1 : viewMode === 'WEEK' ? 7 : 30;
      next.setDate(next.getDate() + step);
      return next;
    });
  };

  const handleToday = () => {
    setRefDate(new Date());
  };

  const handleToggleCompletion = async (task: TaskEntity) => {
    if (!session) return;
    const isCompleted = task.completedAt != null;
    const previous = tasks;
    const optimisticTimestamp = new Date().toISOString();

    setTasks((current) =>
      current.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completedAt: isCompleted ? null : optimisticTimestamp,
              updatedAt: optimisticTimestamp
            }
          : t
      )
    );

    try {
      if (isCompleted) {
        await reopenTask(task.id, { store, userId: session.userId });
      } else {
        await completeTask(task.id, { store, userId: session.userId });
      }
      await reload();
    } catch (err) {
      setTasks(previous);
      setError(err instanceof Error ? err.message : 'خطا در به‌روزرسانی تسک');
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title || !session) return;

    const startIso = timelineWindow.startDate.toISOString();
    const dueIso = timelineWindow.endDate.toISOString();

    try {
      await createTask(
        {
          title,
          startDate: startIso,
          dueDate: dueIso,
          priority: 3
        },
        { store, userId: session.userId }
      );
      setQuickTitle('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ایجاد تسک');
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5:
        return '#dc2626';
      case 3:
        return '#3b82f6';
      case 1:
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  return (
    <div className={styles.container} data-testid="timeline-page">
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title} data-testid="timeline-title">
            تایملاین و گانت پروژه (Timeline View)
          </h1>
          <p className={styles.subtitle}>
            نمایش افقی و زمان‌بندی مدت‌دار کارها در بازه تقویمی
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.navGroup}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handlePrev}
              data-testid="timeline-prev-btn"
            >
              قبلی
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handleToday}
              data-testid="timeline-today-btn"
            >
              امروز
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handleNext}
              data-testid="timeline-next-btn"
            >
              بعدی
            </button>
          </div>

          <div className={styles.viewModeGroup} data-testid="view-mode-selector">
            <button
              type="button"
              className={`${styles.viewModeBtn} ${
                viewMode === 'DAY' ? styles.active : ''
              }`}
              onClick={() => setViewMode('DAY')}
              data-testid="mode-day-btn"
            >
              روزانه
            </button>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${
                viewMode === 'WEEK' ? styles.active : ''
              }`}
              onClick={() => setViewMode('WEEK')}
              data-testid="mode-week-btn"
            >
              هفتگی
            </button>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${
                viewMode === 'MONTH' ? styles.active : ''
              }`}
              onClick={() => setViewMode('MONTH')}
              data-testid="mode-month-btn"
            >
              ماهانه
            </button>
          </div>
        </div>
      </header>

      {error && <div className={styles.emptyState}>{error}</div>}

      <div className={styles.timelineCard}>
        <div className={styles.timelineScroll}>
          {/* Day Columns Header */}
          <div className={styles.timelineHeader} data-testid="timeline-header-grid">
            {timelineWindow.days.map((col) => (
              <div
                key={col.key}
                className={`${styles.dayColumnHeader} ${
                  col.isToday ? styles.today : ''
                } ${col.isWeekend ? styles.weekend : ''}`}
                data-testid={`day-col-${col.key}`}
              >
                <span className={styles.weekdayLabel}>{col.weekdayLabel}</span>
                <span className={styles.jalaliLabel}>{col.jalaliLabel}</span>
              </div>
            ))}
          </div>

          {/* Grid Body with Bars */}
          <div className={styles.timelineBody} data-testid="timeline-body-grid">
            {/* Background vertical dashed grid lines */}
            <div className={styles.gridLines}>
              {timelineWindow.days.map((col) => (
                <div
                  key={col.key}
                  className={`${styles.gridLineColumn} ${
                    col.isToday ? styles.today : ''
                  }`}
                />
              ))}
            </div>

            {/* Task Horizontal Bars Container */}
            <div className={styles.taskRowsContainer}>
              {visibleTasksWithBars.length === 0 ? (
                <div className={styles.emptyState} data-testid="timeline-empty-state">
                  هیچ تسک زمان‌بندی‌شده‌ای در این بازه زمانی وجود ندارد.
                </div>
              ) : (
                visibleTasksWithBars.map(({ task, bar }) => {
                  const isCompleted = task.completedAt != null;
                  const barBg = bar.isOverdue
                    ? '#ef4444'
                    : getPriorityColor(task.priority);

                  return (
                    <div
                      key={task.id}
                      className={styles.taskRow}
                      data-testid={`timeline-row-${task.id}`}
                    >
                      <div
                        className={`${styles.taskBar} ${
                          isCompleted ? styles.completed : ''
                        } ${bar.isOverdue ? styles.overdue : ''}`}
                        style={{
                          left: `${bar.leftPct}%`,
                          width: `${bar.widthPct}%`,
                          backgroundColor: barBg
                        }}
                        data-testid={`task-bar-${task.id}`}
                      >
                        <div
                          className={styles.resizeHandleLeft}
                          title="تنظیم شروع"
                        />
                        <input
                          type="checkbox"
                          className={styles.taskCheckbox}
                          checked={isCompleted}
                          onChange={() => void handleToggleCompletion(task)}
                          data-testid={`timeline-checkbox-${task.id}`}
                        />
                        <span>{task.title}</span>
                        <div
                          className={styles.resizeHandleRight}
                          title="تنظیم پایان"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add on Timeline */}
      <form onSubmit={handleQuickAdd} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="افزودن تسک در این بازه تایملاین..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px'
          }}
          data-testid="timeline-quick-add-input"
        />
        <button
          type="submit"
          disabled={!quickTitle.trim()}
          style={{
            padding: '0.5rem 1rem',
            background: '#1e293b',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
          data-testid="timeline-quick-add-btn"
        >
          + افزودن به تایملاین
        </button>
      </form>
    </div>
  );
}
