/**
 * A Worker binding as the web Worker uses it. At runtime it's a Cloudflare `Fetcher`;
 * typing only `fetch` keeps Workers' Request/Response types out of the Angular build.
 */
interface FetchBinding {
  fetch(request: Request): Promise<Response>;
}

/** Bindings of the web Worker (apps/web/wrangler.jsonc). */
export interface WebEnv {
  Bindings: {
    ASSETS: FetchBinding;
    /** The API Worker, through a service binding: no public hop. */
    API: FetchBinding;
  };
}
