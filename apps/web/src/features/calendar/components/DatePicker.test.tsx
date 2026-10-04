import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DatePicker } from './DatePicker';

describe('DatePicker Component (P4-CAL-001)', () => {
  it('renders trigger button with placeholder when value is null', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(
      <DatePicker value={null} onChange={onChange} placeholder="تعیین تاریخ" />
    );

    expect(html).toContain('datepicker-trigger');
    expect(html).toContain('تعیین تاریخ');
    expect(html).not.toContain('datepicker-trigger-clear');
  });

  it('renders trigger button with formatted Persian date when value is provided', () => {
    const onChange = vi.fn();
    // 2026-10-05T12:00:00.000Z -> 13 Mehr 1405
    const html = renderToStaticMarkup(
      <DatePicker
        value="2026-10-05T12:00:00.000Z"
        isAllDay={true}
        onChange={onChange}
        defaultCalendar="jalali"
      />
    );

    expect(html).toContain('۱۳ مهر');
    expect(html).toContain('datepicker-trigger-clear');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('renders time in trigger button when isAllDay is false', () => {
    const onChange = vi.fn();
    const date = new Date(2026, 9, 5, 14, 30);
    const html = renderToStaticMarkup(
      <DatePicker
        value={date.toISOString()}
        isAllDay={false}
        onChange={onChange}
        defaultCalendar="jalali"
      />
    );

    expect(html).toContain('۱۳ مهر');
    expect(html).toContain('۱۴:۳۰');
  });

  it('renders disabled state correctly', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(
      <DatePicker value={null} onChange={onChange} disabled={true} />
    );

    expect(html).toContain('disabled=""');
  });

  it('verifies DatePicker renders properly as JSX element', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(
      <DatePicker
        value="2026-10-05T00:00:00.000Z"
        isAllDay={true}
        onChange={onChange}
        defaultCalendar="jalali"
      />
    );

    expect(html).toContain('datepicker-trigger');
    expect(html).toContain('۱۳ مهر');
  });
});
