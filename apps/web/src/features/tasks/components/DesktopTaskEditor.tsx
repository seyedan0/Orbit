import React, { useState, useEffect, useRef } from 'react';
import type {
  TaskEntity,
  SubTaskItem,
  TagEntity,
  TaskPriority,
  TaskComment
} from '@orbit/shared-types';
import { useStore } from '../../../core/storage/store-context';
import { useSession } from '../../../core/auth/session-context';
import {
  updateTaskDetails,
  updateTaskSubtasks,
  completeTask,
  reopenTask,
  deleteTask,
  duplicateTask,
  createSubtask,
  listSubtasks
} from '../services/task-service';
import { DualCalendarPopover } from './DualCalendarPopover';
import { TaskContextMenu } from './TaskContextMenu';
import { LinkParentTaskModal } from './LinkParentTaskModal';
import styles from './DesktopTaskEditor.module.css';

export interface DesktopTaskEditorProps {
  task: TaskEntity | null;
  onTaskUpdated?: (updatedTask: TaskEntity) => void;
  onTaskDeleted?: (deletedTask: TaskEntity) => void;
  onStartFocus?: (task: TaskEntity) => void;
  availableTags?: TagEntity[];
  currentListName?: string;
  onMoveToList?: (task: TaskEntity, listId: string) => void;
  onSelectTask?: (task: TaskEntity) => void;
  parentTask?: TaskEntity | null | undefined;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  0: '#9ca3af', // None
  1: '#3b82f6', // Low
  3: '#f59e0b', // Medium
  5: '#ef4444'  // High
};

export function DesktopTaskEditor({
  task,
  parentTask: initialParentTask = null,
  onTaskUpdated,
  onTaskDeleted,
  onStartFocus,
  availableTags = [],
  currentListName = 'Inbox',
  onMoveToList,
  onSelectTask
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

  // Hierarchical subtasks & parent
  const [subtasks, setSubtasks] = useState<TaskEntity[]>([]);
  const [parentTask, setParentTask] = useState<TaskEntity | null>(initialParentTask ?? null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isLinkParentModalOpen, setIsLinkParentModalOpen] = useState(false);

  // Popovers & menus
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Checklist input refs for keyboard navigation
  const checklistInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingFocusIdRef = useRef<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when selected task changes
  useEffect(() => {
    setCurrentTask(task);
    setTitle(task?.title ?? '');
    setDescription(task?.desc ?? task?.content ?? '');
    setChecklistItems(task?.items ?? []);
    setNewChecklistTitle('');
    setNewSubtaskTitle('');
    setIsCalendarOpen(false);
    setIsContextMenuOpen(false);
    setIsFolderMenuOpen(false);
    setIsLinkParentModalOpen(false);

    if (task) {
      void listSubtasks(store, task.id).then(setSubtasks);
      if (task.parentTaskId) {
        void store.getTask(task.parentTaskId).then((p) => setParentTask(p ?? null));
      } else {
        setParentTask(null);
      }
    } else {
      setSubtasks([]);
      setParentTask(null);
    }
  }, [task, store]);

  // Handle focus transition for checklist items
  useEffect(() => {
    if (pendingFocusIdRef.current) {
      const el = checklistInputRefs.current[pendingFocusIdRef.current];
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
      pendingFocusIdRef.current = null;
    }
  }, [checklistItems]);

  if (!currentTask) {
    return (
      <div className={styles.emptyEditorPane} data-testid="empty-task-editor">
        {/* Clean empty backdrop */}
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

  // Date & Duration selection from DualCalendarPopover
  const handleDateSave = (
    dateIso: string | null,
    options?: {
      startDate?: string | null | undefined;
      endDate?: string | null | undefined;
      time?: string | undefined;
      reminder?: string | undefined;
      repeat?: string | undefined;
      isAllDay?: boolean | undefined;
      mode?: 'DATE' | 'DURATION' | undefined;
    }
  ) => {
    if (!options) {
      void persistChanges({ dueDate: dateIso });
      return;
    }
    void persistChanges({
      dueDate: dateIso,
      startDate: options.startDate ?? null,
      endDate: options.endDate ?? null,
      isAllDay: options.isAllDay ?? false,
      scheduleMode: options.mode ?? 'DATE',
      repeatFlag: options.repeat && options.repeat !== 'None' ? options.repeat : undefined
    });
  };

  // Toggle checklist mode / Description converter
  const handleToggleChecklistMode = () => {
    if (!isChecklistMode) {
      if (description.trim() && checklistItems.length === 0) {
        const lines = description.split('\n').filter((l) => l.trim() !== '');
        const newItems: SubTaskItem[] = lines.map((line, idx) => {
          const isDone = /^-\s*\[[xX]\]/.test(line);
          const cleaned = line.replace(/^-\s*\[([ xX])\]\s*/, '').trim();
          return {
            id: `item-${Date.now()}-${idx}`,
            title: cleaned,
            isCompleted: isDone,
            order: idx
          };
        });
        setChecklistItems(newItems);
        if (session) {
          void updateTaskSubtasks(store, currentTask.id, newItems, {
            userId: session.userId,
            timeZone: currentTask.timeZone
          }).then((up) => {
            setCurrentTask(up);
            onTaskUpdated?.(up);
          });
        }
      }
      setIsChecklistMode(true);
    } else {
      if (checklistItems.length > 0 && !description.trim()) {
        const md = checklistItems
          .map((it) => `- [${it.isCompleted ? 'x' : ' '}] ${it.title}`)
          .join('\n');
        setDescription(md);
        void persistChanges({ desc: md });
      }
      setIsChecklistMode(false);
    }
  };

  // Checklist items handling
  const handleAddChecklistItem = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newChecklistTitle.trim()) {
      e.preventDefault();
      const newId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newItem: SubTaskItem = {
        id: newId,
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

  const handleChecklistItemKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>,
    itemId: string,
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newItem: SubTaskItem = {
        id: newId,
        title: '',
        isCompleted: false,
        order: index + 1
      };
      const updatedList = [
        ...checklistItems.slice(0, index + 1),
        newItem,
        ...checklistItems.slice(index + 1).map((it, idx) => ({ ...it, order: index + 2 + idx }))
      ];
      setChecklistItems(updatedList);
      pendingFocusIdRef.current = newId;

      if (session) {
        const updated = await updateTaskSubtasks(store, currentTask.id, updatedList, {
          userId: session.userId,
          timeZone: currentTask.timeZone
        });
        setCurrentTask(updated);
        onTaskUpdated?.(updated);
      }
    } else if (e.key === 'Backspace' && checklistItems[index]?.title === '') {
      e.preventDefault();
      const prevItem = checklistItems[index - 1];
      const updatedList = checklistItems.filter((it) => it.id !== itemId);
      setChecklistItems(updatedList);

      if (prevItem) {
        pendingFocusIdRef.current = prevItem.id;
      } else {
        titleInputRef.current?.focus();
      }

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

  // Hierarchical Subtasks handling
  const handleAddSubtaskKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSubtaskTitle.trim() && session) {
      e.preventDefault();
      try {
        const created = await createSubtask(
          store,
          currentTask.id,
          {
            title: newSubtaskTitle.trim(),
            projectId: currentTask.projectId
          },
          { store, userId: session.userId, timeZone: currentTask.timeZone }
        );
        setSubtasks((prev) => [...prev, created]);
        setNewSubtaskTitle('');
      } catch {
        // ignore
      }
    }
  };

  const handleToggleSubtask = async (sub: TaskEntity) => {
    if (!session) return;
    const isSubCompleted = sub.completedAt != null;
    const updated = isSubCompleted
      ? await reopenTask(sub.id, { store, userId: session.userId })
      : await completeTask(sub.id, { store, userId: session.userId });
    setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
  };

  const handleSelectParent = async (parentId: string | null) => {
    await persistChanges({ parentTaskId: parentId });
    if (parentId) {
      const p = await store.getTask(parentId);
      setParentTask(p ?? null);
    } else {
      setParentTask(null);
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

          <div className={styles.datePickerContainer}>
            <button
              type="button"
              className={styles.datePickerBtn}
              onClick={() => setIsCalendarOpen((prev) => !prev)}
              data-testid="date-and-reminder-btn"
              aria-haspopup="dialog"
              aria-expanded={isCalendarOpen}
            >
              <span className={styles.calendarIcon}>📅</span>
              <span className={styles.dateLabel}>{dateLabel}</span>
            </button>

            {isCalendarOpen && (
              <DualCalendarPopover
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                selectedDate={currentTask.dueDate ?? null}
                startDate={currentTask.startDate ?? null}
                endDate={currentTask.endDate ?? null}
                isAllDay={currentTask.isAllDay ?? false}
                onSave={handleDateSave}
              />
            )}
          </div>
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
        {/* Parent Task Link Badge */}
        {parentTask && (
          <div className={styles.parentBadgeRow}>
            <span>Parent task:</span>
            <button
              type="button"
              className={styles.parentBadgeLink}
              onClick={() => onSelectTask?.(parentTask)}
            >
              🔗 {parentTask.title}
            </button>
          </div>
        )}

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
            onClick={handleToggleChecklistMode}
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
              {checklistItems.map((item, index) => (
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
                    ref={(el) => {
                      checklistInputRefs.current[item.id] = el;
                    }}
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
                    onKeyDown={(e) => void handleChecklistItemKeyDown(e, item.id, index)}
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

        {/* Hierarchical Subtasks Section */}
        <div className={styles.subtasksSection}>
          <div className={styles.subtasksHeader}>
            <span>Subtasks {subtasks.length > 0 && `(${subtasks.length})`}</span>
          </div>

          <div className={styles.subtasksList}>
            {subtasks.map((sub) => {
              const isSubDone = sub.completedAt != null;
              return (
                <div key={sub.id} className={styles.subtaskRow}>
                  <div className={styles.subtaskRowLeft}>
                    <button
                      type="button"
                      className={styles.itemCheckboxBtn}
                      onClick={() => void handleToggleSubtask(sub)}
                    >
                      {isSubDone ? '☑' : '☐'}
                    </button>
                    <span
                      className={`${styles.subtaskRowTitle} ${isSubDone ? styles.subtaskCompleted : ''}`}
                      onClick={() => onSelectTask?.(sub)}
                    >
                      {sub.title}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className={styles.addSubtaskRow}>
              <span className={styles.emptyCheckbox}>+</span>
              <input
                type="text"
                className={styles.addSubtaskInput}
                placeholder="Add subtask and press Enter"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={handleAddSubtaskKeyDown}
                dir="auto"
              />
            </div>
          </div>
        </div>

        {/* Inline Comments Section */}
        {isCommentsOpen && (
          <div className={styles.commentsSection}>
            <div className={styles.commentsHeader}>
              <span>Comments ({(currentTask.comments ?? []).length})</span>
              <button
                type="button"
                className={styles.closeCommentsBtn}
                onClick={() => setIsCommentsOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.commentsList}>
              {(currentTask.comments ?? []).map((c) => (
                <div key={c.id} className={styles.commentItem}>
                  <p className={styles.commentText}>{c.text}</p>
                  <span className={styles.commentDate}>
                    {new Date(c.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
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
                    const newComment: TaskComment = {
                      id: `comment-${Date.now()}`,
                      authorName: session?.userId ?? 'User',
                      text: commentText.trim(),
                      createdAt: new Date().toISOString()
                    };
                    const updatedComments = [...(currentTask.comments ?? []), newComment];
                    void persistChanges({ comments: updatedComments });
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
              setDescription((prev) => (prev ? `**${prev}**` : ''));
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
        onLinkParentTask={() => {
          setIsLinkParentModalOpen(true);
        }}
        onTogglePin={() => {
          const nextPinned = !currentTask.isPinned;
          const currentTags = currentTask.tags ?? [];
          const nextTags = nextPinned
            ? currentTags.includes('pinned')
              ? currentTags
              : [...currentTags, 'pinned']
            : currentTags.filter((t) => t !== 'pinned');
          void persistChanges({ isPinned: nextPinned, tags: nextTags });
        }}
        onMarkWontDo={() => {
          const nextWontDo = !currentTask.isWontDo;
          const currentTags = currentTask.tags ?? [];
          const nextTags = nextWontDo
            ? currentTags.includes('wont-do')
              ? currentTags
              : [...currentTags, 'wont-do']
            : currentTags.filter((t) => t !== 'wont-do');
          void persistChanges({ isWontDo: nextWontDo, tags: nextTags });
        }}
        onDuplicate={async () => {
          if (session) {
            const dup = await duplicateTask(store, currentTask.id, { store, userId: session.userId });
            onTaskUpdated?.(dup);
          }
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

      {/* Link Parent Task Modal */}
      <LinkParentTaskModal
        isOpen={isLinkParentModalOpen}
        onClose={() => setIsLinkParentModalOpen(false)}
        currentTask={currentTask}
        store={store}
        onSelectParent={handleSelectParent}
      />
    </div>
  );
}
