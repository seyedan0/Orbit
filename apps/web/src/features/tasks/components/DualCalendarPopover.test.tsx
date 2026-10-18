import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DualCalendarPopover } from './DualCalendarPopover';

describe('DualCalendarPopover Component', () => {
  it('does not render when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <DualCalendarPopover
        isOpen={false}
        onClose={vi.fn()}
        selectedDate="2026-10-18T00:00:00.000Z"
        onSave={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders DualCalendarPopover with segmented tabs, quick shortcuts, dual grid, and actions', () => {
    const html = renderToStaticMarkup(
      <DualCalendarPopover
        isOpen={true}
        onClose={vi.fn()}
        selectedDate="2026-10-18T00:00:00.000Z"
        onSave={vi.fn()}
      />
    );

    // Segmented Tabs
    expect(html).toContain('Date');
    expect(html).toContain('Duration');

    // Quick Date Shortcuts
    expect(html).toContain('Today');
    expect(html).toContain('Tomorrow');
    expect(html).toContain('+7 Days');
    expect(html).toContain('Evening');

    // Month & Year header
    expect(html).toContain('Oct 2026');

    // Weekdays starting from Saturday (S, S, M, T, W, T, F)
    expect(html).toContain('S');
    expect(html).toContain('M');
    expect(html).toContain('T');
    expect(html).toContain('W');
    expect(html).toContain('F');

    // Dual Date cell for 2026-10-18 (Gregorian 18, Jalali 26 Mehr)
    expect(html).toContain('data-testid="cal-cell-2026-10-18"');
    expect(html).toContain('18');
    expect(html).toContain('26');

    // Jalali Month Start badge (23 Oct 2026 is 1 Aban -> displays 'Aban')
    expect(html).toContain('data-testid="cal-cell-2026-10-23"');
    expect(html).toContain('Aban');

    // Expandable scheduling rows
    expect(html).toContain('Time');
    expect(html).toContain('Reminder');
    expect(html).toContain('Repeat');

    // Footer buttons
    expect(html).toContain('data-testid="cal-confirm-btn"');
    expect(html).toContain('OK');
    expect(html).toContain('data-testid="cal-clear-btn"');
    expect(html).toContain('Clear');
  });
});
