import { useState, useEffect, type FormEvent } from 'react';
import type {
  FilterFieldOperator,
  FilterRule,
  FilterTargetField,
  LogicalOperator,
  RelativeDateRange,
  SmartFilterEntity
} from '@orbit/shared-types';
import { useSession } from '../../../core/auth/session-context';
import { useStore } from '../../../core/storage/store-context';
import {
  createSmartFilter,
  updateSmartFilter,
  FilterValidationError
} from '../services/filter-service';
import { PRESET_TAG_COLORS } from '../../tags/services/tag-service';
import styles from './SmartFilterModal.module.css';

export interface SmartFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (filter: SmartFilterEntity) => void;
  initialFilter?: SmartFilterEntity | null;
}

interface EditableRuleRow {
  id: string;
  field: FilterTargetField;
  operator: FilterFieldOperator;
  value: string;
}

const FIELD_OPTIONS: { value: FilterTargetField; label: string }[] = [
  { value: 'priority', label: 'اولویت (Priority)' },
  { value: 'dueDate', label: 'تاریخ سررسید (Due Date)' },
  { value: 'tags', label: 'برچسب‌ها (Tags)' },
  { value: 'isCompleted', label: 'وضعیت تکمیل (Is Completed)' },
  { value: 'kind', label: 'نوع موجودیت (Kind)' },
  { value: 'projectId', label: 'شناسه پروژه (Project)' }
];

const OPERATORS_BY_FIELD: Record<string, { value: FilterFieldOperator; label: string }[]> = {
  priority: [
    { value: 'eq', label: 'برابر با (=)' },
    { value: 'neq', label: 'نابرابر با (≠)' },
    { value: 'gte', label: 'حداقل / بزرگتر یا مساوی (≥)' },
    { value: 'gt', label: 'بزرگتر از (>)' },
    { value: 'lte', label: 'حداکثر / کوچکتر یا مساوی (≤)' },
    { value: 'lt', label: 'کوچکتر از (<)' }
  ],
  dueDate: [
    { value: 'within', label: 'در بازه زمانی نسبی' },
    { value: 'is_null', label: 'بدون سررسید (خالی)' },
    { value: 'is_not_null', label: 'دارای سررسید' },
    { value: 'eq', label: 'دقیقاً برابر با' },
    { value: 'lte', label: 'قبل یا مساوی' },
    { value: 'gte', label: 'بعد یا مساوی' }
  ],
  tags: [
    { value: 'contains', label: 'شامل برچسب' },
    { value: 'not_contains', label: 'فاقد برچسب' }
  ],
  isCompleted: [
    { value: 'eq', label: 'برابر با' },
    { value: 'neq', label: 'نابرابر با' }
  ],
  kind: [
    { value: 'eq', label: 'برابر با' },
    { value: 'neq', label: 'نابرابر با' }
  ],
  projectId: [
    { value: 'eq', label: 'برابر با' },
    { value: 'neq', label: 'نابرابر با' }
  ]
};

const RELATIVE_DATES: { value: RelativeDateRange; label: string }[] = [
  { value: 'today', label: 'امروز' },
  { value: 'tomorrow', label: 'فردا' },
  { value: 'this_week', label: 'این هفته' },
  { value: 'next_week', label: 'هفته آینده' },
  { value: 'overdue', label: 'سررسید گذشته' },
  { value: 'no_date', label: 'بدون تاریخ' }
];

const ICON_OPTIONS = [
  { value: 'filter', label: '⚡ فیلتر' },
  { value: 'flag', label: '🚩 پرچم' },
  { value: 'calendar', label: '📅 تقویم' },
  { value: 'alert-triangle', label: '⚠️ هشدار' },
  { value: 'star', label: '⭐ ستاره' },
  { value: 'tag', label: '🏷️ برچسب' },
  { value: 'check-circle', label: '✔️ چک‌لیست' },
  { value: 'clock', label: '🕒 ساعت' }
];

export function SmartFilterModal({
  isOpen,
  onClose,
  onSaved,
  initialFilter
}: SmartFilterModalProps) {
  const { session } = useSession();
  const store = useStore();

  const [name, setName] = useState(() => initialFilter?.name ?? '');
  const [color, setColor] = useState<string>(() => initialFilter?.color || '#6366f1');
  const [icon, setIcon] = useState(() => initialFilter?.icon || 'filter');
  const [logicalOperator, setLogicalOperator] = useState<LogicalOperator>(() => {
    if (initialFilter && 'rules' in initialFilter.rule) {
      return initialFilter.rule.operator;
    }
    return 'AND';
  });
  const [rules, setRules] = useState<EditableRuleRow[]>(() => {
    if (initialFilter) {
      const r = initialFilter.rule;
      if ('rules' in r && Array.isArray(r.rules)) {
        return r.rules.map((rule) => {
          if ('field' in rule && 'operator' in rule) {
            return {
              id: crypto.randomUUID(),
              field: rule.field,
              operator: rule.operator,
              value: rule.value !== undefined ? String(rule.value) : ''
            };
          }
          return {
            id: crypto.randomUUID(),
            field: 'priority',
            operator: 'gte',
            value: '3'
          };
        });
      }
      if ('field' in r && 'operator' in r) {
        return [
          {
            id: crypto.randomUUID(),
            field: r.field,
            operator: r.operator,
            value: r.value !== undefined ? String(r.value) : ''
          }
        ];
      }
    }
    return [
      { id: crypto.randomUUID(), field: 'isCompleted', operator: 'eq', value: 'false' },
      { id: crypto.randomUUID(), field: 'priority', operator: 'gte', value: '3' }
    ];
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialFilter) {
      setName(initialFilter.name);
      setColor(initialFilter.color || '#6366f1');
      setIcon(initialFilter.icon || 'filter');

      const r = initialFilter.rule;
      if ('rules' in r && Array.isArray(r.rules)) {
        setLogicalOperator(r.operator);
        setRules(
          r.rules.map((rule) => {
            if ('field' in rule && 'operator' in rule) {
              return {
                id: crypto.randomUUID(),
                field: rule.field,
                operator: rule.operator,
                value: rule.value !== undefined ? String(rule.value) : ''
              };
            }
            return {
              id: crypto.randomUUID(),
              field: 'priority',
              operator: 'gte',
              value: '3'
            };
          })
        );
      } else if ('field' in r && 'operator' in r) {
        setLogicalOperator('AND');
        setRules([
          {
            id: crypto.randomUUID(),
            field: r.field,
            operator: r.operator,
            value: r.value !== undefined ? String(r.value) : ''
          }
        ]);
      } else {
        setLogicalOperator('AND');
        setRules([
          { id: crypto.randomUUID(), field: 'priority', operator: 'gte', value: '3' }
        ]);
      }
    } else {
      setName('');
      setColor('#6366f1');
      setIcon('filter');
      setLogicalOperator('AND');
      setRules([
        { id: crypto.randomUUID(), field: 'isCompleted', operator: 'eq', value: 'false' },
        { id: crypto.randomUUID(), field: 'priority', operator: 'gte', value: '3' }
      ]);
    }
    setError(null);
  }, [isOpen, initialFilter]);

  if (!isOpen) return null;

  const handleFieldChange = (index: number, newField: FilterTargetField) => {
    setRules((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const availableOps = OPERATORS_BY_FIELD[newField] || [
          { value: 'eq', label: 'برابر' }
        ];
        const defaultOp = availableOps[0]?.value ?? 'eq';
        let defaultValue = '';
        if (newField === 'priority') defaultValue = '3';
        if (newField === 'isCompleted') defaultValue = 'false';
        if (newField === 'kind') defaultValue = 'TASK';
        if (newField === 'dueDate' && defaultOp === 'within') defaultValue = 'today';

        return {
          ...row,
          field: newField,
          operator: defaultOp,
          value: defaultValue
        };
      })
    );
  };

  const handleOperatorChange = (index: number, newOp: FilterFieldOperator) => {
    setRules((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        let val = row.value;
        if (row.field === 'dueDate' && newOp === 'within' && !val) {
          val = 'today';
        }
        return { ...row, operator: newOp, value: val };
      })
    );
  };

  const handleValueChange = (index: number, newValue: string) => {
    setRules((prev) =>
      prev.map((row, i) => (i === index ? { ...row, value: newValue } : row))
    );
  };

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        field: 'priority',
        operator: 'gte',
        value: '3'
      }
    ]);
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError('نام فیلتر هوشمند نمی‌تواند خالی باشد');
      return;
    }

    if (rules.length === 0) {
      setError('حداقل یک شرط باید برای فیلتر هوشمند تعریف شود');
      return;
    }

    // Build the FilterRule tree
    const builtRules = rules.map((r) => {
      let finalVal: unknown = r.value;
      if (r.operator === 'is_null' || r.operator === 'is_not_null') {
        finalVal = undefined;
      } else if (r.field === 'priority') {
        finalVal = Number(r.value) || 0;
      } else if (r.field === 'isCompleted') {
        finalVal = r.value === 'true';
      }

      return {
        field: r.field,
        operator: r.operator,
        ...(finalVal !== undefined ? { value: finalVal } : {})
      };
    });

    const rule: FilterRule = {
      operator: logicalOperator,
      rules: builtRules
    };

    setSubmitting(true);
    setError(null);

    try {
      let saved: SmartFilterEntity;
      if (initialFilter) {
        saved = await updateSmartFilter(
          initialFilter.id,
          {
            name: trimmedName,
            color,
            icon,
            rule
          },
          { store, userId: session.userId }
        );
      } else {
        saved = await createSmartFilter(
          {
            name: trimmedName,
            color,
            icon,
            rule
          },
          { store, userId: session.userId }
        );
      }

      onSaved(saved);
      onClose();
    } catch (err) {
      setError(
        err instanceof FilterValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'خطا در ذخیره‌سازی فیلتر هوشمند'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      data-testid="smart-filter-modal-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        data-testid="smart-filter-modal"
      >
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {initialFilter ? 'ویرایش فیلتر هوشمند' : 'ساخت فیلتر هوشمند جدید'}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="بستن"
            data-testid="close-filter-modal-btn"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="filter-name">
                نام فیلتر هوشمند
              </label>
              <input
                id="filter-name"
                type="text"
                className={styles.textInput}
                placeholder="مثال: کارهای فوری توسعه، اولویت‌های من..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="filter-name-input"
                autoFocus
              />
            </div>

            <div className={styles.row2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>رنگ برچسب</label>
                <div
                  className={styles.colorPicker}
                  data-testid="filter-color-picker"
                >
                  {PRESET_TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.colorSwatch} ${
                        color === c ? styles.active : ''
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      aria-label={`رنگ ${c}`}
                      data-testid={`color-swatch-${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="filter-icon">
                  آیکون فیلتر
                </label>
                <select
                  id="filter-icon"
                  className={styles.selectInput}
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  data-testid="filter-icon-select"
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.rulesSection}>
              <div className={styles.rulesHeader}>
                <span className={styles.label}>شرط‌های تطابق فیلتر</span>
                <div className={styles.operatorToggle}>
                  <button
                    type="button"
                    className={`${styles.operatorBtn} ${
                      logicalOperator === 'AND' ? styles.active : ''
                    }`}
                    onClick={() => setLogicalOperator('AND')}
                    data-testid="operator-and-btn"
                  >
                    همه شرط‌ها (AND)
                  </button>
                  <button
                    type="button"
                    className={`${styles.operatorBtn} ${
                      logicalOperator === 'OR' ? styles.active : ''
                    }`}
                    onClick={() => setLogicalOperator('OR')}
                    data-testid="operator-or-btn"
                  >
                    یکی از شرط‌ها (OR)
                  </button>
                </div>
              </div>

              <div className={styles.rulesList}>
                {rules.map((rule, idx) => {
                  const availableOps =
                    OPERATORS_BY_FIELD[rule.field] || [
                      { value: 'eq', label: 'برابر' }
                    ];
                  const hideValueInput =
                    rule.operator === 'is_null' ||
                    rule.operator === 'is_not_null';

                  return (
                    <div key={rule.id} className={styles.ruleRow}>
                      <select
                        className={styles.selectInput}
                        value={rule.field}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            e.target.value as FilterTargetField
                          )
                        }
                        data-testid={`rule-field-${idx}`}
                      >
                        {FIELD_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>

                      <select
                        className={styles.selectInput}
                        value={rule.operator}
                        onChange={(e) =>
                          handleOperatorChange(
                            idx,
                            e.target.value as FilterFieldOperator
                          )
                        }
                        data-testid={`rule-operator-${idx}`}
                      >
                        {availableOps.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>

                      {hideValueInput ? (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                          — بدون نیاز به مقدار —
                        </span>
                      ) : rule.field === 'dueDate' &&
                        rule.operator === 'within' ? (
                        <select
                          className={styles.selectInput}
                          value={rule.value}
                          onChange={(e) =>
                            handleValueChange(idx, e.target.value)
                          }
                          data-testid={`rule-value-${idx}`}
                        >
                          {RELATIVE_DATES.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      ) : rule.field === 'priority' ? (
                        <select
                          className={styles.selectInput}
                          value={rule.value}
                          onChange={(e) =>
                            handleValueChange(idx, e.target.value)
                          }
                          data-testid={`rule-value-${idx}`}
                        >
                          <option value="5">بسیار بالا (5)</option>
                          <option value="3">بالا (3)</option>
                          <option value="1">متوسط (1)</option>
                          <option value="0">عادی (0)</option>
                        </select>
                      ) : rule.field === 'isCompleted' ? (
                        <select
                          className={styles.selectInput}
                          value={rule.value}
                          onChange={(e) =>
                            handleValueChange(idx, e.target.value)
                          }
                          data-testid={`rule-value-${idx}`}
                        >
                          <option value="false">تکمیل‌نشده (فعال)</option>
                          <option value="true">تکمیل‌شده</option>
                        </select>
                      ) : rule.field === 'kind' ? (
                        <select
                          className={styles.selectInput}
                          value={rule.value}
                          onChange={(e) =>
                            handleValueChange(idx, e.target.value)
                          }
                          data-testid={`rule-value-${idx}`}
                        >
                          <option value="TASK">تسک (TASK)</option>
                          <option value="NOTE">یادداشت (NOTE)</option>
                          <option value="CHECKLIST">چک‌لیست (CHECKLIST)</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          className={styles.textInput}
                          placeholder="مقدار شرط..."
                          value={rule.value}
                          onChange={(e) =>
                            handleValueChange(idx, e.target.value)
                          }
                          data-testid={`rule-value-${idx}`}
                        />
                      )}

                      <button
                        type="button"
                        className={styles.removeRuleBtn}
                        onClick={() => handleRemoveRule(idx)}
                        disabled={rules.length <= 1}
                        aria-label="حذف شرط"
                        data-testid={`remove-rule-btn-${idx}`}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className={styles.addRuleBtn}
                onClick={handleAddRule}
                data-testid="add-rule-btn"
              >
                + افزودن شرط جدید
              </button>
            </div>
          </div>

          <footer className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              data-testid="cancel-filter-modal-btn"
            >
              انصراف
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
              data-testid="save-filter-btn"
            >
              {submitting ? 'در حال ذخیره...' : 'ذخیره فیلتر'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
