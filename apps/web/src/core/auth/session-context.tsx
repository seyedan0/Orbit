import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { AuthUser } from '@orbit/shared-types';
import {
  clearSession,
  createLocalSession,
  readSession,
  saveAuthSession,
  type Session
} from './local-session.js';
import { defaultAuthApiClient, type AuthApiClient } from './auth-api.js';

export interface SessionContextValue {
  session: Session | undefined;
  token: string | undefined;
  user: AuthUser | undefined;
  isLoading: boolean;
  error: string | null;
  signIn(email?: string, password?: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): void;
  clearError(): void;
}

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export interface SessionProviderProps {
  children: ReactNode;
  apiClient?: AuthApiClient;
}

export function SessionProvider({
  children,
  apiClient = defaultAuthApiClient
}: SessionProviderProps) {
  const [session, setSession] = useState<Session | undefined>(() =>
    readSession(window.localStorage)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signIn = useCallback(
    async (email?: string, password?: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        if (email && password) {
          const res = await apiClient.login({ email, password });
          const newSession = saveAuthSession(window.localStorage, res);
          setSession(newSession);
        } else {
          // Fallback to local session creation
          const existing = readSession(window.localStorage);
          const newSession = existing ?? createLocalSession(window.localStorage);
          setSession(newSession);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sign in failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient]
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.register({ email, password });
        const newSession = saveAuthSession(window.localStorage, res);
        setSession(newSession);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient]
  );

  const signOut = useCallback(() => {
    clearSession(window.localStorage);
    setSession(undefined);
    setError(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      token: session?.token,
      user: session?.user,
      isLoading,
      error,
      signIn,
      signUp,
      signOut,
      clearError
    }),
    [session, isLoading, error, signIn, signUp, signOut, clearError]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === undefined) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

export function useOptionalSession(): SessionContextValue | undefined {
  return useContext(SessionContext);
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
