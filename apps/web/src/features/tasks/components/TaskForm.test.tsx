import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TaskForm } from './TaskForm';

describe('TaskForm Component (P4-CAL-001)', () => {
  it('renders input, datepicker, and submit button', () => {
    const onSubmit = vi.fn();
    const html = renderToStaticMarkup(<TaskForm onSubmit={onSubmit} />);

    expect(html).toContain('task-input');
    expect(html).toContain('عنوان task جدید…');
    expect(html).toContain('btn-primary');
    expect(html).toContain('datepicker-trigger');
  });

  it('renders pre-populated dueDate when defaultDueDate is provided', () => {
    const onSubmit = vi.fn();
    // 2026-10-05T00:00:00.000Z -> 13 Mehr
    const html = renderToStaticMarkup(
      <TaskForm
        onSubmit={onSubmit}
        defaultDueDate="2026-10-05T00:00:00.000Z"
        defaultIsAllDay={true}
      />
    );

    expect(html).toContain('۱۳ مهر');
  });

  it('renders repeat selector dropdown with standard presets', () => {
    const onSubmit = vi.fn();
    const html = renderToStaticMarkup(<TaskForm onSubmit={onSubmit} />);

    expect(html).toContain('task-repeat-select');
    expect(html).toContain('data-testid="task-repeat-select"');
    expect(html).toContain('روزانه');
    expect(html).toContain('هفتگی');
    expect(html).toContain('بدون تکرار');
  });
});
