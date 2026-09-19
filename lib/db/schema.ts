import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema for Everyday List.
 *
 * Design notes (see docs/PROJECT_PLAN.md and docs/API_CONTRACT.md):
 * - `category` and `priority` are plain `text`, validated at the app layer
 *   against `lib/config/categories.ts` / the Zod schemas — NOT Postgres enums,
 *   so adding a category later needs no migration.
 * - `created_date` / `completed_date` are calendar `date`s (mode "string" →
 *   "YYYY-MM-DD"), the unit the rollover/history query operates on. They carry
 *   no default: the app always supplies the day computed in `APP_TIMEZONE`.
 * - `completed` is a STORED generated column derived from `completed_date`, so
 *   the "completed but no date" inconsistency is impossible.
 * - `id`s are client-generatable UUIDs (idempotent offline replay); the random
 *   default is only a safety net for server-side inserts.
 */
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    priority: text("priority"),
    dueDate: date("due_date", { mode: "string" }),
    createdDate: date("created_date", { mode: "string" }).notNull(),
    completedDate: date("completed_date", { mode: "string" }),
    completed: boolean("completed").generatedAlwaysAs(
      sql`completed_date IS NOT NULL`,
    ),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Rolling day-view: created_date <= D AND (completed_date IS NULL OR completed_date >= D)
    index("tasks_created_date_idx").on(table.createdDate),
    index("tasks_completed_date_idx").on(table.completedDate),
    // Hot "still open" set (rolls over): partial index on the open rows only.
    index("tasks_open_created_date_idx")
      .on(table.createdDate)
      .where(sql`completed_date IS NULL`),
    // Per-day ordering within a category.
    index("tasks_category_sort_idx").on(table.category, table.sortOrder),
    // Substring search over titles (requires the pg_trgm extension).
    index("tasks_title_trgm_idx").using(
      "gin",
      sql`${table.title} gin_trgm_ops`,
    ),
    check(
      "tasks_completed_after_created_check",
      sql`${table.completedDate} IS NULL OR ${table.completedDate} >= ${table.createdDate}`,
    ),
  ],
);

/**
 * A timeline of comments per task ("why it wasn't done", progress updates).
 * Comments belong to the task, so they roll over with it. `id` is
 * client-generated for idempotent offline replay, mirroring `tasks`.
 */
export const taskComments = pgTable(
  "task_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("task_comments_task_created_idx").on(table.taskId, table.createdAt),
    // Substring search over comment bodies (requires the pg_trgm extension).
    index("task_comments_body_trgm_idx").using(
      "gin",
      sql`${table.body} gin_trgm_ops`,
    ),
  ],
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
export type TaskCommentRow = typeof taskComments.$inferSelect;
export type NewTaskCommentRow = typeof taskComments.$inferInsert;
