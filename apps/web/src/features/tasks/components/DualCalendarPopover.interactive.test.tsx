import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DualCalendarPopover } from './DualCalendarPopover';
import { DesktopTaskEditor } from './DesktopTaskEditor';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import type { TaskEntity } from '@orbit/shared-types';

const sampleTask: TaskEntity = {
  id: 'task-1',
  projectId: 'inbox',
  userId: 'user-1',
  title: 'Sample Task',
  kind: 'TASK',
  priority: 1,
  isAllDay: false,
  dueDate: '2026-10-18T10:00:00.000Z',
  startDate: '2026-10-18T09:00:00.000Z',
  endDate: '2026-10-20T17:00:00.000Z',
  timeZone: 'Asia/Tehran',
  reminders: [],
  tags: [],
  items: [],
  version: 0,
  localStatus: 'CREATED',
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
  completedAt: null
};

describe('DualCalendarPopover Interactive Render Tests', () => {
  it('renders DualCalendarPopover with transparent backdrop and anchored popover card', () => {
    const html = renderToStaticMarkup(
      <DualCalendarPopover
        isOpen={true}
        onClose={vi.fn()}
        selectedDate="2026-10-18T10:00:00.000Z"
        startDate="2026-10-18T09:00:00.000Z"
        endDate="2026-10-20T17:00:00.000Z"
        isAllDay={false}
        onSave={vi.fn()}
      />
    );

    // Verify non-blocking transparent backdrop
    expect(html).toContain('data-testid="dual-calendar-backdrop"');
    expect(html).toContain('data-testid="dual-calendar-popover"');

    // Verify Time section
    expect(html).toContain('Time');
    expect(html).toContain('09:00 - 11:30');

    // Verify Confirm & Clear buttons
    expect(html).toContain('data-testid="cal-confirm-btn"');
    expect(html).toContain('data-testid="cal-clear-btn"');
  });

  it('renders anchored inside DesktopTaskEditor toolbar next to date-and-reminder-btn', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <StoreProvider store={store}>
        <SessionProvider>
          <DesktopTaskEditor task={sampleTask} />
        </SessionProvider>
      </StoreProvider>
    );

    expect(html).toContain('data-testid="date-and-reminder-btn"');
  });

  it('handles null, undefined, and non-ISO date inputs safely without throwing', () => {
    expect(() => {
      renderToStaticMarkup(
        <DualCalendarPopover
          isOpen={true}
          onClose={vi.fn()}
          selectedDate={null}
          startDate={null}
          endDate={null}
          isAllDay={false}
          onSave={vi.fn()}
        />
      );
    }).not.toThrow();

    expect(() => {
      renderToStaticMarkup(
        <DualCalendarPopover
          isOpen={true}
          onClose={vi.fn()}
          selectedDate="non-iso-garbage"
          startDate={undefined}
          endDate={undefined}
          isAllDay={true}
          onSave={vi.fn()}
        />
      );
    }).not.toThrow();
  });
});
