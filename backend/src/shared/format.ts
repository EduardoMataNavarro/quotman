// MIRRORED: identical copies live in frontend/src/app/shared/quotation/format.ts and admin/src/app/shared/quotation/format.ts.
// Change all three together.
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const longDate = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' });

/** `500000` → `$5,000.00`. */
export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

/** `'2026-10-04'` → `4 de octubre de 2026`. Calendar dates, so no time-zone shift. */
export function formatLongDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`));
}

/** `1600` → `16%`. */
export function formatRate(bp: number): string {
  return `${bp / 100}%`;
}
