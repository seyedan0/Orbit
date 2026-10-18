import React, { useState, useMemo } from 'react';
import {
  gregorianToJalali,
  type JalaliDate
} from '../../../core/calendar/jalali';
import styles from './DualCalendarPopover.module.css';

export interface DualCalendarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null; // ISO string or YYYY-MM-DD
  onSave: (dateIso: string | null, details?: {
    time?: string;
    reminder?: string;
    repeat?: string;
  }) => void;
}

const JALALI_MONTH_NAMES_EN = [
  '',
  'Farvardin',
  'Ordibehesht',
  'Khordad',
  'Tir',
  'Mordad',
  'Shahrivar',
  'Mehr',
  'Aban',
  'Azar',
  'Dey',
  'Bahman',
  'Esfand'
] as const;

const GREGORIAN_MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

// Weekdays starting from Saturday (S, S, M, T, W, T, F)
const WEEKDAY_HEADERS = ['S', 'S', 'M', 'T', 'W', 'T', 'F'] as const;

interface DayCell {
  gy: number;
  gm: number; // 1-12
  gd: number; // 1-31
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  jalali: JalaliDate;
  isJalaliMonthStart: boolean;
  jalaliMonthName: string;
  isoDate: string;
}

export function DualCalendarPopover({
  isOpen,
  onClose,
  selectedDate,
  onSave
}: DualCalendarPopoverProps) {
  // Current active date reference: 2026-10-18
  const today = useMemo(() => new Date('2026-10-18T10:00:00.000Z'), []);

  // Parse initially selected date or fallback to today
  const initialDate = useMemo(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) return d;
    }
    return today;
  }, [selectedDate, today]);

  const [activeTab, setActiveTab] = useState<'date' | 'duration'>('date');
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth() + 1); // 1-indexed

  const [pickedDate, setPickedDate] = useState<string | null>(selectedDate ?? '2026-10-18');
  const [pickedTime, setPickedTime] = useState<string>('09:00');
  const [pickedReminder, setPickedReminder] = useState<string>('At time of event');
  const [pickedRepeat, setPickedRepeat] = useState<string>('None');

  const [expandedSection, setExpandedSection] = useState<'time' | 'reminder' | 'repeat' | null>(null);

  if (!isOpen) return null;

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleReturnToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setPickedDate(today.toISOString().split('T')[0] ?? '2026-10-18');
  };

  // Quick shortcuts
  const handleShortcut = (type: 'today' | 'tomorrow' | 'nextWeek' | 'evening') => {
    const d = new Date(today);
    if (type === 'today') {
      // today
    } else if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (type === 'nextWeek') {
      d.setDate(d.getDate() + 7);
    } else if (type === 'evening') {
      setPickedTime('19:00');
    }
    const iso = d.toISOString().split('T')[0] ?? '2026-10-18';
    setPickedDate(iso);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth() + 1);
  };

  // Generate 7-column calendar grid starting on Saturday
  const calendarCells: DayCell[] = useMemo(() => {
    const cells: DayCell[] = [];

    // First day of current month
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

    // JS day: 0=Sun, 1=Mon, ..., 6=Sat
    // We want Saturday to be index 0
    const startOffset = (firstDay.getDay() + 1) % 7;

    // Previous month leading days
    for (let i = startOffset - 1; i >= 0; i--) {
      const gd = daysInPrevMonth - i;
      const gm = currentMonth === 1 ? 12 : currentMonth - 1;
      const gy = currentMonth === 1 ? currentYear - 1 : currentYear;
      const jDate = gregorianToJalali(gy, gm, gd);
      const isStart = jDate.day === 1;
      const isoDate = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;

      cells.push({
        gy,
        gm,
        gd,
        isCurrentMonth: false,
        isToday: false,
        isSelected: pickedDate?.startsWith(isoDate) ?? false,
        jalali: jDate,
        isJalaliMonthStart: isStart,
        jalaliMonthName: JALALI_MONTH_NAMES_EN[jDate.month] ?? '',
        isoDate
      });
    }

    // Current month days
    for (let gd = 1; gd <= daysInMonth; gd++) {
      const gm = currentMonth;
      const gy = currentYear;
      const jDate = gregorianToJalali(gy, gm, gd);
      const isStart = jDate.day === 1;
      const isoDate = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
      const isToday =
        today.getFullYear() === gy &&
        today.getMonth() + 1 === gm &&
        today.getDate() === gd;

      cells.push({
        gy,
        gm,
        gd,
        isCurrentMonth: true,
        isToday,
        isSelected: pickedDate?.startsWith(isoDate) ?? false,
        jalali: jDate,
        isJalaliMonthStart: isStart,
        jalaliMonthName: JALALI_MONTH_NAMES_EN[jDate.month] ?? '',
        isoDate
      });
    }

    // Trailing days from next month to complete 35 or 42 grid cells
    const remaining = (7 - (cells.length % 7)) % 7;
    const totalNeeded = cells.length + remaining < 35 ? 35 : cells.length + remaining;
    const trailingCount = totalNeeded - cells.length;

    for (let gd = 1; gd <= trailingCount; gd++) {
      const gm = currentMonth === 12 ? 1 : currentMonth + 1;
      const gy = currentMonth === 12 ? currentYear + 1 : currentYear;
      const jDate = gregorianToJalali(gy, gm, gd);
      const isStart = jDate.day === 1;
      const isoDate = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;

      cells.push({
        gy,
        gm,
        gd,
        isCurrentMonth: false,
        isToday: false,
        isSelected: pickedDate?.startsWith(isoDate) ?? false,
        jalali: jDate,
        isJalaliMonthStart: isStart,
        jalaliMonthName: JALALI_MONTH_NAMES_EN[jDate.month] ?? '',
        isoDate
      });
    }

    return cells;
  }, [currentYear, currentMonth, pickedDate, today]);

  const handleCellClick = (cell: DayCell) => {
    setPickedDate(cell.isoDate);
  };

  const handleConfirm = () => {
    if (!pickedDate) {
      onSave(null);
    } else {
      const fullIso = `${pickedDate}T${pickedTime}:00.000Z`;
      onSave(fullIso, {
        time: pickedTime,
        reminder: pickedReminder,
        repeat: pickedRepeat
      });
    }
    onClose();
  };

  const handleClear = () => {
    setPickedDate(null);
    onSave(null);
    onClose();
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="dual-calendar-popover"
    >
      <div className={styles.popoverCard} role="dialog" aria-modal="true">
        {/* Segmented Top Tabs */}
        <div className={styles.segmentedTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'date' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('date')}
          >
            Date
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'duration' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('duration')}
          >
            Duration
          </button>
        </div>

        {/* Quick Date Shortcuts Row */}
        <div className={styles.shortcutsRow}>
          <button
            type="button"
            className={styles.shortcutBtn}
            onClick={() => handleShortcut('today')}
            title="Today"
          >
            <span className={styles.shortcutIcon}>☀️</span>
            <span className={styles.shortcutLabel}>Today</span>
          </button>
          <button
            type="button"
            className={styles.shortcutBtn}
            onClick={() => handleShortcut('tomorrow')}
            title="Tomorrow"
          >
            <span className={styles.shortcutIcon}>🌅</span>
            <span className={styles.shortcutLabel}>Tomorrow</span>
          </button>
          <button
            type="button"
            className={styles.shortcutBtn}
            onClick={() => handleShortcut('nextWeek')}
            title="+7 Days"
          >
            <span className={styles.shortcutIcon}>📅</span>
            <span className={styles.shortcutLabel}>+7 Days</span>
          </button>
          <button
            type="button"
            className={styles.shortcutBtn}
            onClick={() => handleShortcut('evening')}
            title="Evening"
          >
            <span className={styles.shortcutIcon}>🌙</span>
            <span className={styles.shortcutLabel}>Evening</span>
          </button>
        </div>

        {/* Month & Year Header */}
        <div className={styles.calendarHeader}>
          <span className={styles.monthYearTitle}>
            {GREGORIAN_MONTH_NAMES_EN[currentMonth - 1]} {currentYear}
          </span>
          <div className={styles.navControls}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handlePrevMonth}
              title="Previous Month"
              aria-label="Previous Month"
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handleReturnToToday}
              title="Today"
              aria-label="Today"
            >
              o
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handleNextMonth}
              title="Next Month"
              aria-label="Next Month"
            >
              ›
            </button>
          </div>
        </div>

        {/* Weekday Headers Row */}
        <div className={styles.weekdayRow}>
          {WEEKDAY_HEADERS.map((day, idx) => (
            <span key={idx} className={styles.weekdayCell}>
              {day}
            </span>
          ))}
        </div>

        {/* Dual Gregorian & Jalali Calendar Grid */}
        <div className={styles.daysGrid}>
          {calendarCells.map((cell, idx) => (
            <button
              key={idx}
              type="button"
              className={`
                ${styles.dayCell}
                ${!cell.isCurrentMonth ? styles.otherMonthCell : ''}
                ${cell.isSelected ? styles.selectedCell : ''}
                ${cell.isToday && !cell.isSelected ? styles.todayCell : ''}
              `}
              onClick={() => handleCellClick(cell)}
              data-testid={`cal-cell-${cell.isoDate}`}
            >
              <span className={styles.gregorianDay}>{cell.gd}</span>
              {cell.isJalaliMonthStart ? (
                <span className={styles.jalaliMonthStartBadge}>
                  {cell.jalaliMonthName}
                </span>
              ) : (
                <span className={styles.jalaliDay}>{cell.jalali.day}</span>
              )}
            </button>
          ))}
        </div>

        {/* Expandable Scheduling Rows */}
        <div className={styles.schedulingSection}>
          {/* Time Row */}
          <div className={styles.scheduleRowWrapper}>
            <button
              type="button"
              className={styles.scheduleRow}
              onClick={() =>
                setExpandedSection((prev) => (prev === 'time' ? null : 'time'))
              }
            >
              <div className={styles.scheduleRowLeft}>
                <span className={styles.scheduleIcon}>🕒</span>
                <span className={styles.scheduleLabel}>Time</span>
              </div>
              <div className={styles.scheduleRowRight}>
                <span className={styles.scheduleValue}>{pickedTime}</span>
                <span className={styles.chevron}>›</span>
              </div>
            </button>
            {expandedSection === 'time' && (
              <div className={styles.scheduleDropdown}>
                {['09:00', '10:00', '12:00', '14:00', '17:00', '19:00', '21:00'].map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.timeChoice} ${pickedTime === t ? styles.choiceActive : ''}`}
                      onClick={() => {
                        setPickedTime(t);
                        setExpandedSection(null);
                      }}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Reminder Row */}
          <div className={styles.scheduleRowWrapper}>
            <button
              type="button"
              className={styles.scheduleRow}
              onClick={() =>
                setExpandedSection((prev) => (prev === 'reminder' ? null : 'reminder'))
              }
            >
              <div className={styles.scheduleRowLeft}>
                <span className={styles.scheduleIcon}>⏰</span>
                <span className={styles.scheduleLabel}>Reminder</span>
              </div>
              <div className={styles.scheduleRowRight}>
                <span className={styles.scheduleValue}>{pickedReminder}</span>
                <span className={styles.chevron}>›</span>
              </div>
            </button>
            {expandedSection === 'reminder' && (
              <div className={styles.scheduleDropdown}>
                {[
                  'None',
                  'At time of event',
                  '5 minutes before',
                  '15 minutes before',
                  '1 hour before',
                  '1 day before'
                ].map((rem) => (
                  <button
                    key={rem}
                    type="button"
                    className={`${styles.timeChoice} ${pickedReminder === rem ? styles.choiceActive : ''}`}
                    onClick={() => {
                      setPickedReminder(rem);
                      setExpandedSection(null);
                    }}
                  >
                    {rem}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Repeat Row */}
          <div className={styles.scheduleRowWrapper}>
            <button
              type="button"
              className={styles.scheduleRow}
              onClick={() =>
                setExpandedSection((prev) => (prev === 'repeat' ? null : 'repeat'))
              }
            >
              <div className={styles.scheduleRowLeft}>
                <span className={styles.scheduleIcon}>🔄</span>
                <span className={styles.scheduleLabel}>Repeat</span>
              </div>
              <div className={styles.scheduleRowRight}>
                <span className={styles.scheduleValue}>{pickedRepeat}</span>
                <span className={styles.chevron}>›</span>
              </div>
            </button>
            {expandedSection === 'repeat' && (
              <div className={styles.scheduleDropdown}>
                {['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'].map((rep) => (
                  <button
                    key={rep}
                    type="button"
                    className={`${styles.timeChoice} ${pickedRepeat === rep ? styles.choiceActive : ''}`}
                    onClick={() => {
                      setPickedRepeat(rep);
                      setExpandedSection(null);
                    }}
                  >
                    {rep}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions: OK & Clear */}
        <div className={styles.footerButtons}>
          <button
            type="button"
            className={styles.btnOk}
            onClick={handleConfirm}
            data-testid="cal-confirm-btn"
          >
            OK
          </button>
          <button
            type="button"
            className={styles.btnClear}
            onClick={handleClear}
            data-testid="cal-clear-btn"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
