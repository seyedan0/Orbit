import { describe, expect, it } from 'vitest';
import {
  SESSION_STORAGE_KEY,
  clearSession,
  createLocalSession,
  readSession,
  type KeyValueStorage
} from './local-session';

function fakeStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key)
  };
}

const VALID_ID = '3f2c9a4e-8b1d-4c6e-9f0a-1b2c3d4e5f60';

describe('local session', () => {
  it('returns undefined when no session is stored', () => {
    expect(readSession(fakeStorage())).toBeUndefined();
  });

  it('persists and reads back a created session', () => {
    const storage = fakeStorage();
    const session = createLocalSession(
      storage,
      () => new Date('2026-09-29T10:00:00.000Z'),
      () => VALID_ID
    );
    expect(session).toEqual({ userId: VALID_ID, createdAt: '2026-09-29T10:00:00.000Z' });
    expect(readSession(storage)).toEqual(session);
  });

  it('rejects corrupt JSON', () => {
    const storage = fakeStorage();
    storage.setItem(SESSION_STORAGE_KEY, '{not json');
    expect(readSession(storage)).toBeUndefined();
  });

  it('rejects a session whose userId is not a UUIDv4', () => {
    const storage = fakeStorage();
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ userId: 'user-1', createdAt: '2026-09-29T10:00:00.000Z' })
    );
    expect(readSession(storage)).toBeUndefined();
  });

  it('clears the session', () => {
    const storage = fakeStorage();
    createLocalSession(storage, undefined, () => VALID_ID);
    clearSession(storage);
    expect(readSession(storage)).toBeUndefined();
  });
});
