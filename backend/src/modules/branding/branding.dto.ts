import { z } from 'zod';
import { BRANDING_CSS_MAX, sanitizeDeclarations } from '../../core/css';

/** A branding CSS field: validated and normalized (see core/css.ts). */
export const BrandingCss = z
  .string()
  .max(BRANDING_CSS_MAX)
  .transform((value, ctx) => {
    const result = sanitizeDeclarations(value);
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', message: result.error });
      return z.NEVER;
    }
    return result.css;
  });

/** The picker's gradient: hex colors only, so it can't carry anything but a gradient. */
export const BrandingGradientDto = z.object({
  angle: z.number().int().min(0).max(360),
  stops: z
    .array(
      z.object({
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color no válido.').toLowerCase(),
        position: z.number().int().min(0).max(100),
      }),
    )
    .min(2)
    .max(8),
});

export const BrandingSurfaceDto = z.object({
  gradient: BrandingGradientDto.nullable(),
  css: BrandingCss,
});

export const SaveBrandingDto = z.object({
  page: BrandingSurfaceDto,
  sheet: BrandingSurfaceDto,
});
export type SaveBrandingDto = z.infer<typeof SaveBrandingDto>;
