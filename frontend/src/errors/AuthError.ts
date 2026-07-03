export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_IN_USE'
  | 'USERNAME_IN_USE'
  | 'INVALID_RESET_CODE'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
  }
}
