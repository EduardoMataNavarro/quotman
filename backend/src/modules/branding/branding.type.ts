import type { BrandingGradient } from '../../shared/branding-css';

export type { BrandingGradient } from '../../shared/branding-css';

/** One surface: the picker's gradient (null = none) and extra CSS applied after it. */
export interface BrandingSurface {
  gradient: BrandingGradient | null;
  css: string;
}

/** Both empty on both surfaces means the template's built-in look. */
export interface Branding {
  page: BrandingSurface;
  sheet: BrandingSurface;
  /** ISO 8601; null until saved once. */
  updatedAt: string | null;
}
