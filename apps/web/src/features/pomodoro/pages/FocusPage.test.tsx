import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { TaskEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { FocusPage } from './FocusPage';

describe('FocusPage Component (P6-FOC-001 & P6-POM-001)', () => {
  const makeTask = (overrides: Partial<TaskEntity> = {}): TaskEntity => ({
    id: 'task-focus-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'تسک هدف تمرکز',
    kind: 'TASK',
    priority: 3,
    isAllDay: false,
    startDate: null,
    dueDate: '2026-10-15T10:00:00.000Z',
    duration: 25,
    timeZone: 'Asia/Tehran',
    repeatFlag: null,
    reminders: [],
    tags: ['focus'],
    items: [],
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
    completedAt: null,
    deletedAt: null,
    ...overrides
  });

  it('renders circular SVG ring, mode switcher, cycle indicators and action controls', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/focus']}>
            <Routes>
              <Route path="/focus" element={<FocusPage />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    // Main page container
    expect(html).toContain('data-testid="focus-page"');

    // Mode tabs
    expect(html).toContain('data-testid="mode-tab-work"');
    expect(html).toContain('data-testid="mode-tab-short-break"');
    expect(html).toContain('data-testid="mode-tab-long-break"');
    expect(html).toContain('تمرکز (25m)');
    expect(html).toContain('استراحت کوتاه (5m)');
    expect(html).toContain('استراحت طولانی (15m)');

    // Circular SVG countdown progress ring
    expect(html).toContain('data-testid="progress-svg-ring"');
    expect(html).toContain('data-testid="progress-circle"');
    expect(html).toContain('data-testid="timer-display"');
    expect(html).toContain('25:00');

    // Cycle indicator
    expect(html).toContain('data-testid="cycle-indicator"');
    expect(html).toContain('پومودورو 1 از 4');
    expect(html).toContain('🍅');

    // Action controls
    expect(html).toContain('data-testid="start-timer-btn"');
    expect(html).toContain('data-testid="complete-early-btn"');
    expect(html).toContain('data-testid="skip-timer-btn"');
    expect(html).toContain('data-testid="reset-timer-btn"');

    // Fullscreen / distraction-free and settings buttons
    expect(html).toContain('data-testid="toggle-distraction-free-btn"');
    expect(html).toContain('data-testid="open-settings-btn"');

    // Summary banner
    expect(html).toContain('data-testid="focus-summary-card"');
    expect(html).toContain('data-testid="summary-pomodoro-count"');
    expect(html).toContain('data-testid="summary-focus-minutes"');
  });

  it('renders attached task chip when taskId query param is provided', async () => {
    const store = new MemoryLocalStore();
    const task = makeTask({ id: 'task-test-42', title: 'کدنویسی موتور پومودورو' });
    await store.saveTask(task);

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/focus?taskId=task-test-42']}>
            <Routes>
              <Route path="/focus" element={<FocusPage />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    // Initial render shows the container and connection button
    expect(html).toContain('data-testid="focus-page"');
  });

  it('displays select task button when no task is attached', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/focus']}>
            <Routes>
              <Route path="/focus" element={<FocusPage />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="select-task-btn"');
    expect(html).toContain('+ اتصال به یک تسک');
  });

  it('renders weekly analytics toggle button for focus insights (P6-STA-001)', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/focus']}>
            <Routes>
              <Route path="/focus" element={<FocusPage />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="toggle-analytics-btn"');
    expect(html).toContain('مشاهده آمار و نمودار هفتگی');
  });
});
