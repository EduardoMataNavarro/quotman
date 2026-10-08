import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  // Phase 6/7 add `q/:slug` (Prerender + getPrerenderParams + PrerenderFallback.Server),
  // `acceso` (Prerender) and `admin/**` (Client).
  { path: '**', renderMode: RenderMode.Server },
];
