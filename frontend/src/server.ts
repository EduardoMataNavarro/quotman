// Web Worker entry: scaffolding only. Page-serving logic lives in ./server-logic.ts; the
// API is a separate Worker reached through the `API` service binding (PLAN.md §2).
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { Hono } from 'hono';
import type { WebEnv } from './server-env';
import { forwardToApi, renderApp, servePrivateQuotation } from './server-logic';

const angular = new AngularAppEngine();

const app = new Hono<WebEnv>()
  .all('/api/*', forwardToApi)
  .on(['GET', 'HEAD'], ['/q/:slug', '/q/:slug/*'], (c) => servePrivateQuotation(c, angular))
  .all('*', (c) => renderApp(c, angular));

/** Used by the Angular CLI dev server and the build. */
export const reqHandler = createRequestHandler((request) => app.fetch(request));

export default { fetch: app.fetch };
