import { z } from 'zod';

export const CreateOfferedServiceDto = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullish(),
  unitPriceCents: z.number().int().nonnegative(),
  unit: z.string().trim().min(1).max(40).default('servicio'),
  defaultSection: z.string().trim().max(80).nullish(),
});
export type CreateOfferedServiceDto = z.infer<typeof CreateOfferedServiceDto>;

export const UpdateOfferedServiceDto = CreateOfferedServiceDto.partial().extend({
  active: z.boolean().optional(),
});
export type UpdateOfferedServiceDto = z.infer<typeof UpdateOfferedServiceDto>;

export const ListOfferedServicesQueryDto = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
export type ListOfferedServicesQueryDto = z.infer<typeof ListOfferedServicesQueryDto>;
