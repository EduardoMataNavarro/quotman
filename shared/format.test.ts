import { describe, expect, it } from 'vitest';
import { formatLongDate, formatMoney, formatRate } from './format';

describe('format', () => {
  it('formats MXN cents the way the template shows them', () => {
    expect(formatMoney(500_000)).toBe('$5,000.00');
    expect(formatMoney(8_700_000)).toBe('$87,000.00');
  });

  it('formats calendar dates in Spanish without shifting the day', () => {
    expect(formatLongDate('2026-10-04')).toBe('4 de octubre de 2026');
  });

  it('formats basis points as a percentage', () => {
    expect(formatRate(1600)).toBe('16%');
  });
});
