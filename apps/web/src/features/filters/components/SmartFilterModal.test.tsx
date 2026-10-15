import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SmartFilterEntity } from '@orbit/shared-types';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { SmartFilterModal } from './SmartFilterModal';

describe('SmartFilterModal Component (P5-BLD-001)', () => {
  it('renders nothing when isOpen is false', () => {
    const store = new MemoryLocalStore();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <SmartFilterModal
            isOpen={false}
            onClose={vi.fn()}
            onSaved={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toBe('');
  });

  it('renders modal in create mode with title, color picker, icon selector, operator buttons, and default rules', () => {
    const store = new MemoryLocalStore();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <SmartFilterModal
            isOpen={true}
            onClose={vi.fn()}
            onSaved={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="smart-filter-modal"');
    expect(html).toContain('ساخت فیلتر هوشمند جدید');
    expect(html).toContain('data-testid="filter-name-input"');
    expect(html).toContain('data-testid="filter-color-picker"');
    expect(html).toContain('data-testid="filter-icon-select"');
    expect(html).toContain('data-testid="operator-and-btn"');
    expect(html).toContain('data-testid="operator-or-btn"');
    expect(html).toContain('data-testid="add-rule-btn"');
    expect(html).toContain('data-testid="save-filter-btn"');
    expect(html).toContain('data-testid="cancel-filter-modal-btn"');
  });

  it('renders modal in edit mode with initial filter properties pre-populated', () => {
    const store = new MemoryLocalStore();
    const existingFilter: SmartFilterEntity = {
      id: 'custom-filter-1',
      userId: 'user-1',
      name: 'کارهای دارای تگ توسعه',
      color: '#10b981',
      icon: 'flag',
      rule: {
        operator: 'OR',
        rules: [
          { field: 'tags', operator: 'contains', value: 'dev' },
          { field: 'priority', operator: 'gte', value: 3 }
        ]
      },
      version: 1,
      localStatus: 'SYNCED',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z'
    };

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <SmartFilterModal
            isOpen={true}
            initialFilter={existingFilter}
            onClose={vi.fn()}
            onSaved={vi.fn()}
          />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('ویرایش فیلتر هوشمند');
    expect(html).toContain('value="کارهای دارای تگ توسعه"');
    expect(html).toContain('data-testid="rule-field-0"');
    expect(html).toContain('data-testid="rule-field-1"');
  });
});
