import { z } from 'zod';

export const CreateClientDto = z.object({
  name: z.string().trim().min(1).max(160),
  company: z.string().trim().max(160).nullish(),
  email: z.email().max(254),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, 'RFC no válido.')
    .nullish(),
});
export type CreateClientDto = z.infer<typeof CreateClientDto>;

export const UpdateClientDto = CreateClientDto.partial();
export type UpdateClientDto = z.infer<typeof UpdateClientDto>;

export const ListClientsQueryDto = z.object({
  q: z.string().trim().max(100).optional(),
});
export type ListClientsQueryDto = z.infer<typeof ListClientsQueryDto>;
