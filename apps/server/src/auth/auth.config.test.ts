import { describe, expect, it } from 'vitest';
import { resolveJwtExpiresInSeconds, resolveJwtSecret } from './auth.config.js';

describe('resolveJwtSecret', () => {
  it('uses JWT_SECRET when set', () => {
    expect(resolveJwtSecret({ JWT_SECRET: 'my-dev-secret' })).toBe('my-dev-secret');
  });

  it('refuses to start in production without a secret', () => {
    expect(() => resolveJwtSecret({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET must be set/);
    expect(() => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: '   ' })).toThrow(
      /JWT_SECRET must be set/
    );
  });

  it('refuses a short secret in production', () => {
    expect(() => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'too-short' })).toThrow(
      /at least 32/
    );
  });

  it('accepts a long secret in production', () => {
    const secret = 's'.repeat(48);
    expect(resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: secret })).toBe(secret);
  });

  it('falls back to a stable random per-process secret outside production', () => {
    const first = resolveJwtSecret({ NODE_ENV: 'development' });
    const second = resolveJwtSecret({});
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(64);
  });
});

describe('resolveJwtExpiresInSeconds', () => {
  it('defaults to 7 days', () => {
    expect(resolveJwtExpiresInSeconds({})).toBe(604800);
    expect(resolveJwtExpiresInSeconds({ JWT_EXPIRES_IN_SECONDS: '' })).toBe(604800);
  });

  it('reads a positive integer', () => {
    expect(resolveJwtExpiresInSeconds({ JWT_EXPIRES_IN_SECONDS: '3600' })).toBe(3600);
  });

  it.each(['0', '-5', '1.5', 'abc'])('rejects %s', (value) => {
    expect(() => resolveJwtExpiresInSeconds({ JWT_EXPIRES_IN_SECONDS: value })).toThrow();
  });
});
