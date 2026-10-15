import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import type { TaskEntity } from '@orbit/shared-types';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import { formatJalaliDate, isoToJalali } from '../../../core/calendar/jalali';
import {
  createTask,
  completeTask,
  reopenTask,
  updateTask,
  getLocalDateKey
} from '../../tasks/services/task-service';
import {
  categorizeTaskIntoQuadrant,
  getEisenhowerMatrixGroups,
  getQuadrantTargetUpdates,
  QUADRANT_CONFIGS,
  type EisenhowerQuadrant
} from '../matrix-utils';
import styles from './EisenhowerMatrixPage.module.css';

const QUADRANTS: EisenhowerQuadrant[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export interface EisenhowerMatrixPageProps {
  initialTasks?: TaskEntity[];
}

export function EisenhowerMatrixPage({ initialTasks }: EisenhowerMatrixPageProps = {}) {
  const { session } = useSession();
  const store = useStore();

  const [tasks, setTasks] = useState<TaskEntity[]>(() => initialTasks ?? []);
  const [loading, setLoading] = useState<boolean>(() => initialTasks === undefined);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<EisenhowerQuadrant | null>(null);
  const [quickAddTitles, setQuickAddTitles] = useState<Record<EisenhowerQuadrant, string>>({
    Q1: '',
    Q2: '',
    Q3: '',
    Q4: ''
  });

  const reload = useCallback(async () => {
    try {
      const allTasks = await store.listTasks();
      setTasks(allTasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تسک‌ها');
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const groups = useMemo(() => {
    return getEisenhowerMatrixGroups(tasks, new Date(), undefined, {
      includeCompleted: showCompleted
    });
  }, [tasks, showCompleted]);

  const todayKey = useMemo(() => {
    return getLocalDateKey(new Date());
  }, []);

  const handleToggleCompletion = async (task: TaskEntity) => {
    if (session === undefined || task.kind !== 'TASK') return;
    setError(null);

    const isCurrentlyCompleted = task.completedAt != null;
    const previousTasks = tasks;
    const optimisticTimestamp = new Date().toISOString();

    setTasks((prev) =>
      prev.map((t) => {
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
        await reopenTask(task.id, { store, userId: session.userId });
      } else {
        await completeTask(task.id, { store, userId: session.userId });
      }
      await reload();
    } catch (err) {
      setTasks(previousTasks);
      setError(err instanceof Error ? err.message : 'خطا در به‌روزرسانی وضعیت تسک');
    }
  };

  const handleDragStart = (e: DragEvent<HTMLLIElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverQuadrant(null);
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (quadrant: EisenhowerQuadrant) => {
    setDragOverQuadrant(quadrant);
  };

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverQuadrant(null);
  };

  const handleDrop = async (e: DragEvent<HTMLElement>, targetQuadrant: EisenhowerQuadrant) => {
    e.preventDefault();
    setDragOverQuadrant(null);

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId || !session) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const currentQuadrant = categorizeTaskIntoQuadrant(task);
    if (currentQuadrant === targetQuadrant) return;

    const updates = getQuadrantTargetUpdates(targetQuadrant, task);
    const previousTasks = tasks;
    const optimisticTimestamp = new Date().toISOString();

    // Optimistic state update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              priority: updates.priority,
              dueDate: updates.dueDate,
              isAllDay: updates.isAllDay,
              allDay: updates.isAllDay,
              updatedAt: optimisticTimestamp
            }
          : t
      )
    );

    try {
      await updateTask(taskId, updates, { store, userId: session.userId });
      await reload();
    } catch (err) {
      setTasks(previousTasks);
      setError(err instanceof Error ? err.message : 'خطا در انتقال تسک');
    } finally {
      setDraggedTaskId(null);
    }
  };

  const handleQuickAdd = async (e: FormEvent, quadrant: EisenhowerQuadrant) => {
    e.preventDefault();
    const title = quickAddTitles[quadrant].trim();
    if (!title || !session) return;

    setError(null);
    const defaults = getQuadrantTargetUpdates(quadrant);

    try {
      await createTask(
        {
          title,
          priority: defaults.priority,
          dueDate: defaults.dueDate,
          isAllDay: defaults.isAllDay
        },
        { store, userId: session.userId }
      );
      setQuickAddTitles((prev) => ({ ...prev, [quadrant]: '' }));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ایجاد تسک');
    }
  };

  const formatDueBadge = (dueDateStr: string | null | undefined, isAllDay: boolean) => {
    if (!dueDateStr) return null;
    try {
      const jalali = isoToJalali(dueDateStr);
      const text = formatJalaliDate(jalali, {
        format: 'short',
        includeTime: !isAllDay
      });
      const dueKey = getLocalDateKey(new Date(dueDateStr));
      const isOverdue = dueKey < todayKey;
      const isToday = dueKey === todayKey;

      const badgeClass = isOverdue
        ? styles.dueDateBadgeOverdue
        : isToday
          ? styles.dueDateBadgeToday
          : '';

      return (
        <span className={`${styles.dueDateBadge} ${badgeClass}`}>
          {isOverdue ? '⚠️ گذشته: ' : isToday ? 'امروز: ' : 'سررسید: '}
          {text}
        </span>
      );
    } catch {
      return null;
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 5:
        return { label: 'بسیار بالا (P5)', className: styles.priorityHigh };
      case 3:
        return { label: 'مهم (P3)', className: styles.priorityHigh };
      case 1:
        return { label: 'متوسط (P1)', className: styles.priorityMedium };
      default:
        return { label: 'عادی (P0)', className: styles.priorityLow };
    }
  };

  const totalTasksCount = tasks.filter((t) => t.deletedAt == null).length;
  const completedTasksCount = tasks.filter((t) => t.deletedAt == null && t.completedAt != null).length;

  return (
    <div className={styles.container} data-testid="eisenhower-matrix-page">
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <h1 className={styles.title} data-testid="matrix-title">
              ماتریس آیزنهاور (Eisenhower Matrix)
            </h1>
            <p className={styles.subtitle}>
              اولویت‌بندی و مدیریت هوشمند کارها در ۴ ربع بر اساس فوریت و اهمیت
            </p>
          </div>

          <div className={styles.controls}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                data-testid="toggle-completed"
              />
              نمایش کارهای تکمیل‌شده ({completedTasksCount})
            </label>
          </div>
        </div>

        <div className={styles.statsBar}>
          <span className={styles.statBadge}>
            مجموع تسک‌ها: {totalTasksCount}
          </span>
          {QUADRANTS.map((q) => (
            <span
              key={q}
              className={styles.statBadge}
              style={{ borderColor: QUADRANT_CONFIGS[q].color }}
            >
              {QUADRANT_CONFIGS[q].name}: {groups[q].length}
            </span>
          ))}
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
      </header>

      {loading && (
        <div data-testid="loading-msg" className={styles.loadingBanner}>
          در حال بارگذاری ماتریس...
        </div>
      )}

      <main className={styles.matrixGrid}>
          {QUADRANTS.map((quadrant) => {
            const config = QUADRANT_CONFIGS[quadrant];
            const quadrantTasks = groups[quadrant];
            const isDragOver = dragOverQuadrant === quadrant;

            return (
              <section
                key={quadrant}
                className={`${styles.quadrantCard} ${isDragOver ? styles.dragOver : ''}`}
                style={{ borderColor: config.borderColor }}
                data-testid={`quadrant-${quadrant}`}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(quadrant)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => void handleDrop(e, quadrant)}
              >
                <header
                  className={styles.quadrantHeader}
                  style={{ background: config.bgColor }}
                >
                  <div className={styles.quadrantInfo}>
                    <div className={styles.quadrantTitleRow}>
                      <span
                        className={styles.quadrantBadge}
                        style={{ background: config.color }}
                      >
                        {quadrant} • {config.badge}
                      </span>
                      <h2 className={styles.quadrantName}>{config.name}</h2>
                    </div>
                    <span className={styles.quadrantStrategy}>{config.strategy}</span>
                  </div>
                  <span
                    className={styles.quadrantCount}
                    data-testid={`count-${quadrant}`}
                  >
                    {quadrantTasks.length}
                  </span>
                </header>

                <ul className={styles.taskList}>
                  {quadrantTasks.length === 0 ? (
                    <div
                      className={styles.emptyQuadrant}
                      data-testid={`empty-${quadrant}`}
                    >
                      هیچ تسکی در ربع {config.name} وجود ندارد.
                      <br />
                      می‌توانید تسک‌ها را به اینجا بکشید یا از فرم پایین اضافه کنید.
                    </div>
                  ) : (
                    quadrantTasks.map((task) => {
                      const isCompleted = task.completedAt != null;
                      const priorityInfo = getPriorityLabel(task.priority);
                      const isBeingDragged = draggedTaskId === task.id;

                      return (
                        <li
                          key={task.id}
                          className={`${styles.taskItem} ${
                            isCompleted ? styles.completed : ''
                          } ${isBeingDragged ? styles.dragging : ''}`}
                          draggable={!isCompleted}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          data-testid={`task-item-${task.id}`}
                        >
                          <input
                            type="checkbox"
                            className={styles.taskCheckbox}
                            checked={isCompleted}
                            onChange={() => void handleToggleCompletion(task)}
                            data-testid={`task-checkbox-${task.id}`}
                          />
                          <div className={styles.taskBody}>
                            <span
                              className={`${styles.taskTitle} ${
                                isCompleted ? styles.completed : ''
                              }`}
                            >
                              {task.title}
                            </span>
                            <div className={styles.taskMeta}>
                              <span
                                className={`${styles.priorityBadge} ${priorityInfo.className}`}
                                data-testid={`priority-badge-${task.id}`}
                              >
                                {priorityInfo.label}
                              </span>
                              {formatDueBadge(task.dueDate, task.isAllDay)}
                              {task.tags &&
                                task.tags.map((tag) => (
                                  <span key={tag} className={styles.tagBadge}>
                                    #{tag}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>

                <footer className={styles.quickAddArea}>
                  <form
                    onSubmit={(e) => void handleQuickAdd(e, quadrant)}
                    className={styles.quickAddForm}
                    data-testid={`quick-add-form-${quadrant}`}
                  >
                    <input
                      type="text"
                      className={styles.quickAddInput}
                      placeholder={`افزودن سریع در ${config.name}...`}
                      value={quickAddTitles[quadrant]}
                      onChange={(e) =>
                        setQuickAddTitles((prev) => ({
                          ...prev,
                          [quadrant]: e.target.value
                        }))
                      }
                      data-testid={`quick-add-input-${quadrant}`}
                    />
                    <button
                      type="submit"
                      className={styles.quickAddButton}
                      disabled={!quickAddTitles[quadrant].trim()}
                      data-testid={`quick-add-button-${quadrant}`}
                    >
                      + افزودن
                    </button>
                  </form>
                </footer>
              </section>
            );
          })}
        </main>
    </div>
  );
}
