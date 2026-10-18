import React, { useState, useEffect, useRef } from 'react';
import type { TaskEntity, SubTaskItem, TagEntity, TaskPriority } from '@orbit/shared-types';
import { useStore } from '../../../core/storage/store-context';
import { useSession } from '../../../core/auth/session-context';
import {
  updateTaskDetails,
  updateTaskSubtasks,
  completeTask,
  reopenTask,
  deleteTask
} from '../services/task-service';
import { DualCalendarPopover } from './DualCalendarPopover';
import { TaskContextMenu } from './TaskContextMenu';
import styles from './DesktopTaskEditor.module.css';

export interface DesktopTaskEditorProps {
  task: TaskEntity | null;
  onTaskUpdated?: (updatedTask: TaskEntity) => void;
  onTaskDeleted?: (deletedTask: TaskEntity) => void;
  onStartFocus?: (task: TaskEntity) => void;
  availableTags?: TagEntity[];
  currentListName?: string;
  onMoveToList?: (task: TaskEntity, listId: string) => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  0: '#9ca3af', // None
  1: '#3b82f6', // Low
  3: '#f59e0b', // Medium
  5: '#ef4444'  // High
};

export function DesktopTaskEditor({
  task,
  onTaskUpdated,
  onTaskDeleted,
  onStartFocus,
  availableTags = [],
  currentListName = 'Inbox',
  onMoveToList
}: DesktopTaskEditorProps) {
  const store = useStore();
  const { session } = useSession();

  // Local state for live reactive editing
  const [currentTask, setCurrentTask] = useState<TaskEntity | null>(task);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.desc ?? task?.content ?? '');
  const [checklistItems, setChecklistItems] = useState<SubTaskItem[]>(task?.items ?? []);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [isChecklistMode, setIsChecklistMode] = useState(true);

  // Popovers & menus
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Array<{ id: string; text: string; date: string }>>([
    { id: '1', text: 'بررسی نیازمندی‌های اولیه انجام شد.', date: '10:15' }
  ]);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when selected task changes
  useEffect(() => {
    setCurrentTask(task);
    setTitle(task?.title ?? '');
    setDescription(task?.desc ?? task?.content ?? '');
    setChecklistItems(task?.items ?? []);
    setNewChecklistTitle('');
    setIsCalendarOpen(false);
    setIsContextMenuOpen(false);
    setIsFolderMenuOpen(false);
  }, [task]);

  if (!currentTask) {
    // Empty state: empty pane showing the global winter background
    return (
      <div className={styles.emptyEditorPane} data-testid="empty-task-editor">
        {/* Subtle empty state placeholder or completely clean backdrop */}
      </div>
    );
  }

  const isCompleted = currentTask.completedAt != null;

  // Persist task updates atomically with optimistic UI
  const persistChanges = async (updates: Parameters<typeof updateTaskDetails>[2]) => {
    if (!session || !currentTask) return;
    try {
      const updated = await updateTaskDetails(store, currentTask.id, updates, {
        userId: session.userId,
        timeZone: currentTask.timeZone
      });
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    } catch {
      // Revert if error
    }
  };

  // Title changes
  const handleTitleBlur = () => {
    if (title.trim() && title !== currentTask.title) {
      void persistChanges({ title: title.trim() });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Description changes
  const handleDescriptionBlur = () => {
    const currentDesc = currentTask.desc ?? currentTask.content ?? '';
    if (description !== currentDesc) {
      void persistChanges({ desc: description });
    }
  };

  // Priority toggle (cycles 0 -> 1 -> 3 -> 5 -> 0)
  const handlePriorityToggle = () => {
    const priorityCycle: Record<TaskPriority, TaskPriority> = {
      0: 1,
      1: 3,
      3: 5,
      5: 0
    };
    const nextPriority = priorityCycle[currentTask.priority] ?? 0;
    void persistChanges({ priority: nextPriority });
  };

  // Toggle Completion
  const handleToggleCompletion = async () => {
    if (!session || !currentTask) return;
    try {
      if (isCompleted) {
        const reopened = await reopenTask(currentTask.id, {
          store,
          userId: session.userId
        });
        setCurrentTask(reopened);
        onTaskUpdated?.(reopened);
      } else {
        const completed = await completeTask(currentTask.id, {
          store,
          userId: session.userId
        });
        setCurrentTask(completed);
        onTaskUpdated?.(completed);
      }
    } catch {
      // ignore
    }
  };

  // Date selection from DualCalendarPopover
  const handleDateSave = (dateIso: string | null) => {
    void persistChanges({ dueDate: dateIso });
  };

  // Checklist items handling
  const handleAddChecklistItem = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newChecklistTitle.trim()) {
      e.preventDefault();
      const newItem: SubTaskItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: newChecklistTitle.trim(),
        isCompleted: false,
        order: checklistItems.length
      };
      const updatedList = [...checklistItems, newItem];
      setChecklistItems(updatedList);
      setNewChecklistTitle('');

      if (session) {
        const updated = await updateTaskSubtasks(store, currentTask.id, updatedList, {
          userId: session.userId,
          timeZone: currentTask.timeZone
        });
        setCurrentTask(updated);
        onTaskUpdated?.(updated);
      }
    }
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    const updatedList = checklistItems.map((item) =>
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );
    setChecklistItems(updatedList);

    if (session) {
      const updated = await updateTaskSubtasks(store, currentTask.id, updatedList, {
        userId: session.userId,
        timeZone: currentTask.timeZone
      });
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    const updatedList = checklistItems.filter((item) => item.id !== itemId);
    setChecklistItems(updatedList);

    if (session) {
      const updated = await updateTaskSubtasks(store, currentTask.id, updatedList, {
        userId: session.userId,
        timeZone: currentTask.timeZone
      });
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    }
  };

  const handleUpdateChecklistTitle = async (itemId: string, newTitle: string) => {
    const updatedList = checklistItems.map((item) =>
      item.id === itemId ? { ...item, title: newTitle } : item
    );
    setChecklistItems(updatedList);

    if (session) {
      const updated = await updateTaskSubtasks(store, currentTask.id, updatedList, {
        userId: session.userId,
        timeZone: currentTask.timeZone
      });
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    }
  };

  // Format date label for top toolbar
  const dateLabel = currentTask.dueDate
    ? new Date(currentTask.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    : 'Date and Reminder';

  return (
    <div className={styles.editorPane} data-testid="desktop-task-editor">
      {/* Top Detail Header */}
      <header className={styles.topToolbar}>
        <div className={styles.toolbarLeft}>
          <button
            type="button"
            className={styles.statusToggleBtn}
            onClick={handleToggleCompletion}
            title={isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
            aria-label="Toggle task completion"
          >
            {isCompleted ? (
              <span className={styles.statusChecked}>☑</span>
            ) : currentTask.kind === 'NOTE' ? (
              <span className={styles.statusNote}>📝</span>
            ) : (
              <span className={styles.statusBox}>☐</span>
            )}
          </button>

          <div className={styles.verticalDivider} />

          <button
            type="button"
            className={styles.datePickerBtn}
            onClick={() => setIsCalendarOpen(true)}
            data-testid="date-and-reminder-btn"
          >
            <span className={styles.calendarIcon}>📅</span>
            <span className={styles.dateLabel}>{dateLabel}</span>
          </button>
        </div>

        <div className={styles.toolbarRight}>
          <button
            type="button"
            className={styles.priorityFlagBtn}
            onClick={handlePriorityToggle}
            title={`Priority: ${currentTask.priority}`}
            style={{ color: PRIORITY_COLORS[currentTask.priority] }}
            data-testid="editor-priority-flag"
          >
            ⚑
          </button>
        </div>
      </header>

      {/* Body & Subtask Checklist */}
      <div className={styles.editorBody}>
        {/* Title row */}
        <div className={styles.titleRow}>
          <input
            ref={titleInputRef}
            type="text"
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            placeholder="Task Title"
            dir="auto"
            data-testid="editor-title-input"
          />
          <button
            type="button"
            className={`${styles.checklistModeBtn} ${isChecklistMode ? styles.checklistActive : ''}`}
            onClick={() => setIsChecklistMode((prev) => !prev)}
            title="Toggle checklist view"
            aria-label="Toggle checklist view"
          >
            ☰
          </button>
        </div>

        {/* Description textarea */}
        <textarea
          className={styles.descriptionInput}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="Description"
          rows={3}
          dir="auto"
          data-testid="editor-desc-input"
        />

        {/* Subtask Checklist Items */}
        {isChecklistMode && (
          <div className={styles.checklistSection}>
            {/* Quick add checklist item row */}
            <div className={styles.newChecklistRow}>
              <span className={styles.emptyCheckbox}>☐</span>
              <input
                type="text"
                className={styles.newChecklistInput}
                placeholder="Press 'Enter' to add list item"
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                onKeyDown={handleAddChecklistItem}
                dir="auto"
                data-testid="add-checklist-item-input"
              />
            </div>

            <div className={styles.checklistDivider} />

            {/* Checklist items list */}
            <div className={styles.checklistItemsList}>
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.checklistItemRow} ${item.isCompleted ? styles.itemCompleted : ''}`}
                >
                  <button
                    type="button"
                    className={styles.itemCheckboxBtn}
                    onClick={() => void handleToggleChecklistItem(item.id)}
                  >
                    {item.isCompleted ? '☑' : '☐'}
                  </button>
                  <input
                    type="text"
                    className={styles.itemTitleInput}
                    value={item.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setChecklistItems((list) =>
                        list.map((it) => (it.id === item.id ? { ...it, title: val } : it))
                      );
                    }}
                    onBlur={(e) => void handleUpdateChecklistTitle(item.id, e.target.value)}
                    dir="auto"
                  />
                  <button
                    type="button"
                    className={styles.itemDeleteBtn}
                    onClick={() => void handleDeleteChecklistItem(item.id)}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inline Comments Section */}
        {isCommentsOpen && (
          <div className={styles.commentsSection}>
            <div className={styles.commentsHeader}>
              <span>Comments ({comments.length})</span>
              <button
                type="button"
                className={styles.closeCommentsBtn}
                onClick={() => setIsCommentsOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.commentsList}>
              {comments.map((c) => (
                <div key={c.id} className={styles.commentItem}>
                  <p className={styles.commentText}>{c.text}</p>
                  <span className={styles.commentDate}>{c.date}</span>
                </div>
              ))}
            </div>
            <div className={styles.commentInputRow}>
              <input
                type="text"
                className={styles.commentInput}
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    setComments((prev) => [
                      ...prev,
                      {
                        id: String(Date.now()),
                        text: commentText.trim(),
                        date: 'Just now'
                      }
                    ]);
                    setCommentText('');
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Detail Footer */}
      <footer className={styles.bottomFooter}>
        <div className={styles.footerLeft}>
          <button
            type="button"
            className={styles.folderBtn}
            onClick={() => setIsFolderMenuOpen((prev) => !prev)}
            data-testid="editor-folder-btn"
          >
            <span className={styles.folderIcon}>📁</span>
            <span className={styles.folderName}>{currentListName}</span>
          </button>
          {isFolderMenuOpen && (
            <div className={styles.folderDropdown}>
              {['Inbox', 'My 2025 Goals', 'Work', 'Personal'].map((listName) => (
                <button
                  key={listName}
                  type="button"
                  className={styles.folderChoice}
                  onClick={() => {
                    onMoveToList?.(currentTask, listName.toLowerCase().replace(/\s+/g, '-'));
                    setIsFolderMenuOpen(false);
                  }}
                >
                  {listName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footerRight}>
          <button
            type="button"
            className={styles.footerActionBtn}
            title="Formatting"
            onClick={() => {
              // Quick markdown formatting helper
              setDescription((prev) => prev ? `**${prev}**` : '');
            }}
          >
            <u>A</u>
          </button>

          <button
            type="button"
            className={styles.footerActionBtn}
            title="Comments"
            onClick={() => setIsCommentsOpen((prev) => !prev)}
          >
            💬
          </button>

          <button
            type="button"
            className={styles.footerActionBtn}
            title="More Options"
            onClick={() => setIsContextMenuOpen(true)}
            data-testid="editor-more-options-btn"
          >
            …
          </button>
        </div>
      </footer>

      {/* Dual Calendar Popover */}
      <DualCalendarPopover
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={currentTask.dueDate ?? null}
        onSave={handleDateSave}
      />

      {/* Task Context Menu */}
      <TaskContextMenu
        task={currentTask}
        isOpen={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
        onAddSubtask={() => {
          setIsChecklistMode(true);
          const input = document.querySelector<HTMLInputElement>(
            '[data-testid="add-checklist-item-input"]'
          );
          input?.focus();
        }}
        onTogglePin={() => {
          const currentTags = currentTask.tags ?? [];
          const nextTags = currentTags.includes('pinned')
            ? currentTags.filter((t) => t !== 'pinned')
            : [...currentTags, 'pinned'];
          void persistChanges({ tags: nextTags });
        }}
        onMarkWontDo={() => {
          const currentTags = currentTask.tags ?? [];
          const nextTags = currentTags.includes('wont-do')
            ? currentTags.filter((t) => t !== 'wont-do')
            : [...currentTags, 'wont-do'];
          void persistChanges({ tags: nextTags });
        }}
        onToggleTag={(tagName) => {
          const currentTags = currentTask.tags ?? [];
          const nextTags = currentTags.includes(tagName)
            ? currentTags.filter((t) => t !== tagName)
            : [...currentTags, tagName];
          void persistChanges({ tags: nextTags });
        }}
        onStartFocus={() => {
          onStartFocus?.(currentTask);
        }}
        onConvertToNote={async () => {
          const nextKind = currentTask.kind === 'NOTE' ? 'TASK' : 'NOTE';
          const updated: TaskEntity = {
            ...currentTask,
            kind: nextKind,
            updatedAt: new Date().toISOString()
          };
          await store.saveTask(updated);
          setCurrentTask(updated);
          onTaskUpdated?.(updated);
        }}
        onDelete={() => {
          if (session) {
            void deleteTask(currentTask.id, { store, userId: session.userId });
            onTaskDeleted?.(currentTask);
          }
        }}
        availableTags={availableTags}
      />
    </div>
  );
}
