/** Public identity of an authenticated user. Never contains credentials. */
export interface AuthUser {
  id: string;
  email: string;
}

/** Credentials body for `POST /auth/register` and `POST /auth/login`. */
export interface AuthCredentials {
  email: string;
  password: string;
}

/** Response of `POST /auth/register` and `POST /auth/login`. */
export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** Access token lifetime in seconds. */
  expiresIn: number;
  user: AuthUser;
}
