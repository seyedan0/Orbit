import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const xUserId = request.headers['x-user-id'];
    if (typeof xUserId === 'string' && xUserId.trim().length > 0) {
      return xUserId.trim();
    }

    const authHeader = request.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token.length > 0) {
        return token;
      }
    }

    return 'default-user';
  }
);
