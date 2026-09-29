import type { TaskEntity } from '@orbit/shared-types';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TaskItem } from './TaskItem';

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: 'test-task-1',
    projectId: 'inbox',
    userId: 'user-1',
    title: 'Test task',
    kind: 'TASK',
    priority: 0,
    isAllDay: false,
    timeZone: 'UTC',
    reminders: [],
    items: [],
    version: 0,
    localStatus: 'CREATED',
    createdAt: '2026-09-30T10:00:00.000Z',
    updatedAt: '2026-09-30T10:00:00.000Z',
    completedAt: null,
    ...overrides
  };
}

describe('TaskItem', () => {
  it('renders a checkbox for kind TASK', () => {
    const task = makeTask({ kind: 'TASK' });
    const html = renderToStaticMarkup(<TaskItem task={task} />);

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('task-checkbox');
    expect(html).toContain('Test task');
  });

  it('does NOT render a checkbox for kind NOTE (preserves NOTE semantics)', () => {
    const note = makeTask({ kind: 'NOTE', title: 'A quick note' });
    const html = renderToStaticMarkup(<TaskItem task={note} />);

    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain('task-checkbox');
    expect(html).toContain('A quick note');
  });

  it('renders as unchecked when completedAt is null or undefined', () => {
    const openTask = makeTask({ completedAt: null });
    const html = renderToStaticMarkup(<TaskItem task={openTask} />);

    expect(html).not.toContain('task-item completed');
    expect(html).not.toContain('task-title completed');
    expect(html).not.toContain('checked=""');
  });

  it('renders as checked and adds completed styling when completedAt is set', () => {
    const completedTask = makeTask({
      completedAt: '2026-09-30T12:00:00.000Z'
    });
    const html = renderToStaticMarkup(<TaskItem task={completedTask} />);

    expect(html).toContain('task-item completed');
    expect(html).toContain('task-title completed');
    expect(html).toContain('checked=""');
  });

  it('triggers onToggleCompletion callback when rendered component input changes', () => {
    const onToggle = vi.fn();
    const task = makeTask({ kind: 'TASK' });

    const element = TaskItem({ task, onToggleCompletion: onToggle });
    // Verify props on the element or trigger callback
    expect(element).toBeDefined();

    // Verify children and handler
    const checkbox = (element.props as { children: React.ReactNode[] }).children[0] as React.ReactElement<{
      onChange: () => void;
    }>;
    expect(checkbox.type).toBe('input');
    checkbox.props.onChange();
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(task);
  });

  it('renders a delete button when task is not deleted and triggers onDelete', () => {
    const onDelete = vi.fn();
    const task = makeTask({ kind: 'TASK' });
    const html = renderToStaticMarkup(<TaskItem task={task} onDelete={onDelete} />);

    expect(html).toContain('btn-delete');
    expect(html).toContain('حذف');
    expect(html).not.toContain('btn-restore');

    // Test callback
    const element = TaskItem({ task, onDelete });
    const children = (element.props as { children: React.ReactNode[] }).children;
    const deleteBtn = children[2] as React.ReactElement<{ onClick: () => void }>;
    expect(deleteBtn.type).toBe('button');
    deleteBtn.props.onClick();
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(task);
  });

  it('renders a restore button when task is soft-deleted and triggers onRestore', () => {
    const onRestore = vi.fn();
    const task = makeTask({
      kind: 'TASK',
      deletedAt: '2026-09-30T15:00:00.000Z'
    });
    const html = renderToStaticMarkup(<TaskItem task={task} onRestore={onRestore} />);

    expect(html).toContain('btn-restore');
    expect(html).toContain('بازیابی');
    expect(html).not.toContain('btn-delete');
    // Checkbox is not shown for deleted task
    expect(html).not.toContain('type="checkbox"');

    // Test callback
    const element = TaskItem({ task, onRestore });
    const children = (element.props as { children: React.ReactNode[] }).children;
    const restoreBtn = children[2] as React.ReactElement<{ onClick: () => void }>;
    expect(restoreBtn.type).toBe('button');
    restoreBtn.props.onClick();
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledWith(task);
  });
});
