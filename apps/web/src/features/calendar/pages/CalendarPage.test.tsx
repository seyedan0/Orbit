import type { TaskEntity } from '@orbit/shared-types';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { CalendarPage } from './CalendarPage';
import {
  getCalendarMonthTitle,
  navigateMonth,
  navigateWeek,
  isTaskOnDate
} from '../calendar-utils';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 'cal-task-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'تسک تستی تقویم',
    kind: 'TASK',
    priority: 0,
    isAllDay: true,
    timeZone: 'UTC',
    reminders: [],
    items: [],
    version: 0,
    localStatus: 'CREATED',
    createdAt: '2026-10-05T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z',
    completedAt: null,
    dueDate: '2026-10-05T00:00:00.000Z',
    ...overrides
  };
}

describe('CalendarPage (P4-CAL-002)', () => {
  const baseDate = new Date('2026-10-05T12:00:00.000Z');

  it('renders month view with correct Jalali month title', () => {
    const store = new MemoryLocalStore();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <CalendarPage
            initialDate={baseDate}
            initialCalendarType="jalali"
            initialViewMode="month"
            initialTasks={[]}
          />
        </StoreProvider>
      </SessionProvider>
    );

    // 2026-10-05 -> Mehr 1405
    expect(html).toContain('data-testid="calendar-page"');
    expect(html).toContain('data-testid="month-view"');
    expect(html).toContain('data-testid="calendar-month-year-label"');
    expect(html).toContain('مهر ۱۴۰۵');
    expect(html).toContain('data-testid="calendar-prev-btn"');
    expect(html).toContain('data-testid="calendar-next-btn"');
    expect(html).toContain('data-testid="calendar-today-btn"');
    expect(html).toContain('data-testid="view-month-btn"');
    expect(html).toContain('data-testid="view-week-btn"');
    expect(html).toContain('data-testid="calendar-type-jalali"');
    expect(html).toContain('data-testid="calendar-type-gregorian"');
    expect(html).toContain('شنبه');
    expect(html).toContain('جمعه');
  });

  it('renders month view with correct Gregorian month title', () => {
    const store = new MemoryLocalStore();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <CalendarPage
            initialDate={baseDate}
            initialCalendarType="gregorian"
            initialViewMode="month"
            initialTasks={[]}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="month-view"');
    expect(html).toContain('data-testid="calendar-month-year-label"');
    expect(html).toContain('October 2026');
    expect(html).toContain('Sunday');
    expect(html).toContain('Saturday');
  });

  it('navigates between months when clicking previous/next', () => {
    // Jalali navigation
    const nextJalali = navigateMonth(baseDate, 1, 'jalali');
    const prevJalali = navigateMonth(baseDate, -1, 'jalali');

    expect(getCalendarMonthTitle(nextJalali, 'jalali')).toBe('آبان ۱۴۰۵');
    expect(getCalendarMonthTitle(prevJalali, 'jalali')).toBe('شهریور ۱۴۰۵');

    // Gregorian navigation
    const nextGregorian = navigateMonth(baseDate, 1, 'gregorian');
    const prevGregorian = navigateMonth(baseDate, -1, 'gregorian');

    expect(getCalendarMonthTitle(nextGregorian, 'gregorian')).toBe('November 2026');
    expect(getCalendarMonthTitle(prevGregorian, 'gregorian')).toBe('September 2026');

    // Verify page render with navigated dates
    const store = new MemoryLocalStore();
    const htmlNext = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <CalendarPage
            initialDate={nextJalali}
            initialCalendarType="jalali"
            initialViewMode="month"
            initialTasks={[]}
          />
        </StoreProvider>
      </SessionProvider>
    );
    expect(htmlNext).toContain('آبان ۱۴۰۵');
  });

  it('switches between month and week views', () => {
    const store = new MemoryLocalStore();

    // Month view
    const htmlMonth = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <CalendarPage
            initialDate={baseDate}
            initialViewMode="month"
            initialTasks={[]}
          />
        </StoreProvider>
      </SessionProvider>
    );
    expect(htmlMonth).toContain('data-testid="month-view"');
    expect(htmlMonth).not.toContain('data-testid="week-view"');

    // Week view
    const htmlWeek = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <CalendarPage
            initialDate={baseDate}
            initialViewMode="week"
            initialTasks={[]}
          />
        </StoreProvider>
      </SessionProvider>
    );
    expect(htmlWeek).toContain('data-testid="week-view"');
    expect(htmlWeek).not.toContain('data-testid="month-view"');
    expect(htmlWeek).toContain('data-testid="week-column-0"');
    expect(htmlWeek).toContain('data-testid="week-column-6"');
  });

  it('navigates weeks with navigateWeek helper', () => {
    const nextWeek = navigateWeek(baseDate, 1);
    const prevWeek = navigateWeek(baseDate, -1);

    expect(nextWeek.getDate()).toBe(12);
    expect(prevWeek.getDate()).toBe(28);
  });

  it('displays tasks scheduled on specific dates in month view', () => {
    const store = new MemoryLocalStore();
    const task = makeTask({
      id: 'task-oct-5',
      title: 'جلسه برنامه‌ریزی تقویم',
      dueDate: '2026-10-05T00:00:00.000Z',
      priority: 3
    });

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <CalendarPage
            initialDate={baseDate}
            initialCalendarType="jalali"
            initialViewMode="month"
            initialTasks={[task]}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('جلسه برنامه‌ریزی تقویم');
    expect(html).toContain('data-testid="calendar-task-task-oct-5"');
    expect(html).toContain('data-testid="calendar-task-checkbox-task-oct-5"');
  });

  it('displays tasks scheduled on specific dates in week view with metadata', () => {
    const store = new MemoryLocalStore();
    const allDayTask = makeTask({
      id: 'task-allday',
      title: 'بررسی کد همگام‌سازی',
      dueDate: '2026-10-05T00:00:00.000Z',
      isAllDay: true,
      priority: 3
    });
    const timedTask = makeTask({
      id: 'task-timed',
      title: 'جلسه بازبینی هفتگی',
      dueDate: '2026-10-05T14:30:00.000Z',
      isAllDay: false,
      priority: 1
    });

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <CalendarPage
            initialDate={baseDate}
            initialCalendarType="jalali"
            initialViewMode="week"
            initialTasks={[allDayTask, timedTask]}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('بررسی کد همگام‌سازی');
    expect(html).toContain('جلسه بازبینی هفتگی');
    expect(html).toContain('تمام روز');
    expect(html).toContain('P3');
    expect(html).toContain('P1');
  });

  it('isTaskOnDate accurately maps tasks with startDate or dueDate and excludes deleted tasks', () => {
    const activeTask = makeTask({
      dueDate: '2026-10-05T00:00:00.000Z',
      deletedAt: null
    });
    const deletedTask = makeTask({
      dueDate: '2026-10-05T00:00:00.000Z',
      deletedAt: '2026-10-05T10:00:00.000Z'
    });
    const startOnlyTask = makeTask({
      dueDate: null,
      startDate: '2026-10-05T00:00:00.000Z'
    });
    const unscheduledTask = makeTask({
      dueDate: null,
      startDate: null
    });

    expect(isTaskOnDate(activeTask, baseDate)).toBe(true);
    expect(isTaskOnDate(deletedTask, baseDate)).toBe(false);
    expect(isTaskOnDate(startOnlyTask, baseDate)).toBe(true);
    expect(isTaskOnDate(unscheduledTask, baseDate)).toBe(false);

    const otherDate = new Date('2026-10-06T12:00:00.000Z');
    expect(isTaskOnDate(activeTask, otherDate)).toBe(false);
  });
});
