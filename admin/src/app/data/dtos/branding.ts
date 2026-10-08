import type { BrandingGradient } from '../../shared/quotation/branding-css';

/** Mirrors the API's Branding (backend/src/modules/branding/branding.type.ts). */
export interface BrandingSurface {
  gradient: BrandingGradient | null;
  css: string;
}

export interface Branding {
  page: BrandingSurface;
  sheet: BrandingSurface;
  updatedAt: string | null;
}
