import { describe, expect, it } from 'vitest';
import { onpQuotation } from '../../shared/fixtures/onp';
import type { Bindings } from '../core/env';
import { buildServices } from '../services';
import { createTestDb } from '../test/db';
import { seedOnp } from './onp';

describe('seedOnp', () => {
  it('rebuilds the ONP document through the services, once', async () => {
    const services = buildServices({ DATABASE_URL: '' } as Bindings, await createTestDb());

    expect(await seedOnp(services)).toEqual({ seeded: true, folio: 'COT-2026-001' });
    expect(await seedOnp(services)).toEqual({ seeded: false });

    const [summary] = await services.quotations.list({});
    expect(summary.totalCents).toBe(8_700_000);

    const document = await services.quotations.document(summary.id);
    const { logoUrl: _a, ...expectedIssuer } = onpQuotation.issuer;
    expect(document.issuer).toMatchObject(expectedIssuer);
    expect(document.stages.map((s) => s.lines.map((l) => [l.title, l.unitPriceCents]))).toEqual(
      onpQuotation.stages.map((s) => s.lines.map((l) => [l.title, l.unitPriceCents])),
    );
    expect(await services.catalog.list({ includeArchived: false })).toHaveLength(5);
  });
});
