import { z } from 'zod';
import { QuotationStatus } from './quotations.enum';

export const QuotationLineInput = z
  .object({
    /** When set, missing title / description / price are copied from the catalog. */
    serviceId: z.string().min(1).nullish(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullish(),
    qty: z.number().positive().max(99_999),
    unitPriceCents: z.number().int().nonnegative().max(1_000_000_000).optional(),
  })
  .refine((line) => line.serviceId || (line.title && line.unitPriceCents !== undefined), {
    message: 'Una línea sin servicio necesita título y precio.',
  });
export type QuotationLineInput = z.infer<typeof QuotationLineInput>;

export const QuotationStageInput = z.object({
  name: z.string().trim().max(80).nullish(),
  lines: z.array(QuotationLineInput).max(100),
});
export type QuotationStageInput = z.infer<typeof QuotationStageInput>;

/** The whole editable document, saved at once by the editor. */
export const SaveQuotationDto = z
  .object({
    clientId: z.string().min(1),
    title: z.string().trim().min(1).max(160),
    issuedOn: z.iso.date(),
    validUntil: z.iso.date(),
    taxRateBp: z.number().int().min(0).max(10_000).default(1600),
    terms: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
    notes: z.string().trim().max(5000).nullish(),
    stages: z.array(QuotationStageInput).max(30).default([]),
  })
  .refine((q) => q.validUntil >= q.issuedOn, {
    message: 'La vigencia no puede terminar antes de la fecha de emisión.',
    path: ['validUntil'],
  });
export type SaveQuotationDto = z.infer<typeof SaveQuotationDto>;

export const ListQuotationsQueryDto = z.object({
  status: z.enum(Object.values(QuotationStatus) as [QuotationStatus, ...QuotationStatus[]]).optional(),
});
export type ListQuotationsQueryDto = z.infer<typeof ListQuotationsQueryDto>;
