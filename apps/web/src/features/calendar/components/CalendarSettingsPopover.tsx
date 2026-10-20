import { useState, type FC } from 'react';
import type { CalendarSettings } from '../calendar-utils';
import styles from './CalendarSettingsPopover.module.css';

export interface CalendarSettingsPopoverProps {
  settings: CalendarSettings;
  onSettingsChange: (newSettings: CalendarSettings) => void;
}

export const CalendarSettingsPopover: FC<CalendarSettingsPopoverProps> = ({
  settings,
  onSettingsChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => setIsOpen((prev) => !prev);
  const handleClose = () => setIsOpen(false);

  const updateSetting = <K extends keyof CalendarSettings>(
    key: K,
    val: CalendarSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: val
    });
  };

  return (
    <div className={styles.popoverWrapper}>
      <button
        type="button"
        className={`${styles.settingsBtn} ${isOpen ? styles.settingsBtnActive : ''}`}
        onClick={handleToggle}
        aria-label="تنظیمات نمایش تقویم"
        title="تنظیمات تقویم"
        data-testid="calendar-settings-btn"
      >
        ⋯
      </button>

      {isOpen && (
        <>
          <div
            className={styles.popoverBackdrop}
            onClick={handleClose}
            aria-hidden="true"
          />

          <div
            className={styles.popoverCard}
            role="dialog"
            aria-label="تنظیمات نمایش تقویم"
            data-testid="calendar-settings-popover"
          >
            <h4 className={styles.popoverTitle}>تنظیمات تقویم</h4>

            {/* Start day of week */}
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel} htmlFor="week-start-select">
                روز شروع هفته
              </label>
              <select
                id="week-start-select"
                className={styles.settingSelect}
                value={settings.weekStartDay}
                onChange={(e) =>
                  updateSetting(
                    'weekStartDay',
                    Number(e.target.value) as 0 | 1 | 6
                  )
                }
                data-testid="setting-week-start"
              >
                <option value={6}>شنبه (پیش‌فرض ایران)</option>
                <option value={0}>یک‌شنبه (Sunday)</option>
                <option value={1}>دوشنبه (Monday)</option>
              </select>
            </div>

            {/* Show Week Numbers Toggle */}
            <label className={styles.settingToggleRow}>
              <span className={styles.toggleLabelText}>نمایش شماره هفته‌ها</span>
              <input
                type="checkbox"
                className={styles.toggleCheckbox}
                checked={settings.showWeekNumbers}
                onChange={(e) =>
                  updateSetting('showWeekNumbers', e.target.checked)
                }
                data-testid="setting-show-week-numbers"
              />
            </label>

            {/* Show Completed Tasks Toggle */}
            <label className={styles.settingToggleRow}>
              <span className={styles.toggleLabelText}>
                نمایش تسک‌های تکمیل‌شده
              </span>
              <input
                type="checkbox"
                className={styles.toggleCheckbox}
                checked={settings.showCompletedTasks}
                onChange={(e) =>
                  updateSetting('showCompletedTasks', e.target.checked)
                }
                data-testid="setting-show-completed"
              />
            </label>

            {/* Show Secondary Calendar Toggle */}
            <label className={styles.settingToggleRow}>
              <span className={styles.toggleLabelText}>
                نمایش تقویم دوم (دوگانه)
              </span>
              <input
                type="checkbox"
                className={styles.toggleCheckbox}
                checked={settings.showSecondaryCalendar}
                onChange={(e) =>
                  updateSetting('showSecondaryCalendar', e.target.checked)
                }
                data-testid="setting-show-secondary-cal"
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
};
