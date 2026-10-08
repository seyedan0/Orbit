import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { FakeSyncTransport } from '@orbit/sync-engine';
import { SessionProvider } from '../core/auth/session-context.js';
import { MemoryLocalStore } from '../core/storage/memory-local-store.js';
import { StoreProvider } from '../core/storage/store-context.js';
import { SyncProvider } from '../core/sync/sync-context.js';
import { AppShell } from './AppShell.js';

describe('AppShell with sync status integration', () => {
  it('renders the sync status badge and manual sync button', () => {
    const store = new MemoryLocalStore();
    const transport = new FakeSyncTransport();

    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <SyncProvider transport={transport}>
            <MemoryRouter>
              <AppShell />
            </MemoryRouter>
          </SyncProvider>
        </StoreProvider>
      </SessionProvider>
    );

    // Verify nav items
    expect(html).toContain('امروز');
    expect(html).toContain('فردا');
    expect(html).toContain('تقویم');
    expect(html).toContain('صندوق ورودی');
    expect(html).toContain('تنظیمات');

    // Verify sync status badge
    expect(html).toContain('data-testid="sync-status"');
    expect(html).toContain('همگام');

    // Verify manual sync button
    expect(html).toContain('data-testid="sync-button"');
    expect(html).toContain('همگام‌سازی');

    // Verify sign-out button
    expect(html).toContain('خروج');
  });
});
