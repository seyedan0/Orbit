import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { AuthResponse, AuthUser } from '@orbit/shared-types';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/index.js';
import { resolveJwtExpiresInSeconds } from './auth.config.js';
import type { JwtPayload } from './auth.types.js';
import { parseLoginBody, parseRegisterBody } from './auth.validation.js';

const BCRYPT_ROUNDS = 12;
const POSTGRES_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const candidate = err as { code?: unknown; driverError?: { code?: unknown } };
  return (
    candidate.code === POSTGRES_UNIQUE_VIOLATION ||
    candidate.driverError?.code === POSTGRES_UNIQUE_VIOLATION
  );
}

function emailTaken(): ConflictException {
  return new ConflictException({
    code: 'EMAIL_ALREADY_REGISTERED',
    message: 'An account with this email already exists'
  });
}

function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException('Invalid email or password');
}

@Injectable()
export class AuthService {
  private dummyHash: Promise<string> | undefined;

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @Inject(JwtService)
    private readonly jwt: JwtService
  ) {}

  async register(body: unknown): Promise<AuthResponse> {
    const { email, password } = parseRegisterBody(body);

    const existing = await this.users.findOne({ where: { email }, select: { id: true } });
    if (existing) throw emailTaken();

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = this.users.create({ id: randomUUID(), email, passwordHash });

    try {
      await this.users.save(user);
    } catch (err: unknown) {
      // Two concurrent registrations can both pass the check above.
      if (isUniqueViolation(err)) throw emailTaken();
      throw err;
    }

    return this.issueSession({ id: user.id, email });
  }

  async login(body: unknown): Promise<AuthResponse> {
    const { email, password } = parseLoginBody(body);

    const user = await this.users.findOne({
      where: { email },
      select: { id: true, email: true, passwordHash: true }
    });

    // Always run one bcrypt comparison so response time does not reveal
    // whether the email is registered.
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const matches = await bcrypt.compare(password, hash);

    if (!user || !user.passwordHash || !user.email || !matches) {
      throw invalidCredentials();
    }

    return this.issueSession({ id: user.id, email: user.email });
  }

  /** Resolves the public profile for a verified token subject, or `undefined` if the user is gone. */
  async findProfile(userId: string): Promise<AuthUser | undefined> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, email: true }
    });
    if (!user || !user.email) return undefined;
    return { id: user.id, email: user.email };
  }

  private async issueSession(user: AuthUser): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: resolveJwtExpiresInSeconds(),
      user
    };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= bcrypt.hash(randomBytes(16).toString('hex'), BCRYPT_ROUNDS);
    return this.dummyHash;
  }
}
