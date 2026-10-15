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

  it('renders repeat badge indicator when repeatFlag is present', () => {
    const task = makeTask({
      repeatFlag: 'FREQ=DAILY;INTERVAL=1;CAL=JALALI'
    });
    const html = renderToStaticMarkup(<TaskItem task={task} />);

    expect(html).toContain('task-repeat-badge');
    expect(html).toContain('data-testid="task-repeat-test-task-1"');
    expect(html).toContain('🔁');
  });

  it('renders reminder bell badge indicator when reminders is non-empty', () => {
    const task = makeTask({
      reminders: ['15_MIN_BEFORE']
    });
    const html = renderToStaticMarkup(<TaskItem task={task} />);

    expect(html).toContain('task-reminder-badge');
    expect(html).toContain('data-testid="task-reminder-test-task-1"');
    expect(html).toContain('🔔');
  });

  describe('Tag Badges (P5-TAG-001)', () => {
    it('renders colored tag badges when task has tags', () => {
      const task = makeTask({
        tags: ['work', 'urgent']
      });
      const html = renderToStaticMarkup(<TaskItem task={task} />);

      expect(html).toContain('task-tags-badges');
      expect(html).toContain('data-testid="task-tags-test-task-1"');
      expect(html).toContain('data-testid="task-tag-test-task-1-work"');
      expect(html).toContain('data-testid="task-tag-test-task-1-urgent"');
      expect(html).toContain('#work');
      expect(html).toContain('#urgent');
    });

    it('resolves tag display name and custom color from availableTags', () => {
      const task = makeTask({
        tags: ['tag-custom-1']
      });
      const availableTags = [
        {
          id: 'tag-custom-1',
          userId: 'u1',
          name: 'پروژه وب',
          color: '#10b981',
          version: 0,
          localStatus: 'SYNCED' as const,
          createdAt: '',
          updatedAt: ''
        }
      ];
      const html = renderToStaticMarkup(
        <TaskItem task={task} availableTags={availableTags} />
      );

      expect(html).toContain('#پروژه وب');
      expect(html).toContain('#10b981');
    });

    it('does not render tag badges when task is soft-deleted', () => {
      const task = makeTask({
        tags: ['work'],
        deletedAt: '2026-09-30T12:00:00.000Z'
      });
      const html = renderToStaticMarkup(<TaskItem task={task} />);

      expect(html).not.toContain('task-tags-badges');
      expect(html).not.toContain('#work');
    });
  });

  it('renders quick-start focus button (🍅) for open tasks with link to /focus?taskId=<id>', () => {
    const task = makeTask({ id: 'task-focus-xyz', kind: 'TASK', completedAt: null, deletedAt: null });
    const html = renderToStaticMarkup(<TaskItem task={task} />);

    expect(html).toContain('data-testid="task-focus-task-focus-xyz"');
    expect(html).toContain('href="/focus?taskId=task-focus-xyz"');
    expect(html).toContain('🍅');
  });

  it('renders multi-day span badge when startDate and dueDate span across multiple days', () => {
    const task = makeTask({
      startDate: '2026-10-10T00:00:00.000Z',
      dueDate: '2026-10-18T23:59:59.000Z'
    });
    const html = renderToStaticMarkup(<TaskItem task={task} />);

    expect(html).toContain('task-span-badge');
    expect(html).toContain('data-testid="task-span-test-task-1"');
    expect(html).toContain('تا');
  });

  it('renders subtasks progress badge when task has subtasks', () => {
    const task = makeTask({
      items: [
        { id: 's1', title: 'Part 1', isCompleted: true, order: 0 },
        { id: 's2', title: 'Part 2', isCompleted: false, order: 1 }
      ]
    });
    const html = renderToStaticMarkup(<TaskItem task={task} />);

    expect(html).toContain('task-subtasks-badge');
    expect(html).toContain('1/2');
    expect(html).toContain('50%');
  });

  it('renders delivery performance badge when task has deliveryStatus', () => {
    const earlyTask = makeTask({
      completedAt: '2026-10-14T10:00:00.000Z',
      dueDate: '2026-10-16T10:00:00.000Z',
      deliveryStatus: 'EARLY',
      completionVarianceHours: 48
    });
    const earlyHtml = renderToStaticMarkup(<TaskItem task={earlyTask} />);
    expect(earlyHtml).toContain('task-delivery-badge');
    expect(earlyHtml).toContain('۲ روز زودتر انجام شد');

    const overdueTask = makeTask({
      completedAt: '2026-10-17T10:00:00.000Z',
      dueDate: '2026-10-16T10:00:00.000Z',
      deliveryStatus: 'OVERDUE',
      completionVarianceHours: -24
    });
    const overdueHtml = renderToStaticMarkup(<TaskItem task={overdueTask} />);
    expect(overdueHtml).toContain('task-delivery-badge');
    expect(overdueHtml).toContain('۱ روز با تاخیر انجام شد');
  });

  it('triggers onSelectTask callback when clicking the task title', () => {
    const onSelect = vi.fn();
    const task = makeTask({ kind: 'TASK' });

    const element = TaskItem({ task, onSelectTask: onSelect });
    const liProps = element.props as { onClick: (e: unknown) => void; className: string };
    expect(liProps.className).toContain('clickable');

    liProps.onClick({ target: { closest: () => null } });
    expect(onSelect).toHaveBeenCalledWith(task);
  });
});
