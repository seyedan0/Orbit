import { useEffect, useRef, useState, type FC, type MouseEvent } from 'react';
import {
  GREGORIAN_MONTH_NAMES,
  GREGORIAN_WEEKDAY_SHORT,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAY_SHORT,
  dateToJalali,
  formatJalaliDate,
  getJalaliMonthLength,
  getPersianWeekday,
  jalaliToDate,
  jalaliToIso,
  toPersianDigits
} from '../../../core/calendar/jalali';
import styles from './DatePicker.module.css';

export interface DatePickerProps {
  value?: string | null;
  isAllDay?: boolean;
  onChange: (dueDate: string | null, isAllDay: boolean) => void;
  defaultCalendar?: 'jalali' | 'gregorian';
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export const DatePicker: FC<DatePickerProps> = ({
  value,
  isAllDay = true,
  onChange,
  defaultCalendar = 'jalali',
  disabled = false,
  placeholder = 'تعیین سررسید',
  label = 'تاریخ سررسید'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarType, setCalendarType] = useState<'jalali' | 'gregorian'>(defaultCalendar);
  const [allDay, setAllDay] = useState<boolean>(isAllDay);
  const [hour, setHour] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view and selected date
  const now = new Date();
  const todayJalali = dateToJalali(now);

  const [viewYear, setViewYear] = useState<number>(
    calendarType === 'jalali' ? todayJalali.year : now.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    calendarType === 'jalali' ? todayJalali.month : now.getMonth() + 1
  );

  // Sync internal state when external props change
  useEffect(() => {
    setAllDay(isAllDay);
  }, [isAllDay]);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setHour(date.getHours());
        setMinute(date.getMinutes());
        if (calendarType === 'jalali') {
          const j = dateToJalali(date);
          setViewYear(j.year);
          setViewMonth(j.month);
        } else {
          setViewYear(date.getFullYear());
          setViewMonth(date.getMonth() + 1);
        }
      }
    }
  }, [value, calendarType]);

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(e: Event) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Parse currently selected date if value exists
  const selectedDate = value ? new Date(value) : null;
  const selectedJalali = selectedDate && !isNaN(selectedDate.getTime())
    ? dateToJalali(selectedDate)
    : null;

  // Format trigger label
  const formattedTrigger = (() => {
    if (!value || !selectedDate || isNaN(selectedDate.getTime())) {
      return placeholder;
    }
    if (calendarType === 'jalali' && selectedJalali) {
      return formatJalaliDate(
        {
          year: selectedJalali.year,
          month: selectedJalali.month,
          day: selectedJalali.day,
          hour: selectedDate.getHours(),
          minute: selectedDate.getMinutes()
        },
        {
          format: 'short',
          includeTime: !allDay,
          persianDigits: true
        }
      );
    }
    const month = GREGORIAN_MONTH_NAMES[selectedDate.getMonth()]?.slice(0, 3);
    const day = selectedDate.getDate();
    if (allDay) {
      return `${month} ${day}`;
    }
    const hh = String(selectedDate.getHours()).padStart(2, '0');
    const mm = String(selectedDate.getMinutes()).padStart(2, '0');
    return `${month} ${day} ${hh}:${mm}`;
  })();

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    let iso: string;
    if (calendarType === 'jalali') {
      iso = jalaliToIso(viewYear, viewMonth, day, hour, minute, allDay);
    } else {
      const d = new Date(viewYear, viewMonth - 1, day, allDay ? 0 : hour, allDay ? 0 : minute, 0, 0);
      iso = d.toISOString();
    }
    onChange(iso, allDay);
  };

  const handleQuickToday = () => {
    const today = new Date();
    if (calendarType === 'jalali') {
      const j = dateToJalali(today);
      setViewYear(j.year);
      setViewMonth(j.month);
      const iso = jalaliToIso(j.year, j.month, j.day, hour, minute, allDay);
      onChange(iso, allDay);
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth() + 1);
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), allDay ? 0 : hour, allDay ? 0 : minute);
      onChange(d.toISOString(), allDay);
    }
  };

  const handleQuickTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (calendarType === 'jalali') {
      const j = dateToJalali(tomorrow);
      setViewYear(j.year);
      setViewMonth(j.month);
      const iso = jalaliToIso(j.year, j.month, j.day, hour, minute, allDay);
      onChange(iso, allDay);
    } else {
      setViewYear(tomorrow.getFullYear());
      setViewMonth(tomorrow.getMonth() + 1);
      const d = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), allDay ? 0 : hour, allDay ? 0 : minute);
      onChange(d.toISOString(), allDay);
    }
  };

  const handleClear = (e?: MouseEvent) => {
    e?.stopPropagation();
    onChange(null, allDay);
  };

  const handleCalendarTypeSwitch = (type: 'jalali' | 'gregorian') => {
    if (type === calendarType) return;
    setCalendarType(type);
    if (type === 'jalali') {
      const ref = selectedDate || new Date();
      const j = dateToJalali(ref);
      setViewYear(j.year);
      setViewMonth(j.month);
    } else {
      const ref = selectedDate || new Date();
      setViewYear(ref.getFullYear());
      setViewMonth(ref.getMonth() + 1);
    }
  };

  const handleAllDayToggle = (checked: boolean) => {
    setAllDay(checked);
    if (value && selectedDate) {
      if (calendarType === 'jalali' && selectedJalali) {
        const iso = jalaliToIso(selectedJalali.year, selectedJalali.month, selectedJalali.day, hour, minute, checked);
        onChange(iso, checked);
      } else {
        const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), checked ? 0 : hour, checked ? 0 : minute);
        onChange(d.toISOString(), checked);
      }
    }
  };

  const handleTimeChange = (newHour: number, newMinute: number) => {
    setHour(newHour);
    setMinute(newMinute);
    if (value && selectedDate && !allDay) {
      if (calendarType === 'jalali' && selectedJalali) {
        const iso = jalaliToIso(selectedJalali.year, selectedJalali.month, selectedJalali.day, newHour, newMinute, false);
        onChange(iso, false);
      } else {
        const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), newHour, newMinute);
        onChange(d.toISOString(), false);
      }
    }
  };

  // Build grid
  const daysInMonth = calendarType === 'jalali'
    ? getJalaliMonthLength(viewYear, viewMonth)
    : new Date(viewYear, viewMonth, 0).getDate();

  const startWeekday = calendarType === 'jalali'
    ? getPersianWeekday(jalaliToDate(viewYear, viewMonth, 1))
    : new Date(viewYear, viewMonth - 1, 1).getDay();

  const weekdayHeaders = calendarType === 'jalali'
    ? PERSIAN_WEEKDAY_SHORT
    : GREGORIAN_WEEKDAY_SHORT;

  const monthLabel = calendarType === 'jalali'
    ? `${PERSIAN_MONTH_NAMES[viewMonth - 1]} ${toPersianDigits(viewYear)}`
    : `${GREGORIAN_MONTH_NAMES[viewMonth - 1]} ${viewYear}`;

  const isToday = (day: number) => {
    if (calendarType === 'jalali') {
      return (
        todayJalali.year === viewYear &&
        todayJalali.month === viewMonth &&
        todayJalali.day === day
      );
    }
    return (
      now.getFullYear() === viewYear &&
      now.getMonth() + 1 === viewMonth &&
      now.getDate() === day
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    if (calendarType === 'jalali' && selectedJalali) {
      return (
        selectedJalali.year === viewYear &&
        selectedJalali.month === viewMonth &&
        selectedJalali.day === day
      );
    }
    if (calendarType === 'gregorian' && selectedDate) {
      return (
        selectedDate.getFullYear() === viewYear &&
        selectedDate.getMonth() + 1 === viewMonth &&
        selectedDate.getDate() === day
      );
    }
    return false;
  };

  return (
    <div className={styles.datePickerWrapper} ref={containerRef}>
      <button
        type="button"
        className={`${styles.triggerButton} ${value ? styles.hasValue : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label}
        data-testid="datepicker-trigger"
      >
        <span className={styles.icon} aria-hidden="true">📅</span>
        <span>{formattedTrigger}</span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            className={styles.clearTriggerBtn}
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClear();
              }
            }}
            aria-label="پاک کردن تاریخ"
            data-testid="datepicker-trigger-clear"
          >
            ✕
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={styles.popover}
          role="dialog"
          aria-modal="false"
          aria-label="انتخاب تقویم و زمان"
          data-testid="datepicker-popover"
        >
          {/* Top Bar with Calendar System Switch */}
          <div className={styles.topBar}>
            <div className={styles.calendarSwitch} role="group" aria-label="سیستم تقویم">
              <button
                type="button"
                className={`${styles.switchBtn} ${calendarType === 'jalali' ? styles.switchBtnActive : ''}`}
                onClick={() => handleCalendarTypeSwitch('jalali')}
                aria-pressed={calendarType === 'jalali'}
                data-testid="switch-jalali"
              >
                شمسی
              </button>
              <button
                type="button"
                className={`${styles.switchBtn} ${calendarType === 'gregorian' ? styles.switchBtnActive : ''}`}
                onClick={() => handleCalendarTypeSwitch('gregorian')}
                aria-pressed={calendarType === 'gregorian'}
                data-testid="switch-gregorian"
              >
                میلادی
              </button>
            </div>

            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => handleClear()}
              data-testid="datepicker-clear-btn"
            >
              پاک کردن
            </button>
          </div>

          {/* Month / Year Navigation */}
          <div className={styles.headerNav}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handlePrevMonth}
              aria-label="ماه قبل"
              data-testid="datepicker-prev-month"
            >
              ‹
            </button>
            <span className={styles.monthYearLabel} data-testid="month-year-label">
              {monthLabel}
            </span>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handleNextMonth}
              aria-label="ماه بعد"
              data-testid="datepicker-next-month"
            >
              ›
            </button>
          </div>

          {/* Weekday Headers */}
          <div className={styles.weekdaysGrid} aria-hidden="true">
            {weekdayHeaders.map((w, idx) => (
              <span key={idx} className={styles.weekdayHeader}>
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className={styles.daysGrid} role="grid" aria-label="روزهای ماه">
            {Array.from({ length: startWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className={styles.emptyCell} aria-hidden="true" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const today = isToday(day);
              const selected = isSelected(day);
              const displayDay = calendarType === 'jalali' ? toPersianDigits(day) : String(day);

              return (
                <button
                  key={day}
                  type="button"
                  className={`${styles.dayBtn} ${today ? styles.dayBtnToday : ''} ${
                    selected ? styles.dayBtnSelected : ''
                  }`}
                  onClick={() => handleSelectDay(day)}
                  aria-selected={selected}
                  aria-current={today ? 'date' : undefined}
                  aria-label={`${day} ${calendarType === 'jalali' ? PERSIAN_MONTH_NAMES[viewMonth - 1] : GREGORIAN_MONTH_NAMES[viewMonth - 1]}`}
                  data-testid={`day-${day}`}
                >
                  {displayDay}
                </button>
              );
            })}
          </div>

          {/* Time & All-Day Options */}
          <div className={styles.timeSection}>
            <label className={styles.allDayRow}>
              <input
                type="checkbox"
                className={styles.allDayCheckbox}
                checked={allDay}
                onChange={(e) => handleAllDayToggle(e.target.checked)}
                data-testid="all-day-checkbox"
              />
              <span>تمام روز</span>
            </label>

            {!allDay && (
              <div className={styles.timeInputRow} data-testid="time-row">
                <span className={styles.timeLabel}>ساعت:</span>
                <select
                  className={styles.timeSelect}
                  value={hour}
                  onChange={(e) => handleTimeChange(Number(e.target.value), minute)}
                  aria-label="ساعت"
                  data-testid="select-hour"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <span>:</span>
                <select
                  className={styles.timeSelect}
                  value={minute}
                  onChange={(e) => handleTimeChange(hour, Number(e.target.value))}
                  aria-label="دقیقه"
                  data-testid="select-minute"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className={styles.actionsRow}>
            <div className={styles.quickButtons}>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={handleQuickToday}
                data-testid="btn-today"
              >
                امروز
              </button>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={handleQuickTomorrow}
                data-testid="btn-tomorrow"
              >
                فردا
              </button>
            </div>
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={() => setIsOpen(false)}
              data-testid="btn-close"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
