import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../auth/session-context';

const NAV_ITEMS = [
  { to: '/inbox', label: 'صندوق ورودی' },
  { to: '/settings', label: 'تنظیمات' }
] as const;

export function AppShell() {
  const { signOut } = useSession();

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <h1 className="shell__brand">Orbit</h1>
        <nav aria-label="ناوبری اصلی">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" onClick={signOut}>
          خروج
        </button>
      </aside>
      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
}
