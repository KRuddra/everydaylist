import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";

import { env } from "@/lib/config/env";

/**
 * Every `lib/db/queries/*` function takes `db: AppDatabase` instead of
 * importing the singleton below directly, so the exact same query logic runs
 * against a real Postgres database (Supabase) in production and against an
 * in-process pglite instance in tests (mirrors `scripts/seed.ts`'s `SeedDb`).
 */
export type AppDatabase = NodePgDatabase | PgliteDatabase;

/**
 * Production database client, built with `drizzle-orm/node-postgres` (the `pg`
 * driver) against `env.DATABASE_URL` — a Supabase pooled connection string.
 * `pg`'s Pool connects lazily (on first query), so constructing this at module
 * load is safe even before `DATABASE_URL` is reachable (e.g. during `next build`).
 *
 * Every write in `lib/db/queries/*` is a single SQL statement, so this works
 * over Supabase's transaction pooler as well as its session pooler.
 */
export const db: NodePgDatabase = drizzle(env.DATABASE_URL);
