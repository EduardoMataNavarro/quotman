import { beforeEach, describe, expect, it } from 'vitest';
import { onpQuotation } from '../shared/fixtures/onp';
import { createTestApi } from './app';

type Api = Awaited<ReturnType<typeof createTestApi>>;

const { logoUrl: _logo, ...issuer } = onpQuotation.issuer;
const PAGE_GRADIENT = { angle: 135, stops: [{ color: '#F4F6F7', position: 0 }, { color: '#a7afb4', position: 100 }] };
const PAGE_BG = 'background: linear-gradient(135deg, #f4f6f7 0%, #a7afb4 100%);';
const SHEET_CSS = 'border-radius: 12px;';

const surface = (gradient: object | null, css: string) => ({ gradient, css });

async function quotation(api: Api, branding?: object) {
  const clientId = (await api.call('POST', '/admin/clients', { name: 'C', email: 'c@example.com' })).body.item.id;
  return (
    await api.call('POST', '/admin/quotations', {
      clientId,
      title: 'Q',
      issuedOn: '2026-10-04',
      validUntil: '2026-10-20',
      lines: [{ title: 'L', qty: 1, unitPriceCents: 100 }],
      ...(branding ? { branding } : {}),
    })
  ).body.item;
}

const documentBranding = async (api: Api, id: string) =>
  (await api.call('GET', `/admin/quotations/${id}/document`)).body.document.branding;

describe('branding', () => {
  let api: Api;
  beforeEach(async () => {
    api = await createTestApi();
    await api.call('PUT', '/admin/issuer', issuer);
  });

  it('starts empty and stores picker gradient and extra CSS separately', async () => {
    expect((await api.call('GET', '/admin/branding')).body.item).toEqual({
      page: { gradient: null, css: '' },
      sheet: { gradient: null, css: '' },
      updatedAt: null,
    });
    const saved = await api.call('PUT', '/admin/branding', {
      page: surface(PAGE_GRADIENT, ''),
      sheet: surface(null, 'border-radius:12px'),
    });
    expect(saved.body.item.page.gradient.stops[0].color).toBe('#f4f6f7');
    expect(saved.body.item.sheet).toEqual({ gradient: null, css: SHEET_CSS });
  });

  it('refuses unsafe CSS and non-hex gradient colors', async () => {
    const css = await api.call('PUT', '/admin/branding', {
      page: surface(null, 'background: url(https://x.example/a.png)'),
      sheet: surface(null, ''),
    });
    expect(css.status).toBe(422);
    expect(JSON.stringify(css.body.error.details)).toContain('Valor no permitido');

    const color = await api.call('PUT', '/admin/branding', {
      page: surface({ angle: 90, stops: [{ color: 'red; position: fixed', position: 0 }, { color: '#000000', position: 100 }] }, ''),
      sheet: surface(null, ''),
    });
    expect(color.status).toBe(422);
  });

  it('composes gradient then CSS, falling back to the global branding piece by piece', async () => {
    await api.call('PUT', '/admin/branding', { page: surface(PAGE_GRADIENT, ''), sheet: surface(null, SHEET_CSS) });

    const plain = await quotation(api);
    expect(await documentBranding(api, plain.id)).toEqual({ pageCss: PAGE_BG, sheetCss: SHEET_CSS });

    const custom = await quotation(api, { pageCss: 'box-shadow: none' });
    expect(await documentBranding(api, custom.id)).toEqual({ pageCss: `${PAGE_BG} box-shadow: none;`, sheetCss: SHEET_CSS });
  });

  it('validates the override like the global branding', async () => {
    const clientId = (await api.call('POST', '/admin/clients', { name: 'C', email: 'c@example.com' })).body.item.id;
    const res = await api.call('POST', '/admin/quotations', {
      clientId,
      title: 'Q',
      issuedOn: '2026-10-04',
      validUntil: '2026-10-20',
      branding: { pageCss: 'position: fixed' },
    });
    expect(res.status).toBe(422);
  });
});
