import { describe, expect, it, vi } from 'vitest';
import type { AuthCredentials, AuthResponse, AuthUser } from '@orbit/shared-types';
import { AuthApiClient, AuthApiError } from './auth-api.js';

describe('AuthApiClient', () => {
  const credentials: AuthCredentials = {
    email: 'user@example.com',
    password: 'password123'
  };

  const authUser: AuthUser = {
    id: '3f2c9a4e-8b1d-4c6e-9f0a-1b2c3d4e5f60',
    email: 'user@example.com'
  };

  const authResponse: AuthResponse = {
    accessToken: 'test-jwt-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: authUser
  };

  it('normalizes base url by trimming trailing slashes', async () => {
    let capturedUrl = '';
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify(authResponse), { status: 200 });
    });

    const client = new AuthApiClient({ baseUrl: 'https://api.orbit.app/v1///', fetcher });
    await client.login(credentials);

    expect(capturedUrl).toBe('https://api.orbit.app/v1/auth/login');
  });

  it('login posts credentials and returns auth response', async () => {
    let capturedBody = '';
    let capturedHeaders: HeadersInit | undefined;
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = String(init?.body);
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify(authResponse), { status: 200 });
    });

    const client = new AuthApiClient({ baseUrl: '/api/v1', fetcher });
    const result = await client.login(credentials);

    expect(result).toEqual(authResponse);
    expect(JSON.parse(capturedBody)).toEqual(credentials);
    expect(capturedHeaders).toEqual({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });
  });

  it('register posts credentials and returns auth response', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body);
      return new Response(JSON.stringify(authResponse), { status: 201 });
    });

    const client = new AuthApiClient({ baseUrl: '/api/v1', fetcher });
    const result = await client.register(credentials);

    expect(capturedUrl).toBe('/api/v1/auth/register');
    expect(JSON.parse(capturedBody)).toEqual(credentials);
    expect(result).toEqual(authResponse);
  });

  it('getMe requests user profile with Bearer token', async () => {
    let capturedHeaders: Record<string, string> = {};
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      return new Response(JSON.stringify(authUser), { status: 200 });
    });

    const client = new AuthApiClient({ baseUrl: '/api/v1', fetcher });
    const profile = await client.getMe('valid-token');

    expect(profile).toEqual(authUser);
    expect(capturedHeaders['Authorization']).toBe('Bearer valid-token');
  });

  it('throws AuthApiError with status and message on 401 unauthorized', async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({ message: 'Invalid email or password' }),
        { status: 401 }
      );
    });

    const client = new AuthApiClient({ baseUrl: '/api/v1', fetcher });

    await expect(client.login(credentials)).rejects.toMatchObject({
      name: 'AuthApiError',
      status: 401,
      message: 'Invalid email or password'
    });
  });

  it('throws AuthApiError with error code on 409 conflict', async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'An account with this email already exists'
        }),
        { status: 409 }
      );
    });

    const client = new AuthApiClient({ baseUrl: '/api/v1', fetcher });

    try {
      await client.register(credentials);
      expect.unreachable('Should have thrown AuthApiError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AuthApiError);
      const apiErr = err as AuthApiError;
      expect(apiErr.status).toBe(409);
      expect(apiErr.code).toBe('EMAIL_ALREADY_REGISTERED');
      expect(apiErr.message).toBe('An account with this email already exists');
    }
  });
});
