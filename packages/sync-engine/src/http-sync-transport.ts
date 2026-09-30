import type {
  MutationPayload,
  PullResponse
} from '@orbit/shared-types';
import type {
  PushResult,
  SyncTransport
} from './ports.js';

export type HttpFetcher = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export interface HttpSyncTransportOptions {
  baseUrl: string;
  fetcher?: HttpFetcher;
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  timeoutMs?: number;
  onUnauthorized?: () => void;
}

export class HttpSyncError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly isRetryable: boolean,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'HttpSyncError';
  }
}

/**
 * Checks whether an HTTP status code represents a temporary/retryable failure.
 * 429 (Rate Limited) and 5xx (Server Error) are retryable.
 * 4xx (Client Error) are non-retryable.
 */
export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * HTTP implementation of SyncTransport using standard fetch.
 * Follows docs/api/README.md for push and pull contracts.
 */
export class HttpSyncTransport implements SyncTransport {
  private readonly baseUrl: string;
  private readonly fetcher: HttpFetcher;
  private readonly getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  private readonly timeoutMs: number;
  private readonly onUnauthorized?: () => void;

  constructor(options: HttpSyncTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    if (options.getHeaders) {
      this.getHeaders = options.getHeaders;
    }
    this.timeoutMs = options.timeoutMs ?? 15000;
    if (options.onUnauthorized) {
      this.onUnauthorized = options.onUnauthorized;
    }
  }

  async pull(cursor: string | undefined, limit: number): Promise<PullResponse> {
    const params = new URLSearchParams();
    if (cursor) {
      params.set('cursor', cursor);
    }
    params.set('limit', String(limit));

    const url = `${this.baseUrl}/sync/pull?${params.toString()}`;
    const response = await this.executeFetch(url, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorBody = await this.safeJson(response);
      const message = errorBody?.message ?? `Pull failed with status ${response.status}`;
      const code = errorBody?.code;
      const isRetryable = isRetryableHttpStatus(response.status);
      throw new HttpSyncError(message, response.status, isRetryable, code);
    }

    const data = await response.json() as PullResponse;
    return {
      changes: data.changes ?? [],
      nextCursor: data.nextCursor ?? (cursor ?? ''),
      hasMore: Boolean(data.hasMore)
    };
  }

  async push(mutations: MutationPayload[]): Promise<PushResult[]> {
    if (mutations.length === 0) {
      return [];
    }

    const url = `${this.baseUrl}/sync/push`;
    const response = await this.executeFetch(url, {
      method: 'POST',
      body: JSON.stringify({ mutations })
    });

    if (!response.ok) {
      const errorBody = await this.safeJson(response);
      const message = errorBody?.message ?? `Push failed with HTTP ${response.status}`;
      const isRetryable = isRetryableHttpStatus(response.status);

      // Map batch-level failure to individual results:
      // 5xx / 429 -> RETRYABLE_ERROR
      // 4xx -> REJECTED
      const status = isRetryable ? 'RETRYABLE_ERROR' : 'REJECTED';

      return mutations.map((m) => ({
        mutationId: m.id,
        status,
        error: message
      }));
    }

    const data = await response.json() as { results?: PushResult[] } | PushResult[];
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data.results)) {
      return data.results;
    }

    return mutations.map((m) => ({
      mutationId: m.id,
      status: 'APPLIED'
    }));
  }

  private async executeFetch(url: string, init: RequestInit): Promise<Response> {
    const customHeaders = this.getHeaders ? await this.getHeaders() : {};
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(url, {
        ...init,
        headers,
        signal: controller.signal
      });
      if (response.status === 401 && this.onUnauthorized) {
        this.onUnauthorized();
      }
      return response;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new HttpSyncError(`Request timeout after ${this.timeoutMs}ms`, 0, true);
      }
      if (err instanceof HttpSyncError) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpSyncError(msg, 0, true);
    } finally {
      clearTimeout(timer);
    }
  }

  private async safeJson(response: Response): Promise<{ message?: string; code?: string } | null> {
    try {
      return (await response.json()) as { message?: string; code?: string };
    } catch {
      return null;
    }
  }
}
