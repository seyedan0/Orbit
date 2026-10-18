import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TaskEntity } from '@orbit/shared-types';
import { DesktopMiddlePane } from './DesktopMiddlePane';

const mockTasks: TaskEntity[] = [
  {
    id: 'task-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'سلام',
    desc: '-',
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
    timeZone: 'Asia/Tehran',
    reminders: [],
    tags: ['تکلیف'],
    items: [],
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-10-18T00:00:00.000Z',
    updatedAt: '2026-10-18T00:00:00.000Z',
    completedAt: null
  },
  {
    id: 'task-done-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'تسک تکمیل شده قدیمی',
    desc: '',
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
    timeZone: 'Asia/Tehran',
    reminders: [],
    tags: [],
    items: [],
    version: 1,
    localStatus: 'SYNCED',
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
    completedAt: '2026-10-17T12:00:00.000Z'
  }
];

describe('DesktopMiddlePane Component', () => {
  it('renders header, quick add input, active task list, and collapsible accordion', () => {
    const html = renderToStaticMarkup(
      <DesktopMiddlePane
        currentTitle="Inbox"
        isSidebarOpen={false}
        onToggleSidebar={vi.fn()}
        tasks={mockTasks}
        selectedTask={mockTasks[0]!}
        onSelectTask={vi.fn()}
        onAddTask={vi.fn()}
        onToggleCompletion={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="desktop-middle-pane"');
    expect(html).toContain('Inbox');
    expect(html).toContain('data-testid="middle-pane-sidebar-toggle"');
    expect(html).toContain('data-testid="desktop-quick-add-input"');
    expect(html).toContain('+ Add Task');
    expect(html).toContain('سلام');
    expect(html).toContain('data-testid="task-row-task-1"');
    expect(html).toContain('data-testid="completed-accordion-header"');
    expect(html).toContain("Completed &amp; Won&#x27;t Do");
    expect(html).toContain('1'); // 1 completed task
  });
});
