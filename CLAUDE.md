# Quotman

Personal quotation app: admin creates quotations, clients open them through magic links,
then accept, reject or request changes. Lives at `https://quotman.dasom.mx`.

**`PLAN.md` is the source of truth.** Read it before starting work. The phase checklist in
§9 tracks progress: tick a phase only when it's done and verified, and update the plan in
the same change whenever a decision changes (add it to §12 with the date).

Status: planning done, nothing scaffolded yet. Next up: phase 1.

## Stack

Angular 22 (standalone, signals, zoneless) with `@angular/ssr` · Tailwind CSS v4 · Hono ·
Cloudflare Workers + Static Assets (one Worker) · D1 + Drizzle · R2 · pdf-lib + fontkit ·
Resend. No NGXS: signals + `httpResource`, sessionStorage only for per-tab drafts.

## Backend layout

`backend/modules/<module>/` with one file per layer: `type`, `enum`, `dto`, `service`,
`repository`, `model`, `client`, `routes`, plus `index.ts` as the public surface. Follow
PLAN.md §8.1 for what each layer may import. In short: routes → service → repository →
model; other modules only through their `index.ts`; enums are `as const` objects, not TS
`enum`; the frontend may import only `dto`, `enum` and `type`.

Worker entry: `src/server.ts` is scaffolding only (engine, Hono app, route wiring, `fetch`
export). Page-serving logic and HTML string building go in `src/server-logic.ts`, which
calls backend modules for domain rules instead of re-implementing them (PLAN.md §2).

## Rules that aren't obvious from the code

- **Money is integer cents** (MXN). Every total comes from `shared/totals.ts`; the API,
  the Angular document and the PDF renderer must never compute totals on their own.
- **Quotation pages are prerendered (SSG) but private.** `/q/*` always passes the Worker's
  session check before a static file is served (`assets.run_worker_first`). Never serve
  quotation HTML or JSON without that check, and send `Cache-Control: private, no-store`.
- **Status and action buttons come from the hydrated API response**, never from the
  prerendered HTML, which can be stale.
- **Tokens and session ids are stored hashed** (SHA-256). Magic-link tokens travel in the
  URL fragment and are only consumed by `POST /api/auth/exchange`, never by a GET, because
  email scanners prefetch links.
- **Accepted / rejected quotations are frozen.** Changes mean duplicating into a new draft.
- **Lines created from a service snapshot** its title, description and price.
- **Secrets** (`RESEND_API_KEY`, `SESSION_SECRET`, `ADMIN_EMAIL`, `BUILD_TOKEN`,
  `DEPLOY_HOOK_URL`) go through `wrangler secret put` and a git-ignored `.dev.vars`. Never
  commit them or ask for them in chat.
- **Email** is sent from `@dasom.mx` through Resend.

## Design

The visual base is `../quotations/cotizacion-onp.html` (silver sheet, grouped stages,
bracketed totals, sine-wave squares under the logo). Port it, don't redesign it.

- Fonts: Raleway (headings, 600) and Finlandica Text (body), self-hosted via Fontsource on
  the web; static TTFs for the PDF.
- Palette: `#edf6f7` mist · `#C6DBDE` ice · `#48565A` slate · `#111416` ink ·
  `#020506` void; silver grays `#e3e6e7 → #cdd2d4`.
- Type scale: 13 labels · 14 descriptions · 15 stages · 16 lines/amounts · 19 subtotal ·
  25 IVA · 33 total. Weights 400 body / 500 labels / 600 headings.
- No uppercase letterspaced kicker labels; table headers in title case.
- The quotation document has **no hover states** (it's print-first). Admin UI and client
  action buttons may have them.
- No translucent layers in anything printed or turned into a PDF: some PDF viewers render
  them as dark blobs.

## Copy

All UI text is Spanish (es-MX) with accents always (`Cotización`, `Términos`, `Ubicación`).
Currency formatted with `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
