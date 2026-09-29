import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { clearSession, createLocalSession, readSession, type Session } from './local-session';

interface SessionContextValue {
  session: Session | undefined;
  signIn(): void;
  signOut(): void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | undefined>(() =>
    readSession(window.localStorage)
  );

  const signIn = useCallback(() => {
    setSession(readSession(window.localStorage) ?? createLocalSession(window.localStorage));
  }, []);

  const signOut = useCallback(() => {
    clearSession(window.localStorage);
    setSession(undefined);
  }, []);

  const value = useMemo(
    () => ({ session, signIn, signOut }),
    [session, signIn, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === undefined) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

/** Auth boundary: routes nested under this require an active session. */
export function RequireSession() {
  const { session } = useSession();
  const location = useLocation();
  if (session === undefined) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
