import { escapeHtml, renderGonePage } from './server-logic';

describe('renderGonePage', () => {
  it('answers 410 for expired links with private, noindex headers', async () => {
    const response = renderGonePage('expired');
    expect(response.status).toBe(410);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(await response.text()).toContain('Este enlace expiró');
  });

  it('answers 404 for unknown quotations', () => {
    expect(renderGonePage('not-found').status).toBe(404);
  });
});

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
