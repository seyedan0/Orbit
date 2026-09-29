export interface Session {
  userId: string;
  createdAt: string;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SESSION_STORAGE_KEY = 'orbit.session.v1';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === 'string' &&
    UUID_V4.test(candidate.userId) &&
    typeof candidate.createdAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.createdAt))
  );
}

export function readSession(storage: KeyValueStorage): Session | undefined {
  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (raw === null) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Local-only stand-in for real authentication (Phase 3).
 * The userId is generated on the client; the server must never trust it from the payload.
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
}
