import React, { useState } from 'react';
import type { TaskEntity, TagEntity } from '@orbit/shared-types';
import styles from './TaskContextMenu.module.css';

export interface TaskContextMenuProps {
  task: TaskEntity;
  isOpen: boolean;
  onClose: () => void;
  onAddSubtask: () => void;
  onLinkParentTask?: () => void;
  onTogglePin?: () => void;
  onMarkWontDo?: () => void;
  onToggleTag?: (tagName: string) => void;
  onUploadAttachment?: () => void;
  onStartFocus?: () => void;
  onViewActivities?: () => void;
  onSaveAsTemplate?: () => void;
  onDuplicate?: () => void;
  onCopyLink?: () => void;
  onOpenStickyNote?: () => void;
  onConvertToNote?: () => void;
  onPrint?: () => void;
  onDelete?: () => void;
  availableTags?: TagEntity[];
  position?: { top?: number; right?: number; bottom?: number; left?: number };
}

export function TaskContextMenu({
  task,
  isOpen,
  onClose,
  onAddSubtask,
  onLinkParentTask,
  onTogglePin,
  onMarkWontDo,
  onToggleTag,
  onUploadAttachment,
  onStartFocus,
  onViewActivities,
  onSaveAsTemplate,
  onDuplicate,
  onCopyLink,
  onOpenStickyNote,
  onConvertToNote,
  onPrint,
  onDelete,
  availableTags = [],
  position
}: TaskContextMenuProps) {
  const [showTagsSubmenu, setShowTagsSubmenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPinned = task.isPinned ?? task.tags?.includes('pinned') ?? false;
  const isWontDo = task.isWontDo ?? task.tags?.includes('wont-do') ?? false;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 1200);
  };

  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink();
    } else {
      const url = `${window.location.origin}/inbox?taskId=${task.id}`;
      navigator.clipboard?.writeText(url).catch(() => {});
    }
    triggerToast('Link copied to clipboard!');
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
    onClose();
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.menuContainer}
        style={{
          top: position?.top ?? 'auto',
          bottom: position?.bottom ?? '60px',
          right: position?.right ?? '16px',
          left: position?.left ?? 'auto'
        }}
        role="menu"
        aria-orientation="vertical"
        data-testid="task-context-menu"
      >
        {toastMessage && (
          <div className={styles.toastNotice}>{toastMessage}</div>
        )}

        {/* Group 1: Structure, Status, Attachment & Focus */}
        <div className={styles.menuGroup}>
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onAddSubtask();
              onClose();
            }}
          >
            <span className={styles.itemIcon}>⑂</span>
            <span className={styles.itemLabel}>Add Subtask</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onLinkParentTask?.();
              triggerToast('Parent task link modal opened');
            }}
          >
            <span className={styles.itemIcon}>🔗</span>
            <span className={styles.itemLabel}>Link Parent Task</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onTogglePin?.();
              triggerToast(isPinned ? 'Unpinned task' : 'Pinned task');
            }}
          >
            <span className={styles.itemIcon}>📌</span>
            <span className={styles.itemLabel}>{isPinned ? 'Unpin' : 'Pin'}</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onMarkWontDo?.();
              triggerToast(isWontDo ? "Cleared Won't Do" : "Marked as Won't Do");
            }}
          >
            <span className={styles.itemIcon}>☒</span>
            <span className={styles.itemLabel}>{isWontDo ? "Clear Won't Do" : "Won't Do"}</span>
          </button>

          <div
            className={styles.menuItemWithSubmenu}
            onMouseEnter={() => setShowTagsSubmenu(true)}
            onMouseLeave={() => setShowTagsSubmenu(false)}
          >
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => setShowTagsSubmenu((prev) => !prev)}
            >
              <span className={styles.itemIcon}>🏷️</span>
              <span className={styles.itemLabel}>Tags</span>
              <span className={styles.arrowIcon}>›</span>
            </button>
            {showTagsSubmenu && (
              <div className={styles.tagsSubmenu}>
                {availableTags.length > 0 ? (
                  availableTags.map((tag) => {
                    const hasTag = task.tags?.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={styles.tagSubItem}
                        onClick={() => onToggleTag?.(tag.name)}
                      >
                        <span
                          className={styles.tagDot}
                          style={{ backgroundColor: tag.color || '#10b981' }}
                        />
                        <span className={styles.tagName}>{tag.name}</span>
                        {hasTag && <span className={styles.checkMark}>✓</span>}
                      </button>
                    );
                  })
                ) : (
                  <div className={styles.emptyTagsNotice}>No tags available</div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onUploadAttachment?.();
              triggerToast('Attachment upload opened');
            }}
          >
            <span className={styles.itemIcon}>📎</span>
            <span className={styles.itemLabel}>Upload Attachment</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onStartFocus?.();
              onClose();
            }}
          >
            <span className={styles.itemIcon}>🎯</span>
            <span className={styles.itemLabel}>Start Focus</span>
            <span className={styles.arrowIcon}>›</span>
          </button>
        </div>

        <div className={styles.menuDivider} />

        {/* Group 2: History, Template, Sharing & Conversion */}
        <div className={styles.menuGroup}>
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onViewActivities?.();
              triggerToast('Activity history displayed');
            }}
          >
            <span className={styles.itemIcon}>📋</span>
            <span className={styles.itemLabel}>Task Activities</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onSaveAsTemplate?.();
              triggerToast('Saved as reusable template!');
            }}
          >
            <span className={styles.itemIcon}>📄</span>
            <span className={styles.itemLabel}>Save as Template</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onDuplicate?.();
              triggerToast('Task duplicated successfully!');
            }}
          >
            <span className={styles.itemIcon}>❐</span>
            <span className={styles.itemLabel}>Duplicate</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={handleCopyLink}
          >
            <span className={styles.itemIcon}>🔗</span>
            <span className={styles.itemLabel}>Copy Link</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onOpenStickyNote?.();
              triggerToast('Opened as Sticky Note!');
            }}
          >
            <span className={styles.itemIcon}>🗈</span>
            <span className={styles.itemLabel}>Open as Sticky Note</span>
          </button>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              onConvertToNote?.();
              triggerToast(task.kind === 'NOTE' ? 'Converted to Task' : 'Converted to Note');
            }}
          >
            <span className={styles.itemIcon}>⇄</span>
            <span className={styles.itemLabel}>
              {task.kind === 'NOTE' ? 'Convert to Task' : 'Convert to Note'}
            </span>
          </button>
        </div>

        <div className={styles.menuDivider} />

        {/* Group 3: Print & Delete */}
        <div className={styles.menuGroup}>
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={handlePrint}
          >
            <span className={styles.itemIcon}>🖨️</span>
            <span className={styles.itemLabel}>Print</span>
          </button>

          <button
            type="button"
            className={`${styles.menuItem} ${styles.deleteItem}`}
            role="menuitem"
            onClick={() => {
              onDelete?.();
              onClose();
            }}
          >
            <span className={styles.itemIcon}>🗑️</span>
            <span className={styles.itemLabel}>Delete</span>
          </button>
        </div>
      </div>
    </>
  );
}
