import { beforeEach, describe, expect, it } from 'vitest';
import { addDays } from '../shared/dates';
import { onpQuotation } from '../shared/fixtures/onp';
import { createTestApi } from './app';

type Api = Awaited<ReturnType<typeof createTestApi>>;

const { logoUrl: _logo, ...issuer } = onpQuotation.issuer;

const sectionsFromFixture = () =>
  onpQuotation.sections.map((section) => ({
    name: section.name!,
    lines: section.lines.map(({ title, description, qty, unitPriceCents }) => ({ title, description, qty, unitPriceCents })),
  }));

async function newClient(api: Api, name = 'Cliente Uno', company = 'Empresa Uno', email = 'uno@example.com') {
  const res = await api.call('POST', '/admin/clients', { name, company, email });
  return res.body.item.id as string;
}

async function newQuotation(api: Api, clientId: string, issuedOn = '2026-10-04') {
  return api.call('POST', '/admin/quotations', {
    clientId,
    title: 'Sistema de solicitudes',
    issuedOn,
    validUntil: addDays(issuedOn, 30),
    terms: onpQuotation.terms,
    sections: sectionsFromFixture(),
  });
}

const saveBody = (q: { clientId: string; issuedOn: string; validUntil: string }, overrides = {}) => ({
  clientId: q.clientId,
  title: 'Editada',
  issuedOn: q.issuedOn,
  validUntil: q.validUntil,
  ...overrides,
});

describe('admin API against Postgres', () => {
  let api: Api;
  beforeEach(async () => {
    api = await createTestApi();
  });

  describe('issuer', () => {
    it('is null until saved, then upserts the singleton', async () => {
      expect((await api.call('GET', '/admin/issuer')).body.item).toBeNull();
      const saved = await api.call('PUT', '/admin/issuer', { ...issuer, email: 'Emisor@Example.com', rfc: 'xaxx010101000' });
      expect(saved.body.item).toMatchObject({ email: 'emisor@example.com', rfc: 'XAXX010101000', logoUrl: null });
      await api.call('PUT', '/admin/issuer', { ...issuer, phone: '+52 55 1111 1111' });
      expect((await api.call('GET', '/admin/issuer')).body.item.phone).toBe('+52 55 1111 1111');
    });

    it('rejects an invalid RFC with a 422', async () => {
      const res = await api.call('PUT', '/admin/issuer', { ...issuer, rfc: 'nope' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('validation_failed');
    });
  });

  describe('clients', () => {
    it('creates, searches and updates', async () => {
      const id = await newClient(api);
      await newClient(api, 'Otra Persona', 'Acme', 'hola@acme.example');
      expect((await api.call('GET', '/admin/clients?q=uno')).body.items).toHaveLength(1);
      expect((await api.call('GET', '/admin/clients?q=50%25')).body.items).toHaveLength(0);
      const updated = await api.call('PATCH', `/admin/clients/${id}`, { company: 'Empresa Uno S.A. de C.V.' });
      expect(updated.body.item).toMatchObject({ name: 'Cliente Uno', company: 'Empresa Uno S.A. de C.V.' });
    });

    it('soft-deletes: gone from lists, still shown on its quotations', async () => {
      const id = await newClient(api);
      const q = (await newQuotation(api, id)).body.item;
      expect((await api.call('DELETE', `/admin/clients/${id}`)).status).toBe(204);
      expect((await api.call('GET', `/admin/clients/${id}`)).status).toBe(404);
      expect((await api.call('GET', '/admin/clients')).body.items).toHaveLength(0);
      expect((await api.call('GET', `/admin/quotations/${q.id}`)).body.item.client.name).toBe('Cliente Uno');
      expect((await newQuotation(api, id)).status).toBe(404);
    });
  });

  describe('offered services', () => {
    it('soft-deletes without touching lines that copied them', async () => {
      const service = (await api.call('POST', '/admin/offered-services', { name: 'Soporte', unitPriceCents: 400_000 })).body.item;
      const q = (
        await api.call('POST', '/admin/quotations', {
          clientId: await newClient(api),
          title: 'Soporte',
          issuedOn: '2026-10-04',
          validUntil: '2026-10-20',
          lines: [{ offeredServiceId: service.id, qty: 1 }],
        })
      ).body.item;
      expect((await api.call('DELETE', `/admin/offered-services/${service.id}`)).status).toBe(204);
      expect((await api.call('GET', '/admin/offered-services')).body.items).toHaveLength(0);
      expect((await api.call('GET', `/admin/quotations/${q.id}`)).body.item.unsectionedLines[0].title).toBe('Soporte');
    });
  });

  describe('quotations', () => {
    it('creates a draft with folio YYYY-NNN.R, slug, sections and totals', async () => {
      const res = await newQuotation(api, await newClient(api));
      expect(res.status).toBe(201);
      const q = res.body.item;
      expect(q).toMatchObject({ folio: '2026-001', revision: 1, displayFolio: '2026-001.1', status: 'draft' });
      expect(q.slug).toMatch(/^[0-9A-Za-z]{22}$/);
      expect(q.sections.map((s: { name: string }) => s.name)).toEqual(['Arquitectura', 'Desarrollo', 'Entrega']);
      expect(q.unsectionedLines).toEqual([]);
      expect(q.totals).toMatchObject({ subtotalCents: 7_500_000, taxCents: 1_200_000, totalCents: 8_700_000 });
    });

    it('numbers folios per year of issue', async () => {
      const clientId = await newClient(api);
      const folios = [];
      for (const issuedOn of ['2026-10-04', '2026-10-05', '2027-01-02']) {
        folios.push((await newQuotation(api, clientId, issuedOn)).body.item.displayFolio);
      }
      expect(folios).toEqual(['2026-001.1', '2026-002.1', '2027-001.1']);
    });

    it('lists with totals and client names; archived only on request', async () => {
      const q = (await newQuotation(api, await newClient(api))).body.item;
      const list = (await api.call('GET', '/admin/quotations')).body.items;
      expect(list[0]).toMatchObject({ displayFolio: '2026-001.1', totalCents: 8_700_000, client: { name: 'Cliente Uno' } });

      await api.call('POST', `/admin/quotations/${q.id}/archive`);
      expect((await api.call('GET', '/admin/quotations')).body.items).toHaveLength(0);
      expect((await api.call('GET', '/admin/quotations?status=archived')).body.items).toHaveLength(1);
      expect((await api.call('GET', '/admin/quotations?status=bogus')).status).toBe(422);
    });

    it('keeps lines in sections or in none, and renders the none group last', async () => {
      await api.call('PUT', '/admin/issuer', issuer);
      const q = (await newQuotation(api, await newClient(api))).body.item;
      const saved = await api.call(
        'PUT',
        `/admin/quotations/${q.id}`,
        saveBody(q, {
          taxRateBp: 0,
          sections: [{ name: 'Diseño', lines: [{ title: 'Diagramas', qty: 1.5, unitPriceCents: 100_000 }] }],
          lines: [{ title: 'Viáticos', qty: 1, unitPriceCents: 50_000 }],
        }),
      );
      expect(saved.status).toBe(200);
      expect(saved.body.item.sections).toEqual([
        expect.objectContaining({ name: 'Diseño', lines: [expect.objectContaining({ title: 'Diagramas', qty: 1.5 })] }),
      ]);
      expect(saved.body.item.unsectionedLines).toEqual([expect.objectContaining({ title: 'Viáticos' })]);
      expect(saved.body.item.totals.totalCents).toBe(200_000);

      const { document } = (await api.call('GET', `/admin/quotations/${q.id}/document`)).body;
      expect(document.sections.map((s: { name: string | null }) => s.name)).toEqual(['Diseño', null]);
    });

    it('snapshots service lines so later service edits never change them', async () => {
      const service = (
        await api.call('POST', '/admin/offered-services', { name: 'Soporte mensual', description: 'Horas de soporte', unitPriceCents: 400_000 })
      ).body.item;
      const created = await api.call('POST', '/admin/quotations', {
        clientId: await newClient(api),
        title: 'Soporte',
        issuedOn: '2026-10-04',
        validUntil: '2026-10-20',
        sections: [{ name: 'Operación', lines: [{ offeredServiceId: service.id, qty: 2 }] }],
      });
      const line = created.body.item.sections[0].lines[0];
      expect(line).toMatchObject({ offeredServiceId: service.id, title: 'Soporte mensual', description: 'Horas de soporte', unitPriceCents: 400_000 });
      await api.call('PATCH', `/admin/offered-services/${service.id}`, { unitPriceCents: 999_900 });
      expect((await api.call('GET', `/admin/quotations/${created.body.item.id}`)).body.item.sections[0].lines[0].unitPriceCents).toBe(400_000);
    });

    it('archives from any status, is read-only while archived, and unarchives to where it was', async () => {
      const q = (await newQuotation(api, await newClient(api))).body.item;
      const archived = (await api.call('POST', `/admin/quotations/${q.id}/archive`)).body.item;
      expect(archived).toMatchObject({ status: 'archived', archivedFrom: 'draft' });
      expect((await api.call('PUT', `/admin/quotations/${q.id}`, saveBody(q))).body.error.code).toBe('quotation_frozen');
      expect((await api.call('POST', `/admin/quotations/${q.id}/archive`)).status).toBe(409);

      const back = (await api.call('POST', `/admin/quotations/${q.id}/unarchive`)).body.item;
      expect(back).toMatchObject({ status: 'draft', archivedFrom: null });
      expect((await api.call('PUT', `/admin/quotations/${q.id}`, saveBody(q))).status).toBe(200);
    });

    it('rejects a validity that ends before the issue date, and sections without a name', async () => {
      const clientId = await newClient(api);
      const base = { clientId, title: 'X', issuedOn: '2026-10-04' };
      expect((await api.call('POST', '/admin/quotations', { ...base, validUntil: '2026-10-01' })).status).toBe(422);
      expect(
        (await api.call('POST', '/admin/quotations', { ...base, validUntil: '2026-10-05', sections: [{ name: '', lines: [] }] })).status,
      ).toBe(422);
    });

    it('builds the client document from the record and the issuer', async () => {
      const q = (await newQuotation(api, await newClient(api))).body.item;
      expect((await api.call('GET', `/admin/quotations/${q.id}/document`)).body.error.code).toBe('issuer_not_configured');
      await api.call('PUT', '/admin/issuer', issuer);
      const { document } = (await api.call('GET', `/admin/quotations/${q.id}/document`)).body;
      expect(document).toMatchObject({ folio: '2026-001.1', taxRateBp: 1600, terms: onpQuotation.terms });
      expect(document.issuer).not.toHaveProperty('updatedAt');
      expect(document.sections.map((s: { lines: unknown[] }) => s.lines.length)).toEqual([2, 2, 1]);
    });

    it('duplicates into a new draft dated today with the same validity length', async () => {
      const q = (await newQuotation(api, await newClient(api))).body.item;
      const copy = (await api.call('POST', `/admin/quotations/${q.id}/duplicate`)).body.item;
      expect(copy).toMatchObject({ status: 'draft', revision: 1 });
      expect(copy.folio).not.toBe(q.folio);
      expect((Date.parse(copy.validUntil) - Date.parse(copy.issuedOn)) / 86_400_000).toBe(30);
      expect(copy.totals.totalCents).toBe(q.totals.totalCents);
    });

    it('soft-deletes never-sent drafts', async () => {
      const q = (await newQuotation(api, await newClient(api))).body.item;
      expect((await api.call('DELETE', `/admin/quotations/${q.id}`)).status).toBe(204);
      expect((await api.call('GET', `/admin/quotations/${q.id}`)).status).toBe(404);
      expect((await api.call('GET', '/admin/quotations')).body.items).toHaveLength(0);
    });

    it('answers 404 with a stable code for unknown ids', async () => {
      const res = await api.call('GET', '/admin/quotations/nope');
      expect(res).toMatchObject({ status: 404, body: { error: { code: 'quotation_not_found', message: 'Esa cotización no existe.' } } });
    });
  });
});

describe('issuer seed from env', () => {
  const env = {
    ISSUER_NAME: 'Emisor de Prueba',
    ISSUER_ROLE: 'Desarrollo de software',
    ISSUER_EMAIL: 'Emisor@Example.com',
    ISSUER_PHONE: '+52 55 0000 0000',
    ISSUER_RAZON_SOCIAL: 'EMISOR DE PRUEBA',
    ISSUER_RFC: 'xaxx010101000',
    ISSUER_LOCATION: 'Ciudad de México, México',
  };

  it('copies the env vars into the profile once, then the admin edits win', async () => {
    const api = await createTestApi(env);
    const first = (await api.call('GET', '/admin/issuer')).body.item;
    expect(first).toMatchObject({ name: 'Emisor de Prueba', email: 'emisor@example.com', rfc: 'XAXX010101000', logoUrl: null });

    await api.call('PUT', '/admin/issuer', { ...first, logoUrl: 'https://cdn.example.com/logo.png', phone: '+52 55 1111 1111' });
    const after = (await api.call('GET', '/admin/issuer')).body.item;
    expect(after).toMatchObject({ phone: '+52 55 1111 1111', logoUrl: 'https://cdn.example.com/logo.png' });
  });

  it('stays empty when the env seed is incomplete or invalid', async () => {
    const api = await createTestApi({ ...env, ISSUER_RFC: 'nope' });
    expect((await api.call('GET', '/admin/issuer')).body.item).toBeNull();
  });

  it('accepts only https logo URLs', async () => {
    const api = await createTestApi(env);
    const profile = (await api.call('GET', '/admin/issuer')).body.item;
    expect((await api.call('PUT', '/admin/issuer', { ...profile, logoUrl: 'http://x.example/logo.png' })).status).toBe(422);
    expect((await api.call('PUT', '/admin/issuer', { ...profile, logoUrl: 'javascript:alert(1)' })).status).toBe(422);
  });
});
