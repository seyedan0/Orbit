import type { TaskEntity } from '@orbit/shared-types';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryLocalStore } from '../../core/storage/memory-local-store';
import { StoreProvider } from '../../core/storage/store-context';
import { SessionProvider } from '../../core/auth/session-context';
import { CalendarPage } from './pages/CalendarPage';
import {
  computeWeekSegments,
  computeTimeBlockLayout,
  getYearViewMonths,
  getMultiDayItems,
  getMultiWeekRows,
  isMultiDayTask,
  shiftTaskDuration,
  resizeTaskSpan,
  getCalendarHeaderTitle,
  navigateYear,
  navigateMultiDay,
  navigateMultiWeek
} from './calendar-utils';
import { YearView } from './components/YearView';
import { MultiDayView } from './components/MultiDayView';
import { MultiWeekView } from './components/MultiWeekView';
import { CalendarFloatingBar } from './components/CalendarFloatingBar';
import { CalendarSettingsPopover } from './components/CalendarSettingsPopover';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 'test-task-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'تسک تستی',
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
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

describe('Calendar Engine - Multi-Day Snake Ribbon & Layout (Feature Spec)', () => {
  // Week 1: 2026-10-03 (Sat) to 2026-10-09 (Fri)
  const week1Days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    week1Days.push(new Date(2026, 9, 3 + i, 12, 0, 0));
  }

  // Week 2: 2026-10-10 (Sat) to 2026-10-16 (Fri)
  const week2Days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    week2Days.push(new Date(2026, 9, 10 + i, 12, 0, 0));
  }

  it('detects multi-day tasks when startDate and dueDate differ in calendar dates', () => {
    const singleDayTask = makeTask({
      startDate: '2026-10-05T09:00:00.000Z',
      dueDate: '2026-10-05T12:00:00.000Z'
    });
    expect(isMultiDayTask(singleDayTask)).toBe(false);

    const multiDayTask = makeTask({
      startDate: '2026-10-05T09:00:00.000Z',
      dueDate: '2026-10-08T18:00:00.000Z'
    });
    expect(isMultiDayTask(multiDayTask)).toBe(true);
  });

  it('spans continuous horizontal ribbon within a single week (colSpan)', () => {
    // Oct 5 (Mon, index 2) to Oct 7 (Wed, index 4) in week 1
    const task = makeTask({
      id: 'task-span-3days',
      title: 'توسعه استراتژی بازاریابی',
      startDate: new Date(2026, 9, 5, 0, 0, 0).toISOString(),
      dueDate: new Date(2026, 9, 7, 23, 59, 59).toISOString()
    });

    const segments = computeWeekSegments(week1Days, [task], new Date('2026-10-01'));
    expect(segments).toHaveLength(1);

    const seg = segments[0]!;
    expect(seg.taskId).toBe('task-span-3days');
    expect(seg.startColIndex).toBe(2); // Monday
    expect(seg.endColIndex).toBe(4);   // Wednesday
    expect(seg.colSpan).toBe(3);
    expect(seg.isStartOfTask).toBe(true); // rounded-start
    expect(seg.isEndOfTask).toBe(true);   // rounded-end
    expect(seg.slotIndex).toBe(0);
  });

  it('wraps multi-week duration task across week boundaries like a snake (Snake Ribbon Wrapping)', () => {
    // Task starts on Oct 8 (Thu, index 5 of week 1) and ends on Oct 12 (Mon, index 2 of week 2)
    const snakeTask = makeTask({
      id: 'task-snake-across-weeks',
      title: 'پیاده‌سازی موتور تقویم پیشرفته',
      startDate: new Date(2026, 9, 8, 0, 0, 0).toISOString(),
      dueDate: new Date(2026, 9, 12, 23, 59, 59).toISOString()
    });

    // Week 1 segment
    const week1Segments = computeWeekSegments(week1Days, [snakeTask], new Date('2026-10-01'));
    expect(week1Segments).toHaveLength(1);
    const seg1 = week1Segments[0]!;
    expect(seg1.startColIndex).toBe(5); // Thursday
    expect(seg1.endColIndex).toBe(6);   // Friday (end of week 1)
    expect(seg1.colSpan).toBe(2);
    expect(seg1.isStartOfTask).toBe(true);  // starts here -> rounded left
    expect(seg1.isEndOfTask).toBe(false);   // continues next week -> flat right (no round)

    // Week 2 segment
    const week2Segments = computeWeekSegments(week2Days, [snakeTask], new Date('2026-10-01'));
    expect(week2Segments).toHaveLength(1);
    const seg2 = week2Segments[0]!;
    expect(seg2.startColIndex).toBe(0); // Saturday (beginning of week 2)
    expect(seg2.endColIndex).toBe(2);   // Monday (end of task)
    expect(seg2.colSpan).toBe(3);
    expect(seg2.isStartOfTask).toBe(false); // continued from prev week -> flat left
    expect(seg2.isEndOfTask).toBe(true);    // ends here -> rounded right
  });

  it('allocates stable vertical lanes/slots (slotIndex) avoiding overlapping ribbons', () => {
    // Task 1: Oct 5 to Oct 8 (slot 0)
    const task1 = makeTask({
      id: 'task-1',
      title: 'تسک اول ۴ روزه',
      startDate: '2026-10-05T00:00:00.000Z',
      dueDate: '2026-10-08T00:00:00.000Z'
    });

    // Task 2: Oct 6 to Oct 7 (overlaps with task1 on Oct 6-7 -> should get slot 1)
    const task2 = makeTask({
      id: 'task-2',
      title: 'تسک دوم ۲ روزه همپوشان',
      startDate: '2026-10-06T00:00:00.000Z',
      dueDate: '2026-10-07T00:00:00.000Z'
    });

    // Task 3: Oct 8 to Oct 9 (starts on Oct 8, overlaps with task 1 on Oct 8 -> slot 1)
    const task3 = makeTask({
      id: 'task-3',
      title: 'تسک سوم ۲ روزه',
      startDate: '2026-10-08T00:00:00.000Z',
      dueDate: '2026-10-09T00:00:00.000Z'
    });

    const segments = computeWeekSegments(week1Days, [task1, task2, task3], new Date('2026-10-01'));
    expect(segments).toHaveLength(3);

    const s1 = segments.find((s) => s.taskId === 'task-1')!;
    const s2 = segments.find((s) => s.taskId === 'task-2')!;
    const s3 = segments.find((s) => s.taskId === 'task-3')!;

    expect(s1.slotIndex).toBe(0);
    expect(s2.slotIndex).toBe(1);
    // Task 3 overlaps with task 1 on col 5 (Oct 8), while task 2 finished on col 4 (Oct 7).
    // So on col 5, slot 1 was freed by task 2! Thus task 3 reuses slot 1.
    expect(s3.slotIndex).toBe(1);
  });

  it('shifts entire duration when whole-span is dragged (shiftTaskDuration)', () => {
    const task = makeTask({
      id: 'task-shift',
      startDate: '2026-10-05T10:00:00.000Z',
      dueDate: '2026-10-09T18:00:00.000Z'
    });

    const newStart = new Date('2026-10-12T00:00:00.000Z');
    const shifted = shiftTaskDuration(task, newStart);

    expect(shifted.startDate).toContain('2026-10-12');
    expect(shifted.dueDate).toContain('2026-10-16');
  });

  it('resizes start and end edges independently (resizeTaskSpan)', () => {
    const task = makeTask({
      id: 'task-resize',
      startDate: '2026-10-05T10:00:00.000Z',
      dueDate: '2026-10-09T18:00:00.000Z'
    });

    // Resize start edge earlier to Oct 3
    const resizedStart = resizeTaskSpan(task, 'start', new Date('2026-10-03'));
    expect(resizedStart.startDate).toContain('2026-10-03');
    expect(resizedStart.dueDate).toBe(task.dueDate);

    // Resize end edge later to Oct 15
    const resizedEnd = resizeTaskSpan(task, 'end', new Date('2026-10-15'));
    expect(resizedEnd.startDate).toBe(task.startDate);
    expect(resizedEnd.dueDate).toContain('2026-10-15');
  });
});

describe('Calendar Engine - Time-Blocking & Collision Layout', () => {
  const day = new Date('2026-10-05T12:00:00.000Z');

  it('splits width evenly when timed tasks collide in the same day (Collision & Overlap Resolution)', () => {
    // Task 1: 09:00 - 12:00 (180 min)
    const task1 = makeTask({
      id: 'task-t1',
      title: 'جلسه برنامه‌ریزی استراتژیک',
      dueDate: '2026-10-05T09:00:00.000Z',
      duration: 180,
      isAllDay: false
    });

    // Task 2: 10:00 - 11:30 (90 min) -> overlaps with task 1
    const task2 = makeTask({
      id: 'task-t2',
      title: 'بررسی کد و ادغام',
      dueDate: '2026-10-05T10:00:00.000Z',
      duration: 90,
      isAllDay: false
    });

    // Task 3: 14:00 - 15:00 -> non-overlapping
    const task3 = makeTask({
      id: 'task-t3',
      title: 'تماس با مشتری',
      dueDate: '2026-10-05T14:00:00.000Z',
      duration: 60,
      isAllDay: false
    });

    const layout = computeTimeBlockLayout([task1, task2, task3], day, 'jalali');
    expect(layout).toHaveLength(3);

    const l1 = layout.find((l) => l.task.id === 'task-t1')!;
    const l2 = layout.find((l) => l.task.id === 'task-t2')!;
    const l3 = layout.find((l) => l.task.id === 'task-t3')!;

    // Overlapping cluster has totalCols = 2 (50% each)
    expect(l1.totalCols).toBe(2);
    expect(l2.totalCols).toBe(2);
    expect(l1.colIndex).toBe(0);
    expect(l2.colIndex).toBe(1);

    // Non-overlapping task 3 occupies full width (totalCols = 1)
    expect(l3.totalCols).toBe(1);
    expect(l3.colIndex).toBe(0);
  });
});

describe('Calendar Engine - Year View & Activity Heatmap', () => {
  it('generates 12 months with activity heatmap levels based on task density', () => {
    const today = new Date('2026-10-05T12:00:00.000Z');

    // Create 6 tasks on Oct 5 to produce level 3 (high density)
    const tasks: TaskEntity[] = [];
    for (let i = 0; i < 6; i++) {
      tasks.push(
        makeTask({
          id: `task-heat-${i}`,
          dueDate: '2026-10-05T00:00:00.000Z'
        })
      );
    }

    const months = getYearViewMonths(today, 'jalali', tasks, today);
    expect(months).toHaveLength(12);

    // Oct 5 corresponds to Mehr 1405 (month index 6)
    const mehr = months[6]!;
    expect(mehr.monthName).toBe('مهر');

    // Find Oct 5 cell in Mehr
    const allDays = mehr.weeks.flatMap((w) => w.days);
    const oct5Cell = allDays.find(
      (d) => d.isCurrentMonth && d.date.getDate() === 5 && d.date.getMonth() === 9
    );

    expect(oct5Cell).toBeDefined();
    expect(oct5Cell!.taskCount).toBe(6);
    expect(oct5Cell!.heatmapLevel).toBe(3); // 5+ tasks -> level 3
  });

  it('renders YearView component with month cards and today highlight', () => {
    const html = renderToStaticMarkup(
      <YearView
        currentDate={new Date('2026-10-05T12:00:00.000Z')}
        calendarType="jalali"
        tasks={[]}
      />
    );

    expect(html).toContain('data-testid="year-view"');
    expect(html).toContain('data-testid="year-month-0"'); // فروردین
    expect(html).toContain('data-testid="year-month-11"'); // اسفند
    expect(html).toContain('تراکم کارها: کمتر');
  });
});

describe('Calendar Engine - Multi-Day & Multi-Week Views', () => {
  it('generates MultiDay items with dual dates', () => {
    const base = new Date('2026-10-05T12:00:00.000Z');
    const items = getMultiDayItems(base, 3, 'jalali');

    expect(items).toHaveLength(3);
    expect(items[0]!.weekdayName).toBe('دوشنبه');
    expect(items[0]!.secondaryDayNumber).toBe('5'); // Gregorian 5 Oct
  });

  it('renders MultiDayView component', () => {
    const html = renderToStaticMarkup(
      <MultiDayView
        currentDate={new Date('2026-10-05T12:00:00.000Z')}
        calendarType="jalali"
        tasks={[]}
        daysCount={3}
      />
    );

    expect(html).toContain('data-testid="multi-day-view"');
    expect(html).toContain('data-testid="multi-day-column-0"');
    expect(html).toContain('data-testid="multi-day-column-2"');
    expect(html).toContain('نمای ۳ روزه');
  });

  it('renders MultiWeekView component with 2 consecutive week rows', () => {
    const rows = getMultiWeekRows(new Date('2026-10-05T12:00:00.000Z'), 2, 'jalali', []);
    expect(rows).toHaveLength(2);

    const html = renderToStaticMarkup(
      <MultiWeekView
        currentDate={new Date('2026-10-05T12:00:00.000Z')}
        calendarType="jalali"
        tasks={[]}
        weeksCount={2}
      />
    );

    expect(html).toContain('data-testid="multi-week-view"');
    expect(html).toContain('data-testid="multi-week-row-0"');
    expect(html).toContain('data-testid="multi-week-row-1"');
    expect(html).toContain('نمای ۲ هفته‌ای');
  });
});

describe('Calendar Engine - Synchronized Views & Settings Popover', () => {
  it('renders CalendarFloatingBar with buttons for all 7 views', () => {
    const html = renderToStaticMarkup(
      <CalendarFloatingBar activeView="month" onViewChange={() => {}} />
    );

    expect(html).toContain('data-testid="calendar-floating-dock"');
    expect(html).toContain('data-testid="dock-view-month"');
    expect(html).toContain('data-testid="dock-view-week"');
    expect(html).toContain('data-testid="dock-view-day"');
    expect(html).toContain('data-testid="dock-view-year"');
    expect(html).toContain('data-testid="dock-view-agenda"');
    expect(html).toContain('data-testid="dock-view-multi-day"');
    expect(html).toContain('data-testid="dock-view-multi-week"');
  });

  it('renders CalendarSettingsPopover with options', () => {
    const html = renderToStaticMarkup(
      <CalendarSettingsPopover
        settings={{
          weekStartDay: 6,
          showWeekNumbers: true,
          showCompletedTasks: true,
          showSecondaryCalendar: true
        }}
        onSettingsChange={() => {}}
      />
    );

    expect(html).toContain('data-testid="calendar-settings-btn"');
  });

  it('navigates seamlessly across all view modes', () => {
    const base = new Date('2026-10-05T12:00:00.000Z');

    // Year navigation
    const nextYear = navigateYear(base, 1, 'jalali');
    expect(getCalendarHeaderTitle(nextYear, 'year', 'jalali')).toBe('۱۴۰۶');

    // Multi-day navigation (3 days)
    const nextMultiDay = navigateMultiDay(base, 1, 3);
    expect(nextMultiDay.getDate()).toBe(8);

    // Multi-week navigation (2 weeks)
    const nextMultiWeek = navigateMultiWeek(base, 1, 2);
    expect(nextMultiWeek.getDate()).toBe(19);
  });

  it('renders CalendarPage in Year, Multi-Day, and Multi-Week modes', () => {
    const store = new MemoryLocalStore();

    // Year mode
    const htmlYear = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <CalendarPage
            initialDate={new Date('2026-10-05T12:00:00.000Z')}
            initialViewMode="year"
            initialTasks={[]}
          />
        </StoreProvider>
      </SessionProvider>
    );
    expect(htmlYear).toContain('data-testid="year-view"');
    expect(htmlYear).toContain('data-testid="calendar-floating-dock"');

    // Multi-Day mode
    const htmlMultiDay = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <CalendarPage
            initialDate={new Date('2026-10-05T12:00:00.000Z')}
            initialViewMode="multi-day"
            initialTasks={[]}
          />
        </StoreProvider>
      </SessionProvider>
    );
    expect(htmlMultiDay).toContain('data-testid="multi-day-view"');

    // Multi-Week mode
    const htmlMultiWeek = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <CalendarPage
            initialDate={new Date('2026-10-05T12:00:00.000Z')}
            initialViewMode="multi-week"
            initialTasks={[]}
          />
        </StoreProvider>
      </SessionProvider>
    );
    expect(htmlMultiWeek).toContain('data-testid="multi-week-view"');
  });
});
