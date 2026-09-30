import { randomBytes } from 'node:crypto';

const MIN_PRODUCTION_SECRET_LENGTH = 32;
const DEFAULT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

export const JWT_ALGORITHM = 'HS256';

let ephemeralSecret: string | undefined;

/**
 * Resolves the JWT signing secret.
 *
 * - `JWT_SECRET` is always honoured when set.
 * - In production a missing or short secret is a startup error: there is no
 *   fallback that could silently make tokens forgeable.
 * - Outside production a random per-process secret is used, so no secret is
 *   ever hardcoded. Tokens then stop working after a restart; set `JWT_SECRET`
 *   locally to keep sessions across restarts.
 */
export function resolveJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.JWT_SECRET?.trim();
  const isProduction = env.NODE_ENV === 'production';

  if (configured) {
    if (isProduction && configured.length < MIN_PRODUCTION_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`
      );
    }
    return configured;
  }

  if (isProduction) {
    throw new Error('JWT_SECRET must be set in production');
  }

  ephemeralSecret ??= randomBytes(48).toString('hex');
  return ephemeralSecret;
}

/** Access token lifetime in seconds (`JWT_EXPIRES_IN_SECONDS`, default 7 days). */
export function resolveJwtExpiresInSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.JWT_EXPIRES_IN_SECONDS;
  if (raw === undefined || raw.trim() === '') return DEFAULT_EXPIRES_IN_SECONDS;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be a positive integer');
  }
  return parsed;
}
