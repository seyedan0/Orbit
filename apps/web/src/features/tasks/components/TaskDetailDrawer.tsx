import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { TaskEntity, SubTaskItem, TagEntity, TaskPriority } from '@orbit/shared-types';
import { useStore } from '../../../core/storage/store-context';
import { useSession } from '../../../core/auth/session-context';
import { DatePicker } from '../../calendar/components/DatePicker';
import { RECURRENCE_PRESETS } from '../../../core/recurrence/recurrence';
import { REMINDER_PRESETS } from '../../../core/reminders/reminder-utils';
import { formatJalaliDate, isoToJalali } from '../../../core/calendar/jalali';
import { PRIORITY_OPTIONS } from './TaskForm';
import {
  toggleSubtaskCompletion,
  insertSubtaskChild,
  deleteSubtaskNode,
  updateSubtaskTitle,
  calculateSubtaskProgress
} from '../../../core/tasks/subtask-tree';
import {
  updateTaskDetails,
  updateTaskSubtasks,
  promoteSubtaskToIndependentTask,
  completeTask,
  reopenTask,
  deleteTask
} from '../services/task-service';
import styles from './TaskDetailDrawer.module.css';

export interface TaskDetailDrawerProps {
  task: TaskEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: (updatedTask: TaskEntity) => void;
  onTaskDeleted?: (deletedTask: TaskEntity) => void;
  availableTags?: TagEntity[];
}

const toPersianDigits = (val: number | string): string =>
  String(val).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);

export function TaskDetailDrawer({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  availableTags = []
}: TaskDetailDrawerProps) {
  const store = useStore();
  const { session } = useSession();

  // Local editable state for optimistic updates
  const [currentTask, setCurrentTask] = useState<TaskEntity | null>(task);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.desc ?? task?.content ?? '');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [addingChildParentId, setAddingChildParentId] = useState<string | null>(null);
  const [newChildTitle, setNewChildTitle] = useState('');
  const [newRootTitle, setNewRootTitle] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync internal state when opened task changes
  useEffect(() => {
    setCurrentTask(task);
    setTitle(task?.title ?? '');
    setDescription(task?.desc ?? task?.content ?? '');
    setAddingChildParentId(null);
    setNewChildTitle('');
    setNewRootTitle('');
    setError(null);
  }, [task]);

  // Handle Esc key to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentTask) {
    return null;
  }

  const isCompleted = currentTask.completedAt != null;
  const subtasksTree = currentTask.items ?? [];
  const subtaskProgress = calculateSubtaskProgress(subtasksTree);

  // Save general task details atomically with LWW mutation
  const persistDetails = async (updates: Parameters<typeof updateTaskDetails>[2]) => {
    if (!session || !currentTask) return;
    try {
      setError(null);
      const updated = await updateTaskDetails(store, currentTask.id, updates, {
        userId: session.userId,
        timeZone: currentTask.timeZone
      });
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره‌سازی تغییرات');
    }
  };

  // Save subtasks tree atomically with LWW mutation
  const persistSubtasks = async (newTree: SubTaskItem[]) => {
    if (!session || !currentTask) return;
    try {
      setError(null);
      const updated = await updateTaskSubtasks(store, currentTask.id, newTree, {
        userId: session.userId,
        timeZone: currentTask.timeZone
      });
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره زیرتسک‌ها');
    }
  };

  // Toggle task completion
  const handleToggleCompletion = async () => {
    if (!session || !currentTask) return;
    try {
      setError(null);
      let updated: TaskEntity;
      if (isCompleted) {
        updated = await reopenTask(currentTask.id, {
          store,
          userId: session.userId
        });
      } else {
        updated = await completeTask(currentTask.id, {
          store,
          userId: session.userId,
          timeZone: currentTask.timeZone
        });
      }
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تغییر وضعیت تسک');
    }
  };

  // Title update on blur or Enter
  const handleTitleBlurOrEnter = () => {
    if (title.trim() && title.trim() !== currentTask.title) {
      void persistDetails({ title: title.trim() });
    }
  };

  // Priority change
  const handlePriorityChange = (newPriority: TaskPriority) => {
    if (newPriority !== currentTask.priority) {
      void persistDetails({ priority: newPriority });
    }
  };

  // Description update on blur
  const handleDescriptionBlur = () => {
    if (description !== (currentTask.desc ?? currentTask.content ?? '')) {
      void persistDetails({ description: description.trim() ? description.trim() : null });
    }
  };

  // Start Date / Due Date changes
  const handleStartDateChange = (date: string | null) => {
    void persistDetails({ startDate: date });
  };

  const handleDueDateChange = (date: string | null, isAllDay: boolean) => {
    void persistDetails({ dueDate: date, isAllDay });
  };

  const handleAllDayToggle = (checked: boolean) => {
    void persistDetails({ isAllDay: checked });
  };

  const handleRepeatChange = (repeatFlag: string) => {
    void persistDetails({ repeatFlag: repeatFlag.trim() ? repeatFlag : null });
  };

  const handleReminderChange = (reminderId: string) => {
    void persistDetails({ reminders: reminderId !== 'NONE' ? [reminderId] : [] });
  };

  // Delete task
  const handleDeleteTask = async () => {
    if (!session || !currentTask) return;
    try {
      await deleteTask(currentTask.id, { store, userId: session.userId });
      onTaskDeleted?.(currentTask);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در حذف تسک');
    }
  };

  // Subtask actions
  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleSubtask = (id: string) => {
    const { updatedTree } = toggleSubtaskCompletion(subtasksTree, id, new Date().toISOString());
    void persistSubtasks(updatedTree);
  };

  const handleSubtaskTitleBlur = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const updatedTree = updateSubtaskTitle(subtasksTree, id, newTitle.trim());
    void persistSubtasks(updatedTree);
  };

  const handleDeleteSubtask = (id: string) => {
    const updatedTree = deleteSubtaskNode(subtasksTree, id);
    void persistSubtasks(updatedTree);
  };

  const handleAddChildSubtask = (parentId: string | null, childTitle: string) => {
    if (!childTitle.trim()) return;
    const newChild: SubTaskItem = {
      id: crypto.randomUUID(),
      title: childTitle.trim(),
      isCompleted: false,
      order: 0,
      parentId: parentId ?? null,
      children: []
    };
    const updatedTree = insertSubtaskChild(subtasksTree, parentId, newChild);
    void persistSubtasks(updatedTree);
    setAddingChildParentId(null);
    setNewChildTitle('');
  };

  const handleAddRootSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRootTitle.trim()) return;
    handleAddChildSubtask(null, newRootTitle.trim());
    setNewRootTitle('');
  };

  const handlePromoteSubtask = async (subtaskId: string) => {
    if (!session || !currentTask) return;
    try {
      const result = await promoteSubtaskToIndependentTask(
        store,
        currentTask.id,
        subtaskId,
        {
          userId: session.userId,
          timeZone: currentTask.timeZone
        }
      );
      setCurrentTask(result.parentTask);
      onTaskUpdated?.(result.parentTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تبدیل زیرتسک به تسک');
    }
  };

  // Tags management
  const handleRemoveTag = (tagRef: string) => {
    const nextTags = (currentTask.tags ?? []).filter((t) => t !== tagRef);
    void persistDetails({ tags: nextTags });
  };

  const handleAddTag = (tagRef: string) => {
    if (!tagRef.trim()) return;
    const clean = tagRef.trim().replace(/^#/, '');
    if ((currentTask.tags ?? []).includes(clean)) return;
    const nextTags = [...(currentTask.tags ?? []), clean];
    void persistDetails({ tags: nextTags });
    setNewTagInput('');
  };

  // Delivery status badge display
  const deliveryStatusText = isCompleted && currentTask.deliveryStatus
    ? (() => {
        if (currentTask.deliveryStatus === 'EARLY') {
          const hours = currentTask.completionVarianceHours ?? 0;
          const days = Math.round(hours / 24);
          const timeText = days >= 1 ? `${toPersianDigits(days)} روز` : `${toPersianDigits(Math.max(1, Math.round(hours)))} ساعت`;
          return `🟢 ${timeText} زودتر انجام شد`;
        }
        if (currentTask.deliveryStatus === 'ON_TIME') {
          return '🟢 به موقع انجام شد';
        }
        if (currentTask.deliveryStatus === 'OVERDUE') {
          const hours = Math.abs(currentTask.completionVarianceHours ?? 0);
          const days = Math.round(hours / 24);
          const timeText = days >= 1 ? `${toPersianDigits(days)} روز` : `${toPersianDigits(Math.max(1, Math.round(hours)))} ساعت`;
          return `🔴 ${timeText} با تاخیر انجام شد`;
        }
        return null;
      })()
    : null;

  // Metadata timestamps formatted in Jalali
  const createdDateStr = (() => {
    try {
      return formatJalaliDate(isoToJalali(currentTask.createdAt), { format: 'short', includeTime: true });
    } catch {
      return currentTask.createdAt;
    }
  })();

  const updatedDateStr = (() => {
    try {
      return formatJalaliDate(isoToJalali(currentTask.updatedAt), { format: 'short', includeTime: true });
    } catch {
      return currentTask.updatedAt;
    }
  })();

  // Recursive tree renderer
  const renderSubtaskNode = (node: SubTaskItem, depth = 0) => {
    const isCollapsed = collapsedNodes[node.id] ?? false;
    const hasChildren = node.children && node.children.length > 0;
    const isAddingChildHere = addingChildParentId === node.id;

    return (
      <div key={node.id} className="subtask-node-wrapper" data-testid={`subtask-node-${node.id}`}>
        <div
          className={styles.subtaskNodeRow}
          style={{ paddingRight: `${depth * 1.5}rem` }}
        >
          {hasChildren ? (
            <button
              type="button"
              className={styles.caretButton}
              onClick={() => toggleCollapse(node.id)}
              aria-label={isCollapsed ? 'باز کردن زیرشاخه‌ها' : 'بستن زیرشاخه‌ها'}
              data-testid={`caret-${node.id}`}
            >
              {isCollapsed ? '◀' : '▼'}
            </button>
          ) : (
            <span style={{ width: 18, display: 'inline-block' }} />
          )}

          <input
            type="checkbox"
            className={styles.subtaskCheckbox}
            checked={node.isCompleted}
            onChange={() => handleToggleSubtask(node.id)}
            data-testid={`subtask-checkbox-${node.id}`}
            aria-label={`تکمیل ${node.title}`}
          />

          <input
            type="text"
            className={`${styles.subtaskTitleInput} ${node.isCompleted ? styles.completed : ''}`}
            defaultValue={node.title}
            onBlur={(e) => handleSubtaskTitleBlur(node.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            data-testid={`subtask-title-input-${node.id}`}
          />

          <div className={styles.subtaskActions}>
            <button
              type="button"
              className={styles.btnActionSmall}
              onClick={() => setAddingChildParentId(isAddingChildHere ? null : node.id)}
              title="افزودن زیرمجموعه"
              data-testid={`btn-add-child-${node.id}`}
            >
              + زیرمجموعه
            </button>
            <button
              type="button"
              className={styles.btnActionSmall}
              onClick={() => handlePromoteSubtask(node.id)}
              title="تبدیل به تسک مستقل"
              data-testid={`btn-promote-${node.id}`}
            >
              تبدیل به تسک
            </button>
            <button
              type="button"
              className={`${styles.btnActionSmall} ${styles.delete}`}
              onClick={() => handleDeleteSubtask(node.id)}
              title="حذف زیرتسک"
              data-testid={`btn-delete-subtask-${node.id}`}
            >
              ×
            </button>
          </div>
        </div>

        {isAddingChildHere && (
          <div
            className={styles.addSubtaskInlineForm}
            style={{ paddingRight: `${(depth + 1) * 1.5}rem` }}
          >
            <input
              type="text"
              className={styles.subtaskAddInput}
              placeholder="عنوان زیرمجموعه جدید…"
              value={newChildTitle}
              onChange={(e) => setNewChildTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddChildSubtask(node.id, newChildTitle);
                } else if (e.key === 'Escape') {
                  setAddingChildParentId(null);
                }
              }}
              autoFocus
              data-testid={`input-new-child-${node.id}`}
            />
            <button
              type="button"
              className={styles.btnActionSmall}
              onClick={() => handleAddChildSubtask(node.id, newChildTitle)}
              data-testid={`btn-confirm-add-child-${node.id}`}
            >
              افزودن
            </button>
            <button
              type="button"
              className={styles.btnActionSmall}
              onClick={() => setAddingChildParentId(null)}
            >
              انصراف
            </button>
          </div>
        )}

        {!isCollapsed && hasChildren && (
          <div className="subtask-children">
            {node.children!.map((child) => renderSubtaskNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={styles.drawerOverlay}
      data-testid="task-detail-drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className={styles.drawerContainer}
        data-testid="task-detail-drawer"
        role="dialog"
        aria-label="جزئیات تسک"
      >
        {/* Top Header */}
        <header className={styles.drawerHeader}>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="بستن پنجره"
              data-testid="drawer-close-btn"
            >
              ×
            </button>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#6b7280' }}>
              جزئیات تسک
            </span>
          </div>

          <button
            type="button"
            className={styles.btnDeleteTask}
            onClick={handleDeleteTask}
            data-testid="drawer-delete-task-btn"
          >
            حذف تسک
          </button>
        </header>

        {error && (
          <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Scrollable Body */}
        <div className={styles.drawerBody}>
          {/* Title & Completion Section */}
          <div className={styles.titleSection}>
            <input
              type="checkbox"
              className={styles.completeCheckbox}
              checked={isCompleted}
              onChange={handleToggleCompletion}
              data-testid="drawer-complete-checkbox"
              aria-label="تکمیل تسک"
            />
            <input
              type="text"
              className={`${styles.titleInput} ${isCompleted ? styles.completed : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlurOrEnter}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              data-testid="drawer-title-input"
              aria-label="عنوان تسک"
            />
          </div>

          {/* Delivery Performance Banner */}
          {deliveryStatusText && (
            <div
              className={`${styles.deliveryBanner} ${styles[currentTask.deliveryStatus?.toLowerCase() ?? '']}`}
              data-testid="drawer-delivery-badge"
            >
              <span>{deliveryStatusText}</span>
            </div>
          )}

          {/* Priority Section */}
          <div className={styles.prioritySection}>
            <span className={styles.sectionLabel}>اولویت:</span>
            <div className={styles.priorityPills} data-testid="drawer-priority-pills">
              {PRIORITY_OPTIONS.map((p) => {
                const isSelected = currentTask.priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    className={`${styles.priorityPill} ${isSelected ? styles.active : ''}`}
                    onClick={() => handlePriorityChange(p.value)}
                    data-testid={`drawer-priority-${p.value}`}
                    aria-pressed={isSelected}
                  >
                    <span>{p.icon}</span>
                    <span>{p.value}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scheduling Section: Date Range, All Day, Repeat, Reminders */}
          <div className={styles.schedulingSection}>
            <div className={styles.dateRow}>
              <span className={styles.sectionLabel}>بازه تاریخی:</span>
              <div className={styles.dateInputs}>
                <DatePicker
                  value={currentTask.startDate ?? null}
                  isAllDay={currentTask.isAllDay ?? true}
                  onChange={(newDate) => handleStartDateChange(newDate)}
                  label="تاریخ شروع"
                  placeholder="شروع"
                />
                <span style={{ color: '#9ca3af' }}>تا</span>
                <DatePicker
                  value={currentTask.dueDate ?? null}
                  isAllDay={currentTask.isAllDay ?? true}
                  onChange={(newDate, allDay) => handleDueDateChange(newDate, allDay)}
                  label="تاریخ سررسید"
                  placeholder="سررسید"
                />
              </div>
            </div>

            <div className={styles.dateRow}>
              <span className={styles.sectionLabel}>تمام‌روز:</span>
              <label className={styles.allDayToggle}>
                <input
                  type="checkbox"
                  checked={currentTask.isAllDay ?? false}
                  onChange={(e) => handleAllDayToggle(e.target.checked)}
                  data-testid="drawer-allday-checkbox"
                />
                <span>تسک در طول کل روز جریان دارد</span>
              </label>
            </div>

            <div className={styles.dateRow}>
              <span className={styles.sectionLabel}>تکرار:</span>
              <select
                className={styles.selectInput}
                value={currentTask.repeatFlag ?? ''}
                onChange={(e) => handleRepeatChange(e.target.value)}
                data-testid="drawer-repeat-select"
                aria-label="تکرار"
              >
                {RECURRENCE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.rrule}>
                    {preset.labelFa}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.dateRow}>
              <span className={styles.sectionLabel}>یادآور:</span>
              <select
                className={styles.selectInput}
                value={currentTask.reminders?.[0] ?? 'NONE'}
                onChange={(e) => handleReminderChange(e.target.value)}
                disabled={!currentTask.dueDate}
                data-testid="drawer-reminder-select"
                aria-label="یادآور"
              >
                {REMINDER_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.labelFa}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description Section */}
          <div className={styles.descriptionSection}>
            <span className={styles.sectionLabel}>توضیحات و یادداشت‌ها:</span>
            <textarea
              className={styles.descriptionTextarea}
              placeholder="توضیحات، پیوندها یا یادداشت‌های مربوط به این تسک…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              data-testid="drawer-description-textarea"
            />
          </div>

          {/* Infinitely Nested Subtasks Tree */}
          <div className={styles.subtasksSection}>
            <div className={styles.subtasksHeader}>
              <span className={styles.sectionLabel}>زیرتسک‌ها (Subtasks):</span>
              {subtaskProgress.total > 0 && (
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {toPersianDigits(subtaskProgress.completed)} از {toPersianDigits(subtaskProgress.total)} ({toPersianDigits(subtaskProgress.percentage)}%)
                </span>
              )}
            </div>

            {subtaskProgress.total > 0 && (
              <div className={styles.progressBarContainer} data-testid="drawer-subtasks-progress">
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${subtaskProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            <div className={styles.subtasksTree} data-testid="drawer-subtasks-tree">
              {subtasksTree.map((item) => renderSubtaskNode(item, 0))}
            </div>

            <form onSubmit={handleAddRootSubtask} className={styles.addSubtaskInlineForm}>
              <input
                type="text"
                className={styles.subtaskAddInput}
                placeholder="+ افزودن زیرتسک اصلی…"
                value={newRootTitle}
                onChange={(e) => setNewRootTitle(e.target.value)}
                data-testid="input-new-root-subtask"
              />
              <button
                type="submit"
                className={styles.btnActionSmall}
                data-testid="btn-add-root-subtask"
              >
                افزودن
              </button>
            </form>
          </div>

          {/* Tags Section */}
          <div className={styles.tagsSection}>
            <span className={styles.sectionLabel}>برچسب‌ها (Tags):</span>
            <div className={styles.tagsList} data-testid="drawer-tags-list">
              {(currentTask.tags ?? []).map((tagRef) => {
                const tagObj = availableTags.find((t) => t.id === tagRef || t.name === tagRef);
                const tagName = tagObj ? tagObj.name : tagRef;
                const tagColor = tagObj?.color ?? '#6366f1';
                return (
                  <span
                    key={tagRef}
                    className={styles.tagChip}
                    style={{
                      backgroundColor: `${tagColor}1a`,
                      borderColor: `${tagColor}66`,
                      color: tagColor
                    }}
                    data-testid={`drawer-tag-${tagRef}`}
                  >
                    <span>#{tagName}</span>
                    <button
                      type="button"
                      className={styles.tagRemoveBtn}
                      onClick={() => handleRemoveTag(tagRef)}
                      aria-label={`حذف برچسب ${tagName}`}
                      data-testid={`drawer-remove-tag-${tagRef}`}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>

            <div className={styles.addTagInputWrapper}>
              <input
                type="text"
                className={styles.addTagInput}
                placeholder="افزودن برچسب جدید…"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(newTagInput);
                  }
                }}
                data-testid="drawer-add-tag-input"
              />
              <button
                type="button"
                className={styles.btnActionSmall}
                onClick={() => handleAddTag(newTagInput)}
                data-testid="drawer-add-tag-btn"
              >
                + برچسب
              </button>
            </div>
          </div>
        </div>

        {/* Footer with Metadata */}
        <footer className={styles.drawerFooter}>
          <div className={styles.metadataText}>
            <span>ایجاد: {createdDateStr}</span>
            <span>بروزرسانی: {updatedDateStr}</span>
          </div>
        </footer>
      </aside>
    </div>
  );
}
