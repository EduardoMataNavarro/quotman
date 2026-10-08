import { z } from 'zod';

export const LoginDto = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});
export type LoginDto = z.infer<typeof LoginDto>;

export const ChangePasswordDto = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12, 'Usa al menos 12 caracteres.').max(200),
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordDto>;
