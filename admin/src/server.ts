// Admin Worker entry. Every route renders in the browser (app.routes.server.ts); the
// Worker owns the request path so routes can move to server rendering later without a
// topology change, as in superadmin. /api/* never reaches it: that route belongs to
// quotman-api on this host.
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';

const angular = new AngularAppEngine();

async function handle(request: Request): Promise<Response> {
  const response = await angular.handle(request);
  return response ?? new Response('No encontrado.', { status: 404 });
}

/** Used by the Angular CLI dev server and the build. */
export const reqHandler = createRequestHandler(handle);

export default { fetch: handle };
