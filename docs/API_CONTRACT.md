# Everyday List — API Contract (v1)

This is the source of truth for the REST API. The database (Stage 4) and backend (Stage 5)
stages conform to this document and to the Zod schemas in `lib/api/schemas.ts` — the schemas
are the executable half of this contract; this document explains *why* and covers the parts
a schema alone can't (routes, status codes, ordering guarantees, idempotency).

No route handlers or database code are implemented in this stage.

---

## Conventions

- **Base path:** all routes live under `/api/*` (Next.js route handlers in `app/api/**/route.ts`).
- **Auth:** every route except `POST /api/auth/login` requires a valid session. Session state
  is an httpOnly, `Secure` (in production), `SameSite=Lax` cookie containing a `jose`-signed
  JWT, verified by the root `proxy.ts` (Next 16's renamed `middleware.ts`) before the request
  reaches its route handler. Missing/invalid/expired session → `401 UNAUTHORIZED`. The exact
  cookie name/expiry is an implementation detail of the Stage 5 `lib/auth/*` module.
- **Content type:** all request and response bodies are `application/json` (except
  `GET /api/export`, which is JSON served with a `Content-Disposition: attachment` header for
  browser download).
- **Dates vs. datetimes:** calendar-only fields (`dueDate`, `createdDate`, `completedDate`,
  the `[date]` route param, `from`/`to`/`day` query and response fields) are `YYYY-MM-DD`
  strings, validated by `calendarDateSchema`. Instant-in-time fields (`createdAt`, `updatedAt`,
  `exportedAt`) are ISO 8601 UTC datetime strings, validated by `isoDateTimeSchema`. Never mix
  the two — day-boundary/rollover logic is calendar-date arithmetic, not datetime arithmetic.
- **IDs:** every entity `id` (and `taskId` FK) is a UUID, validated by `uuidSchema`. Task and
  comment IDs are **client-generated** (see Idempotency below); all other server-assigned
  values (`createdAt`, `updatedAt`, `completed`) are response-only and rejected/ignored on
  input.
- **Errors:** every non-2xx response body is `{ error: { code, message } }`, validated by
  `errorResponseSchema` — see the Error Taxonomy section below. There is no other error shape
  anywhere in the API.
- **Category:** `category` is always one of `CATEGORY_SLUGS` (`reminders` | `coop` | `courses`),
  validated by `categorySchema`. Never hardcode the slug list outside `lib/config/categories.ts`.

---

## Endpoint Table

| # | Method | Path | Request Schema | Response Schema (success) | Success | Error codes (status) |
|---|---|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | `loginRequestSchema` | `loginResponseSchema` | 200 | `INVALID_CREDENTIALS` (401), `RATE_LIMITED` (429), `VALIDATION_ERROR` (400) |
| 2 | POST | `/api/auth/logout` | — (no body) | `logoutResponseSchema` | 200 | `UNAUTHORIZED` (401) |
| 3 | GET | `/api/days/[date]` | `date` route param → `calendarDateSchema` | `dayViewResponseSchema` | 200 | `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400, malformed `date`) |
| 4 | POST | `/api/tasks` | `taskCreateRequestSchema` | `taskResponseSchema` | 201 (new) / 200 (idempotent replay) | `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400) |
| 5 | PATCH | `/api/tasks/[id]` | `taskPatchRequestSchema` | `taskResponseSchema` | 200 | `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400), `TASK_NOT_FOUND` (404) |
| 6 | DELETE | `/api/tasks/[id]` | — (no body) | `taskDeleteResponseSchema` | 200 | `UNAUTHORIZED` (401), `TASK_NOT_FOUND` (404) |
| 7 | POST | `/api/tasks/[id]/comments` | `commentCreateRequestSchema` | `commentResponseSchema` | 201 (new) / 200 (idempotent replay) | `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400), `TASK_NOT_FOUND` (404, parent task) |
| 8 | GET | `/api/tasks/[id]/comments` | — (no body) | `commentListResponseSchema` | 200 | `UNAUTHORIZED` (401), `TASK_NOT_FOUND` (404) |
| 9 | POST | `/api/tasks/reorder` | `taskReorderRequestSchema` | `taskReorderResponseSchema` | 200 | `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400), `TASK_NOT_FOUND` (404, any `id` not found in `category`) |
| 10 | GET | `/api/stats` | `from`, `to` query params → `statsQuerySchema` | `statsResponseSchema` | 200 | `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400, missing/malformed/`from > to`) |
| 11 | GET | `/api/search` | `q` query param → `searchQuerySchema` | `searchResponseSchema` | 200 | `UNAUTHORIZED` (401) |
| 12 | GET | `/api/export` | — (no body) | `exportResponseSchema` | 200 | `UNAUTHORIZED` (401) |

Every route not listed as an exception requires an authenticated session; the proxy rejects
unauthenticated requests with `401 UNAUTHORIZED` before the handler runs, so individual routes
don't re-implement that check. Any unhandled exception in a route handler maps to
`INTERNAL_ERROR` (500).

---

## Endpoint Details

### 1. `POST /api/auth/login`

Body: `{ password: string }`. On success, sets the session cookie and returns
`{ success: true }`. Rate-limited server-side (window/attempt count come from
`LOGIN_RATE_LIMIT_MAX` / `LOGIN_RATE_LIMIT_WINDOW_MS`, see `lib/config/env.ts`); exceeding the
limit returns `429 RATE_LIMITED` regardless of whether the password was correct.

### 2. `POST /api/auth/logout`

No body. Clears the session cookie. Returns `{ success: true }`.

### 3. `GET /api/days/[date]`

`date` (route param) must match `calendarDateSchema`, e.g. `/api/days/2024-01-15`.

Returns the **rolling day-view** for `date`: every task where
`createdDate <= date AND (completedDate IS NULL OR completedDate >= date)`. `tasks` is a flat
array, pre-sorted by the server (category order per `CATEGORY_SLUGS`, then `sortOrder` within
category) — clients render in response order and don't re-sort. Each task's `completed` flag
is **relative to `date`**: `true` iff `completedDate === date`. A task with a non-null
`completedDate` earlier than `date` has already scrolled out of the rolling set entirely (it
won't be in the response at all), and a task with `completedDate` later than `date` is still
open as of `date` even though it's already been completed on some *future* day relative to
`date` — this only happens when browsing a past day after later completing the task, and it's
intentionally still shown as open on that past day for historical accuracy.

### 4. `POST /api/tasks`

Body: `taskCreateRequestSchema` — client supplies `id` (UUID), `category`, `title`, and
optionally `priority`, `dueDate`, `createdDate`. `createdDate` defaults to the server's current
date (`APP_TIMEZONE`) when omitted. `sortOrder` is never client-supplied; the server assigns it
by appending to the end of the task's category.

**Idempotent on `id`** (see Idempotency & Offline Replay below): 201 for a genuinely new `id`,
200 returning the *existing, unchanged* resource for a replayed `id` — never 409.

### 5. `PATCH /api/tasks/[id]`

Body: `taskPatchRequestSchema` — see Completion Representation below for why this shape was
chosen. At least one of `title`, `priority`, `dueDate`, `category`, or `completion` must be
present, or the request is `400 VALIDATION_ERROR`. Returns the full updated task.

### 6. `DELETE /api/tasks/[id]`

No body. Deletes the task and its comments. Returns `{ success: true }`. Deleting an
already-deleted/unknown `id` is `404 TASK_NOT_FOUND` (delete is not idempotent-on-replay like
create — an outbox replay of a delete after a successful first attempt is expected to surface
as a 404, which the client treats as "already gone" rather than a failure).

### 7. `POST /api/tasks/[id]/comments`

Body: `commentCreateRequestSchema` — client supplies `id` (UUID) and `body`. `taskId` comes
from the route param, not the body. **Idempotent on `id`**, same semantics as task creation
(201 new / 200 existing-unchanged) — comments are one of the six offline-outbox actions, so
they get the same replay-safety guarantee as task creation.

### 8. `GET /api/tasks/[id]/comments`

Returns all comments for the task, oldest first.

### 9. `POST /api/tasks/reorder`

Body: `taskReorderRequestSchema` — `{ category, items: [{ id, sortOrder }] }`. Scoped to a
single category per request (`sortOrder` is only ever meaningful within a category), so the
request names which category is being reordered plus the full ordered list of that category's
task IDs and their new `sortOrder` values. If any `id` in `items` doesn't belong to `category`,
the request fails with `404 TASK_NOT_FOUND`. Naturally idempotent — replaying the same reorder
payload is harmless — so no separate idempotency handling is needed.

### 10. `GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD`

Both `from` and `to` are required; `from` must be `<= to` (`400 VALIDATION_ERROR` otherwise).
Returns per-day figures for every day in `[from, to]` plus streak summary — see
`statsResponseSchema`. `currentStreak`/`longestStreak` are computed over the *entire* task
history, not just the queried range (the range only bounds `days`).

### 11. `GET /api/search?q=...`

`q` is optional; missing or empty `q` returns `[]` with `200` (not an error — same for a
non-empty `q` with no matches). Matches against task titles and comment bodies; each result
names which one matched (`matchedIn`) and the matched text (`matchedText`), plus `createdDate`/
`completedDate` so the UI can link to the correct day view.

### 12. `GET /api/export`

No params. Returns a full JSON backup: `{ exportedAt, tasks: [...] }`, where each task embeds
its comments — sufficient to fully reconstruct application state. Served with
`Content-Disposition: attachment; filename="everydaylist-export-<date>.json"` so the browser
downloads it directly.

---

## Completion Representation (decision)

`PATCH /api/tasks/[id]` accepts an optional `completion` field, a discriminated union on
`action`:

```jsonc
// Mark complete on a specific day (usually the day currently being viewed):
{ "completion": { "action": "complete", "date": "2024-01-15" } }

// Reopen (clear completion):
{ "completion": { "action": "reopen" } }
```

This is combined with the plain field-edit shape (`title?`, `priority?`, `dueDate?`,
`category?`) in the same request body, so a single `PATCH` can change fields, change
completion, or both.

**Why not a raw `completedDate: string | null` field instead?** Two reasons:

1. **Intent clarity at the type level.** `{ action: "complete", date }` vs.
   `{ action: "reopen" }` makes "why is this field being touched" explicit and lets the two
   cases have different validation (`date` is required to complete, irrelevant to reopen) with
   TypeScript narrowing it for free via `z.discriminatedUnion`. A raw nullable field would let
   a client accidentally set an arbitrary `completedDate` unrelated to any real "I completed
   this" action.
2. **Matches the product rule directly.** "Completing a task while browsing a past day marks it
   complete *on that day*, not today" reads naturally as `{ action: "complete", date: <the day
   being viewed> }` — the endpoint doesn't need to guess "today" server-side at all; the client
   (which already knows which day it's looking at) always supplies it.

The tradeoff: this is one extra level of nesting vs. a flat `completedDate` field, and the
combined-request shape (fields + completion in one object) needs the "at least one key present"
refinement to reject empty `PATCH {}` bodies. Both are minor compared to the correctness win.

## Idempotency & Offline Replay (decision)

Task creation (`POST /api/tasks`) and comment creation (`POST /api/tasks/[id]/comments`) both
use a **client-generated UUID** as the resource `id`, and both are **idempotent on that `id`**:

- If no resource with that `id` exists yet: create it, return **201** with the new resource.
- If a resource with that `id` already exists: **no-op**, return **200** with the *existing
  stored* resource — never a `409 Conflict`, and never a merge/update of the existing resource
  with the new request's field values.

This is required by the offline architecture: mutations are queued in an IndexedDB outbox while
offline and replayed on reconnect. If a create request actually succeeded server-side but the
client never saw the response (e.g. connection dropped mid-flight), the outbox will retry the
same request with the same `id`. Idempotency-on-`id` makes that retry safe by construction,
without needing a separate dedup/request-id-tracking layer.

**Idempotency is on `id` only, not full-payload equality.** If a replayed request's body
somehow differs from what was originally stored (shouldn't happen in practice — the outbox
replays the exact original payload — but is possible if, say, a UUID were reused by a bug), the
server returns the *original* stored resource and silently ignores the differing fields in the
replay, rather than attempting to reconcile or erroring. This keeps create-idempotency simple
and unambiguous; genuine edits always go through `PATCH`, which has no such idempotency (a
`PATCH` replay just reapplies the same edit, which is naturally idempotent for field edits and
explicitly modeled for completion via the `action` union above).

`DELETE` and `POST /api/tasks/reorder` are **not** given the same "existing resource, 200"
treatment:

- `DELETE` replayed after a successful first delete hits `404 TASK_NOT_FOUND` — the client's
  outbox treats 404 on a queued delete as "goal already achieved," not a failure.
- Reorder is naturally idempotent (same payload → same end state) without any special-casing,
  since it's a full replacement of the ordering for a category rather than a relative change.

---

## Error Taxonomy

| Code | HTTP Status | `lib/errors/*` class | Used by |
|---|---|---|---|
| `INVALID_CREDENTIALS` | 401 | `InvalidCredentialsError` | `POST /api/auth/login` |
| `RATE_LIMITED` | 429 | `RateLimitedError` | `POST /api/auth/login` |
| `UNAUTHORIZED` | 401 | `UnauthorizedError` | every route except login (thrown by the proxy / session check) |
| `VALIDATION_ERROR` | 400 | `ValidationError` | any route whose request body/params/query fail their Zod schema, or fail a semantic check (e.g. `from > to`, empty `PATCH` body) |
| `TASK_NOT_FOUND` | 404 | `TaskNotFoundError` | `PATCH/DELETE /api/tasks/[id]`, comment routes (parent task lookup), `POST /api/tasks/reorder` (unknown `id` in `items`) |
| `INTERNAL_ERROR` | 500 | `InternalServerError` | any unhandled exception in a route handler (catch-all; never used for an expected/validated failure) |

All error responses share the one shape below, validated by `errorResponseSchema`:

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task 3fa8...c2 was not found."
  }
}
```

`message` is a human-readable, non-sensitive string safe to show directly in the UI or log;
`code` is the stable machine-readable identifier the client branches on. There is no separate
"validation details" field on `VALIDATION_ERROR` responses in v1 — `message` describes the
first/primary validation failure. (If per-field validation detail turns out to be needed for a
richer form UI, that's an additive change to `errorResponseSchema` — e.g. an optional `details`
array — not a breaking one, since `error.code`/`error.message` stay stable.)

---

## Schema Reference

All schemas below live in `lib/api/schemas.ts`, exported by name along with their inferred
`z.infer` type (e.g. `taskResponseSchema` → `TaskResponse`).

**Primitives:** `calendarDateSchema`, `uuidSchema`, `isoDateTimeSchema`, `categorySchema`,
`taskPrioritySchema`, `successResponseSchema`.

**Errors:** `errorCodeSchema`, `errorResponseSchema`.

**Auth:** `loginRequestSchema`, `loginResponseSchema`, `logoutResponseSchema`.

**Comments:** `commentResponseSchema`, `commentCreateRequestSchema`, `commentListResponseSchema`.

**Tasks:** `taskResponseSchema`, `taskCreateRequestSchema`, `taskEditFieldsSchema`,
`taskCompletionActionSchema`, `taskPatchRequestSchema`, `taskDeleteResponseSchema`,
`taskReorderItemSchema`, `taskReorderRequestSchema`, `taskReorderResponseSchema`.

**Day view:** `dayViewResponseSchema`.

**Stats:** `statsQuerySchema`, `statsDayEntrySchema`, `statsResponseSchema`.

**Search:** `searchQuerySchema`, `searchResultItemSchema`, `searchResponseSchema`.

**Export:** `exportResponseSchema`.
