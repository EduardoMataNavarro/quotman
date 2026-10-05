// Worker entry: scaffolding only. Page-serving logic lives in ./server-logic.ts and domain
// rules in backend/modules (PLAN.md §2).
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { api } from '@backend/app';
import type { AppEnv } from '@backend/core/env';
import { Hono } from 'hono';
import { renderApp, servePrivateQuotation } from './server-logic';

const angular = new AngularAppEngine();

const app = new Hono<AppEnv>()
  .route('/api', api)
  .on(['GET', 'HEAD'], ['/q/:slug', '/q/:slug/*'], (c) => servePrivateQuotation(c, angular))
  .all('*', (c) => renderApp(c, angular));

/** Used by the Angular CLI dev server and the build. */
export const reqHandler = createRequestHandler((request) => app.fetch(request));

export default { fetch: app.fetch };
