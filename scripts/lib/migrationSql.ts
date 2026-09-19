import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Shared helpers for locating and parsing drizzle-kit migration SQL files.
 * Used by both `scripts/verify-migration.ts` (pglite) and
 * `scripts/rollback.ts` (real Neon database via `pnpm db:migrate:down`).
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

/**
 * Reads the tag of the most recently generated migration from the
 * drizzle-kit journal (`drizzle/migrations/meta/_journal.json`).
 */
export function latestMigrationTag(): string {
  const journalPath = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as {
    entries: Array<{ tag: string }>;
  };
  const lastEntry = journal.entries.at(-1);
  if (!lastEntry) {
    throw new Error(`No migrations found in ${journalPath}`);
  }
  return lastEntry.tag;
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
