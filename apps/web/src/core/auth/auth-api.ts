import type { AuthCredentials, AuthResponse, AuthUser } from '@orbit/shared-types';

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export interface AuthApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export class AuthApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: AuthApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '/api/v1').replace(/\/+$/, '');
    this.fetcher =
      options.fetcher ??
      ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  }

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/login', credentials);
  }

  async register(credentials: AuthCredentials): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/register', credentials);
  }

  async getMe(token: string): Promise<AuthUser> {
    const response = await this.fetcher(`${this.baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorBody = await this.safeJson(response);
      const message = errorBody?.message ?? `Request failed with status ${response.status}`;
      throw new AuthApiError(message, response.status, errorBody?.code);
    }

    return (await response.json()) as AuthUser;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = await this.safeJson(response);
      const message = errorBody?.message ?? `Request failed with status ${response.status}`;
      throw new AuthApiError(message, response.status, errorBody?.code);
    }

    return (await response.json()) as T;
  }

  private async safeJson(response: Response): Promise<{ message?: string; code?: string } | null> {
    try {
      return (await response.json()) as { message?: string; code?: string };
    } catch {
      return null;
    }
  }
}

export const defaultAuthApiClient = new AuthApiClient();
