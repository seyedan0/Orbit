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

  it('renders reminder selector dropdown disabled when dueDate is not set', () => {
    const onSubmit = vi.fn();
    const html = renderToStaticMarkup(<TaskForm onSubmit={onSubmit} />);

    expect(html).toContain('task-reminder-select');
    expect(html).toContain('data-testid="task-reminder-select"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('در زمان سررسید');
    expect(html).toContain('۱۵ دقیقه قبل');
  });

  it('renders reminder selector dropdown enabled when defaultDueDate is provided', () => {
    const onSubmit = vi.fn();
    const html = renderToStaticMarkup(
      <TaskForm
        onSubmit={onSubmit}
        defaultDueDate="2026-10-15T12:00:00.000Z"
      />
    );

    expect(html).toContain('task-reminder-select');
    expect(html).not.toContain('disabled=""');
  });

  describe('Natural Language Date Detection (P4-NLP-001)', () => {
    it('renders smart date suggestion chip when title contains natural date keyword', () => {
      const onSubmit = vi.fn();
      const html = renderToStaticMarkup(
        <TaskForm onSubmit={onSubmit} defaultTitle="جلسه فردا ساعت ۱۰ با مدیر" />
      );

      expect(html).toContain('smart-date-chip');
      expect(html).toContain('data-testid="smart-date-chip"');
      expect(html).toContain('🗓️');
      expect(html).toContain('فردا');
      expect(html).toContain('۱۰:۰۰');

      // Reminder selector should also be enabled automatically by smart date
      expect(html).toContain('data-testid="task-reminder-select"');
      expect(html).not.toContain('disabled=""');
    });

    it('does not render smart date chip when title contains no date/time tokens', () => {
      const onSubmit = vi.fn();
      const html = renderToStaticMarkup(
        <TaskForm onSubmit={onSubmit} defaultTitle="خرید شیر و پنیر" />
      );

      expect(html).not.toContain('smart-date-chip');
      expect(html).not.toContain('data-testid="smart-date-chip"');
    });

    it('renders smart date chip for English keywords like tomorrow at 5pm', () => {
      const onSubmit = vi.fn();
      const html = renderToStaticMarkup(
        <TaskForm onSubmit={onSubmit} defaultTitle="Deploy website tomorrow at 5pm" />
      );

      expect(html).toContain('smart-date-chip');
      expect(html).toContain('data-testid="smart-date-chip"');
      expect(html).toContain('🗓️');
      expect(html).toContain('فردا');
      expect(html).toContain('۱۷:۰۰');
    });
  });
});
