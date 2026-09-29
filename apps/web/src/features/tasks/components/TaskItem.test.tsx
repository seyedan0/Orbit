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
});
