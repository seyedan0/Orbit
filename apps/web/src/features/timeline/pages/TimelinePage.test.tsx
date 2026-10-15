import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { TaskEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { TimelinePage } from './TimelinePage';

describe('TimelinePage Component (P5-TML-001)', () => {
  const makeTask = (overrides: Partial<TaskEntity> = {}): TaskEntity => ({
    id: 'task-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'تسک گانت تست',
    kind: 'TASK',
    priority: 3,
    isAllDay: false,
    startDate: '2026-10-15T08:00:00.000Z',
    dueDate: '2026-10-17T08:00:00.000Z',
    duration: 120,
    timeZone: 'Asia/Tehran',
    repeatFlag: null,
    reminders: [],
    tags: ['dev'],
    items: [],
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
    completedAt: null,
    deletedAt: null,
    ...overrides
  });

  it('renders timeline container, view mode toggles, navigation, and quick add input', () => {
    const store = new MemoryLocalStore();
    const refDate = new Date('2026-10-15T12:00:00.000Z');

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/timeline']}>
            <Routes>
              <Route
                path="/timeline"
                element={
                  <TimelinePage
                    initialRefDate={refDate}
                    initialViewMode="WEEK"
                    initialTasks={[]}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="timeline-page"');
    expect(html).toContain('تایملاین و گانت پروژه');
    expect(html).toContain('data-testid="mode-day-btn"');
    expect(html).toContain('data-testid="mode-week-btn"');
    expect(html).toContain('data-testid="mode-month-btn"');
    expect(html).toContain('data-testid="timeline-quick-add-input"');
    expect(html).toContain('data-testid="timeline-header-grid"');
  });

  it('renders task duration bars positioned across the grid', () => {
    const store = new MemoryLocalStore();
    const refDate = new Date('2026-10-15T12:00:00.000Z');
    const task = makeTask({
      id: 'task-gantt-1',
      title: 'پیاده‌سازی موتور رنکینگ',
      startDate: '2026-10-15T09:00:00.000Z',
      dueDate: '2026-10-16T18:00:00.000Z'
    });

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/timeline']}>
            <Routes>
              <Route
                path="/timeline"
                element={
                  <TimelinePage
                    initialRefDate={refDate}
                    initialViewMode="WEEK"
                    initialTasks={[task]}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="timeline-row-task-gantt-1"');
    expect(html).toContain('پیاده‌سازی موتور رنکینگ');
    expect(html).toContain('data-testid="task-bar-task-gantt-1"');
  });
});
