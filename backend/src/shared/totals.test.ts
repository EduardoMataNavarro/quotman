import { describe, expect, it } from 'vitest';
import { onpQuotation } from './fixtures/onp';
import { computeTotals } from './totals';

describe('computeTotals', () => {
  it('adds the ONP quotation up to $75,000 + $12,000 IVA = $87,000', () => {
    const totals = computeTotals({
      lines: onpQuotation.sections.flatMap((section) => section.lines),
      taxRateBp: onpQuotation.taxRateBp,
    });
    expect(totals.lineCents).toEqual([500_000, 500_000, 3_000_000, 3_000_000, 500_000]);
    expect(totals).toMatchObject({ subtotalCents: 7_500_000, taxCents: 1_200_000, totalCents: 8_700_000 });
  });

  it('rounds tax once on the subtotal', () => {
    // 3 × 33 cents = 99; 16 % = 15.84 → 16.
    const totals = computeTotals({ lines: [{ qty: 3, unitPriceCents: 33 }], taxRateBp: 1600 });
    expect(totals).toMatchObject({ subtotalCents: 99, taxCents: 16, totalCents: 115 });
  });

  it('handles fractional quantities and an empty quotation', () => {
    expect(computeTotals({ lines: [{ qty: 1.5, unitPriceCents: 1001 }], taxRateBp: 0 }).subtotalCents).toBe(1502);
    expect(computeTotals({ lines: [], taxRateBp: 1600 })).toEqual({
      lineCents: [],
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
  });
});
