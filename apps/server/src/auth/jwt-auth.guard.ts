import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Rejects requests without a valid Bearer access token with 401 `UNAUTHORIZED`. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
