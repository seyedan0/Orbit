import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FocusAnalyticsCard } from './FocusAnalyticsCard';
import type { WeeklyFocusStats } from '../services/pomodoro-service';

describe('FocusAnalyticsCard Component (P6-STA-001)', () => {
  const mockStats: WeeklyFocusStats = {
    totalFocusMinutes: 150,
    dailyAverageMinutes: 21,
    totalCompletedSessions: 6,
    totalCancelledSessions: 1,
    completionRatePercent: 86,
    streakDays: 4,
    dailyStats: [
      { date: '2026-10-09', dayLabel: 'جمعه', focusMinutes: 0, completedPomodoros: 0 },
      { date: '2026-10-10', dayLabel: 'شنبه', focusMinutes: 50, completedPomodoros: 2 },
      { date: '2026-10-11', dayLabel: 'یکشنبه', focusMinutes: 25, completedPomodoros: 1 },
      { date: '2026-10-12', dayLabel: 'دوشنبه', focusMinutes: 25, completedPomodoros: 1 },
      { date: '2026-10-13', dayLabel: 'سه‌شنبه', focusMinutes: 0, completedPomodoros: 0 },
      { date: '2026-10-14', dayLabel: 'چهارشنبه', focusMinutes: 25, completedPomodoros: 1 },
      { date: '2026-10-15', dayLabel: 'پنج‌شنبه', focusMinutes: 25, completedPomodoros: 1 }
    ],
    topTasks: [
      { taskId: 'task-1', taskTitle: 'تسک تحلیل داده', focusMinutes: 100, pomodoroCount: 4 },
      { taskId: 'task-2', taskTitle: 'توسعه رابط کاربری', focusMinutes: 50, pomodoroCount: 2 }
    ],
    tagDistribution: [
      { tag: 'analytics', focusMinutes: 100 },
      { tag: 'frontend', focusMinutes: 50 }
    ]
  };

  it('renders weekly KPI metrics correctly', () => {
    const html = renderToStaticMarkup(<FocusAnalyticsCard stats={mockStats} />);

    expect(html).toContain('data-testid="focus-analytics-card"');
    expect(html).toContain('2.5'); // 150 mins = 2.5 hours
    expect(html).toContain('data-testid="kpi-daily-average"');
    expect(html).toContain('21');
    expect(html).toContain('data-testid="kpi-streak"');
    expect(html).toContain('4');
    expect(html).toContain('data-testid="kpi-completion-rate"');
    expect(html).toContain('%86');
  });

  it('renders 7-day bar chart with day labels and proportional heights', () => {
    const html = renderToStaticMarkup(<FocusAnalyticsCard stats={mockStats} />);

    expect(html).toContain('data-testid="analytics-barchart"');
    expect(html).toContain('شنبه');
    expect(html).toContain('یکشنبه');
    expect(html).toContain('دوشنبه');
    expect(html).toContain('پنج‌شنبه');
    expect(html).toContain('50m');
    expect(html).toContain('25m');
  });

  it('renders top tasks list and tag distribution pills', () => {
    const html = renderToStaticMarkup(<FocusAnalyticsCard stats={mockStats} />);

    expect(html).toContain('تسک تحلیل داده');
    expect(html).toContain('100 دقیقه');
    expect(html).toContain('4 🍅');
    expect(html).toContain('#analytics');
    expect(html).toContain('(100m)');
    expect(html).toContain('#frontend');
    expect(html).toContain('(50m)');
  });

  it('renders empty states gracefully when there are no tasks or tags', () => {
    const emptyStats: WeeklyFocusStats = {
      totalFocusMinutes: 0,
      dailyAverageMinutes: 0,
      totalCompletedSessions: 0,
      totalCancelledSessions: 0,
      completionRatePercent: 100,
      streakDays: 0,
      dailyStats: mockStats.dailyStats.map((d) => ({ ...d, focusMinutes: 0, completedPomodoros: 0 })),
      topTasks: [],
      tagDistribution: []
    };

    const html = renderToStaticMarkup(<FocusAnalyticsCard stats={emptyStats} onClose={() => {}} />);

    expect(html).toContain('تسک ثبت‌شده‌ای در این هفته وجود ندارد');
    expect(html).toContain('برچسبی در تسک‌ها یافت نشد');
    expect(html).toContain('data-testid="close-analytics-btn"');
  });
});
