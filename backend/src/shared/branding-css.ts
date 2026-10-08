// MIRRORED: an identical copy lives in admin/src/app/shared/quotation/branding-css.ts.
// Change both together.

/** A linear gradient chosen with the admin's picker. */
export interface BrandingGradient {
  /** Degrees, 0–360. */
  angle: number;
  /** 2–8 stops; `color` is `#rrggbb`, `position` 0–100 (%). */
  stops: { color: string; position: number }[];
}

export function gradientDeclaration(gradient: BrandingGradient): string {
  const stops = [...gradient.stops].sort((a, b) => a.position - b.position);
  return `background: linear-gradient(${gradient.angle}deg, ${stops.map((s) => `${s.color} ${s.position}%`).join(', ')});`;
}

/**
 * The inline CSS one surface gets: the picker's gradient as its background, then the extra
 * CSS, which comes last so it can override the gradient. Both empty → '' (template look).
 */
export function composeSurfaceCss(gradient: BrandingGradient | null, css: string): string {
  return [gradient ? gradientDeclaration(gradient) : '', css].filter(Boolean).join(' ');
}
