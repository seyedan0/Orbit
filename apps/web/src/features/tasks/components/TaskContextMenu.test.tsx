import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TaskEntity } from '@orbit/shared-types';
import { TaskContextMenu } from './TaskContextMenu';

const mockTask: TaskEntity = {
  id: 'test-task-1',
  projectId: 'inbox',
  userId: 'user-1',
  title: 'سلام',
  desc: '',
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
};

describe('TaskContextMenu Component', () => {
  it('does not render when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <TaskContextMenu
        task={mockTask}
        isOpen={false}
        onClose={vi.fn()}
        onAddSubtask={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders all 15 context menu operations categorized into 3 distinct groups', () => {
    const html = renderToStaticMarkup(
      <TaskContextMenu
        task={mockTask}
        isOpen={true}
        onClose={vi.fn()}
        onAddSubtask={vi.fn()}
      />
    );

    // Group 1: Structure, Status, Attachment & Focus
    expect(html).toContain('Add Subtask');
    expect(html).toContain('Link Parent Task');
    expect(html).toContain('Pin');
    expect(html).toContain("Won&#x27;t Do");
    expect(html).toContain('Tags');
    expect(html).toContain('Upload Attachment');
    expect(html).toContain('Start Focus');

    // Group 2: History, Template, Sharing & Conversion
    expect(html).toContain('Task Activities');
    expect(html).toContain('Save as Template');
    expect(html).toContain('Duplicate');
    expect(html).toContain('Copy Link');
    expect(html).toContain('Open as Sticky Note');
    expect(html).toContain('Convert to Note');

    // Group 3: Print & Delete
    expect(html).toContain('Print');
    expect(html).toContain('Delete');
  });
});
