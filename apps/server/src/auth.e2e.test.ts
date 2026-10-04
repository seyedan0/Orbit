import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { AuthResponse, MutationPayload } from '@orbit/shared-types';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { UserEntity } from './database/entities/index.js';
import { SYNC_REPOSITORY } from './sync/interfaces/sync-repository.interface.js';
import { InMemorySyncRepository } from './sync/repositories/in-memory-sync.repository.js';
import {
  TEST_PASSWORD,
  bearer,
  deleteTestUsers,
  registerTestUser,
  uniqueTestEmail
} from './testing/auth-test-helpers.js';

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function makeMutation(entityId: string): MutationPayload {
  return {
    id: `mut-${entityId}`,
    idempotencyKey: `key-${entityId}`,
    entityType: 'TASK',
    entityId,
    operation: 'CREATE',
    baseVersion: 0,
    payloadType: 'FULL',
    payload: { title: 'Auth test task' },
    fieldTimestamps: { title: '2026-09-30T10:00:00.000Z' },
    createdAt: '2026-09-30T10:00:00.000Z'
  };
}

describe('Authentication (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let syncRepo: InMemorySyncRepository;
  const createdUserIds: string[] = [];

  const http = () => request(app.getHttpServer());

  async function createUser(label: string): Promise<AuthResponse> {
    const session = await registerTestUser(app, label);
    createdUserIds.push(session.user.id);
    return session;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SYNC_REPOSITORY)
      .useClass(InMemorySyncRepository)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    dataSource = moduleRef.get<DataSource>(getDataSourceToken());
    jwtService = moduleRef.get(JwtService, { strict: false });
    syncRepo = moduleRef.get<InMemorySyncRepository>(SYNC_REPOSITORY);
  });

  afterAll(async () => {
    if (dataSource) await deleteTestUsers(dataSource, createdUserIds);
    if (app) await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates an account and returns a token and public user info', async () => {
      const email = uniqueTestEmail('register');
      const res = await http().post('/api/v1/auth/register').send({ email, password: TEST_PASSWORD });

      expect(res.status).toBe(201);
      createdUserIds.push(res.body.user.id);
      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: expect.any(Number),
        user: { id: expect.stringMatching(/^[0-9a-f-]{36}$/), email }
      });
      expect(Object.keys(res.body.user).sort()).toEqual(['email', 'id']);
    });

    it('generates a UUIDv4 user id', async () => {
      const session = await createUser('uuid');
      expect(session.user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('stores only a bcrypt hash and never returns it', async () => {
      const email = uniqueTestEmail('hash');
      const res = await http().post('/api/v1/auth/register').send({ email, password: TEST_PASSWORD });
      createdUserIds.push(res.body.user.id);

      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain(TEST_PASSWORD);
      expect(serialized).not.toContain('$2');
      expect(serialized.toLowerCase()).not.toContain('passwordhash');

      const stored = await dataSource.getRepository(UserEntity).findOne({
        where: { id: res.body.user.id },
        select: { id: true, passwordHash: true }
      });
      expect(stored?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      expect(stored?.passwordHash).not.toContain(TEST_PASSWORD);

      // select:false keeps the hash out of ordinary reads.
      const plain = await dataSource.getRepository(UserEntity).findOne({
        where: { id: res.body.user.id }
      });
      expect(plain?.passwordHash).toBeUndefined();
    });

    it('normalizes the email (trim + lowercase)', async () => {
      const base = uniqueTestEmail('normalize');
      const res = await http()
        .post('/api/v1/auth/register')
        .send({ email: `  ${base.toUpperCase()}  `, password: TEST_PASSWORD });

      expect(res.status).toBe(201);
      createdUserIds.push(res.body.user.id);
      expect(res.body.user.email).toBe(base);
    });

    it('rejects a duplicate email, including a different-case variant, with 409', async () => {
      const email = uniqueTestEmail('dup');
      const first = await http().post('/api/v1/auth/register').send({ email, password: TEST_PASSWORD });
      expect(first.status).toBe(201);
      createdUserIds.push(first.body.user.id);

      const second = await http()
        .post('/api/v1/auth/register')
        .send({ email: email.toUpperCase(), password: TEST_PASSWORD });

      expect(second.status).toBe(409);
      expect(second.body).toMatchObject({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('lets exactly one of two concurrent registrations for the same email win', async () => {
      const email = uniqueTestEmail('race');
      const [a, b] = await Promise.all([
        http().post('/api/v1/auth/register').send({ email, password: TEST_PASSWORD }),
        http().post('/api/v1/auth/register').send({ email, password: TEST_PASSWORD })
      ]);

      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([201, 409]);
      for (const res of [a, b]) {
        if (res.status === 201) createdUserIds.push(res.body.user.id);
      }
    });

    it.each([
      ['missing body', undefined],
      ['non-object body', 'just a string'],
      ['missing email', { password: TEST_PASSWORD }],
      ['blank email', { email: '   ', password: TEST_PASSWORD }],
      ['malformed email', { email: 'not-an-email', password: TEST_PASSWORD }],
      ['non-string email', { email: 42, password: TEST_PASSWORD }],
      ['missing password', { email: 'valid@example.test' }],
      ['short password', { email: 'valid@example.test', password: 'short' }],
      ['non-string password', { email: 'valid@example.test', password: 12345678 }],
      ['password over 72 bytes', { email: 'valid@example.test', password: 'a'.repeat(73) }]
    ])('rejects invalid input with 400 (%s)', async (_label, body) => {
      const req = http().post('/api/v1/auth/register');
      const res = await (body === undefined ? req : req.send(body as object | string));

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('POST /auth/login', () => {
    it('returns a token for valid credentials', async () => {
      const email = uniqueTestEmail('login');
      const reg = await http().post('/api/v1/auth/register').send({ email, password: TEST_PASSWORD });
      createdUserIds.push(reg.body.user.id);

      const res = await http().post('/api/v1/auth/login').send({ email, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: reg.body.user.id, email });
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('accepts the email in a different case and with whitespace', async () => {
      const email = uniqueTestEmail('login-case');
      const reg = await http().post('/api/v1/auth/register').send({ email, password: TEST_PASSWORD });
      createdUserIds.push(reg.body.user.id);

      const res = await http()
        .post('/api/v1/auth/login')
        .send({ email: ` ${email.toUpperCase()} `, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(reg.body.user.id);
    });

    it('gives the same 401 for a wrong password and an unknown email', async () => {
      const email = uniqueTestEmail('login-bad');
      const reg = await http().post('/api/v1/auth/register').send({ email, password: TEST_PASSWORD });
      createdUserIds.push(reg.body.user.id);

      const wrongPassword = await http()
        .post('/api/v1/auth/login')
        .send({ email, password: 'definitely-wrong' });
      const unknownEmail = await http()
        .post('/api/v1/auth/login')
        .send({ email: uniqueTestEmail('nobody'), password: TEST_PASSWORD });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body.code).toBe('UNAUTHORIZED');
      expect(unknownEmail.body.code).toBe('UNAUTHORIZED');
      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    it('rejects a user without a stored password hash', async () => {
      const email = uniqueTestEmail('legacy');
      const id = '00000000-0000-4000-8000-00000000c0de';
      await dataSource.getRepository(UserEntity).save({ id, email, passwordHash: null });
      createdUserIds.push(id);

      const res = await http().post('/api/v1/auth/login').send({ email, password: TEST_PASSWORD });
      expect(res.status).toBe(401);
    });

    it.each([
      ['missing body', undefined],
      ['missing email', { password: TEST_PASSWORD }],
      ['missing password', { email: 'valid@example.test' }]
    ])('rejects invalid input with 400 (%s)', async (_label, body) => {
      const req = http().post('/api/v1/auth/login');
      const res = await (body === undefined ? req : req.send(body));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /auth/me', () => {
    it('returns the authenticated profile for a valid token', async () => {
      const session = await createUser('me');
      const res = await http()
        .get('/api/v1/auth/me')
        .set('Authorization', bearer(session.accessToken));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(session.user);
    });

    it('rejects a missing token with 401 UNAUTHORIZED', async () => {
      const res = await http().get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ code: 'UNAUTHORIZED', requestId: expect.any(String) });
    });

    it('rejects a garbage token', async () => {
      const res = await http().get('/api/v1/auth/me').set('Authorization', bearer('not.a.jwt'));
      expect(res.status).toBe(401);
    });

    it('rejects a non-Bearer scheme', async () => {
      const session = await createUser('scheme');
      const res = await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Basic ${session.accessToken}`);
      expect(res.status).toBe(401);
    });

    it('rejects an expired token', async () => {
      const session = await createUser('expired');
      const expired = jwtService.sign(
        { sub: session.user.id, email: session.user.email },
        { expiresIn: -60 }
      );

      const res = await http().get('/api/v1/auth/me').set('Authorization', bearer(expired));
      expect(res.status).toBe(401);
    });

    it('rejects a token signed with a different secret', async () => {
      const session = await createUser('forged');
      const forged = new JwtService({ secret: 'x'.repeat(48) }).sign({
        sub: session.user.id,
        email: session.user.email
      });

      const res = await http().get('/api/v1/auth/me').set('Authorization', bearer(forged));
      expect(res.status).toBe(401);
    });

    it('rejects an unsigned token using alg "none"', async () => {
      const session = await createUser('alg-none');
      const unsigned = `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({
        sub: session.user.id,
        email: session.user.email,
        exp: Math.floor(Date.now() / 1000) + 3600
      })}.`;

      const res = await http().get('/api/v1/auth/me').set('Authorization', bearer(unsigned));
      expect(res.status).toBe(401);
    });

    it('rejects a valid token whose user no longer exists', async () => {
      const session = await createUser('deleted');
      await deleteTestUsers(dataSource, [session.user.id]);

      const res = await http()
        .get('/api/v1/auth/me')
        .set('Authorization', bearer(session.accessToken));
      expect(res.status).toBe(401);
    });
  });

  describe('Sync route protection', () => {
    it('rejects push and pull without a token', async () => {
      const push = await http()
        .post('/api/v1/sync/push')
        .send({ mutations: [makeMutation('no-token')] });
      const pull = await http().get('/api/v1/sync/pull');

      expect(push.status).toBe(401);
      expect(pull.status).toBe(401);
      expect(push.body.code).toBe('UNAUTHORIZED');
      expect(pull.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects an x-user-id header without a token (header impersonation is gone)', async () => {
      const victim = await createUser('victim');

      const pull = await http().get('/api/v1/sync/pull').set('x-user-id', victim.user.id);
      const push = await http()
        .post('/api/v1/sync/push')
        .set('x-user-id', victim.user.id)
        .send({ mutations: [makeMutation('spoofed')] });

      expect(pull.status).toBe(401);
      expect(push.status).toBe(401);
    });

    it('does not treat an arbitrary Bearer value as a user id', async () => {
      const res = await http().get('/api/v1/sync/pull').set('Authorization', bearer('some-user-id'));
      expect(res.status).toBe(401);
    });

    it('accepts push and pull with a valid token', async () => {
      const session = await createUser('sync-ok');
      syncRepo.clear();

      const push = await http()
        .post('/api/v1/sync/push')
        .set('Authorization', bearer(session.accessToken))
        .send({ mutations: [makeMutation('ok-task')] });
      expect(push.status).toBe(200);
      expect(push.body.results).toEqual([{ mutationId: 'mut-ok-task', status: 'APPLIED' }]);

      const pull = await http()
        .get('/api/v1/sync/pull')
        .set('Authorization', bearer(session.accessToken));
      expect(pull.status).toBe(200);
      expect(pull.body.changes).toHaveLength(1);
      expect(pull.body.changes[0].title).toBe('Auth test task');
    });

    it('scopes data to the token user even when x-user-id names someone else', async () => {
      const alice = await createUser('alice');
      const bob = await createUser('bob');
      syncRepo.clear();

      const push = await http()
        .post('/api/v1/sync/push')
        .set('Authorization', bearer(alice.accessToken))
        .set('x-user-id', bob.user.id)
        .send({ mutations: [makeMutation('alice-task')] });
      expect(push.status).toBe(200);

      const bobPull = await http()
        .get('/api/v1/sync/pull')
        .set('Authorization', bearer(bob.accessToken));
      const alicePull = await http()
        .get('/api/v1/sync/pull')
        .set('Authorization', bearer(alice.accessToken));

      expect(bobPull.body.changes).toHaveLength(0);
      expect(alicePull.body.changes).toHaveLength(1);
    });

    it('keeps /health public', async () => {
      const res = await http().get('/api/v1/health');
      expect(res.status).toBe(200);
    });
  });
});
