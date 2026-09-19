import { existsSync } from "node:fs";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { downSqlPath, latestMigrationTag, readStatements } from "./lib/migrationSql";

/**
 * `pnpm db:migrate:down` — applies the paired down migration for the most
 * recently generated migration against the real (Neon) database.
 *
 * Runs each statement in the down `.sql` file as its own request: the
 * `neon-http` driver has no interactive-transaction support, so there is no
 * multi-statement `BEGIN`/`COMMIT` wrapping this — see docs/DB_RUNBOOK.md for
 * what that means if a rollback fails partway through.
 *
 * Only ever rolls back the single latest migration (by journal order). This
 * project currently has exactly one migration; if a second migration is
 * added later, re-check which migration is actually applied to the target
 * database before assuming "latest in the journal" is safe to roll back.
 */
async function main(): Promise<void> {
  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  } else if (existsSync(".env")) {
    process.loadEnvFile(".env");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to run the rollback script. Set it in .env.local or the environment.",
    );
  }

  const tag = latestMigrationTag();
  const filePath = downSqlPath(tag);
  if (!existsSync(filePath)) {
    throw new Error(`No down migration found for "${tag}" at ${filePath}`);
  }

  const statements = readStatements(filePath);
  if (statements.length === 0) {
    throw new Error(`Down migration for "${tag}" at ${filePath} contains no statements`);
  }

  const db = drizzle(databaseUrl);

  console.log(`Rolling back migration "${tag}" (${statements.length} statement(s))...`);
  for (const [index, statement] of statements.entries()) {
    const preview = statement.split("\n")[0].slice(0, 80);
    console.log(`  [${index + 1}/${statements.length}] ${preview}`);
    await db.execute(sql.raw(statement));
  }

  console.log(`Rollback of "${tag}" complete.`);
}

main().catch((error: unknown) => {
  console.error("Rollback failed:", error);
  process.exitCode = 1;
});
