import React, { useState, useEffect, useMemo } from 'react';
import type { TaskEntity } from '@orbit/shared-types';
import type { AtomicTaskStore } from '@orbit/sync-engine';
import { detectCircularParent } from '../services/task-service';
import styles from './LinkParentTaskModal.module.css';

export interface LinkParentTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTask: TaskEntity;
  store: AtomicTaskStore;
  onSelectParent: (parentId: string | null) => void;
}

export function LinkParentTaskModal({
  isOpen,
  onClose,
  currentTask,
  store,
  onSelectParent
}: LinkParentTaskModalProps) {
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [circularMap, setCircularMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    void store.listTasks().then(async (all: TaskEntity[]) => {
      if (!mounted) return;
      const activeTasks = all.filter((t) => t.deletedAt == null);
      setTasks(activeTasks);

      // Check cycles for candidate parents
      const checkResults: Record<string, boolean> = {};
      for (const t of activeTasks) {
        if (t.id === currentTask.id) {
          checkResults[t.id] = true;
        } else {
          checkResults[t.id] = await detectCircularParent(store, currentTask.id, t.id);
        }
      }
      if (mounted) {
        setCircularMap(checkResults);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen, store, currentTask.id]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (!q) return true;
      return t.title.toLowerCase().includes(q);
    });
  }, [tasks, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose} aria-modal="true" role="dialog">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <span>🔗</span> Link Parent Task
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              dir="auto"
            />
          </div>

          <div className={styles.taskList}>
            {filteredTasks.length === 0 ? (
              <div className={styles.emptyNotice}>No tasks found</div>
            ) : (
              filteredTasks.map((t) => {
                const isCurrentParent = currentTask.parentTaskId === t.id;
                const isSelf = t.id === currentTask.id;
                const isCircular = circularMap[t.id] ?? false;
                const isDisabled = isSelf || isCircular;

                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.taskItem} ${isDisabled ? styles.taskItemDisabled : ''}`}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        onSelectParent(t.id);
                        onClose();
                      }
                    }}
                  >
                    <div className={styles.taskItemLeft}>
                      <span className={styles.taskItemTitle}>{t.title}</span>
                    </div>

                    <div>
                      {isCurrentParent && (
                        <span className={styles.currentBadge}>Current Parent</span>
                      )}
                      {isCircular && !isSelf && (
                        <span className={styles.circularWarning}>Circular dependency</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          {currentTask.parentTaskId ? (
            <button
              type="button"
              className={styles.unlinkBtn}
              onClick={() => {
                onSelectParent(null);
                onClose();
              }}
            >
              Unlink Parent Task
            </button>
          ) : null}

          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
