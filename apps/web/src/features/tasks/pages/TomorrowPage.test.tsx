import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryLocalStore } from '../../../core/storage/memory-local-store';
import { StoreProvider } from '../../../core/storage/store-context';
import { SessionProvider } from '../../../core/auth/session-context';
import { TomorrowPage } from './TomorrowPage';

describe('TomorrowPage View (P4-CAL-001)', () => {
  it('renders TomorrowPage with heading, Persian date label, TaskForm, and loading message initially', () => {
    const store = new MemoryLocalStore();
    const html = renderToStaticMarkup(
      <SessionProvider>
        <StoreProvider store={store}>
          <TomorrowPage />
        </StoreProvider>
      </SessionProvider>
    );

    expect(html).toContain('data-testid="tomorrow-page"');
    expect(html).toContain('فردا');
    expect(html).toContain('data-testid="tomorrow-date-label"');
    expect(html).toContain('task-input');
    expect(html).toContain('datepicker-trigger');
    expect(html).toContain('loading-msg');
  });
});
