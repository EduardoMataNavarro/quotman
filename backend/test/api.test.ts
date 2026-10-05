import { beforeEach, describe, expect, it } from 'vitest';
import { addDays } from '../../shared/dates';
import { onpQuotation } from '../../shared/fixtures/onp';
import { createTestApi } from './app';

type Api = Awaited<ReturnType<typeof createTestApi>>;

const issuer = {
  name: 'Emisor de Prueba',
  role: 'Desarrollo de software',
  email: 'Emisor@Example.com',
  phone: '+52 81 0000 0000',
  razonSocial: 'EMISOR DE PRUEBA',
  rfc: 'XAXX010101000',
  location: 'Ciudad de México, México',
};

const stagesFromFixture = () =>
  onpQuotation.stages.map((stage) => ({
    name: stage.name,
    lines: stage.lines.map(({ title, description, qty, unitPriceCents }) => ({ title, description, qty, unitPriceCents })),
  }));

async function newClient(api: Api, name = 'Cliente ONP', company = 'ONP', email = 'cliente@onp.example') {
  const res = await api.call('POST', '/admin/clients', { name, company, email });
  return res.body.item.id as string;
}

async function newQuotation(api: Api, clientId: string, issuedOn = '2026-10-04') {
  return api.call('POST', '/admin/quotations', {
    clientId,
    title: 'Sistema de solicitudes ONP',
    issuedOn,
    validUntil: addDays(issuedOn, 30),
    terms: onpQuotation.terms,
    stages: stagesFromFixture(),
  });
}

describe('API against Postgres', () => {
  let api: Api;
  beforeEach(async () => {
    api = await createTestApi();
  });

  describe('issuer', () => {
    it('is null until saved, then upserts the singleton', async () => {
      expect((await api.call('GET', '/admin/issuer')).body.item).toBeNull();

      const saved = await api.call('PUT', '/admin/issuer', issuer);
      expect(saved.status).toBe(200);
      expect(saved.body.item).toMatchObject({ email: 'emisor@example.com', rfc: 'XAXX010101000', logoUrl: null });

      await api.call('PUT', '/admin/issuer', { ...issuer, phone: '+52 81 1111 1111' });
      expect((await api.call('GET', '/admin/issuer')).body.item.phone).toBe('+52 81 1111 1111');
    });

    it('rejects an invalid RFC with a 422', async () => {
      const res = await api.call('PUT', '/admin/issuer', { ...issuer, rfc: 'nope' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('validation_failed');
    });
  });

  describe('clients', () => {
    it('creates, searches, updates and deletes', async () => {
      const id = await newClient(api);
      await newClient(api, 'Otra Empresa', 'Acme', 'hola@acme.example');

      expect((await api.call('GET', '/admin/clients?q=onp')).body.items).toHaveLength(1);
      expect((await api.call('GET', '/admin/clients?q=50%25')).body.items).toHaveLength(0);

      const updated = await api.call('PATCH', `/admin/clients/${id}`, { company: 'ONP S.A. de C.V.' });
      expect(updated.body.item).toMatchObject({ name: 'Cliente ONP', company: 'ONP S.A. de C.V.' });

      expect((await api.call('DELETE', `/admin/clients/${id}`)).status).toBe(204);
      expect((await api.call('GET', `/admin/clients/${id}`)).status).toBe(404);
    });

    it('refuses to delete a client with quotations', async () => {
      const id = await newClient(api);
      await newQuotation(api, id);
      const res = await api.call('DELETE', `/admin/clients/${id}`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('client_has_quotations');
    });
  });

  describe('quotations', () => {
    it('creates the ONP quotation with folio, slug and totals', async () => {
      const res = await newQuotation(api, await newClient(api));
      expect(res.status).toBe(201);
      const q = res.body.item;
      expect(q.folio).toBe('COT-2026-001');
      expect(q.slug).toMatch(/^[0-9A-Za-z]{22}$/);
      expect(q.status).toBe('draft');
      expect(q.stages.map((s: { name: string }) => s.name)).toEqual(['Arquitectura', 'Desarrollo', 'Entrega']);
      expect(q.stages[1].lines[1].title).toBe('Implementación del sistema para solicitudes ONP (servidor)');
      expect(q.totals).toMatchObject({ subtotalCents: 7_500_000, taxCents: 1_200_000, totalCents: 8_700_000 });
      expect(q.client).toMatchObject({ name: 'Cliente ONP', email: 'cliente@onp.example' });
    });

    it('numbers folios per year of issue', async () => {
      const clientId = await newClient(api);
      const folios = [];
      for (const issuedOn of ['2026-10-04', '2026-10-05', '2027-01-02']) {
        folios.push((await newQuotation(api, clientId, issuedOn)).body.item.folio);
      }
      expect(folios).toEqual(['COT-2026-001', 'COT-2026-002', 'COT-2027-001']);
    });

    it('lists with totals, client names and a status filter', async () => {
      await newQuotation(api, await newClient(api));
      const list = (await api.call('GET', '/admin/quotations')).body.items;
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ totalCents: 8_700_000, client: { name: 'Cliente ONP', company: 'ONP' } });
      expect((await api.call('GET', '/admin/quotations?status=accepted')).body.items).toHaveLength(0);
      expect((await api.call('GET', '/admin/quotations?status=bogus')).status).toBe(422);
    });

    it('snapshots catalog lines so later catalog edits never change them', async () => {
      const service = (
        await api.call('POST', '/admin/catalog', { name: 'Soporte mensual', description: 'Horas de soporte', unitPriceCents: 400_000 })
      ).body.item;
      const created = await api.call('POST', '/admin/quotations', {
        clientId: await newClient(api),
        title: 'Soporte',
        issuedOn: '2026-10-04',
        validUntil: '2026-10-20',
        stages: [{ name: 'Operación', lines: [{ serviceId: service.id, qty: 2 }] }],
      });
      const line = created.body.item.stages[0].lines[0];
      expect(line).toMatchObject({ serviceId: service.id, title: 'Soporte mensual', description: 'Horas de soporte', qty: 2, unitPriceCents: 400_000 });

      await api.call('PATCH', `/admin/catalog/${service.id}`, { unitPriceCents: 999_900 });
      const reloaded = await api.call('GET', `/admin/quotations/${created.body.item.id}`);
      expect(reloaded.body.item.stages[0].lines[0].unitPriceCents).toBe(400_000);
    });

    it('saves the whole document, replacing stages and lines', async () => {
      const q = (await newQuotation(api, await newClient(api))).body.item;
      const saved = await api.call('PUT', `/admin/quotations/${q.id}`, {
        clientId: q.clientId,
        title: 'Solo arquitectura',
        issuedOn: q.issuedOn,
        validUntil: q.validUntil,
        taxRateBp: 0,
        stages: [{ name: null, lines: [{ title: 'Diagramas', qty: 1.5, unitPriceCents: 100_000 }] }],
      });
      expect(saved.status).toBe(200);
      expect(saved.body.item).toMatchObject({ title: 'Solo arquitectura', version: 1, terms: [] });
      expect(saved.body.item.stages).toEqual([
        expect.objectContaining({ name: null, lines: [expect.objectContaining({ title: 'Diagramas', qty: 1.5 })] }),
      ]);
      expect(saved.body.item.totals.totalCents).toBe(150_000);
    });

    it('rejects a validity that ends before the issue date', async () => {
      const res = await api.call('POST', '/admin/quotations', {
        clientId: await newClient(api),
        title: 'X',
        issuedOn: '2026-10-04',
        validUntil: '2026-10-01',
      });
      expect(res.status).toBe(422);
    });

    it('builds the client document from the record and the issuer', async () => {
      const q = (await newQuotation(api, await newClient(api))).body.item;
      expect((await api.call('GET', `/admin/quotations/${q.id}/document`)).body.error.code).toBe('issuer_not_configured');

      await api.call('PUT', '/admin/issuer', issuer);
      const { document } = (await api.call('GET', `/admin/quotations/${q.id}/document`)).body;
      expect(document).toMatchObject({ folio: 'COT-2026-001', taxRateBp: 1600, terms: onpQuotation.terms });
      expect(document.issuer).toMatchObject({ rfc: 'XAXX010101000', logoUrl: null });
      expect(document.issuer).not.toHaveProperty('updatedAt');
      expect(document.stages.map((s: { lines: unknown[] }) => s.lines.length)).toEqual([2, 2, 1]);
    });

    it('duplicates into a new draft dated today with the same validity length', async () => {
      const q = (await newQuotation(api, await newClient(api))).body.item;
      const copy = (await api.call('POST', `/admin/quotations/${q.id}/duplicate`)).body.item;
      expect(copy.id).not.toBe(q.id);
      expect(copy.status).toBe('draft');
      expect(copy.folio).not.toBe(q.folio);
      const days = (Date.parse(copy.validUntil) - Date.parse(copy.issuedOn)) / 86_400_000;
      expect(days).toBe(30);
      expect(copy.totals.totalCents).toBe(q.totals.totalCents);
    });

    it('deletes never-published drafts, cascading stages and lines', async () => {
      const q = (await newQuotation(api, await newClient(api))).body.item;
      expect((await api.call('DELETE', `/admin/quotations/${q.id}`)).status).toBe(204);
      expect((await api.call('GET', `/admin/quotations/${q.id}`)).status).toBe(404);
    });

    it('answers 404 with a stable code for unknown ids', async () => {
      const res = await api.call('GET', '/admin/quotations/nope');
      expect(res).toEqual({ status: 404, body: { error: { code: 'quotation_not_found', message: 'Esa cotización no existe.' } } });
    });
  });
});
