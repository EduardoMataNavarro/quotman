import { RenderMode, ServerRoute } from '@angular/ssr';

/** Every route renders in the browser: the admin is behind a login and has nothing to
 *  prerender. Same choice as superadmin. */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Client }];
