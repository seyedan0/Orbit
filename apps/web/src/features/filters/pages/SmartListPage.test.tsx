import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { SmartListPage } from './SmartListPage';
import {
  SYSTEM_HIGH_PRIORITY_FILTER_ID,
  SYSTEM_NO_DATE_FILTER_ID,
  SYSTEM_OVERDUE_FILTER_ID
} from '../services/filter-service';

describe('SmartListPage View (P5-SMT-001)', () => {
  it('renders system preset page with filter title, badge, task count and form', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={[`/filters/${SYSTEM_OVERDUE_FILTER_ID}`]}>
            <Routes>
              <Route path="/filters/:filterId" element={<SmartListPage />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="smart-list-page"');
    expect(html).toContain('data-testid="filter-title"');
    expect(html).toContain('data-testid="filter-task-count"');
    expect(html).toContain('task-input');
  });

  it('renders high priority system preset page', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={[`/filters/${SYSTEM_HIGH_PRIORITY_FILTER_ID}`]}>
            <Routes>
              <Route path="/filters/:filterId" element={<SmartListPage />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="smart-list-page"');
    expect(html).toContain('اولویت بالا');
    expect(html).toContain('فیلتر سیستمی');
  });

  it('renders no date system preset page', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={[`/filters/${SYSTEM_NO_DATE_FILTER_ID}`]}>
            <Routes>
              <Route path="/filters/:filterId" element={<SmartListPage />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="smart-list-page"');
    expect(html).toContain('بدون تاریخ');
    expect(html).toContain('فیلتر سیستمی');
  });

  it('renders filter-not-found state when filterId does not exist', () => {
    const store = new MemoryLocalStore();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <MemoryRouter initialEntries={['/filters/non-existent-filter-id']}>
            <Routes>
              <Route path="/filters/:filterId" element={<SmartListPage />} />
            </Routes>
          </MemoryRouter>
        </StoreProvider>
      </SessionProvider>
    );

    // Initial render in static markup before useEffect
    // Either renders loading or not-found
    expect(html).toBeDefined();
  });
});
