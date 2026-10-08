/** The signed-in admin, as the API exposes it. */
export interface AuthenticatedAdmin {
  id: string;
  email: string;
  lastLoginAt: string | null;
}
