import type { ChangePasswordRequest, LoginRequest } from '../../app/data/dtos/auth';

export class Login {
  static readonly type = '[Auth] Login';
  constructor(public payload: LoginRequest) {}
}

export class LoadMe {
  static readonly type = '[Auth] Load me';
}

export class Logout {
  static readonly type = '[Auth] Logout';
}

/** Clears the session state without calling the API (it already answered 401). */
export class SessionExpired {
  static readonly type = '[Auth] Session expired';
}

export class ChangePassword {
  static readonly type = '[Auth] Change password';
  constructor(public payload: ChangePasswordRequest) {}
}
