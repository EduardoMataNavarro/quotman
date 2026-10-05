# Quotman — plan

A personal quotation app built on the visual style of `quotations/cotizacion-onp.html`
(silver sheet, Raleway 600 headings, Finlandica Text body, grouped stages, bracketed totals).

Status: **plan only**, nothing scaffolded yet. Decisions from 2026-10-05 are folded in (§12).

---

## 1. Stack

| Layer | Choice | Version checked (2026-10-05) |
|---|---|---|
| Frontend | Angular, standalone components, signals, zoneless | 22.2 |
| Rendering | `@angular/ssr`: SSG for quotation pages, SSR fallback, CSR admin | 22.2 |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) | 4.3 |
| State | Signals + `httpResource`; sessionStorage for per-tab drafts (no NGXS, see §6) | — |
| API | Hono, mounted in the same Worker as Angular | 4.13 |
| Database | Cloudflare D1 (SQLite) + Drizzle ORM / drizzle-kit migrations | 0.45 |
| Files | Cloudflare R2 (logo, cached PDFs) | — |
| PDF | **pdf-lib** + `@pdf-lib/fontkit`, drawn in the Worker (same approach as `manttio/backend/src/lib/pdf.ts`) | 1.17 / 1.1 |
| Email | Resend | 6.32 |
| Hosting | Cloudflare Workers + Static Assets (one Worker), Wrangler, Workers Builds for CI | 4.147 |
| Fonts | Self-hosted `@fontsource-variable/finlandica-text` + `@fontsource-variable/raleway` (web); static TTFs for the PDF | 5.3 |

Everything fits the Workers **free** plan at personal volume; no Browser Rendering.

---

## 2. Architecture

```
Browser ──► Cloudflare Worker (quotman)
              │
              ├─ /q/*            → Worker first: check quotation session, then
              │                    serve the prerendered page from Static Assets
              │                    (or SSR it if it isn't prerendered yet)
              ├─ /api/*          → Hono
              │     ├─ /api/admin/*      admin session
              │     ├─ /api/q/:slug/*    quotation session (document JSON, PDF, actions)
              │     ├─ /api/auth/*       sign-in codes, magic-link exchange, logout
              │     └─ /api/build/*      build token; feeds the prerender (§2.1)
              ├─ static files    → Static Assets (JS, CSS, fonts, prerendered shells)
              └─ everything else → AngularAppEngine.handle(request)
              
              Bindings: DB (D1) · FILES (R2) · ASSETS · RATE_LIMIT
              Secrets:  RESEND_API_KEY · SESSION_SECRET · ADMIN_EMAIL · BUILD_TOKEN · DEPLOY_HOOK_URL
```

The Worker entry is split in two files:

| File | Holds | Doesn't hold |
|---|---|---|
| `src/server.ts` | **Scaffolding only.** Creates the `AngularAppEngine` and the root Hono app, mounts `backend/app.ts` under `/api`, registers the page routes by pointing them at handlers from `server-logic.ts`, and exports the Worker `fetch`. Reads like a table of contents. | Any `if` about sessions, statuses or HTML |
| `src/server-logic.ts` | **Page-serving logic and HTML string building.** The `/q/*` gate (session check through `access/index.ts`, redirect to `/acceso?q=<slug>` when missing), choosing the prerendered asset (`env.ASSETS.fetch`) vs the SSR fallback, response headers (`Cache-Control: private, no-store`, CSP, `X-Robots-Tag: noindex`), and the HTML strings the Worker builds itself: the expired / revoked / not-found pages and any `<head>` injection (title, meta) into rendered or static HTML. | Domain rules: those stay in `backend/modules/*` and are called through each module's `index.ts` |

`server-logic.ts` exports plain functions (`servePrivateQuotation(c)`, `renderGonePage(…)`),
so they're unit-testable without booting Angular. `wrangler.jsonc` sets
`assets.run_worker_first: ["/q/*"]` so **no prerendered quotation is ever served without
passing the session check**.

### 2.1 SSG for quotation URLs + headless hydration

The API is the **headless CMS**: a quotation is content (JSON) at `/api/q/:slug`, and the
Angular app is a presentation layer that hydrates from it. Pages are statically generated
from that content, Jamstack-style.

| Route | Mode |
|---|---|
| `/q/:slug` | **Prerender (SSG)**. `getPrerenderParams()` asks `/api/build/quotations` (build token) for every published slug. `fallback: PrerenderFallback.Server`, so a quotation published since the last build is SSR'd until the next build includes it. |
| `/acceso` (magic-link landing) | Prerender (SSG), static, no data; the token is exchanged client-side (§4.3) |
| `/` | Prerender (SSG) |
| `/admin/**` | Client (CSR) behind auth |

**How content flows:**

1. **Build** — the static HTML for `/q/:slug` contains the quotation document (issuer,
   stages, lines, totals, terms) as of that build, plus its JSON in `TransferState`.
2. **Hydrate** — on load, the page re-fetches `/api/q/:slug` (the user has the session
   cookie by then) and swaps in anything newer: edits made after the build, the current
   status, change-request history. That's the "headless hydration" part: the static page
   is a fast first paint, and the API is the source of truth.
3. **Rebuild** — publishing or editing a quotation in the admin calls the Workers Builds
   **deploy hook**, debounced (one rebuild per 2 minutes, however many edits). Until it
   finishes, step 2 keeps the page correct.

**Dynamic bits never come from the static HTML:** the action buttons (accept / reject /
request changes), status and expiry are always rendered from the hydrated API response, so a
stale build can't offer "Aceptar" on a quotation that was already rejected.

**Privacy:** the prerendered files hold client data, so they live behind `run_worker_first`
and the session check, and every response sends `Cache-Control: private, no-store`. Slugs are
unguessable (22-char base62) as a second layer, not as the only one.

---

## 3. Data model (D1 / Drizzle)

All money is stored as **integer cents** (MXN). Totals come from one shared function,
`shared/totals.ts`, used by the API, the Angular document and the PDF, so the three can't
disagree.

```
issuer_profile     (singleton) name, role, email, phone, razon_social, rfc, location, logo_r2_key
clients            id, name, company, email, rfc?, created_at
services           id, name, description, unit_price_cents, unit, default_stage?, active,
                   created_at, updated_at
quotations         id, slug, folio ('COT-2026-001'), client_id, title, status,
                   currency ('MXN'), tax_rate_bp (1600 = 16%), issued_on, valid_until,
                   terms (json string[]), notes?, version, published_version?,
                   sent_at?, viewed_at?, decided_at?, created_at, updated_at
quotation_stages   id, quotation_id, name ('Arquitectura'), position
quotation_lines    id, quotation_id, stage_id?, service_id?, title, description?,
                   qty, unit_price_cents, position
quotation_actions  id, quotation_id, version, type ('accepted'|'rejected'|'changes_requested'),
                   message?, signer_name?, ip?, user_agent?, created_at
access_links       id, quotation_id, token_hash, recipient_email, expires_at, created_at,
                   first_used_at?, last_used_at?, use_count, revoked_at?
sessions           id_hash, kind ('admin'|'quotation'), subject, expires_at, created_at
quotation_events   id, quotation_id, type ('sent','viewed','downloaded'), at, meta (json)
folio_counters     year, last_number
```

Lines created from a service **copy** its title, description and price at that moment, so
editing the catalog never changes a quotation that was already sent. `service_id` stays only
as a reference.

### Status lifecycle

```
draft ──publish──► sent ──open──► viewed ─┬─► accepted        (frozen)
                     ▲                    ├─► rejected        (frozen)
                     │                    └─► changes_requested
                     └──── admin edits, version + 1, republish ┘
```

`expired` is computed (`valid_until < today` and not accepted). Accepted and rejected
quotations are read-only; changing one means duplicating it into a new draft.

---

## 4. Authentication (self-built)

Cookie sessions, no passwords. The `sessions` table stores SHA-256 of the session id, never
the id itself.

### 4.1 Admin

- One admin: the `ADMIN_EMAIL` secret is the only accepted address.
- `/admin/entrar` → email → Resend sends a 6-digit code and a link (10 min TTL, single
  use). Any other address gets the same "revisa tu correo" response, so the form doesn't
  reveal who the admin is.
- Cookie `qm_admin`: `HttpOnly; Secure; SameSite=Lax; Path=/`, 30-day sliding expiry.
- Hono middleware on `/api/admin/*`; Angular `canMatch` guard on `/admin/**`.
- Rate limit: 5 requests / 15 min per IP and per email (Workers Rate Limiting binding).

### 4.2 Per quotation

- Clients have no accounts. Access to one quotation = a quotation session, cookie
  `qm_q_<slug>` with `Path=/q/<slug>` plus a matching one for `/api/q/<slug>`, so it's
  useless for any other quotation.
- Checked in two places: the Worker before serving `/q/:slug` (static or SSR), and Hono
  middleware on `/api/q/:slug/*`.
- Lasts until `valid_until` + 7 days, capped at 30 days.
- Admin "Revocar acceso" deletes the quotation's sessions and revokes its links.
- No session → redirect to `/acceso?q=<slug>`, which offers "Pedir un nuevo enlace".

### 4.3 Magic links with TTL

- Created on "Enviar" or "Reenviar enlace". Default TTL 7 days, editable, never past
  `valid_until`.
- Token: 32 random bytes, base64url. The DB stores SHA-256(token) only.
- Link: `https://quotman.dasom.mx/acceso#t=<token>`. The token is in the **fragment**, so it never
  reaches server logs or the `Referer` header.
- Email scanners (Outlook Safe Links, Gmail) open links automatically. So the link opens the
  prerendered `/acceso` page with a **"Ver cotización"** button, and only that button's
  `POST /api/auth/exchange` uses the token, sets the cookie and redirects to `/q/<slug>`.
- Reusable until it expires (clients reopen emails days later); `use_count` and
  `last_used_at` are tracked.
- Expired or revoked → "Pedir un nuevo enlace" notifies the admin; the admin decides
  whether to resend.

---

## 5. Features

### 5.1 Client page (`/q/:slug`)

```
Desktop (≥ 1024px)                                Mobile
┌──────────────────────────────┬────────────┐     ┌──────────────────────┐
│                              │ Total      │     │                      │
│   Quotation document         │ $87,000.00 │     │  Quotation document  │
│   (current template)         │ Vigente    │     │                      │
│                              │ hasta …    │     │                      │
│                              │            │     ├──────────────────────┤
│                              │ [Aceptar]  │     │ Total $87,000.00     │
│                              │ [Solicitar │     │ [Aceptar]            │
│                              │  cambios]  │     │ [Solicitar cambios]  │
│                              │ [Rechazar] │     │ [Rechazar]           │
│                              │ ⤓ PDF      │     │ ⤓ Descargar PDF      │
└──────────────────────────────┴────────────┘     └──────────────────────┘
       actions column is sticky                     actions at the very bottom
```

- **Desktop:** a right-hand column, sticky while scrolling: total, validity, the three
  actions, PDF download.
- **Mobile:** the same block at the very bottom of the page, after the terms.
- **Aceptar** → dialog: summary (folio, total) and full name as acceptance ("Acepto la
  cotización COT-2026-001 por $87,000.00 MXN"). Stores name, timestamp, IP, user agent and
  the accepted `version`. Emails the admin.
- **Solicitar cambios** → dialog with a textarea (required, 2,000 chars max) and an optional
  checkbox list of the quotation's lines to point at what should change. Status becomes
  `changes_requested`, the message is stored in `quotation_actions` and emailed to the admin.
  The client sees their request listed under the actions ("Solicitaste cambios el 5 de
  octubre"), and the buttons stay disabled until the admin republishes.
- **Rechazar** → dialog with an optional reason. Status becomes `rejected`; emails the admin.
- After a decision, the column shows the outcome instead of the buttons.
- Dialogs use the native `<dialog>` element: focus trap, Esc to close, labelled.
- The actions column and dialogs are hidden in print.

### 5.2 Admin (`/admin`)

- **Cotizaciones**: list (folio, client, total, status, valid until), status filter;
  create / duplicate / delete draft.
- **Editor** (simple, one page): client, title, validity, tax rate, terms; stages as
  blocks with lines inside (title, description, qty, unit price), "Agregar desde
  servicio" or "Línea libre", up/down buttons for order. Totals update live. Preview tab
  uses the same document component. The unsaved draft lives in sessionStorage.
- **Enviar / Publicar**: recipient, link TTL → creates the access link, sends the email,
  triggers the rebuild. Shows link status (opened, expires in N days), "Reenviar enlace",
  "Revocar acceso".
- **Solicitudes**: client actions per quotation (accepted / rejected / change requests
  with their messages).
- **Servicios**: catalog CRUD, active/inactive.
- **Perfil**: issuer details and logo.

### 5.3 PDF (pdf-lib in the Worker)

Same approach as `manttio/backend/src/lib/pdf.ts`: a small renderer with a moving `y`
cursor, `measureRowHeight` / word wrap, `ensureSpace` to add pages. Rendered on request at
`GET /api/q/:slug/pdf`, cached in R2 as `pdf/<id>/v<version>.pdf`, regenerated only when the
version changes.

Matching the template's look:

| Template element | pdf-lib |
|---|---|
| Fonts | `@pdf-lib/fontkit` with **static TTFs**: Raleway SemiBold, Finlandica Text Regular + Medium, embedded with `subset: true`. Variable fonts only embed their default instance in pdf-lib, and the Fontsource packages ship woff2, so the PDF needs separate TTF files in `backend/modules/pdf/fonts/`. |
| Silver sheet | A solid `#e3e6e7` page fill. pdf-lib has no gradient helper, and a flat fill also avoids the dark-blob problem we hit with translucent layers. |
| Logo | `embedPng` from R2 |
| Sine squares | 12 `drawRectangle` calls using the same formula as the template |
| Grouped stages / lines | Two text columns (stage, concept + description) and three right-aligned numeric columns; 1px rules between stages |
| Totals | Subtotal 19 · IVA 25 · Total 33 (scaled to points), corner brackets as `drawLine` |
| Terms | Two-column list at the bottom |
| Page size | A4 portrait (595 × 842 pt) |

The manttio renderer uses StandardFonts Helvetica; we embed custom fonts instead, so
accents and the brand faces come through.

### 5.4 Email (Resend)

Templates: admin sign-in code, quotation sent (with magic link), new link requested (to
admin), accepted / rejected / changes requested (to admin, with the message). Sending domain
verified in Resend (SPF/DKIM records on Cloudflare DNS).

---

## 6. State

- **Client page:** no store. TransferState from the prerender, then one `httpResource` for
  hydration.
- **Admin:** signals + `httpResource` per feature. No NGXS: the editor is simple, one page,
  with no undo or cross-page optimistic updates.
- **sessionStorage:** the unsaved editor draft and last list filter, wrapped in try/catch.
  Never auth.

---

## 7. Design system port

- Tailwind v4 `@theme` tokens from the template palette:
  `mist #edf6f7 · ice #C6DBDE · slate #48565A · ink #111416 · void #020506`, silver sheet
  grays (`#e3e6e7 → #cdd2d4`) and `--rule rgba(2,5,6,.14)`.
- Type scale settled in the template: 13 labels · 14 descriptions · 15 stages ·
  16 lines/amounts · 19 subtotal · 20/25 IVA · 23/33 total. Weights 400 / 500 / 600,
  accents required, no uppercase kickers, title-case table headers.
- The document itself has no hover states (it's print-first); the admin and the action
  buttons can.
- Reusable pieces: `quotation-document`, `bracket-amount`, `sine-squares`,
  `download-button`, `quotation-actions`, `action-dialog`.

---

## 8. Project structure

```
quotman/
├─ src/
│  ├─ app/
│  │  ├─ core/            auth guards, api client
│  │  ├─ shared/ui/       quotation-document, bracket-amount, sine-squares, buttons, dialog
│  │  ├─ features/
│  │  │  ├─ public/       landing, acceso
│  │  │  ├─ quotation/    client page, actions column, dialogs
│  │  │  └─ admin/        sign-in, quotations, editor, requests, services, profile
│  │  ├─ app.routes.ts
│  │  └─ app.routes.server.ts   ← RenderMode + getPrerenderParams per route
│  ├─ server.ts           Worker entry, scaffolding only: AngularAppEngine, Hono, route wiring
│  ├─ server-logic.ts     /q/* gate, asset vs SSR choice, headers, HTML string building
│  └─ styles.css          Tailwind + @theme tokens + fonts
├─ backend/               modular API (see §8.1)
│  ├─ app.ts              Hono app: core middleware, mounts every module's routes, onError
│  ├─ core/               env bindings, db factory, errors, middleware, crypto, ids, logger
│  └─ modules/
│     ├─ auth/  access/  quotations/  catalog/  clients/  issuer/
│     └─ notifications/  pdf/  build/  files/
├─ shared/                framework-free code used by both sides: totals(), es-MX/MXN formatting
├─ drizzle/               migrations
├─ wrangler.jsonc
└─ package.json
```

One package, one Worker.

### 8.1 Backend architecture

The backend is split into **feature modules**. Every module has the same layers, each in its
own file, so finding code is mechanical: "where's the query that loads a quotation?" is
always `quotations/quotations.repository.ts`.

```
backend/modules/<module>/
├─ <module>.type.ts         domain types
├─ <module>.enum.ts         enumerations
├─ <module>.dto.ts          request / response contracts (zod)
├─ <module>.service.ts      business logic
├─ <module>.repository.ts   database access
├─ <module>.model.ts        Drizzle table definitions
├─ <module>.client.ts       external service adapter
├─ <module>.routes.ts       Hono router (HTTP layer)
├─ <module>.service.test.ts
└─ index.ts                 the module's public surface
```

A module only creates the files it needs (`build` has no model; `quotations` has no
client). When a layer outgrows one file it becomes a folder of the same name
(`quotations/repository/…`) with an `index.ts`, and nothing outside notices.

#### Layers

| Layer | Holds | May import | Never |
|---|---|---|---|
| **type** | Domain types and interfaces (`Quotation`, `QuotationWithLines`, `Totals`) | `enum` | Runtime code |
| **enum** | `as const` objects + derived union types, e.g. `QuotationStatus = { Draft: 'draft', … } as const` | nothing | TS `enum` (not erasable; awkward across the Angular / Worker boundary) |
| **dto** | zod schemas for every request body, query and response, and their inferred types (`CreateQuotationDto`) | `enum`, `type`, zod | Drizzle, Hono |
| **model** | Drizzle `sqliteTable` definitions and relations for the module's tables | drizzle-orm, other models for foreign keys | Queries |
| **repository** | Every D1 query for the module's tables; maps rows ⇄ domain types; owns atomic writes through `db.batch()` | `model`, `type`, `core/db` | Business rules, Hono, other modules' repositories |
| **client** | Thin adapters over external services (Resend, R2, deploy hook) with a small interface the service depends on | external SDK, `core/env` | Business rules |
| **service** | Business logic: rules, status transitions, totals, orchestration. Plain functions over injected deps; throws domain errors | own `repository`, `client`, `type`, `enum`, `dto` types, `shared/`, other modules' `index.ts` | Hono context, raw SQL, `c.env` |
| **routes** | Hono router: auth middleware, `zValidator` with the DTOs, calls the service, shapes the response | own `service` and `dto`, `core/http` | Repositories, models, business rules |

Dependency direction, top to bottom only:

```
routes ──► dto ──► enum / type
   │
   ▼
service ──► repository ──► model
   │   └──► client
   └──► other modules' index.ts (service + public types only)
```

#### Rules

- **Cross-module access goes through `index.ts`.** `access` may call
  `quotations.service.getBySlug()`; it may never import `quotations.repository` or
  `quotations.model`. The one exception is `core/db/schema.ts`, which re-exports every model
  so Drizzle and drizzle-kit see the whole schema.
- **Dependency injection without a container.** Each service is a factory,
  `createQuotationsService({ repo, clock, ids })`. Bindings only exist per request on
  Workers, so a core middleware builds the request's services once
  (`c.set('services', buildServices(c.env))`) and routes read them from there.
- **Errors.** Services throw typed errors from `core/errors` (`NotFoundError`,
  `ConflictError`, `ForbiddenError`, `ValidationError`, `GoneError`); `app.onError` maps them
  to JSON with a stable `code` and a Spanish `message`. Routes never build error responses
  by hand.
- **Transactions.** D1 has no interactive transactions. Multi-statement writes that must be
  atomic (folio counter + insert, revoke links + delete sessions) are one `db.batch([...])`
  inside a single repository method.
- **Frontend contract.** `dto`, `enum` and `type` files are pure TypeScript + zod, so Angular
  imports them through the `@api/<module>` path alias to type its HTTP calls. A lint rule
  (`no-restricted-imports`) stops the frontend from importing `service`, `repository`,
  `model`, `client` or `routes`.
- **Testing.** Services are unit-tested with in-memory fakes of their repository and client
  interfaces. Repositories and routes are tested against a local D1 with Vitest +
  `@cloudflare/vitest-pool-workers`.

#### Modules

| Module | Owns | type | enum | dto | service | repository | model | client | routes |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `auth` | Admin sign-in codes, admin sessions, guard middleware | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `access` | Magic links, quotation sessions, the `/q/*` gate, exchange | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `quotations` | Quotations, stages, lines, folios, status lifecycle, client actions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `catalog` | Services (the sellable catalog; named `catalog` so "service" keeps meaning the layer) | ✓ | | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `clients` | Client records (the people quotations go to) | ✓ | | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `issuer` | Issuer profile and logo | ✓ | | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `notifications` | Email templates and sending | ✓ | ✓ | | ✓ | | | Resend | |
| `pdf` | pdf-lib renderer, fonts, R2 cache | ✓ | | | ✓ | | | | ✓ |
| `build` | Prerender feed, debounced deploy hook | | | ✓ | ✓ | | | Deploy hook | ✓ |
| `files` | R2 uploads and reads (logo, PDFs) | ✓ | | | ✓ | | | R2 | |

`core/` is not a module: env and binding types, the Drizzle factory, errors, shared Hono
middleware (request id, logging, rate limit), crypto helpers (random tokens, SHA-256,
constant-time compare), id and slug generation.

Example request path, client accepts a quotation:

```
POST /api/q/:slug/accept
  quotations.routes      access guard (via access/index.ts) → zValidator(AcceptQuotationDto)
  quotations.service     load by slug, assert status is sent|viewed and not expired,
                         record the action, set status accepted, freeze
  quotations.repository  db.batch([insert quotation_actions, update quotations])
  notifications.service  send "Cotización aceptada" to the admin (Resend client)
  build.service          schedule the debounced rebuild
```

---

## 9. Phases

Progress is tracked here: tick a checkpoint when it's done and verified, and tick the phase
when all its checkpoints are.

- [ ] **1. Scaffold**
  - [ ] Angular 22 + SSR, zoneless, Tailwind v4 with the `@theme` tokens, self-hosted fonts
  - [ ] `src/server.ts` as scaffolding only: AngularAppEngine, root Hono app, route wiring,
        Worker `fetch` export
  - [ ] `src/server-logic.ts` created with stubbed handlers (`servePrivateQuotation`,
        `renderGonePage`) that `server.ts` already routes to
  - [ ] `backend/app.ts` + `backend/core/` (env types, db factory, errors + `onError`,
        request-id/logging middleware, crypto helpers)
  - [ ] Module skeleton convention in place with one example module, and the
        `no-restricted-imports` rule keeping the frontend to `dto` / `enum` / `type`
  - [ ] `wrangler.jsonc`: D1, R2, assets with `run_worker_first: ["/q/*"]`
  - [ ] `wrangler dev` serves an Angular page and `/api/health`
- [ ] **2. Document component**
  - [ ] Port `cotizacion-onp.html` to `<qm-quotation-document>` with a typed input
  - [ ] `bracket-amount`, `sine-squares`, `download-button` as shared UI
  - [ ] Renders the ONP quotation from a fixture, screen and print
- [ ] **3. Data + API**
  - [ ] Models + migrations for every table in §3; `core/db/schema.ts` re-exports them
  - [ ] `shared/totals.ts` with unit tests
  - [ ] Modules `catalog`, `clients`, `issuer`, `quotations` (all layers per §8.1), CRUD routes
  - [ ] Seed with the ONP quotation
- [ ] **4. Admin auth**
  - [ ] `auth` module: email code + link, sessions, guard middleware, rate limit
  - [ ] `notifications` module with the Resend client and the sign-in template
  - [ ] Angular sign-in page + `canMatch` guard
- [ ] **5. Admin UI**
  - [ ] Quotations list with status filter
  - [ ] Simple editor with live totals, preview, sessionStorage draft
  - [ ] Services catalog and issuer profile pages
- [ ] **6. Magic links + client page**
  - [ ] `access` module: links (hashed, TTL), exchange endpoint, quotation sessions, revoke
  - [ ] `/acceso` page with the "Ver cotización" button
  - [ ] **`server-logic.ts` gate:** session check through `access/index.ts`, redirect to
        `/acceso?q=<slug>`, `private, no-store` + `noindex` headers
  - [ ] **`server-logic.ts` HTML strings:** expired / revoked / not-found pages
  - [ ] Client page hydrates from `/api/q/:slug`
- [ ] **7. SSG pipeline**
  - [ ] `build` module: `/api/build/quotations` (build token), debounced deploy hook
  - [ ] `getPrerenderParams` + `PrerenderFallback.Server` on `/q/:slug`
  - [ ] **`server-logic.ts` asset vs SSR choice:** serve the prerendered file through
        `env.ASSETS.fetch`, fall back to SSR when it isn't built yet
  - [ ] Build succeeds when the API is unreachable (prerenders nothing)
  - [ ] Workers Builds connected; publish triggers a rebuild
- [ ] **8. Client actions**
  - [ ] Accept / request changes / reject endpoints and status transitions
  - [ ] Actions column (right on desktop, bottom on mobile) + dialogs
  - [ ] Admin "Solicitudes" view; notification emails
- [ ] **9. PDF**
  - [ ] `pdf` module: pdf-lib renderer with embedded TTFs, matching the template
  - [ ] R2 cache per version (`files` module); download button wired
- [ ] **10. Deploy**
  - [ ] `quotman.dasom.mx` custom domain; `dasom.mx` verified in Resend
  - [ ] Secrets set; remote D1 migrations applied
  - [ ] Smoke test: publish → email → open → request changes → republish → accept → PDF
---

## 10. Secrets and setup you'll provide

- **Resend API key**: don't paste it into chat or commit it. Set it with
  `npx wrangler secret put RESEND_API_KEY`, and in `.dev.vars` locally (git-ignored).
- `ADMIN_EMAIL`, `SESSION_SECRET`, `BUILD_TOKEN` (random 32+ bytes each) via
  `wrangler secret put`.
- `DEPLOY_HOOK_URL`: created in the Cloudflare dashboard once the repo is connected to
  Workers Builds.
- **App: `https://quotman.dasom.mx`**, a Workers custom domain on the `dasom.mx` zone
  (Cloudflare DNS). Cookies are host-only (no `Domain=` attribute), so sessions never
  reach other `dasom.mx` subdomains.
- **Email: sent from `@dasom.mx`** (e.g. `cotizaciones@dasom.mx`). Verify `dasom.mx` in
  Resend and add its records in Cloudflare DNS: the DKIM key (`resend._domainkey`) plus the
  SPF/MX records Resend puts on its `send.dasom.mx` bounce subdomain. None of them touch the
  root MX or SPF, so any existing mailboxes on `dasom.mx` keep working. Add a DMARC record if
  the domain doesn't have one yet.

---

## 11. Risks

- **Rebuild latency:** a full Angular build per publish takes minutes. The SSR fallback and
  hydration keep pages correct meanwhile, so this only affects speed, not correctness.
- **Build-time data access:** the CI build calls the production API with `BUILD_TOKEN`; if
  the API is down, the build must still succeed (prerender nothing, rely on SSR fallback).
- **PDF/web drift:** two renderers (Angular and pdf-lib) draw the same document. Both read
  `shared/totals.ts` and the same type tokens; a fixture test renders the ONP quotation in
  both for visual comparison.

---

## 12. Decisions (2026-10-05)

1. **SSG for quotation URLs** — yes. Prerendered per quotation, gated by the Worker,
   rebuilt on publish, SSR fallback in between (§2.1).
2. **Headless** — means headless-CMS-style hydration: the API serves quotation content as
   JSON and the page hydrates from it (§2.1).
3. **Editor** — simple, single page, no NGXS (§5.2, §6).
4. **Client actions** — accept, reject and request changes (with a dialog); right-hand
   column on desktop, very bottom on mobile (§5.1).
5. **Admin auth** — self-built (§4.1).
6. **Domain** — app at `https://quotman.dasom.mx`; email sent from `@dasom.mx` via Resend (§10).
7. **PDF** — pdf-lib in the Worker, as in manttio; no Browser Rendering (§5.3).
