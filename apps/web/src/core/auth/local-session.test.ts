import { describe, expect, it } from 'vitest';
import type { AuthResponse } from '@orbit/shared-types';
import {
  SESSION_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  clearSession,
  createLocalSession,
  readSession,
  readToken,
  saveAuthSession,
  type KeyValueStorage
} from './local-session.js';

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

  it('persists and reads back an authenticated session with token and user', () => {
    const storage = fakeStorage();
    const authResponse: AuthResponse = {
      accessToken: 'jwt-token-xyz',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: VALID_ID,
        email: 'user@example.com'
      }
    };

    const session = saveAuthSession(
      storage,
      authResponse,
      () => new Date('2026-09-30T12:00:00.000Z')
    );

    expect(session).toEqual({
      userId: VALID_ID,
      token: 'jwt-token-xyz',
      user: {
        id: VALID_ID,
        email: 'user@example.com'
      },
      createdAt: '2026-09-30T12:00:00.000Z'
    });

    expect(readSession(storage)).toEqual(session);
    expect(readToken(storage)).toBe('jwt-token-xyz');
    expect(storage.getItem(TOKEN_STORAGE_KEY)).toBe('jwt-token-xyz');

    clearSession(storage);
    expect(readSession(storage)).toBeUndefined();
    expect(readToken(storage)).toBeUndefined();
    expect(storage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
