import type { INestApplication } from '@nestjs/common';
import type { AuthResponse } from '@orbit/shared-types';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { UserEntity } from '../database/entities/index.js';

export const TEST_PASSWORD = 'correct-horse-battery';

/** Unique per call so tests never collide with each other or with real data in a shared database. */
export function uniqueTestEmail(label = 'user'): string {
  return `orbit-test-${label}-${randomUUID()}@example.test`;
}

export function bearer(accessToken: string): string {
  return `Bearer ${accessToken}`;
}

export async function registerTestUser(
  app: INestApplication,
  label = 'user'
): Promise<AuthResponse> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: uniqueTestEmail(label), password: TEST_PASSWORD });

  if (res.status !== 201) {
    throw new Error(`Test user registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body as AuthResponse;
}

export async function deleteTestUsers(dataSource: DataSource, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  await dataSource.getRepository(UserEntity).delete(userIds);
}
