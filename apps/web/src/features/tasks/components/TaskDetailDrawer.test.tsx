import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TaskEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { TaskDetailDrawer } from './TaskDetailDrawer';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 'task-detail-test-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'تسک با زیرتسک‌های سلسله‌مراتبی',
    kind: 'TASK',
    priority: 3,
    startDate: '2026-10-10T00:00:00.000Z',
    dueDate: '2026-10-18T23:59:59.000Z',
    isAllDay: true,
    timeZone: 'Asia/Tehran',
    reminders: [],
    tags: ['work', 'important'],
    desc: 'توضیحات و نکات کلیدی برای پیگیری پروژه',
    items: [
      {
        id: 'sub-root-1',
        title: 'فاز اول: نیازمندی‌ها',
        isCompleted: true,
        order: 0,
        children: [
          {
            id: 'sub-child-1-1',
            title: 'تحلیل داده‌ها',
            isCompleted: true,
            order: 0,
            children: [
              {
                id: 'sub-deep-1',
                title: 'مصاحبه با ذینفعان',
                isCompleted: true,
                order: 0
              }
            ]
          }
        ]
      },
      {
        id: 'sub-root-2',
        title: 'فاز دوم: طراحی معماری',
        isCompleted: false,
        order: 1,
        children: [
          {
            id: 'sub-child-2-1',
            title: 'انتخاب دیتابیس',
            isCompleted: false,
            order: 0
          }
        ]
      }
    ],
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-02T12:00:00.000Z',
    completedAt: null,
    ...overrides
  };
}

describe('TaskDetailDrawer Component', () => {
  it('does not render anything when isOpen is false or task is null', () => {
    const store = new MemoryLocalStore();
    const htmlClosed = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <TaskDetailDrawer
            task={makeTask()}
            isOpen={false}
            onClose={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );
    expect(htmlClosed).toBe('');

    const htmlNull = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <TaskDetailDrawer
            task={null}
            isOpen={true}
            onClose={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );
    expect(htmlNull).toBe('');
  });

  it('renders drawer with editable title, priority pills, and close button when open', () => {
    const store = new MemoryLocalStore();
    const task = makeTask();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <TaskDetailDrawer
            task={task}
            isOpen={true}
            onClose={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="task-detail-drawer"');
    expect(html).toContain('data-testid="drawer-title-input"');
    expect(html).toContain('تسک با زیرتسک‌های سلسله‌مراتبی');
    expect(html).toContain('data-testid="drawer-close-btn"');
    expect(html).toContain('data-testid="drawer-delete-task-btn"');
    expect(html).toContain('data-testid="drawer-priority-pills"');
    expect(html).toContain('data-testid="drawer-priority-5"');
    expect(html).toContain('data-testid="drawer-priority-3"');
    expect(html).toContain('data-testid="drawer-priority-1"');
    expect(html).toContain('data-testid="drawer-priority-0"');
  });

  it('renders infinitely nested subtask tree with indented nodes and action buttons', () => {
    const store = new MemoryLocalStore();
    const task = makeTask();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <TaskDetailDrawer
            task={task}
            isOpen={true}
            onClose={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );

    // Root nodes
    expect(html).toContain('data-testid="subtask-node-sub-root-1"');
    expect(html).toContain('فاز اول: نیازمندی‌ها');
    expect(html).toContain('data-testid="subtask-node-sub-root-2"');
    expect(html).toContain('فاز دوم: طراحی معماری');

    // Deep children
    expect(html).toContain('data-testid="subtask-node-sub-child-1-1"');
    expect(html).toContain('تحلیل داده‌ها');
    expect(html).toContain('data-testid="subtask-node-sub-deep-1"');
    expect(html).toContain('مصاحبه با ذینفعان');

    // Caret toggles
    expect(html).toContain('data-testid="caret-sub-root-1"');
    expect(html).toContain('data-testid="caret-sub-child-1-1"');

    // Action buttons
    expect(html).toContain('data-testid="btn-add-child-sub-root-1"');
    expect(html).toContain('data-testid="btn-promote-sub-root-1"');
    expect(html).toContain('data-testid="btn-delete-subtask-sub-root-1"');

    // Progress bar
    expect(html).toContain('data-testid="drawer-subtasks-progress"');
    expect(html).toContain('۳ از ۵');
  });

  it('renders description textarea and dates section', () => {
    const store = new MemoryLocalStore();
    const task = makeTask();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <TaskDetailDrawer
            task={task}
            isOpen={true}
            onClose={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="drawer-description-textarea"');
    expect(html).toContain('توضیحات و نکات کلیدی برای پیگیری پروژه');
    expect(html).toContain('تاریخ شروع');
    expect(html).toContain('تاریخ سررسید');
    expect(html).toContain('data-testid="drawer-allday-checkbox"');
    expect(html).toContain('data-testid="drawer-repeat-select"');
    expect(html).toContain('data-testid="drawer-reminder-select"');
  });

  it('renders tags section with chips and remove action', () => {
    const store = new MemoryLocalStore();
    const task = makeTask({ tags: ['work', 'important'] });
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <TaskDetailDrawer
            task={task}
            isOpen={true}
            onClose={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="drawer-tags-list"');
    expect(html).toContain('data-testid="drawer-tag-work"');
    expect(html).toContain('data-testid="drawer-remove-tag-work"');
    expect(html).toContain('data-testid="drawer-tag-important"');
    expect(html).toContain('data-testid="drawer-add-tag-input"');
    expect(html).toContain('data-testid="drawer-add-tag-btn"');
  });

  it('renders delivery performance badge when task is completed with deliveryStatus', () => {
    const store = new MemoryLocalStore();
    const earlyTask = makeTask({
      completedAt: '2026-10-15T10:00:00.000Z',
      dueDate: '2026-10-17T10:00:00.000Z',
      deliveryStatus: 'EARLY',
      completionVarianceHours: 48
    });
    const earlyHtml = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <TaskDetailDrawer
            task={earlyTask}
            isOpen={true}
            onClose={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(earlyHtml).toContain('data-testid="drawer-delivery-badge"');
    expect(earlyHtml).toContain('۲ روز زودتر انجام شد');

    const overdueTask = makeTask({
      completedAt: '2026-10-19T10:00:00.000Z',
      dueDate: '2026-10-18T10:00:00.000Z',
      deliveryStatus: 'OVERDUE',
      completionVarianceHours: -24
    });
    const overdueHtml = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <TaskDetailDrawer
            task={overdueTask}
            isOpen={true}
            onClose={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(overdueHtml).toContain('data-testid="drawer-delivery-badge"');
    expect(overdueHtml).toContain('۱ روز با تاخیر انجام شد');
  });

  it('renders Jalali metadata timestamps in footer', () => {
    const store = new MemoryLocalStore();
    const task = makeTask();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <TaskDetailDrawer
            task={task}
            isOpen={true}
            onClose={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('ایجاد:');
    expect(html).toContain('بروزرسانی:');
  });
});
