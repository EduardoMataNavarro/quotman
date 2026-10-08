// MIRRORED: identical copies live in frontend/src/app/shared/quotation/totals.ts and admin/src/app/shared/quotation/totals.ts.
// Change all three together.
/**
 * The only place quotation money is computed. Everything is integer cents.
 */
export interface TotalsInput {
  lines: ReadonlyArray<{ qty: number; unitPriceCents: number }>;
  /** Basis points: 1600 = 16 %. */
  taxRateBp: number;
}

export interface Totals {
  /** Amount per line, same order as the input. */
  lineCents: number[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export function lineAmountCents(line: { qty: number; unitPriceCents: number }): number {
  return Math.round(line.qty * line.unitPriceCents);
}

export function computeTotals({ lines, taxRateBp }: TotalsInput): Totals {
  const lineCents = lines.map(lineAmountCents);
  const subtotalCents = lineCents.reduce((sum, cents) => sum + cents, 0);
  // Tax is rounded once, on the subtotal, half away from zero.
  const taxCents = Math.round((subtotalCents * taxRateBp) / 10_000);
  return { lineCents, subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}
