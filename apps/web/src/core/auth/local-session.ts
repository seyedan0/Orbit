import type { AuthResponse, AuthUser } from '@orbit/shared-types';

export interface Session {
  userId: string;
  token?: string;
  user?: AuthUser;
  createdAt: string;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SESSION_STORAGE_KEY = 'orbit.session.v1';
export const TOKEN_STORAGE_KEY = 'orbit.token.v1';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.email === 'string';
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === 'string' &&
    UUID_V4.test(candidate.userId) &&
    typeof candidate.createdAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.createdAt)) &&
    (candidate.token === undefined || typeof candidate.token === 'string') &&
    (candidate.user === undefined || isAuthUser(candidate.user))
  );
}

export function readSession(storage: KeyValueStorage): Session | undefined {
  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (raw === null) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) return undefined;

    // Fall back to reading token from TOKEN_STORAGE_KEY if missing in session payload
    if (!parsed.token) {
      const token = storage.getItem(TOKEN_STORAGE_KEY);
      if (token) parsed.token = token;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function readToken(storage: KeyValueStorage): string | undefined {
  const directToken = storage.getItem(TOKEN_STORAGE_KEY);
  if (directToken) return directToken;
  const session = readSession(storage);
  return session?.token;
}

/**
 * Persists an authenticated user session and JWT access token in storage.
 */
export function saveAuthSession(
  storage: KeyValueStorage,
  authResponse: AuthResponse,
  now: () => Date = () => new Date()
): Session {
  const session: Session = {
    userId: authResponse.user.id,
    token: authResponse.accessToken,
    user: authResponse.user,
    createdAt: now().toISOString()
  };
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  storage.setItem(TOKEN_STORAGE_KEY, authResponse.accessToken);
  return session;
}

/**
 * Local-only stand-in for unauthenticated / offline prototyping.
 */
export function createLocalSession(
  storage: KeyValueStorage,
  now: () => Date = () => new Date(),
  newId: () => string = () => crypto.randomUUID()
): Session {
  const session: Session = { userId: newId(), createdAt: now().toISOString() };
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearSession(storage: KeyValueStorage): void {
  storage.removeItem(SESSION_STORAGE_KEY);
  storage.removeItem(TOKEN_STORAGE_KEY);
}
