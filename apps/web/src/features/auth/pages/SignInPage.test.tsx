import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { AuthResponse } from '@orbit/shared-types';
import { SessionProvider } from '../../../core/auth/session-context.js';
import { clearSession, saveAuthSession } from '../../../core/auth/local-session.js';
import { SignInPage } from './SignInPage.js';

describe('SignInPage', () => {
  it('renders auth form with tabs, email and password fields in sign in mode', () => {
    clearSession(window.localStorage);

    const html = renderToStaticMarkup(
      <SessionProvider>
        <MemoryRouter initialEntries={['/sign-in']}>
          <SignInPage />
        </MemoryRouter>
      </SessionProvider>
    );

    expect(html).toContain('Orbit');
    expect(html).toContain('data-testid="tab-signin"');
    expect(html).toContain('data-testid="tab-signup"');
    expect(html).toContain('data-testid="input-email"');
    expect(html).toContain('data-testid="input-password"');
    expect(html).toContain('data-testid="auth-submit"');
    expect(html).toContain('ورود به حساب');
  });

  it('redirects to inbox when session is already active', () => {
    clearSession(window.localStorage);
    const authResponse: AuthResponse = {
      accessToken: 'dummy-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: '3f2c9a4e-8b1d-4c6e-9f0a-1b2c3d4e5f60',
        email: 'user@example.com'
      }
    };
    saveAuthSession(window.localStorage, authResponse);

    const html = renderToStaticMarkup(
      <SessionProvider>
        <MemoryRouter initialEntries={['/sign-in']}>
          <SignInPage />
        </MemoryRouter>
      </SessionProvider>
    );

    // When already authenticated, SignInPage renders Navigate and does not render the form card
    expect(html).not.toContain('data-testid="auth-submit"');
  });
});
