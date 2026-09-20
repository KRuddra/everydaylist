import { existsSync } from "node:fs";

import { Client } from "pg";

/**
 * `pnpm db:reset` — deletes ALL tasks (and, via `ON DELETE CASCADE`, all their
 * comments) from the database in `DATABASE_URL`. This is a destructive,
 * start-from-scratch reset — it removes real data, not just seed data. It does
 * NOT drop tables or run migrations; the schema is left intact and ready to
 * use immediately.
 */
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local first.");
}

const client = new Client({ connectionString: databaseUrl });

async function countRows(): Promise<{ tasks: number; comments: number }> {
  const result = await client.query<{ tasks: number; comments: number }>(
    "SELECT (SELECT count(*) FROM tasks)::int AS tasks, (SELECT count(*) FROM task_comments)::int AS comments",
  );
  return result.rows[0];
}

async function main(): Promise<void> {
  await client.connect();
  const before = await countRows();
  console.log(`Before -> tasks: ${before.tasks}, comments: ${before.comments}`);

  await client.query("DELETE FROM tasks");

  const after = await countRows();
  console.log(`After  -> tasks: ${after.tasks}, comments: ${after.comments}`);
  console.log("Done. Your list is now empty and ready for your own tasks.");
  await client.end();
}

main().catch((error: unknown) => {
  console.error("Reset failed:", error);
  process.exitCode = 1;
});
