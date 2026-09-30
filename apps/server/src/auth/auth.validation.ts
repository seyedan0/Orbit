import { BadRequestException } from '@nestjs/common';

export const MAX_EMAIL_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt silently ignores bytes beyond 72, so longer passwords are rejected instead of truncated. */
export const MAX_PASSWORD_BYTES = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

/** Strict validation used when creating an account. */
export function parseRegisterBody(body: unknown): { email: string; password: string } {
  const record = asRecord(body);
  const { email, password } = record;

  if (typeof email !== 'string' || email.trim().length === 0) {
    throw new BadRequestException('email is required');
  }
  const normalized = normalizeEmail(email);
  if (normalized.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalized)) {
    throw new BadRequestException('email is not a valid email address');
  }

  if (typeof password !== 'string') {
    throw new BadRequestException('password is required');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestException(
      `password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new BadRequestException(
      `password must be at most ${MAX_PASSWORD_BYTES} bytes`
    );
  }

  return { email: normalized, password };
}

/**
 * Lenient validation used when signing in: only types are checked so that
 * malformed and unknown credentials are indistinguishable to the caller.
 */
export function parseLoginBody(body: unknown): { email: string; password: string } {
  const record = asRecord(body);
  const { email, password } = record;

  if (typeof email !== 'string' || email.trim().length === 0) {
    throw new BadRequestException('email is required');
  }
  if (typeof password !== 'string' || password.length === 0) {
    throw new BadRequestException('password is required');
  }

  return { email: normalizeEmail(email), password };
}
