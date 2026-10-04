import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from '../core/auth/session-context';
import { IndexedDbLocalStore } from '../core/storage/indexeddb-local-store';
import { StoreProvider } from '../core/storage/store-context';
import { SyncProvider } from '../core/sync/sync-context';
import { AppRoutes } from './routes';

export function App() {
  // Created once per app lifetime; IndexedDB connection is lazy (first access).
  const [store] = useState(() => new IndexedDbLocalStore());

  return (
    <SessionProvider>
      <StoreProvider store={store}>
        <SyncProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SyncProvider>
      </StoreProvider>
    </SessionProvider>
  );
}
