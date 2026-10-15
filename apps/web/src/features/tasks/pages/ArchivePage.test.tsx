import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { TaskEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { ArchivePage } from './ArchivePage';

describe('ArchivePage Component (P5-BLK-001)', () => {
  const makeTask = (overrides: Partial<TaskEntity> = {}): TaskEntity => ({
    id: 'arch-t1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'تسک آرشیو شده تستی',
    kind: 'TASK',
    priority: 1,
    isAllDay: false,
    timeZone: 'Asia/Tehran',
    reminders: [],
    tags: [],
    items: [],
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
    completedAt: '2026-10-15T09:00:00.000Z',
    deletedAt: null,
    ...overrides
  });

  it('renders archive page with empty state when no completed tasks exist', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/archive']}>
            <Routes>
              <Route path="/archive" element={<ArchivePage initialTasks={[]} />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="archive-page"');
    expect(html).toContain('آرشیو تسک‌های تکمیل شده');
    expect(html).toContain('data-testid="archive-empty-state"');
  });

  it('renders list of completed tasks with reopen button', () => {
    const store = new MemoryLocalStore();
    const task = makeTask({ id: 'task-done-42', title: 'تسک به پایان رسیده' });

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/archive']}>
            <Routes>
              <Route path="/archive" element={<ArchivePage initialTasks={[task]} />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="archive-item-task-done-42"');
    expect(html).toContain('تسک به پایان رسیده');
    expect(html).toContain('data-testid="reopen-task-btn-task-done-42"');
  });
});
