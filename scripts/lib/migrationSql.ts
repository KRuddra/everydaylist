import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Shared helpers for locating and parsing drizzle-kit migration SQL files.
 * Used by both `scripts/verify-migration.ts` (pglite) and
 * `scripts/rollback.ts` (real Supabase database via `pnpm db:migrate:down`).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** `drizzle/migrations` — must match `out` in drizzle.config.ts. */
export const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "drizzle", "migrations");

/** Statement separator drizzle-kit writes between DDL statements in a migration file. */
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

/** Path to a forward migration's `.sql` file for a given tag, e.g. `0000_careful_thunderball`. */
export function forwardSqlPath(tag: string): string {
  return path.join(MIGRATIONS_DIR, `${tag}.sql`);
}

/** Path to the paired down migration's `.sql` file for a given tag. */
export function downSqlPath(tag: string): string {
  return path.join(MIGRATIONS_DIR, "down", `${tag}.sql`);
}

/** All migration tags in journal (application) order — for applying the full schema. */
export function allMigrationTags(): string[] {
  const journalPath = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as {
    entries: Array<{ tag: string }>;
  };
  if (journal.entries.length === 0) {
    throw new Error(`No migrations found in ${journalPath}`);
  }
  return journal.entries.map((entry) => entry.tag);
}

/**
 * Reads the tag of the most recently generated migration from the
 * drizzle-kit journal (`drizzle/migrations/meta/_journal.json`).
 */
export function latestMigrationTag(): string {
  const tags = allMigrationTags();
  return tags[tags.length - 1];
}

/** Splits a migration file's contents into individual executable SQL statements. */
export function splitStatements(sqlText: string): string[] {
  return sqlText
    .split(STATEMENT_BREAKPOINT)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

/** Reads and splits a migration `.sql` file in one step. */
export function readStatements(filePath: string): string[] {
  return splitStatements(readFileSync(filePath, "utf-8"));
}
