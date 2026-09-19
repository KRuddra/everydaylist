import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { eq, ilike, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";

import { tasks, taskComments } from "@/lib/db/schema";
import { downSqlPath, forwardSqlPath, latestMigrationTag, readStatements } from "./lib/migrationSql";
import { seed } from "./seed";

/**
 * End-to-end verification of the forward + down migration SQL, run against
 * an in-process pglite instance (no Docker/local Postgres available — see
 * docs/DB_RUNBOOK.md). This is the thing `pnpm db:verify` runs; it must pass
 * before any migration is considered safe to apply to Neon.
 *
 * Checks, in order:
 *  1. Forward migration applies cleanly (extension, tables, indexes, FK, CHECK).
 *  2. Both tables and every named index exist (`information_schema`/`pg_indexes`).
 *  3. The `completed` generated column reacts to `completed_date` changes.
 *  4. The `tasks_completed_after_created_check` CHECK constraint is enforced.
 *  5. pg_trgm ILIKE/similarity search works over `tasks.title` and
 *     `task_comments.body` (the queries the trigram GIN indexes exist to serve).
 *  6. `seed()` runs against the same schema and inserts rows.
 *  7. The down migration reverses everything, leaving zero objects behind.
 */

const EXPECTED_TABLES = ["tasks", "task_comments"] as const;

const EXPECTED_INDEXES = [
  "tasks_created_date_idx",
  "tasks_completed_date_idx",
  "tasks_open_created_date_idx",
  "tasks_category_sort_idx",
  "tasks_title_trgm_idx",
  "task_comments_task_created_idx",
  "task_comments_body_trgm_idx",
] as const;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Migration verification failed: ${message}`);
  }
}

async function applySqlFile(client: PGlite, filePath: string): Promise<void> {
  for (const statement of readStatements(filePath)) {
    await client.exec(statement);
  }
}

async function step(label: string, fn: () => Promise<void>): Promise<void> {
  await fn();
  console.log(`  ✓ ${label}`);
}

async function main(): Promise<void> {
  const tag = latestMigrationTag();

  console.log(`Verifying migration "${tag}" against pglite...\n`);

  const client = new PGlite({ extensions: { pg_trgm } });
  const db = drizzle(client);

  console.log("1. Forward migration");
  await step("applies without error", () => applySqlFile(client, forwardSqlPath(tag)));

  console.log("2. Schema shape");
  await step("both tables exist", async () => {
    const result = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [EXPECTED_TABLES],
    );
    const found = new Set(result.rows.map((row) => row.table_name));
    for (const table of EXPECTED_TABLES) {
      assert(found.has(table), `expected table "${table}" to exist`);
    }
  });

  await step("every expected index exists", async () => {
    const result = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = ANY($1)`,
      [EXPECTED_TABLES],
    );
    const found = new Set(result.rows.map((row) => row.indexname));
    for (const indexName of EXPECTED_INDEXES) {
      assert(found.has(indexName), `expected index "${indexName}" to exist`);
    }
  });

  await step("`completed` is a STORED generated column", async () => {
    const result = await client.query<{ is_generated: string; generation_expression: string }>(
      `SELECT is_generated, generation_expression FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'completed'`,
    );
    assert(result.rows.length === 1, "expected a `completed` column on `tasks`");
    assert(result.rows[0].is_generated === "ALWAYS", "expected `completed` to be a generated column");
    assert(
      result.rows[0].generation_expression.includes("completed_date IS NOT NULL"),
      "expected `completed` to be generated from `completed_date IS NOT NULL`",
    );
  });

  await step("`tasks_completed_after_created_check` CHECK constraint exists", async () => {
    const result = await client.query<{ constraint_name: string }>(
      `SELECT constraint_name FROM information_schema.table_constraints
       WHERE table_schema = 'public' AND table_name = 'tasks'
         AND constraint_type = 'CHECK' AND constraint_name = 'tasks_completed_after_created_check'`,
    );
    assert(result.rows.length === 1, "expected the completed-after-created CHECK constraint");
  });

  await step("pg_trgm extension is installed", async () => {
    const result = await client.query<{ extname: string }>(
      `SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'`,
    );
    assert(result.rows.length === 1, "expected pg_trgm extension to be installed");
  });

  console.log("3. Generated column behavior");
  const probeTaskId = "00000000-0000-4000-8000-000000000001";
  await step("`completed` starts false when completed_date is null", async () => {
    await db.insert(tasks).values({
      id: probeTaskId,
      category: "reminders",
      title: "Buy groceries for the week",
      createdDate: "2024-01-01",
      completedDate: null,
    });
    const [row] = await db.select().from(tasks).where(eq(tasks.id, probeTaskId));
    assert(row !== undefined, "expected the inserted probe task to be readable");
    assert(row.completed === false, "expected `completed` to be false when `completed_date` is null");
  });

  await step("`completed` flips to true when completed_date is set", async () => {
    await db.update(tasks).set({ completedDate: "2024-01-02" }).where(eq(tasks.id, probeTaskId));
    const [row] = await db.select().from(tasks).where(eq(tasks.id, probeTaskId));
    assert(row !== undefined, "expected the probe task to still be readable");
    assert(row.completed === true, "expected `completed` to flip to true once `completed_date` is set");
  });

  console.log("4. CHECK constraint enforcement");
  await step("rejects completed_date before created_date", async () => {
    let threw = false;
    try {
      await db.insert(tasks).values({
        id: "00000000-0000-4000-8000-000000000002",
        category: "reminders",
        title: "Invalid task (should be rejected)",
        createdDate: "2024-01-10",
        completedDate: "2024-01-05",
      });
    } catch {
      threw = true;
    }
    assert(threw, "expected the CHECK constraint to reject completed_date < created_date");
  });

  console.log("5. Trigram search");
  await step("ILIKE search matches on tasks.title", async () => {
    const matches = await db.select().from(tasks).where(ilike(tasks.title, "%groceries%"));
    assert(
      matches.some((task) => task.id === probeTaskId),
      "expected ILIKE search to find the probe task by title substring",
    );
  });

  const probeCommentId = "00000000-0000-4000-8000-000000000003";
  await step("comment insert + ILIKE search matches on task_comments.body", async () => {
    await db.insert(taskComments).values({
      id: probeCommentId,
      taskId: probeTaskId,
      body: "Still waiting on a reply from the co-op board before finishing this.",
    });
    const matches = await db
      .select()
      .from(taskComments)
      .where(ilike(taskComments.body, "%co-op board%"));
    assert(
      matches.some((comment) => comment.id === probeCommentId),
      "expected ILIKE search to find the probe comment by body substring",
    );
  });

  await step("trigram `%` similarity operator matches a near-miss spelling", async () => {
    // Low threshold so the assertion isn't sensitive to the exact similarity
    // score — this proves the `%` operator (and its GIN index) work at all,
    // not that the default threshold is tuned a particular way.
    await client.exec("SET pg_trgm.similarity_threshold = 0.1;");
    const result = await db.execute(
      sql`SELECT id FROM ${tasks} WHERE title % 'grocery' AND id = ${probeTaskId}`,
    );
    assert(result.rows.length === 1, "expected the trigram `%` operator to match a near-miss spelling");
  });

  console.log("6. Seed script");
  await step("seed() inserts the expected number of rows", async () => {
    const [{ count: tasksBefore }] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks);
    const [{ count: commentsBefore }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(taskComments);

    const result = await seed(db);
    assert(result.taskCount > 0, "expected seed() to plan at least one task");
    assert(result.commentCount > 0, "expected seed() to plan at least one comment");

    const [{ count: tasksAfter }] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks);
    const [{ count: commentsAfter }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(taskComments);

    assert(
      tasksAfter - tasksBefore === result.taskCount,
      `expected task count to increase by ${result.taskCount}, got ${tasksAfter - tasksBefore}`,
    );
    assert(
      commentsAfter - commentsBefore === result.commentCount,
      `expected comment count to increase by ${result.commentCount}, got ${commentsAfter - commentsBefore}`,
    );
  });

  console.log("7. Down migration");
  await step("applies without error", () => applySqlFile(client, downSqlPath(tag)));

  await step("both tables are gone", async () => {
    const result = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [EXPECTED_TABLES],
    );
    assert(result.rows.length === 0, `expected no tables to remain, found: ${result.rows.map((r) => r.table_name).join(", ")}`);
  });

  await step("pg_trgm extension is removed", async () => {
    const result = await client.query<{ extname: string }>(
      `SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'`,
    );
    assert(result.rows.length === 0, "expected pg_trgm extension to be removed");
  });

  await client.close();
  console.log("\nAll migration checks passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
