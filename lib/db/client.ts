import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { PgliteDatabase } from "drizzle-orm/pglite";

import { env } from "@/lib/config/env";

/**
 * Every `lib/db/queries/*` function takes `db: AppDatabase` instead of
 * importing the singleton below directly, so the exact same query logic runs
 * against a real Neon database in production and against an in-process
 * pglite instance in tests (mirrors `scripts/seed.ts`'s `SeedDb` union).
 */
export type AppDatabase = NeonHttpDatabase | PgliteDatabase;

/**
 * Production database client, built with `drizzle-orm/neon-http` +
 * `neon(env.DATABASE_URL)`. `neon-http` queries over HTTP per-call rather
 * than opening a connection at construction time, so creating this at module
 * load is safe regardless of whether `DATABASE_URL` is reachable yet.
 *
 * No interactive transactions on `neon-http` — every write in
 * `lib/db/queries/*` is a single independent SQL statement (see
 * docs/DB_RUNBOOK.md's "Environment split").
 */
export const db: NeonHttpDatabase = drizzle(neon(env.DATABASE_URL));
