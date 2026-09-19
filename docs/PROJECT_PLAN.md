# Everyday Guide — Execution Task List (v1)

Architecture is locked (see project brief). This document is execution-only: an ordered,
trackable task list with dependencies and verifiable acceptance criteria. No application
code is written here.

**Legend:** `ID` — short task id (referenced as a dependency elsewhere) · `Depends on` —
task ids that must be done first · `AC` — acceptance criteria (all must hold for the task
to be marked done).

**Stage → Agent map:**

| Stage | Agent |
|---|---|
| 1. Scaffold | project-manager output → executed by whoever scaffolds (fullstack-developer/devops) |
| 2. UI Design | ui-designer |
| 3. API Design | api-designer |
| 4. Database | db-architect |
| 5. Backend | fullstack-developer |
| 6. Frontend | frontend-developer |
| 7. Testing | test-writer |
| 8. Review | code-reviewer |

**High-level sequencing:** Stage 1 first. Stages 2 and 3 can run in parallel once Stage 1
is done. Stage 4 depends on Stage 3 (schemas inform table shape). Stage 5 depends on
Stages 3 + 4. Stage 6 depends on Stages 2 + 3, and functionally on Stage 5 for real data
(may stub against the T3.2 contract earlier). Stage 7 depends on Stages 5 + 6. Stage 8 is
last, gated on Stage 7 passing.

---

## Definition of Done (v1)

- [ ] All tasks T1.1–T8.5 below are complete and their acceptance criteria verified.
- [ ] `pnpm build` succeeds with zero TypeScript errors and zero ESLint errors.
- [ ] `pnpm test` (Vitest) and `pnpm test:e2e` (Playwright) pass locally and in CI.
- [ ] Every forward migration in `drizzle/migrations/` has a paired, tested down SQL file
      in `drizzle/migrations/down/`.
- [ ] App is installable as a PWA on iOS Safari and desktop Chrome; app-shell loads offline.
- [ ] Creating, completing, reopening, commenting on, and reordering tasks all work fully
      offline and replay correctly on reconnect (verified by a Playwright offline test).
- [ ] Rolling/history behavior is verified by an integration test directly against the
      rolling query (no cron, pure query semantics).
- [ ] Login works with the single shared password, is rate-limited, and unauthenticated
      requests to any `/api/*` route (except login) are rejected by Edge middleware.
- [ ] JSON backup export produces a complete, valid, re-importable-shape snapshot of all
      tasks and comments.
- [ ] Stats page shows accurate daily completion % and a streak/heatmap that matches
      manually verified sample data for at least 14 days.
- [ ] `.env.example` documents every environment variable in use; no `process.env.X` is
      referenced outside `lib/config/env.ts`.
- [ ] No generic `throw new Error(...)` for domain failures — all domain errors use a
      custom error class from `lib/errors/*`.
- [ ] code-reviewer sign-off recorded against T8.5 checklist with zero open blocking findings.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string used by the `@neondatabase/serverless` Pool and Drizzle. |
| `AUTH_SECRET` | Secret key used by `jose` to sign/verify the JWT session cookie. |
| `APP_PASSWORD_HASH` | Argon2 hash (via `@node-rs/argon2`) of the single shared app password; verified at login. |
| `APP_TIMEZONE` | Fixed IANA timezone (e.g. `America/New_York`) used server-side for all day-boundary/rollover logic. |
| `NEXT_PUBLIC_APP_TIMEZONE` | Client-exposed copy of `APP_TIMEZONE` for date display/formatting in the browser (must match server value). |
| `LOGIN_RATE_LIMIT_MAX` | Max login attempts allowed per rate-limit window before lockout. |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Duration (ms) of the login rate-limit window. |
| `NODE_ENV` | Standard Next.js/Node environment flag (`development`/`production`/`test`); not hand-set in `.env`, but documented for completeness. |

All of the above (except `NODE_ENV`) must be read exclusively through `lib/config/env.ts`
(Zod-validated, fail-fast on missing/invalid values at boot).

---

## Stage 1 — Scaffold

| ID | Task | Depends on | Acceptance Criteria |
|---|---|---|---|
| T1.1 | Initialize Next.js app via `pnpm dlx create-next-app` (TypeScript, App Router, Tailwind, ESLint) | — | `pnpm dev` boots a default page; `tsconfig.json` has `strict: true`; App Router (`app/`) present; Tailwind classes render on the default page. |
| T1.2 | Install all locked dependencies (`@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`, `zod`, `@tanstack/react-query`, an IndexedDB persister lib for React Query, `@serwist/next` + `serwist`, `jose`, `@node-rs/argon2`, `date-fns`, `date-fns-tz`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test`, `tsx`) | T1.1 | `package.json` lists every package above under correct dep/devDep section; `pnpm install` completes with zero peer-dependency errors; no unrelated/unused packages added. |
| T1.3 | Initialize shadcn/ui and register the base component set needed for MVP (button, input, checkbox, dialog, badge, calendar/date-picker, tabs, toast) | T1.1 | `components.json` present; `components/ui/*` generated; a sample shadcn `Button` renders correctly on the default page. |
| T1.4 | Configure Serwist in `next.config.ts` (service worker entry, PWA manifest wiring, app-shell caching strategy scaffold) | T1.2 | `next build` produces a service worker output; `public/manifest.json` (or equivalent) present and linked from root layout; no build errors from the Serwist plugin. |
| T1.5 | Configure `drizzle.config.ts` (schema path, migrations output dir `drizzle/migrations`, Postgres dialect, credentials from env) | T1.2 | `pnpm drizzle-kit check` (or equivalent) runs without error against a placeholder/empty `lib/db/schema.ts`; migrations output path matches convention used by T4.4. |
| T1.6 | Configure Vitest (`vitest.config.ts`, jsdom environment, RTL setup file, path aliases matching `tsconfig.json`) | T1.2 | A trivial sample test (`sample.test.ts`) passes via `pnpm test`; path alias imports (e.g. `@/lib/...`) resolve inside tests. |
| T1.7 | Configure Playwright (`playwright.config.ts`, base URL, local dev server auto-start for e2e) | T1.2 | `pnpm exec playwright install` completes; a trivial e2e spec that loads `/` and asserts page title passes via `pnpm test:e2e`. |
| T1.8 | Create `.env.example` documenting every variable from the Environment Variables table | T1.1 | File exists at repo root; every variable in the table above is present with a one-line comment; no real secrets committed. |
| T1.9 | Implement `lib/config/env.ts` — single Zod-validated env loader | T1.8 | Importing the module with a missing/invalid required var throws a descriptive error at import time (verified by a quick manual run); all app code that needs env vars imports from this module only (spot-checked, enforced fully in T8.1). |
| T1.10 | Implement `lib/config/categories.ts` — fixed category enum/config (`Reminders`, `Coop`, `Courses`) with stable slugs/order | T1.1 | Exports a typed, ordered list of exactly the three categories; no other module hardcodes category strings (enforced in T8.1). |
| T1.11 | Repo hygiene: `.gitignore`, root `README.md` skeleton (setup steps only), `package.json` scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:generate`, `db:migrate`, `db:migrate:down`, `db:seed`) | T1.5, T1.6, T1.7 | Every listed script exists and runs (even as a stub/no-op where the target doesn't exist yet) without throwing "command not found". |
| T1.12 | Minimal CI workflow (GitHub Actions): install, lint, typecheck, unit test on PR | T1.11 | A workflow file runs on `pull_request`; a test PR (or local `act` run / dry validation) shows all four steps executing in order and the job failing if lint/typecheck/test fails. |

---

## Stage 2 — UI Design

| ID | Task | Depends on | Acceptance Criteria |
|---|---|---|---|
| T2.1 | Screen spec: **Today** (default landing view) | T1.3 | Spec covers layout for the three fixed category sections, task item anatomy, add-task entry point, offline indicator placement, and header/nav; reviewed against locked design points (strike-through semantics, rollover). |
| T2.2 | Screen spec: **Day** (browse past dates) | T2.1 | Spec covers date navigation (prev/next/jump), read/interact rules for past days (can still strike/comment on rolled-over tasks), and visual distinction from Today. |
| T2.3 | Screen spec: **Stats** (streaks + heatmap) | T1.3 | Spec covers daily completion % display, calendar heatmap cell states (no data / 0% / partial / 100%), and streak counter placement. |
| T2.4 | Screen spec: **Search** | T1.3 | Spec covers search input, result list item (task + matched context + date), empty-results state, and how results link back to their Day view. |
| T2.5 | Screen spec: **Login** | T1.3 | Spec covers single-password form, error state (invalid password), and rate-limit-exceeded state. |
| T2.6 | Component inventory | T2.1–T2.5 | A single document/table listing every shared component (task item, category section, comment thread/composer, priority flag, due-date badge, streak calendar cell, offline indicator, export button, date navigator) with props/variants named. |
| T2.7 | shadcn theme configuration (color tokens, typography scale, spacing, light/dark if in scope) | T1.3 | Theme values defined in `tailwind.config` / shadcn theme file; every component in T2.6 mapped to theme tokens, no ad-hoc hex values specified in the spec. |
| T2.8 | State matrix across all five screens: struck, overdue, offline, empty, loading, error | T2.1–T2.6 | A matrix (screen × state) exists with a description or wireframe note for each non-trivial cell; every state listed is referenced by at least one component in T2.6. |

---

## Stage 3 — API Design

| ID | Task | Depends on | Acceptance Criteria |
|---|---|---|---|
| T3.1 | `lib/api/schemas.ts` — Zod schemas for Task, Comment, Stats response, Search result, Auth request/response | T1.9, T1.10 | Every entity has a request-input schema and a response schema (where they differ); schemas exported as named exports; types inferred via `z.infer` (no hand-duplicated interfaces). |
| T3.2 | Endpoint table — full REST contract (method, path, request schema, response schema, status codes) covering: auth (login/logout), tasks (list-by-day, create, update, complete, reopen, comment, reorder), stats, search, export | T3.1 | Table includes every route needed by T5.10–T5.14 and every interaction from T2.1–T2.5; each row references a named schema from T3.1; success and error status codes both specified per route. |
| T3.3 | Idempotency contract for task creation via client-generated UUID | T3.1, T3.2 | Contract states: client generates UUID v4/v7 for new tasks; POST with an already-existing id is a no-op success (returns existing resource, not a duplicate/conflict); documented explicitly in T3.2's create-task row. |
| T3.4 | Error taxonomy — canonical list of domain error codes (e.g. `INVALID_CREDENTIALS`, `RATE_LIMITED`, `TASK_NOT_FOUND`, `VALIDATION_ERROR`, `UNAUTHORIZED`) mapped to HTTP status and custom error class name | T3.2 | Every error code used anywhere in T3.2's endpoint table appears in this taxonomy; each entry names the `lib/errors/*` class that will implement it (implemented in T5.15). |

---

## Stage 4 — Database

| ID | Task | Depends on | Acceptance Criteria |
|---|---|---|---|
| T4.1 | `lib/db/schema.ts` — Drizzle table definitions (tasks, comments, and any auth/session-support table if needed) | T3.1 | Columns match every field referenced by T3.1 schemas; `category` constrained to the three fixed values from `lib/config/categories.ts`; `created_date`/`completed_date` typed as date (not timestamp) per rolling-query model. |
| T4.2 | `completed` generated column on `tasks`, derived from `completed_date` | T4.1 | Column defined with Postgres `GENERATED ALWAYS AS (...) STORED` (or Drizzle's generated-column API) keyed off `completed_date IS NOT NULL`; verified by a direct SQL check after migration (insert a row, confirm `completed` flips automatically). |
| T4.3 | Indexes: `created_date`, `completed_date`, `category`, and a `pg_trgm` GIN index on task text for search | T4.1 | `pg_trgm` extension enabled in migration; GIN index present on the searchable text column(s); btree indexes present on `created_date`/`completed_date`/`category`; confirmed via `\d tasks` (or equivalent) after migration. |
| T4.4 | First migration (via `drizzle-kit generate`) + paired hand-written down SQL in `drizzle/migrations/down/` | T4.1, T4.2, T4.3 | Forward SQL file and down SQL file share a matching identifier/name; running forward then down against a scratch DB leaves zero tables/extensions behind; `pnpm db:migrate` and `pnpm db:migrate:down` both succeed. |
| T4.5 | `scripts/seed.ts` — seed script producing realistic sample data (multiple days, all three categories, some completed/rolled-over/commented tasks) | T4.4 | `pnpm db:seed` runs against a local/dev DB and populates enough data to exercise Today, Day, Stats, and Search screens without manual DB edits. |
| T4.6 | Migration runbook (short doc) — how to run up/down migrations locally and in production | T4.4 | Doc lists exact commands for `db:migrate`, `db:migrate:down`, and rollback-on-failure procedure; reviewed for accuracy by actually running each command once. |

---

## Stage 5 — Backend

| ID | Task | Depends on | Acceptance Criteria |
|---|---|---|---|
| T5.1 | `lib/auth/*` — argon2 password verification, JWT issue/verify via `jose`, httpOnly cookie config | T1.9, T3.4 | Verifying the correct password against `APP_PASSWORD_HASH` succeeds; verifying an incorrect password throws the `INVALID_CREDENTIALS` custom error; issued JWT has an expiry and is verifiable with `AUTH_SECRET`. |
| T5.2 | Edge middleware — verifies JWT on protected routes | T5.1 | Requests to any `/api/*` route other than login without a valid cookie return 401 before reaching the route handler; requests with a valid cookie pass through; middleware runs on the Edge runtime (no Node-only APIs used). |
| T5.3 | `POST /api/auth/login` route (Node runtime): argon2 verify → jose JWT → httpOnly cookie, with rate limiting | T5.1, T3.2, T3.4 | Correct password returns 200 + sets cookie; incorrect password returns 401 with `INVALID_CREDENTIALS`; exceeding `LOGIN_RATE_LIMIT_MAX` within `LOGIN_RATE_LIMIT_WINDOW_MS` returns 429 with `RATE_LIMITED`. |
| T5.4 | `POST /api/auth/logout` route | T5.1 | Clears the auth cookie; subsequent requests to a protected route return 401. |
| T5.5 | `lib/dates/*` — pure functions for day-boundary math using `APP_TIMEZONE` (via `date-fns-tz`) | T1.9 | Functions are pure (no I/O); given a fixed `APP_TIMEZONE`, correctly compute "today" boundaries and date comparisons across a DST transition (covered by a unit test in T7.1). |
| T5.6 | `lib/db/queries/tasks.ts` — rolling day-view query: `created_date <= D AND (completed_date IS NULL OR completed_date >= D)`, struck iff `completed_date = D` | T4.4, T5.5 | Query returns correct task set for at least 3 hand-constructed scenarios (never completed, completed same day, completed on a later day) verified manually against seed data before T7.5 automates it. |
| T5.7 | `lib/db/queries/tasks.ts` — create/update/complete/reopen/reorder, idempotent on client UUID | T5.6, T3.3 | Re-submitting a create with the same client UUID does not create a duplicate row; complete/reopen correctly set/clear `completed_date`; reorder persists a stable sort position per category. |
| T5.8 | `lib/db/queries/comments.ts` — add/list comments per task | T4.4 | Comments are queryable per task and per day; adding a comment does not alter `completed_date`/rollover behavior. |
| T5.9 | `lib/stats/*` — daily completion % and streak/heatmap calculation | T5.6 | Given seed data, output matches manually verified expected values for at least 14 consecutive days (covered by unit tests in T7.2); pure functions, no direct DB calls (query results passed in). |
| T5.10 | Route handlers: `/api/tasks` (list/create) and `/api/tasks/[id]` (update/complete/reopen) | T5.7, T3.2 | Each route validates input with the T3.1 Zod schema and returns the exact status codes from T3.2's endpoint table; invalid payloads return `VALIDATION_ERROR` (400). |
| T5.11 | Route handler: `/api/days/[date]` (day view) and `/api/tasks/[id]/comments` and `/api/tasks/reorder` | T5.6, T5.7, T5.8 | `/api/days/[date]` returns exactly the rolling-query result set for that date; comment and reorder endpoints match T3.2 contract. |
| T5.12 | Route handler: `/api/stats` | T5.9 | Returns daily % + streak/heatmap payload matching the T3.1 stats response schema. |
| T5.13 | Route handler: `/api/search` (uses `pg_trgm` index) | T4.3 | Returns matching tasks across all past days ranked by relevance; empty query or no matches returns an empty result array (not an error). |
| T5.14 | Route handler: `/api/export` (JSON backup) | T5.6, T5.8 | Returns a single JSON document containing every task and comment with enough fields to fully reconstruct state; downloadable/parseable as valid JSON. |
| T5.15 | `lib/errors/*` — custom error classes per T3.4 taxonomy + central error-to-HTTP-response mapper used by all route handlers | T3.4 | Every route handler from T5.3–T5.14 uses the shared mapper (no ad-hoc `NextResponse.json({error}, {status})` duplicated per route); no generic `throw new Error(...)` remains for domain failures. |
| T5.16 | Env-loader audit across backend modules | T1.9, T5.1–T5.15 | `grep`-level check confirms zero direct `process.env.X` references outside `lib/config/env.ts` in `lib/`, `app/api/`, and `middleware.ts`. |

---

## Stage 6 — Frontend

| ID | Task | Depends on | Acceptance Criteria |
|---|---|---|---|
| T6.1 | App shell/layout + nav (Today, Day/Stats/Search links, logout) | T2.1–T2.7, T5.2 | Root layout renders nav on all authenticated pages; unauthenticated users are redirected to Login (middleware-enforced, not just UI-hidden). |
| T6.2 | Login page + form | T2.5, T5.3 | Submitting correct password redirects to Today; incorrect password shows the T2.5-specified error state; rate-limited response shows the lockout state. |
| T6.3 | Today page | T2.1, T6.1, T5.10, T5.11 | Renders the three fixed category sections with today's rolling-query task set; add-task control creates a task with a client-generated UUID. |
| T6.4 | Day (past) page + date navigation | T2.2, T6.3, T5.11 | Navigating to a past date shows that date's rolling-query result (including rolled-over unfinished tasks); striking a task on a past day sets `completed_date` to that day, not today. |
| T6.5 | Task item component (strike-through, priority flag, due-date badge, overdue styling) | T2.6, T2.8, T6.3 | Struck tasks render with strike-through per T2.8's "struck" state; tasks past their due date without completion render per the "overdue" state. |
| T6.6 | Comment UI (composer + thread per task) | T2.6, T6.5, T5.11 | Adding a comment persists via the API and appears immediately (optimistically) without a full page reload. |
| T6.7 | Stats page (heatmap + streak + daily %) | T2.3, T5.12 | Heatmap cell shading matches the states defined in T2.3; streak counter matches `lib/stats` output for seeded data. |
| T6.8 | Search page | T2.4, T5.13 | Typing a query returns matching past tasks with a link to their Day view; empty state per T2.8 shown when there are no matches. |
| T6.9 | React Query hooks with optimistic updates for every mutation (create/edit/complete/reopen/comment/reorder) | T3.1, T5.10, T5.11 | Each mutation updates the UI immediately (optimistic) and rolls back on server error; verified manually by throttling network in devtools. |
| T6.10 | React Query IndexedDB persister setup | T1.2, T6.9 | On page reload with network disabled, previously loaded task lists still render from the IndexedDB-persisted cache. |
| T6.11 | IndexedDB outbox — queues create/edit/complete/reopen/addComment/reorder while offline, keyed by client UUID | T6.9 | Performing any of the six actions while offline (devtools offline mode) writes an entry to the outbox and updates the UI optimistically; no network request is attempted while offline. |
| T6.12 | Outbox replay on `online`/focus events with last-writer-wins conflict handling | T6.11 | Reconnecting after offline actions replays all queued outbox entries in order against the real API; if a conflicting server-side change occurred, the more recent write (by timestamp) wins, verified by a manual two-client scenario. |
| T6.13 | Serwist service worker registration + app-shell caching strategy | T1.4 | With network disabled, reloading the app still renders the shell (nav, layout) instead of a browser offline error page. |
| T6.14 | PWA manifest + icons + installability | T1.4, T6.13 | App passes Chrome's installability checks (Lighthouse PWA installable = yes); "Add to Home Screen" works on iOS Safari. |
| T6.15 | Offline indicator UI + export trigger (calls `/api/export`, downloads file) | T2.1, T2.8, T5.14 | Offline indicator appears/disappears correctly with simulated connectivity changes; export button downloads a `.json` file containing the expected structure. |
| T6.16 | Accessibility pass on all interactive components (labels, focus states, keyboard nav) | T6.1–T6.15 | Every interactive element has an accessible name; full task-completion flow (add → complete → comment) is achievable using keyboard only, verified manually. |

---

## Stage 7 — Testing

| ID | Task | Depends on | Acceptance Criteria |
|---|---|---|---|
| T7.1 | Vitest: `lib/dates` unit tests (incl. DST edge case) | T5.5 | Tests cover a standard day, a DST-transition day, and a year boundary; all pass. |
| T7.2 | Vitest: `lib/stats` unit tests | T5.9 | Tests cover 0%, partial, and 100% completion days, plus streak continuation/break; all pass. |
| T7.3 | Vitest: `lib/auth` unit tests | T5.1 | Tests cover correct password, incorrect password, and JWT expiry handling; all pass. |
| T7.4 | Vitest: `lib/api/schemas` validation tests | T3.1 | Tests cover at least one valid and one invalid payload per schema; all pass. |
| T7.5 | Integration test: rolling-query behavior against a real/test Postgres instance | T5.6, T4.5 | Automates the 3 scenarios from T5.6 plus a rollover-then-complete-later scenario; runs against seeded test DB; all pass. |
| T7.6 | RTL component tests: task item, comment composer, forms (login, add-task) | T6.5, T6.6, T6.2 | Each component has a co-located `*.test.tsx`; tests cover struck/overdue rendering and form validation error display; all pass. |
| T7.7 | Playwright e2e: login flow | T6.2 | Covers correct password success, wrong password failure, and rate-limit lockout; passes headless. |
| T7.8 | Playwright e2e: add / complete / comment on a task | T6.3, T6.5, T6.6 | Full flow from Today page through to a struck, commented task persisted after reload; passes headless. |
| T7.9 | Playwright e2e: browse past days + rollover verification | T6.4 | Creates an incomplete task on day D, navigates to day D+2, confirms it still appears (rolled over); completes it on D+2; confirms it disappears from D+3; passes headless. |
| T7.10 | Playwright e2e: offline mode + outbox replay | T6.11, T6.12 | Simulates offline via Playwright's network conditions, performs a create+complete, goes back online, confirms both actions are persisted server-side after reload; passes headless. |
| T7.11 | Playwright e2e: JSON export | T6.15 | Triggers export, confirms downloaded file is valid JSON containing the previously created test task; passes headless. |
| T7.12 | Coverage thresholds + CI gate wiring | T7.1–T7.11, T1.12 | CI workflow fails the build if unit test coverage drops below an agreed threshold or if any e2e spec fails; verified by intentionally breaking a test locally and observing CI fail. |

---

## Stage 8 — Code Review

| ID | Task | Depends on | Acceptance Criteria |
|---|---|---|---|
| T8.1 | Convention audit — naming (PascalCase components, camelCase utils/hooks), named exports, custom error classes only, small single-purpose functions, early returns, co-located tests | T7.1–T7.12 | Findings documented; zero blocking violations remain (all fixed or explicitly waived with reasoning). |
| T8.2 | Security audit — cookie flags (`httpOnly`, `secure`, `sameSite`), rate limiting effectiveness, parameterized queries (no raw SQL string interpolation), secrets never logged/committed | T7.1–T7.12 | Findings documented; zero critical/high findings remain open. |
| T8.3 | Accessibility audit — WCAG AA basics across all five screens | T6.16 | Findings documented; zero blocking a11y issues remain (contrast, labels, focus order). |
| T8.4 | Migration audit — every forward migration has a correct, tested paired down file; index correctness re-verified | T4.4, T4.6 | Confirmed by re-running up/down once more during review; zero orphaned migrations. |
| T8.5 | Final sign-off against the Definition of Done checklist | T8.1–T8.4 | Every checkbox in the Definition of Done section is checked off with evidence (test run output, screenshot, or command output) referenced. |

---

## Risks & Phase-2 Deferrals

- **No history versioning** — editing/deleting a task or comment overwrites state with no
  audit trail. Accepted for v1 (single user, low stakes); revisit if undo/history becomes
  a real need.
- **Fixed `APP_TIMEZONE` on travel** — day boundaries won't shift if Ruddra travels across
  timezones; tasks will roll over based on the configured zone, not local time. Acceptable
  tradeoff for v1 simplicity; a per-session override is a phase-2 candidate.
- **iOS PWA limits** — Safari's IndexedDB storage can be evicted under storage pressure,
  and there's no Background Sync API on iOS, so offline actions only replay on next app
  open/focus, not automatically in the background. Mitigated by the outbox-replay-on-focus
  design; full reliability requires opening the app after reconnecting.
- **LWW offline conflicts** — last-writer-wins can silently drop a concurrent edit if the
  same task is modified from two devices while both were offline. Acceptable for a
  single-user app with low concurrent-edit likelihood; a proper CRDT/merge strategy is
  deferred.
- **Single shared password** — no per-request user identity, no multi-user support, no
  audit-by-actor. Acceptable since this is a personal single-user tool; would need a real
  auth/user model before any multi-user phase.
- **Background Sync + Web Push** — explicitly deferred to phase 2; v1 offline relies on
  manual/focus-triggered replay only, not OS-level background sync.
