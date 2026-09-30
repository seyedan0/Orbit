import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AuthResponse } from '@orbit/shared-types';
import {
  RequireSession,
  SessionProvider,
  useSession
} from './session-context.js';
import { clearSession, saveAuthSession } from './local-session.js';

describe('session-context', () => {
  const dummyAuthResponse: AuthResponse = {
    accessToken: 'test-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: '3f2c9a4e-8b1d-4c6e-9f0a-1b2c3d4e5f60',
      email: 'test@example.com'
    }
  };

  it('throws error when useSession is used outside SessionProvider', () => {
    function Consumer() {
      useSession();
      return null;
    }

    expect(() => renderToStaticMarkup(<Consumer />)).toThrow(
      'useSession must be used inside SessionProvider'
    );
  });

  it('renders children and provides active session when already stored', () => {
    clearSession(window.localStorage);
    saveAuthSession(window.localStorage, dummyAuthResponse);

    function Consumer() {
      const { session, token, user } = useSession();
      return (
        <div>
          <span data-testid="user-id">{session?.userId}</span>
          <span data-testid="token">{token}</span>
          <span data-testid="email">{user?.email}</span>
        </div>
      );
    }

    const html = renderToStaticMarkup(
      <SessionProvider>
        <Consumer />
      </SessionProvider>
    );

    expect(html).toContain('3f2c9a4e-8b1d-4c6e-9f0a-1b2c3d4e5f60');
    expect(html).toContain('test-token');
    expect(html).toContain('test@example.com');
  });

  it('RequireSession does not render protected content when session is undefined', () => {
    clearSession(window.localStorage);

    const html = renderToStaticMarkup(
      <SessionProvider>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/sign-in" element={<div>Sign In Screen</div>} />
            <Route element={<RequireSession />}>
              <Route path="/protected" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    );

    expect(html).not.toContain('Protected Content');
  });

  it('RequireSession renders protected content when session is present', () => {
    clearSession(window.localStorage);
    saveAuthSession(window.localStorage, dummyAuthResponse);

    const html = renderToStaticMarkup(
      <SessionProvider>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/sign-in" element={<div>Sign In Screen</div>} />
            <Route element={<RequireSession />}>
              <Route path="/protected" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    );

    expect(html).toContain('Protected Content');
  });
});
