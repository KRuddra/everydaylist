# Everyday List — Database Runbook

How to generate, apply, verify, roll back, and seed database migrations for
this project. Every command below has actually been run once while writing
this doc (see "Verified" notes).

## Environment split (read this first)

- **Production runtime** (`lib/db/*`, once Stage 5 implements it) uses
  **`drizzle-orm/neon-http`** — Neon's HTTP query endpoint. It does **not**
  support interactive transactions: every write is a single independent SQL
  statement. Do not introduce `ws`/`Pool`-based connections into application
  code.
- **`pnpm db:migrate`** (the `drizzle-kit migrate` CLI) is a separate tool
  from the app runtime. When `@neondatabase/serverless` is the only Postgres
  driver installed (our case), drizzle-kit's CLI talks to Neon over a
  **WebSocket `Pool`** (bundling its own `ws` internally — this is
  drizzle-kit's own dependency, not something added to this project's
  dependencies) so it *can* wrap a migration file in a real transaction.
  That's a CLI-only implementation detail; it doesn't change the app's
  runtime driver.
- **Tests/verification never touch Neon at all.** There is no Docker or
  local Postgres in this project. `pnpm db:verify` spins up an in-process
  **pglite** (`@electric-sql/pglite`) instance, applies the SQL files
  directly, and tears it down. Production is the only environment that ever
  sees a real Postgres/Neon connection.

## Directory layout

```
drizzle/
  migrations/
    0000_careful_thunderball.sql        # forward migration (drizzle-kit generate)
    down/
      0000_careful_thunderball.sql      # hand-written paired rollback (this repo's convention;
                                         # drizzle-kit does not generate down migrations itself)
    meta/
      _journal.json                     # drizzle-kit's own bookkeeping (migration order/tags)
      0000_snapshot.json
scripts/
  lib/migrationSql.ts                   # shared helpers: latest tag, read/split statement files
  rollback.ts                           # `pnpm db:migrate:down`
  seed.ts                               # `pnpm db:seed` (also exports `seed()` for verify-migration.ts)
  verify-migration.ts                   # `pnpm db:verify`
```

Every forward migration file must have a paired file of the same name under
`down/`. `pnpm db:migrate:down` and `pnpm db:verify` both resolve "the
current migration" as the last entry in `meta/_journal.json`, so a stale/
missing down file is caught immediately (missing file → clear thrown error,
not a silent no-op).

## Commands

### `pnpm db:generate`

Runs `drizzle-kit generate`, reading `lib/db/schema.ts` and writing a new
`drizzle/migrations/NNNN_<name>.sql` (plus updating `meta/`). **Two manual
steps are required after every `db:generate` run**, because drizzle-kit
doesn't know about either of them:

1. **Prepend the pg_trgm extension.** drizzle-kit never emits
   `CREATE EXTENSION`. If the new migration creates or alters a
   `gin_trgm_ops` index, add this as the very first statement:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   --> statement-breakpoint
   ```
   (Already present tables and existing indexes don't need this if the
   extension was already installed by an earlier migration — check whether
   it's a fresh index before adding it again; `IF NOT EXISTS` makes it safe
   either way.)
2. **Hand-write the paired down migration** at
   `drizzle/migrations/down/<same-filename>.sql`. drizzle-kit does not
   generate down migrations — write SQL that fully reverses the forward
   file's statements, in reverse dependency order (drop indexes/constraints
   that reference a table before dropping the table itself, drop child
   tables' FKs before parent tables if order matters, `DROP EXTENSION` last
   if the migration was the one that added it and nothing else still needs
   it).

Then run `pnpm db:verify` (below) before ever pointing this migration at
Neon.

**Verified:** ran against the current schema; confirmed the output contains
the `completed` `GENERATED ALWAYS AS (...) STORED` column, the
`tasks_open_created_date_idx` partial index (`WHERE completed_date IS
NULL`), the `tasks_completed_after_created_check` CHECK constraint, and both
`gin_trgm_ops` indexes (`tasks_title_trgm_idx`, `task_comments_body_trgm_idx`)
— then added the `CREATE EXTENSION` prefix by hand.

### `pnpm db:migrate`

Runs `drizzle-kit migrate` against `DATABASE_URL` (read from `.env.local` /
`.env`, same as `drizzle.config.ts`). Applies every migration in
`drizzle/migrations/` not yet recorded in the `drizzle.__drizzle_migrations`
tracking table, in order, then records it. Requires a real `DATABASE_URL` —
there is no local Postgres to point this at, so this command talks to Neon
directly. Run it against a **dev/staging Neon branch first**, never
directly against a production branch you can't restore.

### `pnpm db:migrate:down`

Runs `scripts/rollback.ts`. Looks up the **most recent** migration tag from
`meta/_journal.json`, reads its paired `down/<tag>.sql`, and applies each
statement (split on `--> statement-breakpoint`) individually against
`DATABASE_URL` via `drizzle-orm/neon-http` — one HTTP request per statement,
since `neon-http` has no interactive transaction to wrap them in.

**This project currently has exactly one migration**, so "most recent in the
journal" and "most recent applied" are the same thing. If a second migration
is ever added, don't assume that anymore — check
`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC;`
against the target database first to confirm which migration is actually
the one on top before rolling back.

**Important — the tracking table is not updated by this script.**
`drizzle-kit migrate` recorded the migration as applied in
`drizzle.__drizzle_migrations`; running the down SQL removes the tables but
does **not** remove that tracking row (`scripts/rollback.ts` talks to Neon
directly, not through drizzle-kit). Before running `pnpm db:migrate` again
after a rollback, delete the stale row or drizzle-kit will think the
migration is already applied and skip it, leaving you with an empty schema
and a tracker that disagrees with reality:
```sql
DELETE FROM drizzle.__drizzle_migrations
WHERE hash = (SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1);
```
(Verify the row you're deleting is actually the one you just rolled back —
compare `created_at` against when you ran `db:migrate`.)

### `pnpm db:seed`

Runs `scripts/seed.ts`'s CLI entrypoint: loads `.env.local` (falling back to
`.env`) via `process.loadEnvFile`, requires `DATABASE_URL`, builds a
`drizzle-orm/neon-http` database, and calls the exported `seed(db)`. Inserts
~14 days of history across all three categories — see "Seed data" below.
Safe to re-run against an empty/fresh database; **not** idempotent against a
database that already has seed data (it always generates new random UUIDs,
so re-running adds a second copy of everything rather than upserting).

### `pnpm db:verify`

Runs `scripts/verify-migration.ts` — the only command in this list that
**doesn't** need `DATABASE_URL` or touch Neon at all. Spins up a fresh
in-process pglite instance with the `pg_trgm` contrib extension available,
then:

1. Applies the forward migration SQL.
2. Asserts both tables and every named index exist (`information_schema`,
   `pg_indexes`).
3. Asserts the `completed` generated column reacts to `completed_date`
   changes (insert with `completed_date: null` → `completed = false`;
   update `completed_date` → `completed` flips to `true`).
4. Asserts the `tasks_completed_after_created_check` CHECK constraint
   actually rejects `completed_date < created_date`.
5. Runs an ILIKE search and a `pg_trgm` `%` similarity search against
   `tasks.title` and `task_comments.body`.
6. Calls `seed()` (imported from `scripts/seed.ts`) against the same pglite
   database and asserts the task/comment counts increased by exactly what
   `seed()` reports it inserted.
7. Applies the down migration and asserts both tables and the `pg_trgm`
   extension are gone.

Run this after every `db:generate` + manual SQL fix, and again any time the
down migration is touched. It's also the fastest way to sanity-check schema
changes without needing any credentials.

**Verified:** all 16 checks pass; the down migration leaves zero tables and
the extension removed.

## First-time setup (fresh Neon database)

1. `cp .env.example .env.local` and fill in a **dev/staging** Neon branch's
   pooled connection string as `DATABASE_URL` (plus the other required
   vars — see `.env.example`).
2. `pnpm db:verify` — confirms the migration SQL itself is correct, with no
   DB credentials needed yet.
3. `pnpm db:migrate` — applies the migration to the real database.
4. `pnpm db:seed` — populates sample data.

## Rollback-on-failure procedure

**If `pnpm db:migrate` fails partway through:** drizzle-kit's CLI migrator
uses a WebSocket `Pool` connection for Postgres/Neon (see "Environment
split" above), and Postgres supports transactional DDL, so a failure inside
a single migration file is rolled back automatically by Postgres itself —
none of that file's statements will have taken effect. Fix the SQL (or the
schema that generated it), then re-run `pnpm db:migrate`. You do **not**
need `pnpm db:migrate:down` in this case — nothing was committed.

**If a migration applied successfully but you need to undo it anyway**
(e.g. it's correct SQL but the wrong schema decision):
1. `pnpm db:migrate:down` — applies the down SQL.
2. Manually reconcile `drizzle.__drizzle_migrations` (see the
   `db:migrate:down` section above) so `pnpm db:migrate` doesn't skip
   re-applying it later.
3. Fix `lib/db/schema.ts`, `pnpm db:generate`, redo the two manual steps
   (pg_trgm prefix + down file), `pnpm db:verify`, then `pnpm db:migrate`
   again.

**If the down migration itself fails partway through** (rare — it's
hand-written and covered by `db:verify`, but `db:migrate:down` runs
statement-by-statement over HTTP with no surrounding transaction, so a
mid-file failure *can* leave partial state on Neon, unlike `db:migrate`):
inspect which of the down file's statements succeeded (the script logs each
one as it runs), manually apply the remaining statements via the Neon SQL
console or `psql`, then reconcile the tracking table as above.

## Adding the next migration

1. Edit `lib/db/schema.ts`.
2. `pnpm db:generate`.
3. Add `CREATE EXTENSION IF NOT EXISTS pg_trgm;` if the new migration
   touches trigram indexes and add/adjust the manual fixes above as needed.
4. Write the paired `drizzle/migrations/down/<same-name>.sql`.
5. `pnpm db:verify` — iterate until it passes.
6. `pnpm db:migrate` against a dev/staging Neon branch, confirm the app
   works, only then promote to production.
