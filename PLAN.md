# Quotman — plan

A personal quotation app built on the visual style of `quotations/cotizacion-onp.html`
(silver sheet, Raleway 600 headings, Finlandica Text body, grouped sections, bracketed totals).

Status: **phases 1–3 done**; next is phase 4. Decisions from 2026-10-05 are folded in (§12).

---

## 1. Stack

| Layer | Choice | Version checked (2026-10-05) |
|---|---|---|
| Client app (`frontend/`) | Angular, standalone components, signals, zoneless | 22.2 |
| Admin app (`admin/`) | Mirrors superadmin: Angular + PrimeNG (Aura, `QuotmanPreset`) + NGXS + Lucide, zoneless. Pinned to 21 because PrimeNG 22 moved to a paid license; 21 is MIT | 21.2 / 21.1 / 21.0 |
| Rendering | `@angular/ssr`: SSG for quotation pages, SSR fallback; the admin renders every route client-side | 22.2 |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) | 4.3 |
| State | Client app: signals + `httpResource`. Admin: NGXS, as in superadmin (§6) | — |
| API | Hono, its own Worker (`backend/`) | 4.13 |
| Database | Neon (serverless Postgres) over HTTP (`@neondatabase/serverless`) + Drizzle ORM / drizzle-kit migrations | 1.2 / 0.45 |
| Files | Cloudflare R2 (logo, cached PDFs) | — |
| PDF | **pdf-lib** + `@pdf-lib/fontkit`, drawn in the Worker (same approach as `manttio/backend/src/lib/pdf.ts`) | 1.17 / 1.1 |
| Email | Resend | 6.32 |
| Hosting | Three Cloudflare Workers: API, client app (+ Static Assets, service binding to the API), admin (+ Static Assets). Wrangler, Workers Builds for CI | 4.147 |
| Fonts | Self-hosted `@fontsource-variable/finlandica-text` + `@fontsource-variable/raleway` (web); static TTFs for the PDF | 5.3 |

Everything fits the Workers **free** plan at personal volume; no Browser Rendering.

---

## 2. Architecture

Three Workers on two hostnames, from a three-folder repo (`backend/`, `frontend/`, `admin/`):

```
Browser ──► quotman.dasom.mx
              │
              ├─ /api/*  ─────────► quotman-api   (backend/, Hono)
              │                       ├─ /api/admin/*      admin session
              │                       ├─ /api/q/:slug/*    quotation session (document JSON, PDF, actions)
              │                       ├─ /api/auth/*       sign-in codes, magic-link exchange, logout
              │                       └─ /api/build/*      build token; feeds the prerender (§2.1)
              │                       Bindings: FILES (R2) · RATE_LIMIT
              │                       Secrets:  DATABASE_URL · RESEND_API_KEY · SESSION_SECRET ·
              │                                 ADMIN_EMAIL · BUILD_TOKEN · DEPLOY_HOOK_URL
              │                                 ▲
              │                                 │ service binding `API`
              └─ everything else ─► quotman-web   (frontend/, Angular SSR)
                                      ├─ /q/*            Worker first: session check (via API),
                                      │                  then the prerendered page or SSR
                                      ├─ static files    Static Assets
                                      └─ the rest        AngularAppEngine.handle(request)
                                      Bindings: ASSETS · API (no secrets, no database)

Browser ──► admin-quotman.dasom.mx
              ├─ /api/*  ─────────► quotman-api   (same Worker; admin cookie is host-only here)
              └─ everything else ─► quotman-admin (admin/, Angular, client-rendered)
```

- **Routing.** `quotman.dasom.mx/api/*` and `admin-quotman.dasom.mx/api/*` are Worker routes
  of `quotman-api`, more specific than the apps' `/*` routes, so API calls never touch the
  app Workers. Each app calls the API on its own host: cookies stay host-only, no CORS, and
  the admin cookie never exists on the client-facing host.
- **The web Worker reaches the API only through its `API` service binding** (SSR data, the
  `/q/*` session check, local dev forwarding). It has no database access and no secrets.
- **Code boundary.** `backend/`, `frontend/` and `admin/` are self-contained: own package.json,
  lockfile, tsconfig, ESLint and Prettier, and **no imports between them** (a lint rule in
  each blocks it). They talk over HTTP and the service binding only. Logic they share is
  **copied** into each: `totals`, `format`, `dates`, the `QuotationDocument` type and the ONP
  fixture live in `backend/src/shared/`, `frontend/src/app/shared/quotation/` and
  `admin/src/app/shared/quotation/`; the document UI (`quotation-document`,
  `bracket-amount`, `sine-squares`) in both apps' `shared/ui/`. Every copy is headed
  `MIRRORED …`; change all copies together.

The web Worker entry is split in two files:

| File | Holds | Doesn't hold |
|---|---|---|
| `frontend/src/server.ts` | **Scaffolding only.** Creates the `AngularAppEngine` and the Hono app, registers the routes by pointing them at handlers from `server-logic.ts`, and exports the Worker `fetch`. Reads like a table of contents. | Any `if` about sessions, statuses or HTML |
| `frontend/src/server-logic.ts` | **Page-serving logic and HTML string building.** The `/q/*` gate (session check through the `API` binding, redirect to `/acceso?q=<slug>` when missing), choosing the prerendered asset (`env.ASSETS.fetch`) vs the SSR fallback, `/api/*` forwarding, response headers (`Cache-Control: private, no-store`, CSP, `X-Robots-Tag: noindex`), and the HTML strings the Worker builds itself: the expired / revoked / not-found pages and any `<head>` injection. | Domain rules: those live in the API Worker |

`server-logic.ts` exports plain functions (`servePrivateQuotation(c)`, `renderGonePage(…)`),
so they're unit-testable without booting Angular. `frontend/wrangler.jsonc` sets
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
   sections, lines, totals, terms) as of that build, plus its JSON in `TransferState`.
2. **Hydrate** — on load, the page re-fetches `/api/q/:slug` (the user has the session
   cookie by then) and swaps in anything newer: edits made after the build, the current
   status, change-request history. That's the "headless hydration" part: the static page
   is a fast first paint, and the API is the source of truth.
3. **Rebuild** — publishing or editing a quotation in the admin calls the Workers Builds
   **deploy hook**, debounced (one rebuild per 2 minutes, however many edits). Until it
   finishes, step 2 keeps the page correct.

**Dynamic bits never come from the static HTML:** the action buttons (accept / reject /
request changes), status and expiry are always rendered from the hydrated API response, so a
stale build can't offer "Aceptar" on a quotation that was already declined.

**Privacy:** the prerendered files hold client data, so they live behind `run_worker_first`
and the session check, and every response sends `Cache-Control: private, no-store`. Slugs are
unguessable (22-char base62) as a second layer, not as the only one.

---

## 3. Data model (Neon Postgres / Drizzle)

All money is stored as **integer cents** (MXN). Totals come from one function,
`shared/totals.ts`, mirrored in every folder and used by the API, both apps and the PDF, so
they can't disagree. `deleted_at` marks **soft deletes**: set once, filtered out of every list
and lookup, never cleared.

```
issuer_profile      (singleton) name, role, email, phone, razon_social, rfc, location, logo_url?
branding            (singleton) page_gradient? (json), page_css, sheet_gradient? (json), sheet_css,
                    updated_at
clients             id, name, company?, email, rfc?, created_at, updated_at, deleted_at?
offered_services    id, name, description?, unit_price_cents, unit, default_section?, active,
                    created_at, updated_at, deleted_at?
quotations          id, slug, folio ('2026-001'), client_id, title, status, archived_from?,
                    currency ('MXN'), tax_rate_bp (1600 = 16%), issued_on, valid_until,
                    terms (json string[]), notes?, page_gradient?, page_css?,
                    sheet_gradient?, sheet_css?,
                    revision (from 1), published_revision?, sent_at?, decided_at?,
                    created_at, updated_at, deleted_at?
quotation_sections  id, quotation_id, name ('Arquitectura'), position
quotation_lines     id, quotation_id, section_id?, offered_service_id?, title, description?,
                    qty, unit_price_cents, position
quotation_revisions quotation_id + revision (PK), document (json QuotationDocument), published_at
quotation_actions   id, quotation_id, revision, type ('accepted'|'declined'|'changes_requested'),
                    message?, signer_name?, ip?, user_agent?, created_at
quotation_events    id, quotation_id, type ('sent'|'downloaded'), at, meta (json)
access_links        id, quotation_id, token_hash, recipient_email, expires_at, created_at,
                    first_used_at?, last_used_at?, use_count, revoked_at?
admins              id, email (unique), password_hash (PBKDF2), created_at, last_login_at?
sessions            id_hash, kind ('admin'|'quotation'), subject, expires_at, created_at
folio_counters      year, last_number
```

- **Issuer profile** is seeded once from the `ISSUER_*` secrets (name, role, email, phone,
  razón social, RFC, location) the first time it's read while empty; after that the admin
  edits it. The logo is an https URL entered in the admin. No personal data in the repo.
- **Lines belong to the quotation**; a line's section is optional. Sections are named groups
  (the document's "Etapa" column). The document lists the sections in order, then the lines
  in no section under an empty "Etapa" cell.
- **Folio** `YYYY-NNN.R`: count per year of issue (padded to 3), assigned in the same
  transaction as the insert, plus the revision. Stored as `YYYY-NNN`; shown with `.R`.
- **Revisions.** A quotation starts at revision 1. Sending stores the document in
  `quotation_revisions` and sets `published_revision`. The first edit after a send opens the
  next revision; `revision > published_revision` means unsent changes. **Clients only ever
  see the last sent revision** (its snapshot), never live edits.
- Lines created from a service **copy** its title, description and price, so editing the
  catalog never changes a quotation. `offered_service_id` stays only as a reference.
- **Branding**: per surface (page, sheet) a picker gradient and extra CSS, stored apart
  (§5.5). A quotation's own pieces override the global ones piece by piece; the resolved
  CSS is part of the sent snapshot, so a sent revision never changes look.

### Status lifecycle

```
draft ──send──► sent ─┬─► accepted            (read-only)
                      ├─► declined            (read-only)
                      └─► changes_requested ──edit (revision + 1)──► send ──► sent
any status ──archive──► archived (read-only, hidden from the default list) ──unarchive──► previous status
```

| Code | UI label |
|---|---|
| `draft` | Borrador |
| `sent` | Enviada para revisión |
| `accepted` | Aceptada |
| `declined` | Rechazada |
| `changes_requested` | Cambios solicitados |
| `archived` | Archivada |

`expired` is computed (`valid_until < today` in Monterrey time, and not accepted). Accepted
and declined quotations are read-only; changing one means duplicating it into a new draft
(dated today, same validity length). Only drafts that were never sent can be deleted, and
the delete is soft. Client opens are not tracked.

---

## 4. Authentication (self-built)

Cookie sessions. The `sessions` table stores SHA-256 of the session id, never the id itself.
The admin signs in with a password; clients use magic links.

### 4.1 Admin

- Accounts in `admins` (email + PBKDF2-SHA256 password hash, 100k iterations). Created with
  `cd backend && npm run admin:create`, which asks for the email and password interactively.
- `POST /api/admin/auth/login` → cookie `qm_admin`: `HttpOnly; Secure; SameSite=Strict;
  Path=/api/admin`, 30 days, renewed when less than half is left. Unknown email and wrong
  password get the same answer and cost the same time.
- Guard middleware on every `/api/admin/*` route except login; the admin app's `authGuard`
  asks `GET /api/admin/auth/me` (the cookie is unreadable to JavaScript).
- Logout deletes the session. Changing the password keeps the current session and signs out
  every other one.
- Rate limit on login: 5 attempts / 15 min per IP and per email (Workers Rate Limiting
  binding). Not built yet.

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
  cotización 2026-001.1 por $87,000.00 MXN"). Stores name, timestamp, IP, user agent and
  the accepted `revision`. Emails the admin.
- **Solicitar cambios** → dialog with a textarea (required, 2,000 chars max) and an optional
  checkbox list of the quotation's lines to point at what should change. Status becomes
  `changes_requested`, the message is stored in `quotation_actions` and emailed to the admin.
  The client sees their request listed under the actions ("Solicitaste cambios el 5 de
  octubre"), and the buttons stay disabled until the admin sends the next revision.
- **Rechazar** → dialog with an optional reason. Status becomes `declined`; emails the admin.
- After a decision, the column shows the outcome instead of the buttons.
- Dialogs use the native `<dialog>` element: focus trap, Esc to close, labelled.
- The actions column and dialogs are hidden in print.

### 5.2 Admin app (`admin-quotman.dasom.mx`)

Its own Angular app in `admin/`, mirroring superadmin's structure and conventions (folder
layout, NGXS state, PrimeNG components, `p-table` lists, Lucide icons, guards and
interceptor, shell with collapsible sidebar and topbar) in the webapp's visual style:
brushed-metal backdrop, silver panes, the template's palette and fonts. Dark mode toggle
kept from superadmin (ink/void variant).

- **Cotizaciones**: list (folio with revision, client, total, status, valid until), status
  filter (archived only on request); create / duplicate / archive / unarchive / delete draft.
- **Editor** (simple, one page): client, title, validity, tax rate, terms, branding
  override; sections as blocks with lines inside, plus lines in no section; "Agregar desde
  servicio" or "Línea libre"; up/down ordering. Totals update live. Preview tab uses the
  mirrored document component.
- **Enviar**: recipient, link TTL → stores the revision snapshot, creates the access link,
  sends the email, triggers the rebuild. Shows link status, "Reenviar enlace", "Revocar acceso".
- **Solicitudes**: client actions per quotation (accepted / declined / change requests).
- **Clientes**, **Servicios**: CRUD with soft delete.
- **Perfil del emisor**: issuer details and logo.
- **Marca**: global branding (§5.5).
- **Account menu**: change password, sign out.

### 5.3 PDF (pdf-lib in the Worker)

Same approach as `manttio/backend/src/lib/pdf.ts`: a small renderer with a moving `y`
cursor, `measureRowHeight` / word wrap, `ensureSpace` to add pages. Rendered on request at
`GET /api/q/:slug/pdf` from the sent revision's snapshot, cached in R2 as
`pdf/<id>/r<revision>.pdf`.

Matching the template's look:

| Template element | pdf-lib |
|---|---|
| Fonts | `@pdf-lib/fontkit` with **static TTFs**: Raleway SemiBold, Finlandica Text Regular + Medium, embedded with `subset: true`. Variable fonts only embed their default instance in pdf-lib, and the Fontsource packages ship woff2, so the PDF needs separate TTF files in `backend/src/modules/pdf/fonts/`. |
| Silver sheet | A solid `#e3e6e7` page fill. pdf-lib has no gradient helper, and a flat fill also avoids the dark-blob problem we hit with translucent layers. |
| Branding | Approximated: the first solid color found in `page_css` fills the page and the first in `sheet_css` fills the sheet; no gradients, no translucency. |
| Logo | `embedPng` from R2 |
| Sine squares | 12 `drawRectangle` calls using the same formula as the template |
| Sections / lines | Two text columns (section, concept + description) and three right-aligned numeric columns; 1px rules between sections |
| Totals | Subtotal 19 · IVA 25 · Total 33 (scaled to points), corner brackets as `drawLine` |
| Terms | Two-column list at the bottom |
| Page size | A4 portrait (595 × 842 pt) |

The manttio renderer uses StandardFonts Helvetica; we embed custom fonts instead, so
accents and the brand faces come through.

### 5.4 Email (Resend)

Templates: quotation sent (with magic link), new link requested (to admin), accepted /
declined / changes requested (to admin, with the message). Sending domain
verified in Resend (SPF/DKIM records on Cloudflare DNS).

### 5.5 Branding

- **Marca** page in the admin, one block per surface ("Fondo de la página", "Hoja de la
  cotización"). Each has a **"Usar degradado"** switch with a gradient picker (angle + 2–8
  hex color stops, starting from the template's gradient) and a separate **"CSS adicional"**
  text field. They're stored apart; neither writes into the other. Live preview with the
  mirrored document component.
- **Composition** (`shared/branding-css.ts`, mirrored in backend and admin): the gradient
  becomes `background: linear-gradient(...)`, then the extra CSS follows it, so the CSS can
  override the gradient. Nothing set → the template's look.
- **Validation:** gradient colors must be `#rrggbb`, positions 0–100, angle 0–360. Extra
  CSS (`backend/src/core/css.ts`): declarations only, 2,000 characters max, properties
  limited to `background*`, `border*`, `box-shadow`, `outline`; values may not contain
  `url(` (no images, by decision), `expression(`, `javascript:`, `@`, `<`, `>`, `{`, `}`,
  `\\`, comments or `!important`; parentheses must balance. Normalized to `prop: value;`.
- **Applying it:** the client page applies the page CSS inline to its root. The sheet CSS
  goes inline on the sheet element and replaces only its base gradient: **the template's
  glows and grain always stay on top**, as in cotizacion-onp.html. Print rules use
  `!important` so the printed sheet stays flat.
- **Scope:** global (`branding` singleton), overridable per quotation piece by piece;
  resolved into the sent snapshot.

---

## 6. State

- **Client page:** no store. TransferState from the prerender, then one `httpResource` for
  hydration.
- **Admin:** NGXS, as in superadmin. `app` (dark mode, sidebar) persists through the storage
  plugin; `auth` never persists (the session is an HttpOnly cookie, so "signed in" means
  `/me` answered). Feature state grows per module.
- **sessionStorage:** the unsaved editor draft and last list filter, wrapped in try/catch.
  Never auth.

---

## 7. Design system port

- Tailwind v4 `@theme` tokens from the template palette:
  `mist #edf6f7 · ice #C6DBDE · slate #48565A · ink #111416 · void #020506`, silver sheet
  grays (`#e3e6e7 → #cdd2d4`) and `--rule rgba(2,5,6,.14)`.
- Type scale settled in the template: 13 labels · 14 descriptions · 15 sections ·
  16 lines/amounts · 19 subtotal · 20/25 IVA · 23/33 total. Weights 400 / 500 / 600,
  accents required, no uppercase kickers, title-case table headers.
- The document itself has no hover states (it's print-first); the admin and the action
  buttons can.
- Reusable pieces: `quotation-document`, `bracket-amount`, `sine-squares`,
  `download-button`, `quotation-actions`, `action-dialog`.
- **Admin:** PrimeNG Aura with `QuotmanPreset` (primary = slate family, cool neutral
  surfaces) for components; the shell, cards and login use the template's brushed backdrop
  and silver panes (`silver-pane`, `card-section`), with ink/void dark variants.

---

## 8. Project structure

```
quotman/                    PLAN.md, CLAUDE.md, .gitignore, .nvmrc, .editorconfig; no root package.json
├─ backend/                 quotman-api: the API Worker (see §8.1)
│  ├─ src/
│  │  ├─ index.ts           Worker entry: mounts app.ts under /api
│  │  ├─ app.ts             Hono app: core middleware, every module's routes, onError
│  │  ├─ modules.ts         composition root
│  │  ├─ core/              env, db factory, errors, middleware, crypto, ids, logger
│  │  ├─ modules/           auth/ access/ quotations/ offered-services/ clients/ issuer/ branding/
│  │  │                     notifications/ pdf/ build/ files/
│  │  ├─ shared/            totals, format, dates, QuotationDocument, fixtures (MIRRORED)
│  │  ├─ cli/               create-admin (npm run admin:create)
│  │  └─ test/              PGlite database + API test harness
│  ├─ drizzle/              migrations
│  ├─ wrangler.jsonc        quotman-api, routes quotman.dasom.mx/api/* and admin-quotman.dasom.mx/api/*
│  └─ package.json, tsconfig*.json, eslint.config.js, .prettierrc
└─ frontend/                quotman-web: the Angular app and its Worker
   ├─ src/
   │  ├─ app/
   │  │  ├─ core/               auth guards, api client
   │  │  ├─ shared/quotation/   totals, format, dates, QuotationDocument, fixtures (MIRRORED)
   │  │  ├─ shared/ui/          quotation-document, bracket-amount, sine-squares, buttons, dialog
   │  │  ├─ features/           public/ (landing, acceso), quotation/ (client page)
   │  │  ├─ app.routes.ts
   │  │  └─ app.routes.server.ts   RenderMode + getPrerenderParams per route
   │  ├─ server.ts              Worker entry, scaffolding only
   │  ├─ server-logic.ts        /q/* gate, asset vs SSR choice, /api forwarding, HTML strings
   │  ├─ server-env.ts          ASSETS + API binding types
   │  └─ styles.css             Tailwind + @theme tokens + fonts
   ├─ proxy.conf.json       ng serve: /api → 127.0.0.1:8787
   ├─ wrangler.jsonc        quotman-web, route quotman.dasom.mx/*, service binding API
   └─ package.json, tsconfig*.json, eslint.config.js, .prettierrc
admin/                      quotman-admin: the admin app (mirrors superadmin's layout)
   ├─ src/
   │  ├─ app/
   │  │  ├─ auth/               pages/login, components/change-password-dialog
   │  │  ├─ layouts/            authenticated-layout, components/sidebar
   │  │  ├─ quotations/ clients/ service-catalog/ profile/ branding/   one folder per area
   │  │  ├─ guards/ interceptors/ services/http/ data/dtos/ model/constants/
   │  │  ├─ shared/quotation/   totals, format, dates, QuotationDocument, fixtures (MIRRORED)
   │  │  ├─ shared/ui/          quotation-document, bracket-amount, sine-squares (MIRRORED)
   │  │  └─ theme/quotman-preset.ts
   │  ├─ state/                 NGXS: app/, auth/
   │  ├─ server.ts              Worker entry (every route client-rendered)
   │  └─ styles.css, animations.css
   ├─ proxy.conf.json       ng serve (:4300): /api → 127.0.0.1:8787
   ├─ wrangler.jsonc        quotman-admin, route admin-quotman.dasom.mx/*
   └─ package.json, tsconfig*.json, eslint.config.js, .prettierrc
```

### 8.1 Backend architecture

The backend is split into **feature modules**. Every module has the same layers, each in its
own file, so finding code is mechanical: "where's the query that loads a quotation?" is
always `quotations/quotations.repository.ts`.

```
backend/src/modules/<module>/
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
| **model** | Drizzle `pgTable` definitions and relations for the module's tables | drizzle-orm, other models for foreign keys | Queries |
| **repository** | Every database query for the module's tables; maps rows ⇄ domain types; owns atomic writes through `db.batch()` | `model`, `type`, `core/db` | Business rules, Hono, other modules' repositories |
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
  Workers, so a core middleware builds the request's modules once
  (`c.set('modules', buildModules(c.env))`) and routes read them from there.
- **Errors.** Services throw typed errors from `core/errors` (`NotFoundError`,
  `ConflictError`, `ForbiddenError`, `ValidationError`, `GoneError`); `app.onError` maps them
  to JSON with a stable `code` and a Spanish `message`. Routes never build error responses
  by hand.
- **Transactions.** The Neon HTTP driver has no interactive transactions. Multi-statement
  writes that must be atomic (folio counter + insert, revoke links + delete sessions) are one `db.batch([...])`
  inside a single repository method.
- **Frontend contract.** The frontend never imports backend code. Request and response
  shapes it needs are written on its side (or copied, marked `MIRRORED`) and kept in step
  with the backend's `dto` / `type` files by hand.
- **Testing.** Services are unit-tested with in-memory fakes of their repository and client
  interfaces. Repositories and routes are tested against a Neon dev branch with Vitest +
  `@cloudflare/vitest-pool-workers`.

#### Modules

| Module | Owns | type | enum | dto | service | repository | model | client | routes |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `auth` | Admins, password login, admin sessions, guard middleware | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `access` | Magic links, quotation sessions, the `/q/*` gate, exchange | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `quotations` | Quotations, sections, lines, revisions, folios, status lifecycle, client actions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `offered-services` | The service catalog: table `offered_services`, type `OfferedService`, routes `/api/admin/offered-services` | ✓ | | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `clients` | Client records (the people quotations go to) | ✓ | | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `issuer` | Issuer profile and logo | ✓ | | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `branding` | Global page/sheet CSS, validation in `core/css.ts` | ✓ | | ✓ | ✓ | ✓ | ✓ | | ✓ |
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

- [x] **1. Scaffold**
  - [x] Angular 22 + SSR, zoneless, Tailwind v4 with the `@theme` tokens, self-hosted fonts
  - [x] `src/server.ts` as scaffolding only: AngularAppEngine, root Hono app, route wiring,
        Worker `fetch` export
  - [x] `src/server-logic.ts` created with stubbed handlers (`servePrivateQuotation`,
        `renderGonePage`) that `server.ts` already routes to
  - [x] `backend/app.ts` + `backend/core/` (env types, db factory, errors + `onError`,
        request-id/logging middleware, crypto helpers)
  - [x] Module skeleton convention in place with one example module, and the
        `no-restricted-imports` rule keeping the frontend to `dto` / `enum` / `type`
  - [x] `wrangler.jsonc`: R2, assets with `run_worker_first: ["/q/*"]`
  - [x] `wrangler dev` serves an Angular page and `/api/health`
- [x] **2. Document component**
  - [x] Port `cotizacion-onp.html` to `<qm-quotation-document>` with a typed input
  - [x] `bracket-amount`, `sine-squares`, `download-button` as shared UI
  - [x] Renders the ONP quotation from a fixture, screen and print
- [x] **3. Data + API**
  - [x] Models + migrations for every table in §3; `core/db/schema.ts` re-exports them
  - [x] `shared/totals.ts` with unit tests (done in phase 2, with `shared/format.ts`)
  - [x] Modules `offered-services`, `clients`, `issuer`, `quotations`, `branding` (all layers per §8.1), CRUD routes
  - [x] ~~Seed with the ONP quotation~~ (dropped 2026-10-05: no seed)
- [ ] **4. Admin auth + admin app**
  - [x] `auth` module: admins, password login, HttpOnly cookie sessions, guard middleware
  - [x] `admin:create` CLI
  - [x] `admin/` app mirroring superadmin: shell, sidebar, login, `authGuard` / `guestGuard`,
        interceptor, change-password dialog, dark mode, webapp visual style
  - [ ] Login rate limit (Workers Rate Limiting binding)
  - [x] Admin API answers only on the admin host (404 elsewhere, outside development)
- [ ] **5. Admin UI**
  - [ ] Quotations list with status filter, archive / unarchive / duplicate / delete
  - [ ] Simple editor with sections, live totals, preview, branding override, sessionStorage draft
  - [ ] Clients, offered services and issuer profile pages
  - [x] Marca page: gradient pickers, CSS fields, live preview
- [ ] **6. Magic links + client page**
  - [ ] Send: revision snapshot into `quotation_revisions`, `published_revision`, status `sent`
  - [ ] `access` module: links (hashed, TTL), exchange endpoint, quotation sessions, revoke
  - [ ] `/acceso` page with the "Ver cotización" button
  - [ ] **`server-logic.ts` gate:** session check through `access/index.ts`, redirect to
        `/acceso?q=<slug>`, `private, no-store` + `noindex` headers
  - [ ] **`server-logic.ts` HTML strings:** expired / revoked / not-found pages
  - [ ] Client page hydrates from `/api/q/:slug` (the sent snapshot) and applies `page_css`
- [ ] **7. SSG pipeline**
  - [ ] `build` module: `/api/build/quotations` (build token), debounced deploy hook
  - [ ] `getPrerenderParams` + `PrerenderFallback.Server` on `/q/:slug`
  - [ ] **`server-logic.ts` asset vs SSR choice:** serve the prerendered file through
        `env.ASSETS.fetch`, fall back to SSR when it isn't built yet
  - [ ] Build succeeds when the API is unreachable (prerenders nothing)
  - [ ] Workers Builds connected; publish triggers a rebuild
- [ ] **8. Client actions**
  - [ ] Accept / request changes / decline endpoints and status transitions
  - [ ] Actions column (right on desktop, bottom on mobile) + dialogs
  - [ ] Admin "Solicitudes" view; notification emails
- [ ] **9. PDF**
  - [ ] `pdf` module: pdf-lib renderer with embedded TTFs, matching the template
  - [ ] Branding approximated (first solid color of each CSS value)
  - [ ] R2 cache per revision (`files` module); download button wired
- [ ] **10. Deploy**
  - [ ] Proxied DNS records for `quotman.dasom.mx` and `admin-quotman.dasom.mx`; Worker routes
        for `quotman-api` (`/api/*` on both hosts), `quotman-web` and `quotman-admin` (`/*`);
        `dasom.mx` verified in Resend
  - [ ] Deploy order: API first (the web Worker's service binding needs it), then web and admin
  - [ ] **Cloudflare Access** application on `admin-quotman.dasom.mx/*` (covers its `/api/*`
        too), policy: only the owner's email. The admin is never public.
  - [ ] First admin created with `npm run admin:create` against production
  - [ ] Secrets set (incl. `DATABASE_URL`); migrations applied to the Neon production branch
  - [ ] Smoke test: publish → email → open → request changes → republish → accept → PDF
---

## 10. Secrets and setup you'll provide

- **Resend API key**: don't paste it into chat or commit it. Set it with
  `npx wrangler secret put RESEND_API_KEY`, and in `.dev.vars` locally (git-ignored).
- `DATABASE_URL`: Neon pooled connection string (a dev branch in `.dev.vars`, production via
  `wrangler secret put`).
- `SESSION_SECRET`, `BUILD_TOKEN` (random 32+ bytes each) via `wrangler secret put`.
- `ISSUER_NAME`, `ISSUER_ROLE`, `ISSUER_EMAIL`, `ISSUER_PHONE`, `ISSUER_RAZON_SOCIAL`,
  `ISSUER_RFC`, `ISSUER_LOCATION`: secrets that seed the issuer profile once. Set them in
  `backend/.dev.vars` locally. The logo URL is entered in the admin.
- **Admin account:** `cd backend && npm run admin:create` (asks for email and password;
  nothing goes in a secret or in shell history).
- `DEPLOY_HOOK_URL`: created in the Cloudflare dashboard once the repo is connected to
  Workers Builds.
- **Client app: `https://quotman.dasom.mx`**, **admin: `https://admin-quotman.dasom.mx`**,
  Worker routes on the `dasom.mx` zone (Cloudflare DNS). Cookies are host-only (no `Domain=`
  attribute), so sessions never reach other subdomains, and the admin cookie never reaches
  the client-facing host.
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
  the mirrored `totals` and the same type tokens; a fixture test renders the ONP quotation in
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
5. **Admin auth** — self-built (§4.1). Superseded by 13: password + HttpOnly cookie.
6. **Domain** — app at `https://quotman.dasom.mx`; email sent from `@dasom.mx` via Resend (§10).
7. **PDF** — pdf-lib in the Worker, as in manttio; no Browser Rendering (§5.3).
8. **Phase 1 build notes** — Node ≥ 24.15 (Angular CLI 22 minimum; `.nvmrc` pins 24.21).
   `ssr.platform: "neutral"` so the server bundle runs on Workers. The catalog's domain type
   is `CatalogItem` (table stays `services`). Until the `auth` module lands,
   `/api/admin/*` uses `adminGuardPlaceholder`: open only when `ENVIRONMENT=development`,
   401 everywhere else. `/q/*` denies everything until phase 6.
9. **Database: Neon instead of D1** (2026-10-05). Serverless Postgres over HTTP
   (`drizzle-orm/neon-http`), connection string in the `DATABASE_URL` secret. Atomic
   multi-statement writes still go through `db.batch()`. Migrations: `npm run db:generate`,
   then `npm run db:migrate` against the branch in `.dev.vars`. Money stays integer cents
   (`integer`), timestamps are `timestamptz` exposed as ISO strings.
10. **Phase 2 notes** (partly superseded by 13: `/muestra` and the logo are gone) — The document's input type is `QuotationDocument` in
    each app's `shared/` folder (the `/api/q/:slug` payload). The ONP fixture lives in
    `shared/fixtures/onp.ts` for the seed and the PDF comparison. `/muestra` (prerendered)
    renders it and is the screen/print reference; the logo is `public/logo.png`
    until the issuer logo moves to R2.
11. **Phase 3 notes** (data-model parts superseded by 13) — Every line belongs to a stage (`stage_id` required); a stage's name
    is optional and renders an empty stage cell. The issuer stores `logo_url` (set by the
    files module on upload) instead of an R2 key. `sign_in_codes` added for §4.1. Folios
    are `COT-<year of issue>-NNN`, bumped in the same transaction as the insert. The
    editor saves the whole document (`PUT /api/admin/quotations/:id`); the first save after
    a publish bumps `version`, so `version > published_version` means unpublished changes.
    Clients are joined in the service through `clients/index.ts`, never in SQL, to keep
    modules apart. Repository and route tests run on PGlite (in-memory Postgres) with the
    real migrations. **Open for phase 6:** the client page currently would see unpublished
    edits; decide whether `/api/q/:slug` serves the live record or a snapshot taken on publish.
12. **Two Workers, two folders** (2026-10-05; a third folder, `admin/`, added by 13). `backend/` (`quotman-api`, route
    `quotman.dasom.mx/api/*`) and `frontend/` (`quotman-web`, route `quotman.dasom.mx/*`,
    service binding `API`), side by side at the root. No npm workspaces, no root
    package.json, no published packages: each folder has its own package.json, lockfile,
    tsconfig, ESLint and Prettier, and they never import each other. Shared logic (`totals`,
    `format`, `dates`, `QuotationDocument`, ONP fixture) is **copied into both** and marked
    `MIRRORED`. The web Worker holds no secrets and no database access. Dev: `cd backend &&
    npm run dev` (:8787) and `cd frontend && npm start` (:4200, proxies `/api`);
    `cd frontend && npm run dev:workers` runs both Worker builds with the binding.
    `.vscode/` is git-ignored.
13. **Owner review** (2026-10-05). No public personal info ever: `/muestra` and the logo
    removed, fixtures use a fictional issuer. No seed. Lines belong to the quotation;
    sections are a separate table and a line's section is optional. Statuses `draft → sent →
    accepted | declined | changes_requested`, `archived` from any status (reversible), with
    the labels in §3. Revision number per quotation; folio `YYYY-NNN.R`. First edit after a
    send opens the next revision. Soft deletes on quotations, clients and services; only
    never-sent drafts can be deleted. Duplicates keep the validity length. Clients only see
    the last sent revision (snapshot). No open tracking (`viewed` dropped). Catalog type
    `Service`, module `services`. `sign_in_codes` dropped. **Admin app** in `admin/` at
    `admin-quotman.dasom.mx`, mirroring superadmin on Angular 21 + PrimeNG 21 (MIT; PrimeNG
    22 requires a paid license key) + NGXS 21 + Lucide, Tailwind 4, in the webapp's visual
    style with dark mode kept. Admin auth: `admins` table, PBKDF2 passwords,
    `npm run admin:create`, HttpOnly `qm_admin` cookie; the API is also routed on the admin
    host. **Branding:** global page/sheet CSS with per-quotation override, gradient picker +
    editable CSS fields, validated declarations, approximated in the PDF. Internal naming:
    the per-request container is `c.get('modules')`.
14. **Follow-ups** (2026-10-07). Unsectioned lines render under an empty "Etapa" cell; a
    sent quotation stays editable (clients keep seeing the sent snapshot). Branding: no
    `url()` / images; a branded sheet keeps the template's glows and grain; picker gradient
    and extra CSS stored separately (gradient first, CSS after). **The admin is never
    public:** Cloudflare Access in front of `admin-quotman.dasom.mx`, and the API refuses
    `/api/admin/*` on any other host. The catalog table is `offered_services` (type
    `OfferedService`, module `offered-services`, routes `/api/admin/offered-services`); the
    admin's label stays "Servicios". The per-request container is `c.get('modules')`
    (confirmed 2026-10-07). The admin's catalog route `/services` and folder
    `service-catalog/` stay as they are.
15. **Issuer from env** (2026-10-07). The issuer profile is seeded once from `ISSUER_*`
    secrets, then edited in the admin; an invalid or incomplete seed is skipped (logged by
    field name only). The logo is an https URL entered in the admin. Personal data was
    removed from the git history (rewritten and force-pushed). `c.get('modules')` stays.
