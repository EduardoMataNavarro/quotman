import type { BrandingGradient } from '../../../shared/quotation/branding-css';

/** The template's built-in gradients: where the pickers start when switched on. */
export const TEMPLATE_PAGE_GRADIENT: BrandingGradient = {
  angle: 135,
  stops: [
    { color: '#f4f6f7', position: 0 },
    { color: '#e1e5e7', position: 25 },
    { color: '#cdd2d5', position: 50 },
    { color: '#b9c0c4', position: 75 },
    { color: '#a7afb4', position: 100 },
  ],
};

export const TEMPLATE_SHEET_GRADIENT: BrandingGradient = {
  angle: 180,
  stops: [
    { color: '#e3e6e7', position: 0 },
    { color: '#cdd2d4', position: 100 },
  ],
};
