/** Identity attached to `req.user` after the JWT has been verified and the user confirmed to exist. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

/** Claims carried in the access token. */
export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}
