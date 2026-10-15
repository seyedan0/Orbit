import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { TaskEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { TrashPage } from './TrashPage';

describe('TrashPage Component (P5-BLK-001)', () => {
  const makeTask = (overrides: Partial<TaskEntity> = {}): TaskEntity => ({
    id: 'trash-t1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'تسک سطل زباله تستی',
    kind: 'TASK',
    priority: 1,
    isAllDay: false,
    timeZone: 'Asia/Tehran',
    reminders: [],
    tags: [],
    items: [],
    version: 1,
    localStatus: 'DELETED',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
    completedAt: null,
    deletedAt: '2026-10-15T08:30:00.000Z',
    ...overrides
  });

  it('renders trash page with empty state when no deleted tasks exist', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/trash']}>
            <Routes>
              <Route path="/trash" element={<TrashPage initialTasks={[]} />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="trash-page"');
    expect(html).toContain('سطل زباله (Trash)');
    expect(html).toContain('data-testid="trash-empty-state"');
  });

  it('renders list of soft-deleted tasks with restore and purge buttons', () => {
    const store = new MemoryLocalStore();
    const task = makeTask({ id: 'task-del-99', title: 'تسک آزمایشی پاک شده' });

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/trash']}>
            <Routes>
              <Route path="/trash" element={<TrashPage initialTasks={[task]} />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="trash-item-task-del-99"');
    expect(html).toContain('تسک آزمایشی پاک شده');
    expect(html).toContain('data-testid="restore-task-btn-task-del-99"');
    expect(html).toContain('data-testid="purge-task-btn-task-del-99"');
    expect(html).toContain('data-testid="purge-all-btn"');
  });
});
