// MIRRORED: identical copies live in frontend/src/app/shared/quotation/dates.ts and admin/src/app/shared/quotation/dates.ts.
// Change all three together.
/** Calendar dates (`YYYY-MM-DD`) as the issuer sees them: Monterrey time. */
const TIME_ZONE = 'America/Monterrey';
const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export function isoDateInMexico(at: Date): string {
  return isoDay.format(at);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
