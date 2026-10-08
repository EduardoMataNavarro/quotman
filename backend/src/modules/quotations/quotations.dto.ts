import { z } from 'zod';
import { BrandingCss, BrandingGradientDto } from '../branding';
import { QuotationStatus } from './quotations.enum';

export const QuotationLineInput = z
  .object({
    /** When set, missing title / description / price are copied from the service. */
    offeredServiceId: z.string().min(1).nullish(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullish(),
    qty: z.number().positive().max(99_999),
    unitPriceCents: z.number().int().nonnegative().max(1_000_000_000).optional(),
  })
  .refine((line) => line.offeredServiceId || (line.title && line.unitPriceCents !== undefined), {
    message: 'Una línea sin servicio necesita título y precio.',
  });
export type QuotationLineInput = z.infer<typeof QuotationLineInput>;

export const QuotationSectionInput = z.object({
  name: z.string().trim().min(1).max(80),
  lines: z.array(QuotationLineInput).max(100),
});
export type QuotationSectionInput = z.infer<typeof QuotationSectionInput>;

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
    /** Override of the global branding, per piece; null or missing = the global piece. */
    branding: z
      .object({
        pageGradient: BrandingGradientDto.nullable(),
        pageCss: BrandingCss.nullable(),
        sheetGradient: BrandingGradientDto.nullable(),
        sheetCss: BrandingCss.nullable(),
      })
      .partial()
      .optional(),
    sections: z.array(QuotationSectionInput).max(30).default([]),
    /** Lines in no section. */
    lines: z.array(QuotationLineInput).max(100).default([]),
  })
  .refine((q) => q.validUntil >= q.issuedOn, {
    message: 'La vigencia no puede terminar antes de la fecha de emisión.',
    path: ['validUntil'],
  });
export type SaveQuotationDto = z.infer<typeof SaveQuotationDto>;

export const ListQuotationsQueryDto = z.object({
  /** Without it, every status except archived. */
  status: z.enum(Object.values(QuotationStatus) as [QuotationStatus, ...QuotationStatus[]]).optional(),
});
export type ListQuotationsQueryDto = z.infer<typeof ListQuotationsQueryDto>;
