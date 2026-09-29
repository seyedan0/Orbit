import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireSession } from '../core/auth/session-context';
import { SignInPage } from '../features/auth/pages/SignInPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { InboxPage } from '../features/tasks/pages/InboxPage';
import { AppShell } from '../layout/AppShell';
import { NotFoundPage } from './NotFoundPage';

export function AppRoutes() {
  return (
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
  );
}
