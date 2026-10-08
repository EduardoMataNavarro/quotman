/** Mirrors the API's AuthenticatedAdmin (backend/src/modules/auth/auth.type.ts). */
export interface AuthenticatedAdmin {
  id: string;
  email: string;
  lastLoginAt: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** The API's error envelope. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
