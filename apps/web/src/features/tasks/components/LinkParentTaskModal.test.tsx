import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TaskEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { LinkParentTaskModal } from './LinkParentTaskModal';

const baseTask: TaskEntity = {
  id: 'task-modal-1',
  projectId: 'inbox',
  userId: 'user-1',
  title: 'Task A',
  kind: 'TASK',
  priority: 0,
  isAllDay: false,
  timeZone: 'Asia/Tehran',
  reminders: [],
  items: [],
  version: 0,
  localStatus: 'CREATED',
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
  completedAt: null
};

describe('LinkParentTaskModal Component', () => {
  it('renders null when isOpen is false', () => {
    const store = new MemoryLocalStore();
    const html = renderToStaticMarkup(
      <LinkParentTaskModal
        isOpen={false}
        onClose={vi.fn()}
        currentTask={baseTask}
        store={store}
        onSelectParent={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders modal dialog with search input and header when open', () => {
    const store = new MemoryLocalStore();
    const html = renderToStaticMarkup(
      <LinkParentTaskModal
        isOpen={true}
        onClose={vi.fn()}
        currentTask={baseTask}
        store={store}
        onSelectParent={vi.fn()}
      />
    );

    expect(html).toContain('Link Parent Task');
    expect(html).toContain('Search tasks...');
    expect(html).toContain('Cancel');
  });

  it('renders Unlink button when current task has a parentTaskId', () => {
    const store = new MemoryLocalStore();
    const taskWithParent: TaskEntity = {
      ...baseTask,
      parentTaskId: 'parent-xyz'
    };

    const html = renderToStaticMarkup(
      <LinkParentTaskModal
        isOpen={true}
        onClose={vi.fn()}
        currentTask={taskWithParent}
        store={store}
        onSelectParent={vi.fn()}
      />
    );

    expect(html).toContain('Unlink Parent Task');
  });
});
