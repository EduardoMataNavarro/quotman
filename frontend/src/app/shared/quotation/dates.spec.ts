import { addDays, daysBetween, isoDateInMexico } from './dates';

describe('dates', () => {
  it('uses the Monterrey calendar day, not UTC', () => {
    // 03:00 UTC on the 5th is still the evening of the 4th in Monterrey (UTC-6).
    expect(isoDateInMexico(new Date('2026-10-05T03:00:00Z'))).toBe('2026-10-04');
  });

  it('adds days across month ends and counts them back', () => {
    expect(addDays('2026-10-04', 30)).toBe('2026-11-03');
    expect(daysBetween('2026-10-04', '2026-11-03')).toBe(30);
  });
});
