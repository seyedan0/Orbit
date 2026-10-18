import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TaskEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { DesktopTaskEditor } from './DesktopTaskEditor';

const mockTask: TaskEntity = {
  id: 'task-editor-test-1',
  projectId: 'inbox',
  userId: 'user-1',
  title: 'سلام',
  desc: 'توضیحات تسک نمونه',
  kind: 'TASK',
  priority: 3,
  isAllDay: false,
  timeZone: 'Asia/Tehran',
  reminders: [],
  tags: ['تکلیف'],
  items: [
    {
      id: 'item-1',
      title: 'مرحله اول',
      isCompleted: false,
      order: 0
    }
  ],
  version: 1,
  localStatus: 'SYNCED',
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
  completedAt: null
};

describe('DesktopTaskEditor Component', () => {
  it('renders empty background container when task is null', () => {
    const store = new MemoryLocalStore();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <DesktopTaskEditor task={null} />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="empty-task-editor"');
  });

  it('renders active editor with top toolbar, title, description, checklist items, and bottom footer', () => {
    const store = new MemoryLocalStore();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <DesktopTaskEditor task={mockTask} currentListName="Inbox" />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="desktop-task-editor"');
    // Top toolbar elements
    expect(html).toContain('data-testid="date-and-reminder-btn"');
    expect(html).toContain('Date and Reminder');
    expect(html).toContain('data-testid="editor-priority-flag"');

    // Body inputs
    expect(html).toContain('data-testid="editor-title-input"');
    expect(html).toContain('سلام');
    expect(html).toContain('data-testid="editor-desc-input"');
    expect(html).toContain('توضیحات تسک نمونه');

    // Checklist section
    expect(html).toContain("Press &#x27;Enter&#x27; to add list item");
    expect(html).toContain('مرحله اول');

    // Bottom footer
    expect(html).toContain('data-testid="editor-folder-btn"');
    expect(html).toContain('Inbox');
    expect(html).toContain('data-testid="editor-more-options-btn"');
  });
});
