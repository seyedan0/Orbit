import React, { useState } from 'react';
import type { TaskEntity } from '@orbit/shared-types';
import styles from './DesktopMiddlePane.module.css';

export interface DesktopMiddlePaneProps {
  currentTitle?: string;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  tasks: TaskEntity[];
  selectedTask: TaskEntity | null;
  onSelectTask: (task: TaskEntity) => void;
  onAddTask: (title: string) => Promise<void> | void;
  onToggleCompletion: (task: TaskEntity) => Promise<void> | void;
}

export function isTaskWontDo(task: TaskEntity): boolean {
  return (
    task.isWontDo === true ||
    task.tags?.includes('wont-do') ||
    task.tags?.includes("Won't Do") ||
    false
  );
}

export function isTaskPinned(task: TaskEntity): boolean {
  return task.isPinned === true || task.tags?.includes('pinned') || false;
}

const PRIORITY_CHECKBOX_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#3b82f6',
  3: '#f59e0b',
  5: '#ef4444'
};

export function DesktopMiddlePane({
  currentTitle = 'Inbox',
  isSidebarOpen,
  onToggleSidebar,
  tasks,
  selectedTask,
  onSelectTask,
  onAddTask,
  onToggleCompletion
}: DesktopMiddlePaneProps) {
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [isCompletedAccordionOpen, setIsCompletedAccordionOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'date' | 'priority' | 'title'>('date');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // Filter tasks into active and completed/won't do
  const activeTasks = tasks.filter(
    (t) => t.completedAt == null && !isTaskWontDo(t)
  );
  const completedOrWontDoTasks = tasks.filter(
    (t) => t.completedAt != null || isTaskWontDo(t)
  );

  // Sorting
  const sortedActiveTasks = [...activeTasks].sort((a, b) => {
    const aPinned = isTaskPinned(a);
    const bPinned = isTaskPinned(b);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    if (sortOrder === 'priority') {
      return (b.priority ?? 0) - (a.priority ?? 0);
    }
    if (sortOrder === 'title') {
      return a.title.localeCompare(b.title);
    }
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });

  const handleKeyDownQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAddTitle.trim()) {
      e.preventDefault();
      const titleToCreate = quickAddTitle.trim();
      setQuickAddTitle('');
      await onAddTask(titleToCreate);
    }
  };

  return (
    <div className={styles.middlePane} data-testid="desktop-middle-pane">
      {/* Pane Header */}
      <header className={styles.paneHeader}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.toggleSidebarBtn}
            onClick={onToggleSidebar}
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label="Toggle sidebar"
            data-testid="middle-pane-sidebar-toggle"
          >
            <span className={styles.toggleIcon}>
              {isSidebarOpen ? '≡←' : '≡→'}
            </span>
          </button>
          <h2 className={styles.listTitle} data-testid="middle-pane-title">
            {currentTitle}
          </h2>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.sortWrapper}>
            <button
              type="button"
              className={styles.headerActionBtn}
              onClick={() => setIsSortMenuOpen((prev) => !prev)}
              title="Sort tasks"
              data-testid="middle-pane-sort-btn"
            >
              ⇅
            </button>
            {isSortMenuOpen && (
              <div className={styles.sortMenu}>
                <button
                  type="button"
                  className={`${styles.sortChoice} ${sortOrder === 'date' ? styles.sortActive : ''}`}
                  onClick={() => {
                    setSortOrder('date');
                    setIsSortMenuOpen(false);
                  }}
                >
                  By Date
                </button>
                <button
                  type="button"
                  className={`${styles.sortChoice} ${sortOrder === 'priority' ? styles.sortActive : ''}`}
                  onClick={() => {
                    setSortOrder('priority');
                    setIsSortMenuOpen(false);
                  }}
                >
                  By Priority
                </button>
                <button
                  type="button"
                  className={`${styles.sortChoice} ${sortOrder === 'title' ? styles.sortActive : ''}`}
                  onClick={() => {
                    setSortOrder('title');
                    setIsSortMenuOpen(false);
                  }}
                >
                  By Title
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.headerActionBtn}
            title="List options"
          >
            …
          </button>
        </div>
      </header>

      {/* Quick Add Pill Input */}
      <div className={styles.quickAddContainer}>
        <input
          type="text"
          className={styles.quickAddInput}
          placeholder="+ Add Task"
          value={quickAddTitle}
          onChange={(e) => setQuickAddTitle(e.target.value)}
          onKeyDown={handleKeyDownQuickAdd}
          dir="auto"
          data-testid="desktop-quick-add-input"
        />
      </div>

      {/* Task List Items */}
      <div className={styles.taskListScroll}>
        <div className={styles.activeTaskList}>
          {sortedActiveTasks.map((task) => {
            const isSelected = selectedTask?.id === task.id;
            const isPinned = isTaskPinned(task);
            const checklistCount = task.items ? task.items.length : 0;
            const completedChecklistCount = task.items
              ? task.items.filter((it) => it.isCompleted).length
              : 0;

            return (
              <div
                key={task.id}
                className={`${styles.taskRowCard} ${isSelected ? styles.taskRowSelected : ''}`}
                onClick={() => onSelectTask(task)}
                data-testid={`task-row-${task.id}`}
              >
                <button
                  type="button"
                  className={styles.taskCheckBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onToggleCompletion(task);
                  }}
                  title="Mark as completed"
                  aria-label="Toggle completion"
                >
                  {task.kind === 'NOTE' ? (
                    <span className={styles.noteIcon}>📄</span>
                  ) : (
                    <span
                      className={styles.checkboxIcon}
                      style={{
                        color: PRIORITY_CHECKBOX_COLORS[task.priority] ?? '#6b7280'
                      }}
                    >
                      ☐
                    </span>
                  )}
                </button>

                <div className={styles.taskContent}>
                  <div className={styles.taskTitleRow}>
                    <span className={styles.taskTitle} dir="auto">
                      {task.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {checklistCount > 0 && (
                        <span className={styles.checklistBadge}>
                          {completedChecklistCount}/{checklistCount}
                        </span>
                      )}
                      {isPinned && <span className={styles.pinnedBadge}>📌</span>}
                    </div>
                  </div>
                  <span className={styles.taskSubtitle}>
                    {task.desc ? task.desc.substring(0, 30) : '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Collapsible Completed & Won't Do Section */}
        <div className={styles.completedSection}>
          <button
            type="button"
            className={styles.accordionHeader}
            onClick={() => setIsCompletedAccordionOpen((prev) => !prev)}
            data-testid="completed-accordion-header"
          >
            <span
              className={`${styles.accordionChevron} ${isCompletedAccordionOpen ? styles.chevronRotated : ''}`}
            >
              ›
            </span>
            <span className={styles.accordionTitle}>Completed &amp; Won't Do</span>
            <span className={styles.accordionCount}>
              {completedOrWontDoTasks.length}
            </span>
          </button>

          {isCompletedAccordionOpen && (
            <div className={styles.completedList}>
              {completedOrWontDoTasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                const isWontDo = isTaskWontDo(task);
                return (
                  <div
                    key={task.id}
                    className={`${styles.taskRowCard} ${styles.taskRowCompleted} ${isSelected ? styles.taskRowSelected : ''}`}
                    onClick={() => onSelectTask(task)}
                  >
                    <button
                      type="button"
                      className={styles.taskCheckBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onToggleCompletion(task);
                      }}
                      title="Reopen task"
                    >
                      {isWontDo ? (
                        <span className={styles.wontDoIcon}>☒</span>
                      ) : (
                        <span className={styles.checkedIcon}>☑</span>
                      )}
                    </button>

                    <div className={styles.taskContent}>
                      <span className={styles.taskTitle} dir="auto">
                        {task.title}
                      </span>
                      <span className={styles.taskSubtitle}>
                        {isWontDo ? "Won't Do" : 'Completed'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
