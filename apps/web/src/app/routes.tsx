import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireSession } from '../core/auth/session-context';
import { SignInPage } from '../features/auth/pages/SignInPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { CalendarPage } from '../features/calendar/pages/CalendarPage';
import { InboxPage } from '../features/tasks/pages/InboxPage';
import { TodayPage } from '../features/tasks/pages/TodayPage';
import { TomorrowPage } from '../features/tasks/pages/TomorrowPage';
import { SmartListPage } from '../features/filters/pages/SmartListPage';
import { EisenhowerMatrixPage } from '../features/matrix/pages/EisenhowerMatrixPage';
import { TimelinePage } from '../features/timeline/pages/TimelinePage';
import { FocusPage } from '../features/pomodoro/pages/FocusPage';
import { TrashPage } from '../features/tasks/pages/TrashPage';
import { ArchivePage } from '../features/tasks/pages/ArchivePage';
import { AppShell } from '../layout/AppShell';
import { NotFoundPage } from './NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<RequireSession />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/inbox" replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/tomorrow" element={<TomorrowPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/matrix" element={<EisenhowerMatrixPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/filters/:filterId" element={<SmartListPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
