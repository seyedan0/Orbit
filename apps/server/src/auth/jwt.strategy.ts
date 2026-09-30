import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_ALGORITHM, resolveJwtSecret } from './auth.config.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser, JwtPayload } from './auth.types.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(),
      // Pin the algorithm so a token cannot downgrade verification (e.g. `alg: none`).
      algorithms: [JWT_ALGORITHM]
    });
  }

  /** Runs only for a correctly signed, unexpired token. The user must still exist. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (typeof payload?.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException();
    }
    const profile = await this.authService.findProfile(payload.sub);
    if (!profile) throw new UnauthorizedException();
    return profile;
  }
}
