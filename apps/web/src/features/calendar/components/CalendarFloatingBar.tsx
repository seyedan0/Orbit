import type { FC } from 'react';
import type { CalendarViewMode } from '../calendar-utils';
import styles from './CalendarFloatingBar.module.css';

export interface CalendarFloatingBarProps {
  activeView: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
}

interface ViewOption {
  id: CalendarViewMode;
  label: string;
  icon: string;
  testId: string;
}

const VIEW_OPTIONS: ViewOption[] = [
  { id: 'month', label: 'ماه', icon: '📅', testId: 'dock-view-month' },
  { id: 'week', label: 'هفته', icon: '🗓️', testId: 'dock-view-week' },
  { id: 'day', label: 'روز', icon: '☀️', testId: 'dock-view-day' },
  { id: 'year', label: 'سال', icon: '✨', testId: 'dock-view-year' },
  { id: 'agenda', label: 'دستورکار', icon: '📋', testId: 'dock-view-agenda' },
  { id: 'multi-day', label: '۳ روزه', icon: '⏱️', testId: 'dock-view-multi-day' },
  { id: 'multi-week', label: '۲ هفته‌ای', icon: '📆', testId: 'dock-view-multi-week' }
];

export const CalendarFloatingBar: FC<CalendarFloatingBarProps> = ({
  activeView,
  onViewChange
}) => {
  return (
    <nav
      className={styles.floatingDockContainer}
      aria-label="انتخاب سریع نمای تقویم"
      data-testid="calendar-floating-dock"
    >
      {VIEW_OPTIONS.map((opt) => {
        const isActive = activeView === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            className={`${styles.dockItemBtn} ${
              isActive ? styles.dockItemBtnActive : ''
            }`}
            onClick={() => onViewChange(opt.id)}
            aria-pressed={isActive}
            data-testid={opt.testId}
            title={`نمای ${opt.label}`}
          >
            <span className={styles.dockIcon}>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
