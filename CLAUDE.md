# Quotman

Personal quotation app: the admin creates quotations, clients open them through magic
links, then accept, decline or request changes. Client app at `https://quotman.dasom.mx`,
admin at `https://admin-quotman.dasom.mx`.

**`PLAN.md` is the source of truth.** Read it before starting work. The phase checklist in
§9 tracks progress: tick a checkpoint only when it's done and verified, and update the plan
in the same change whenever a decision changes (add it to §12 with the date).

Status: phases 1–3 done; phase 4 (admin auth + admin app) mostly done; the Marca page from
phase 5 is built. Next up: the rest of phase 5 (admin UI).

## Decisions

Recommend and ask; never make a business, product or architecture call alone (data model,
naming, public routes, seed content, lifecycle rules, dependencies or licenses, moving or
deleting files). The owner decides; record the decision in PLAN.md §12.

## Commands

Node ≥ 24.15 (`nvm use`, reads `.nvmrc`). There is no root package.json: run each app from
its own folder. Copy `backend/.dev.vars.example` to `backend/.dev.vars` once.

- `cd backend && npm run dev`: API Worker on :8787.
- `cd frontend && npm start`: client app on :4200, proxying `/api` to :8787.
- `cd admin && npm start`: admin on :4201, proxying `/api` to :8787.
- `cd frontend && npm run dev:workers`: client Worker + API Worker together with the `API`
  service binding (to check the `/q/*` gate and SSR against the API).
- Backend DB: `npm run db:generate` after changing a model, then `npm run db:migrate`.
  `npm run admin:create` adds an admin (asks for email and password).
- In each folder: `npm run typecheck` · `npm run lint` · `npm test`. Backend tests run on
  PGlite (in-memory Postgres, real migrations): no Neon needed.

## Repo layout

Three self-contained folders, three Workers (PLAN.md §2, §8):

- `backend/` (`quotman-api`): Hono API Worker, routed at `/api/*` on both hosts. Owns the
  database, migrations, secrets and email.
- `frontend/` (`quotman-web`): Angular 22 client app + its Worker. Reaches the API through
  the `API` service binding (server side) or `/api` (browser). No secrets, no database.
- `admin/` (`quotman-admin`): the admin, mirroring
  `../repos/manttio-whitelabeled/superadmin` (layout, NGXS, PrimeNG, Lucide, conventions) on
  **Angular 21 + PrimeNG 21** (PrimeNG 22 needs a paid license; don't upgrade without asking).
  Every route client-rendered.

**The folders never import each other.** Each has its own package.json, lockfile, tsconfig,
ESLint and Prettier. Shared logic is copied and headed `MIRRORED …`:
`totals`, `format`, `dates`, `QuotationDocument` and the ONP fixture in
`backend/src/shared/`, `frontend/src/app/shared/quotation/` and
`admin/src/app/shared/quotation/`; the document UI (`quotation-document`, `bracket-amount`,
`sine-squares`) in `frontend/` and `admin/` under `src/app/shared/ui/`. **Change every copy
in the same commit.**

API modules: `backend/src/modules/<module>/` with one file per layer: `type`, `enum`, `dto`,
`service`, `repository`, `model`, `client`, `routes`, plus `index.ts` as the public surface
(PLAN.md §8.1); the catalog is `offered-services` (table `offered_services`, type
`OfferedService`). routes → service → repository → model; other modules only through their
`index.ts`; enums are `as const` objects, not TS `enum`. Routes read services from
`c.get('modules')`.

Client Worker entry: `frontend/src/server.ts` is scaffolding only; page-serving logic and
HTML string building go in `frontend/src/server-logic.ts`, which asks the API for domain
answers instead of re-implementing them.

## Rules that aren't obvious from the code

- **No real personal data in the repo or on any public page.** Fixtures use a fictional
  issuer; there is no public sample page.
- **Money is integer cents** (MXN). Every total comes from the mirrored `computeTotals`;
  nothing computes totals on its own.
- **Statuses:** `draft → sent → accepted | declined | changes_requested`, `archived` from any
  status and back. Accepted, declined and archived are read-only. Labels in PLAN.md §3.
- **Revisions and folios:** folio `YYYY-NNN.R`. The first edit after a send opens the next
  revision. Clients only ever see the last **sent** revision's snapshot, never live edits.
- **Soft deletes** (`deleted_at`) on quotations, clients and services; every query filters
  them. Only never-sent drafts can be deleted.
- **Quotation pages are prerendered (SSG) but private.** `/q/*` always passes the Worker's
  session check before a static file is served (`assets.run_worker_first`). Never serve
  quotation HTML or JSON without that check, and send `Cache-Control: private, no-store`.
- **Status and action buttons come from the hydrated API response**, never from the
  prerendered HTML.
- **Tokens and session ids are stored hashed** (SHA-256). Magic-link tokens travel in the
  URL fragment and are only consumed by `POST /api/auth/exchange`, never by a GET.
- **Admin session:** HttpOnly `qm_admin` cookie (`Secure; SameSite=Strict; Path=/api/admin`),
  set by the API on the admin host. The admin app never sees a token; "signed in" means
  `GET /api/admin/auth/me` answered.
- **Branding:** per surface a picker gradient and extra CSS, stored apart and composed by
  the mirrored `shared/branding-css.ts` (gradient first). Extra CSS is declarations only,
  validated by `backend/src/core/css.ts`; no `url()`. The sheet CSS replaces only the base
  gradient: the template's glows and grain stay on top. Print rules use `!important`.
- **The admin is never public:** Cloudflare Access in front of `admin-quotman.dasom.mx`, and
  the API answers `/api/admin/*` only on `ADMIN_HOST` (404 elsewhere, outside development).
- **Lines created from a service snapshot** its title, description and price.
- **Secrets** (`DATABASE_URL`, `RESEND_API_KEY`, `SESSION_SECRET`, `BUILD_TOKEN`,
  `DEPLOY_HOOK_URL`, `ISSUER_*`) go through `wrangler secret put` and a git-ignored
  `.dev.vars`. Never commit them or ask for them in chat. `ISSUER_*` seed the issuer profile
  once; afterwards it's edited in the admin.
- **Email** is sent from `@dasom.mx` through Resend.

## Design

The visual base is `../quotations/cotizacion-onp.html`, ported to
`shared/ui/quotation-document/` in both apps (silver sheet, grouped sections, bracketed
totals, sine-wave squares under the logo). Port it, don't redesign it. The admin uses the
same look (brushed backdrop, silver panes) on top of PrimeNG Aura with `QuotmanPreset`, plus
a dark mode.

- Fonts: Raleway (headings, 600) and Finlandica Text (body), self-hosted via Fontsource on
  the web; static TTFs for the PDF.
- Palette: `#edf6f7` mist · `#C6DBDE` ice · `#48565A` slate · `#111416` ink ·
  `#020506` void; silver grays `#e3e6e7 → #cdd2d4`.
- Type scale: 13 labels · 14 descriptions · 15 sections · 16 lines/amounts · 19 subtotal ·
  25 IVA · 33 total. Weights 400 body / 500 labels / 600 headings.
- No uppercase letterspaced kicker labels; table headers in title case.
- The quotation document has **no hover states** (it's print-first). Admin UI and client
  action buttons may have them.
- No translucent layers in anything printed or turned into a PDF: some PDF viewers render
  them as dark blobs.

## Copy

All UI text is Spanish (es-MX) with accents always (`Cotización`, `Términos`, `Ubicación`).
Currency formatted with `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
