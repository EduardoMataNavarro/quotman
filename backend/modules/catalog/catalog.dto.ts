import { z } from 'zod';

export const CreateCatalogItemDto = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullish(),
  unitPriceCents: z.number().int().nonnegative(),
  unit: z.string().trim().min(1).max(40).default('servicio'),
  defaultStage: z.string().trim().max(80).nullish(),
});
export type CreateCatalogItemDto = z.infer<typeof CreateCatalogItemDto>;

export const UpdateCatalogItemDto = CreateCatalogItemDto.partial().extend({
  active: z.boolean().optional(),
});
export type UpdateCatalogItemDto = z.infer<typeof UpdateCatalogItemDto>;

export const ListCatalogQueryDto = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
export type ListCatalogQueryDto = z.infer<typeof ListCatalogQueryDto>;
