// Page-serving logic and HTML string building for the Worker (PLAN.md §2). Domain rules
// stay in backend/modules and are reached through each module's index.ts.
import type { AngularAppEngine } from '@angular/ssr';
import type { AppEnv } from '@backend/core/env';
import type { Context } from 'hono';

type Ctx = Context<AppEnv>;

export type GoneReason = 'expired' | 'revoked' | 'not-found';

/** Headers on every response that carries, or could carry, quotation data. */
export const PRIVATE_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};

/**
 * `/q/:slug`. Runs before Static Assets (`run_worker_first`), so no prerendered quotation
 * is served without passing here.
 *
 * Stub until phase 6 (session check through access/index.ts, redirect to
 * `/acceso?q=<slug>`) and phase 7 (prerendered file through `env.ASSETS`, SSR fallback).
 * Until then it denies everything.
 */
export async function servePrivateQuotation(_c: Ctx, _angular: AngularAppEngine): Promise<Response> {
  return renderGonePage('not-found');
}

/** Everything that isn't the API, a static file or a quotation: Angular SSR. */
export async function renderApp(c: Ctx, angular: AngularAppEngine): Promise<Response> {
  const response = await angular.handle(c.req.raw);
  return response ?? c.text('No encontrado.', 404);
}

const GONE_COPY: Record<GoneReason, { status: 404 | 410; title: string; body: string }> = {
  expired: {
    status: 410,
    title: 'Este enlace expiró',
    body: 'Los enlaces de acceso duran unos días. Pide uno nuevo y te lo enviaremos por correo.',
  },
  revoked: {
    status: 410,
    title: 'Este enlace ya no está activo',
    body: 'El acceso a esta cotización se retiró. Si crees que es un error, pide un enlace nuevo.',
  },
  'not-found': {
    status: 404,
    title: 'No encontramos esta cotización',
    body: 'Revisa que el enlace esté completo, o pide uno nuevo.',
  },
};

/** Expired / revoked / not-found page, built as a string so it needs no Angular render. */
export function renderGonePage(reason: GoneReason): Response {
  const { status, title, body } = GONE_COPY[reason];
  const html = `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} · Quotman</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
    background: #cdd2d5 linear-gradient(135deg, #f4f6f7 0%, #e1e5e7 25%, #cdd2d5 50%, #b9c0c4 75%, #a7afb4 100%) fixed;
    color: #111416; font: 400 16px/1.5 system-ui, sans-serif; }
  main { max-width: 28rem; padding: 32px; border-radius: 1rem; background: #e3e6e7; }
  h1 { margin: 0 0 8px; font-weight: 600; font-size: 23px; line-height: 1.25; }
  p { margin: 0; color: #48565a; font-size: 15px; }
</style>
</head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></main></body>
</html>`;
  return new Response(html, {
    status,
    headers: { ...PRIVATE_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
