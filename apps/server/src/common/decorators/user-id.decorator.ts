import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.types.js';

/**
 * Returns the verified user id from `req.user`, which `JwtAuthGuard` populates.
 *
 * The id is never read from headers or the body: `x-user-id` and raw Bearer
 * values are client-controlled and would allow impersonation. Use only on
 * routes protected by `JwtAuthGuard`.
 */
export const UserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user?: Partial<AuthenticatedUser> }>();
  const id = request.user?.id;
  if (typeof id !== 'string' || id.length === 0) {
    throw new UnauthorizedException();
  }
  return id;
});
