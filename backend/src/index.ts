// The API Worker. Routed at quotman.dasom.mx/api/*; the web Worker also reaches it through
// its `API` service binding (server-side rendering, the /q/* gate, local dev).
import { Hono } from 'hono';
import { api } from './app';
import type { AppEnv } from './core/env';

const worker = new Hono<AppEnv>().route('/api', api);

export default { fetch: worker.fetch };
