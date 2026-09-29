import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireSession, SessionProvider } from '../auth/session-context';
import { IndexedDbLocalStore } from '../storage/indexeddb-local-store';
import { StoreProvider } from '../storage/store-context';
import { AppShell } from './AppShell';
import { InboxPage, NotFoundPage, SettingsPage, SignInPage } from './pages';

export function App() {
  // Created once per app lifetime; IndexedDB connection is lazy (first access).
  const [store] = useState(() => new IndexedDbLocalStore());

  return (
    <SessionProvider>
      <StoreProvider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route element={<RequireSession />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/inbox" replace />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </SessionProvider>
  );
}
