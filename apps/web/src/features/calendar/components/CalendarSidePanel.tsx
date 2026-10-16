import type { TaskEntity } from '@orbit/shared-types';
import { useMemo, useState, type FC } from 'react';
import {
  getMonthViewDays,
  navigateMonth,
  type CalendarType
} from '../calendar-utils';
import {
  dateToJalali,
  toPersianDigits,
  PERSIAN_WEEKDAY_SHORT,
  GREGORIAN_WEEKDAY_SHORT
} from '../../../core/calendar/jalali';
import styles from './CalendarSidePanel.module.css';

export interface CalendarFilterState {
  showAll: boolean;
  selectedProjects: string[];
  selectedTags: string[];
}

export interface CalendarSidePanelProps {
  currentDate: Date;
  selectedDate: Date;
  calendarType: CalendarType;
  tasks: TaskEntity[];
  filterState: CalendarFilterState;
  onFilterChange: (filters: CalendarFilterState) => void;
  onSelectDate: (date: Date) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

export const CalendarSidePanel: FC<CalendarSidePanelProps> = ({
  currentDate,
  selectedDate,
  calendarType,
  tasks,
  filterState,
  onFilterChange,
  onSelectDate,
  onClose: _onClose,
  isOpen = true
}) => {
  const [miniCalendarMonth, setMiniCalendarMonth] = useState<Date>(
    () => new Date(currentDate)
  );

  // Extract unique project IDs and tags from tasks
  const { projectList, tagList, inboxCount } = useMemo(() => {
    const projects = new Set<string>();
    const tags = new Set<string>();
    let inboxTasks = 0;

    for (const t of tasks) {
      if (t.deletedAt != null) continue;
      if (t.projectId && t.projectId !== 'inbox' && t.projectId !== 'default') {
        projects.add(t.projectId);
      } else {
        inboxTasks++;
      }

      if (t.tags && Array.isArray(t.tags)) {
        for (const tag of t.tags) {
          if (tag.trim()) tags.add(tag.trim());
        }
      }
    }

    return {
      projectList: Array.from(projects),
      tagList: Array.from(tags),
      inboxCount: inboxTasks
    };
  }, [tasks]);

  const handleMiniPrev = () => {
    setMiniCalendarMonth((prev) => navigateMonth(prev, -1, calendarType));
  };

  const handleMiniNext = () => {
    setMiniCalendarMonth((prev) => navigateMonth(prev, 1, calendarType));
  };

  const handleMiniToday = () => {
    const now = new Date();
    setMiniCalendarMonth(now);
    onSelectDate(now);
  };

  // Mini calendar header title (e.g. 2022/05 or 1405/07)
  const miniHeaderTitle = useMemo(() => {
    if (calendarType === 'jalali') {
      const j = dateToJalali(miniCalendarMonth);
      return `${toPersianDigits(j.year)}/${toPersianDigits(
        String(j.month).padStart(2, '0')
      )}`;
    }
    const y = miniCalendarMonth.getFullYear();
    const m = String(miniCalendarMonth.getMonth() + 1).padStart(2, '0');
    return `${y}/${m}`;
  }, [miniCalendarMonth, calendarType]);

  const miniDaysData = useMemo(() => {
    return getMonthViewDays(miniCalendarMonth, calendarType, new Date());
  }, [miniCalendarMonth, calendarType]);

  const miniWeekdayHeaders = useMemo(() => {
    return calendarType === 'jalali'
      ? PERSIAN_WEEKDAY_SHORT
      : GREGORIAN_WEEKDAY_SHORT;
  }, [calendarType]);

  const handleToggleAll = () => {
    onFilterChange({
      showAll: true,
      selectedProjects: [],
      selectedTags: []
    });
  };

  const handleToggleInbox = () => {
    const isInboxActive = filterState.selectedProjects.includes('inbox');
    const updated = isInboxActive
      ? filterState.selectedProjects.filter((p) => p !== 'inbox')
      : [...filterState.selectedProjects, 'inbox'];

    onFilterChange({
      showAll: updated.length === 0 && filterState.selectedTags.length === 0,
      selectedProjects: updated,
      selectedTags: filterState.selectedTags
    });
  };

  const handleToggleProject = (projId: string) => {
    const isProjActive = filterState.selectedProjects.includes(projId);
    const updated = isProjActive
      ? filterState.selectedProjects.filter((p) => p !== projId)
      : [...filterState.selectedProjects, projId];

    onFilterChange({
      showAll: updated.length === 0 && filterState.selectedTags.length === 0,
      selectedProjects: updated,
      selectedTags: filterState.selectedTags
    });
  };

  const handleToggleTag = (tag: string) => {
    const isTagActive = filterState.selectedTags.includes(tag);
    const updated = isTagActive
      ? filterState.selectedTags.filter((t) => t !== tag)
      : [...filterState.selectedTags, tag];

    onFilterChange({
      showAll: filterState.selectedProjects.length === 0 && updated.length === 0,
      selectedProjects: filterState.selectedProjects,
      selectedTags: updated
    });
  };

  if (!isOpen) return null;

  const selIsoPrefix = selectedDate.toISOString().slice(0, 10);

  return (
    <aside
      className={styles.sidePanelContainer}
      aria-label="سایدبار فیلترها و تقویم کوچک"
      data-testid="calendar-side-panel"
    >
      {/* Mini Calendar Widget */}
      <div className={styles.miniCalendarSection}>
        <div className={styles.miniCalendarHeader}>
          <span className={styles.miniCalendarTitle}>{miniHeaderTitle}</span>
          <div className={styles.miniNavButtons}>
            <button
              type="button"
              className={styles.miniNavBtn}
              onClick={handleMiniPrev}
              title="ماه قبل"
              aria-label="ماه قبل تقویم کوچک"
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.miniTodayDot}
              onClick={handleMiniToday}
              title="امروز"
              aria-label="امروز در تقویم کوچک"
            />
            <button
              type="button"
              className={styles.miniNavBtn}
              onClick={handleMiniNext}
              title="ماه بعد"
              aria-label="ماه بعد تقویم کوچک"
            >
              ›
            </button>
          </div>
        </div>

        {/* Mini Weekday Headers */}
        <div className={styles.miniWeekdayGrid}>
          {miniWeekdayHeaders.map((hdr, idx) => (
            <span key={idx} className={styles.miniWeekdayHeader}>
              {hdr}
            </span>
          ))}
        </div>

        {/* Mini Days Grid */}
        <div className={styles.miniDaysGrid}>
          {miniDaysData.days.map((item, idx) => {
            if (!item) {
              return (
                <span
                  key={`empty-${idx}`}
                  className={styles.miniEmptyCell}
                  aria-hidden="true"
                />
              );
            }

            const isSelected = item.isoDate.slice(0, 10) === selIsoPrefix;

            return (
              <button
                key={item.isoDate + idx}
                type="button"
                className={`${styles.miniDayCell} ${
                  item.isToday ? styles.miniToday : ''
                } ${!item.isCurrentMonth ? styles.miniOtherMonth : ''} ${
                  isSelected ? styles.miniSelected : ''
                }`}
                onClick={() => onSelectDate(item.date)}
                title={`${item.dayNumber} ${item.monthName}`}
              >
                {item.dayNumber}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter / Lists Section */}
      <div className={styles.filtersSection}>
        {/* All tasks option */}
        <div
          className={`${styles.filterItem} ${
            filterState.showAll ? styles.filterItemActive : ''
          }`}
          onClick={handleToggleAll}
          role="button"
          tabIndex={0}
        >
          <span className={styles.filterItemLabel}>
            <span className={styles.radioIndicator}>
              {filterState.showAll && <span className={styles.radioDot} />}
            </span>
            <span>همه تسک‌ها (All)</span>
          </span>
          <span className={styles.filterItemCount}>{tasks.length}</span>
        </div>

        {/* Inbox option */}
        <div
          className={`${styles.filterItem} ${
            filterState.selectedProjects.includes('inbox')
              ? styles.filterItemActive
              : ''
          }`}
          onClick={handleToggleInbox}
          role="button"
          tabIndex={0}
        >
          <span className={styles.filterItemLabel}>
            <span className={styles.filterIcon}>📥</span>
            <span>صندوق ورودی (Inbox)</span>
          </span>
          <span className={styles.filterItemCount}>{inboxCount}</span>
          <input
            type="checkbox"
            className={styles.filterCheckbox}
            checked={
              filterState.showAll ||
              filterState.selectedProjects.includes('inbox')
            }
            onChange={handleToggleInbox}
            onClick={(e) => e.stopPropagation()}
            aria-label="فیلتر صندوق ورودی"
          />
        </div>

        {/* Project Lists */}
        {projectList.length > 0 && (
          <div className={styles.subSection}>
            <span className={styles.subSectionHeader}>لیست‌ها (Lists)</span>
            {projectList.map((proj) => {
              const isChecked = filterState.selectedProjects.includes(proj);
              return (
                <div
                  key={proj}
                  className={`${styles.filterItem} ${
                    isChecked ? styles.filterItemActive : ''
                  }`}
                  onClick={() => handleToggleProject(proj)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={styles.filterItemLabel}>
                    <span className={styles.filterIcon}>📋</span>
                    <span className={styles.truncate}>{proj}</span>
                  </span>
                  <input
                    type="checkbox"
                    className={styles.filterCheckbox}
                    checked={filterState.showAll || isChecked}
                    onChange={() => handleToggleProject(proj)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`فیلتر لیست ${proj}`}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Tags Section */}
        {tagList.length > 0 && (
          <div className={styles.subSection}>
            <span className={styles.subSectionHeader}>برچسب‌ها (Tags)</span>
            {tagList.map((tag) => {
              const isChecked = filterState.selectedTags.includes(tag);
              return (
                <div
                  key={tag}
                  className={`${styles.filterItem} ${
                    isChecked ? styles.filterItemActive : ''
                  }`}
                  onClick={() => handleToggleTag(tag)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={styles.filterItemLabel}>
                    <span className={styles.filterIcon}>🏷️</span>
                    <span className={styles.truncate}>{tag}</span>
                  </span>
                  <input
                    type="checkbox"
                    className={styles.filterCheckbox}
                    checked={filterState.showAll || isChecked}
                    onChange={() => handleToggleTag(tag)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`فیلتر برچسب ${tag}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
