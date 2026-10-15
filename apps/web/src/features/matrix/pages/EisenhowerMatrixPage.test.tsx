import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { TaskEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { EisenhowerMatrixPage } from './EisenhowerMatrixPage';

describe('EisenhowerMatrixPage Component (P5-MTX-001)', () => {
  const makeTask = (overrides: Partial<TaskEntity> = {}): TaskEntity => ({
    id: 'task-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'تسک ماتریس تست',
    kind: 'TASK',
    priority: 3,
    isAllDay: false,
    startDate: null,
    dueDate: '2026-10-15T10:00:00.000Z',
    duration: 30,
    timeZone: 'Asia/Tehran',
    repeatFlag: null,
    reminders: [],
    tags: ['work'],
    items: [],
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
    completedAt: null,
    deletedAt: null,
    ...overrides
  });

  it('renders matrix page with title, 4 quadrants, and quick-add controls', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/matrix']}>
            <Routes>
              <Route path="/matrix" element={<EisenhowerMatrixPage />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="eisenhower-matrix-page"');
    expect(html).toContain('data-testid="matrix-title"');
    expect(html).toContain('ماتریس آیزنهاور');

    // 4 quadrants present
    expect(html).toContain('data-testid="quadrant-Q1"');
    expect(html).toContain('data-testid="quadrant-Q2"');
    expect(html).toContain('data-testid="quadrant-Q3"');
    expect(html).toContain('data-testid="quadrant-Q4"');

    // Quadrant titles
    expect(html).toContain('فوری و مهم');
    expect(html).toContain('مهم و غیرفوری');
    expect(html).toContain('فوری و کم‌اهمیت');
    expect(html).toContain('نه فوری و نه مهم');

    // Quick add controls
    expect(html).toContain('data-testid="quick-add-form-Q1"');
    expect(html).toContain('data-testid="quick-add-input-Q1"');
    expect(html).toContain('data-testid="quick-add-button-Q1"');

    // Toggle completed
    expect(html).toContain('data-testid="toggle-completed"');
  });

  it('renders initial empty states for quadrants when store is empty', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/matrix']}>
            <Routes>
              <Route path="/matrix" element={<EisenhowerMatrixPage />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="empty-Q1"');
    expect(html).toContain('data-testid="empty-Q2"');
    expect(html).toContain('data-testid="empty-Q3"');
    expect(html).toContain('data-testid="empty-Q4"');
  });

  it('renders tasks distributed across the 4 quadrants with badges and tags', () => {
    const store = new MemoryLocalStore();
    const todayIso = new Date().toISOString();

    const tasks: TaskEntity[] = [
      makeTask({ id: 'task-q1', title: 'کار بحرانی سرور', priority: 5, dueDate: todayIso, tags: ['devops'] }),
      makeTask({ id: 'task-q2', title: 'برنامه‌ریزی فاز بعدی', priority: 3, dueDate: null, tags: ['planning'] }),
      makeTask({ id: 'task-q3', title: 'پاسخ ایمیل‌های روتین', priority: 1, dueDate: todayIso }),
      makeTask({ id: 'task-q4', title: 'مرتب‌سازی پوشه دانلودها', priority: 0, dueDate: null, completedAt: todayIso })
    ];

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/matrix']}>
            <Routes>
              <Route path="/matrix" element={<EisenhowerMatrixPage initialTasks={tasks} />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    // Verify task items exist
    expect(html).toContain('data-testid="task-item-task-q1"');
    expect(html).toContain('کار بحرانی سرور');
    expect(html).toContain('data-testid="task-item-task-q2"');
    expect(html).toContain('برنامه‌ریزی فاز بعدی');
    expect(html).toContain('data-testid="task-item-task-q3"');
    expect(html).toContain('پاسخ ایمیل‌های روتین');
    expect(html).toContain('data-testid="task-item-task-q4"');
    expect(html).toContain('مرتب‌سازی پوشه دانلودها');

    // Verify badges and tags
    expect(html).toContain('#devops');
    expect(html).toContain('#planning');
    expect(html).toContain('data-testid="priority-badge-task-q1"');

    // Completed task has checked checkbox
    expect(html).toContain('data-testid="task-checkbox-task-q4"');
  });
});
