import { useState } from 'react';
import type { TaskPriority } from '@orbit/shared-types';
import styles from './BulkActionBar.module.css';

export interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkComplete?: () => void;
  onBulkDelete?: () => void;
  onBulkPriority?: (priority: TaskPriority) => void;
  onBulkAddTag?: (tag: string) => void;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkComplete,
  onBulkDelete,
  onBulkPriority,
  onBulkAddTag
}: BulkActionBarProps) {
  const [isTagPromptOpen, setIsTagPromptOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');

  if (selectedCount <= 0) return null;

  return (
    <div
      className={styles.floatingBar}
      data-testid="bulk-action-bar"
      role="region"
      aria-label="عملیات گروهی"
    >
      <span className={styles.countText} data-testid="bulk-selected-count">
        {selectedCount} مورد انتخاب شده
      </span>

      <div className={styles.actionsGroup}>
        {onBulkComplete && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onBulkComplete}
            data-testid="bulk-complete-btn"
          >
            ✓ تکمیل همه
          </button>
        )}

        {onBulkPriority && (
          <select
            className={styles.actionBtn}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value !== '') {
                onBulkPriority(Number(e.target.value) as TaskPriority);
                e.target.value = '';
              }
            }}
            data-testid="bulk-priority-select"
            aria-label="تغییر اولویت گروهی"
          >
            <option value="" disabled>
              تغییر اولویت...
            </option>
            <option value="5">P5 (فوری)</option>
            <option value="3">P3 (مهم)</option>
            <option value="1">P1 (عادی)</option>
            <option value="0">P0 (بدون اولویت)</option>
          </select>
        )}

        {onBulkAddTag && !isTagPromptOpen && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setIsTagPromptOpen(true)}
            data-testid="bulk-add-tag-prompt-btn"
          >
            + برچسب
          </button>
        )}

        {isTagPromptOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="text"
              placeholder="نام برچسب..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              style={{
                padding: '0.3rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid #475569',
                background: '#0f172a',
                color: '#fff',
                fontSize: '0.8rem'
              }}
              data-testid="bulk-tag-input"
            />
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => {
                if (tagInput.trim()) {
                  onBulkAddTag?.(tagInput.trim());
                  setTagInput('');
                  setIsTagPromptOpen(false);
                }
              }}
              data-testid="bulk-save-tag-btn"
            >
              افزودن
            </button>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setTagInput('');
                setIsTagPromptOpen(false);
              }}
            >
              ✕
            </button>
          </div>
        )}

        {onBulkDelete && (
          <button
            type="button"
            className={styles.actionBtnDanger}
            onClick={onBulkDelete}
            data-testid="bulk-delete-btn"
          >
            حذف
          </button>
        )}

        <button
          type="button"
          className={styles.clearBtn}
          onClick={onClearSelection}
          data-testid="bulk-clear-selection-btn"
        >
          لغو
        </button>
      </div>
    </div>
  );
}
