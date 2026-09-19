import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";

import type { TaskResponse } from "@/lib/api/schemas";
import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/config/categories";
import type { AppDatabase } from "@/lib/db/client";
import { taskComments, tasks, type TaskCommentRow, type TaskRow } from "@/lib/db/schema";
import { InternalServerError, TaskNotFoundError } from "@/lib/errors/errors";

import { mapCommentRow, mapTaskRow } from "./mappers";

/** `ORDER BY` expression: `CATEGORY_SLUGS` order first, then `sortOrder` within category. */
const categoryOrderExpr = sql`CASE ${tasks.category} ${sql.join(
  CATEGORY_SLUGS.map((slug, index) => sql`WHEN ${slug} THEN ${index}`),
  sql` `,
)} END`;

export async function getTaskById(db: AppDatabase, id: string): Promise<TaskRow | undefined> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
  return row;
}

/**
 * All comments for every task in `taskIds`, grouped by `taskId`, oldest
 * first within each group. Used by `getDayView`/`getAllTasks` so they don't
 * issue one comment query per task. Returns an empty map for an empty input
 * (an `IN ()` with no values is invalid SQL). Kept in this file (rather than
 * `comments.ts`) to avoid a circular import — `comments.ts` already depends
 * on `getTaskById` above.
 */
async function getCommentsForTaskIds(
  db: AppDatabase,
  taskIds: readonly string[],
): Promise<Map<string, TaskCommentRow[]>> {
  const byTaskId = new Map<string, TaskCommentRow[]>();
  if (taskIds.length === 0) {
    return byTaskId;
  }

  const rows = await db
    .select()
    .from(taskComments)
    .where(inArray(taskComments.taskId, [...taskIds]))
    .orderBy(asc(taskComments.createdAt));

  for (const row of rows) {
    const existing = byTaskId.get(row.taskId);
    if (existing) {
      existing.push(row);
    } else {
      byTaskId.set(row.taskId, [row]);
    }
  }

  return byTaskId;
}

export interface CreateTaskInput {
  id: string;
  category: CategorySlug;
  title: string;
  priority: TaskRow["priority"];
  dueDate: string | null;
  createdDate: string;
}

/**
 * Creates a task, idempotent on `input.id` (see
 * docs/API_CONTRACT.md's Idempotency & Offline Replay): a replayed `id`
 * returns the original stored task unchanged (`isNew: false`) rather than
 * erroring or re-applying the new field values.
 *
 * `sortOrder` is computed inside the same `INSERT` statement (append to the
 * end of `category`) so create stays a single atomic statement — keeping every
 * write to one statement means this works over Supabase's transaction pooler.
 */
export async function createTask(
  db: AppDatabase,
  input: CreateTaskInput,
): Promise<{ task: TaskRow; isNew: boolean }> {
  const [inserted] = await db
    .insert(tasks)
    .values({
      id: input.id,
      category: input.category,
      title: input.title,
      priority: input.priority,
      dueDate: input.dueDate,
      createdDate: input.createdDate,
      sortOrder: sql`(SELECT COALESCE(MAX(${tasks.sortOrder}), -1) + 1 FROM ${tasks} WHERE ${tasks.category} = ${input.category})`,
    })
    .onConflictDoNothing({ target: tasks.id })
    .returning();

  if (inserted) {
    return { task: inserted, isNew: true };
  }

  const existing = await getTaskById(db, input.id);
  if (!existing) {
    // Insert conflicted (id already existed) but the row is now gone — only
    // possible if it was deleted between the conflict and this read. Not a
    // validated client-facing failure, so this is a genuine internal error.
    throw new InternalServerError(`Task ${input.id} conflicted on insert but could not be found afterward.`);
  }
  return { task: existing, isNew: false };
}

export interface PatchTaskFields {
  title?: string;
  priority?: TaskRow["priority"];
  dueDate?: string | null;
  category?: CategorySlug;
}

export type PatchTaskCompletion = { action: "complete"; date: string } | { action: "reopen" };

/**
 * Applies field edits and/or a completion action to a task in one `UPDATE`
 * statement. Throws `TaskNotFoundError` if `id` doesn't exist. Completion
 * semantics (see docs/API_CONTRACT.md's "Completion Representation"):
 * `{ action: "complete", date }` sets `completedDate` to `date` (which may be
 * a past day being browsed, not necessarily today); `{ action: "reopen" }`
 * clears it back to `null`.
 */
export async function patchTask(
  db: AppDatabase,
  id: string,
  fields: PatchTaskFields,
  completion: PatchTaskCompletion | undefined,
): Promise<TaskRow> {
  const completedDate =
    completion === undefined ? undefined : completion.action === "complete" ? completion.date : null;

  const [updated] = await db
    .update(tasks)
    .set({
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.priority !== undefined ? { priority: fields.priority } : {}),
      ...(fields.dueDate !== undefined ? { dueDate: fields.dueDate } : {}),
      ...(fields.category !== undefined ? { category: fields.category } : {}),
      ...(completedDate !== undefined ? { completedDate } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id))
    .returning();

  if (!updated) {
    throw new TaskNotFoundError(`Task ${id} was not found.`);
  }
  return updated;
}

/** Deletes a task (and cascades to its comments via the FK). Throws `TaskNotFoundError` if `id` doesn't exist. */
export async function deleteTask(db: AppDatabase, id: string): Promise<void> {
  // `.returning()` (no field selector) rather than `.returning({ id: tasks.id })` —
  // calling an overloaded builder method on the `AppDatabase` union type only
  // reliably resolves the zero-argument overload; see `AppDatabase` for why
  // the union exists at all.
  const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  if (!deleted) {
    throw new TaskNotFoundError(`Task ${id} was not found.`);
  }
}

export interface ReorderItem {
  id: string;
  sortOrder: number;
}

/**
 * Bulk-updates `sortOrder` for every task in `items`, scoped to `category`,
 * as a single `UPDATE ... FROM (VALUES ...)` statement. Throws
 * `TaskNotFoundError` if any `id` doesn't belong to `category` (including if
 * it doesn't exist at all) — detected by comparing the number of rows
 * actually updated against `items.length`, since a `VALUES` row that doesn't
 * match any `tasks` row in `category` simply updates nothing.
 */
export async function reorderTasks(
  db: AppDatabase,
  category: CategorySlug,
  items: readonly ReorderItem[],
): Promise<void> {
  const values = sql.join(
    items.map((item) => sql`(${item.id}::uuid, ${item.sortOrder}::int)`),
    sql`, `,
  );

  const result = await db.execute<{ id: string }>(sql`
    UPDATE ${tasks} AS t
    SET sort_order = v.sort_order, updated_at = now()
    FROM (VALUES ${values}) AS v(id, sort_order)
    WHERE t.id = v.id AND t.category = ${category}
    RETURNING t.id
  `);

  if (result.rows.length !== items.length) {
    throw new TaskNotFoundError(`One or more task ids do not belong to category "${category}".`);
  }
}

/**
 * The rolling day-view for `date`: every task where
 * `createdDate <= date AND (completedDate IS NULL OR completedDate >= date)`,
 * ordered by category (`CATEGORY_SLUGS` order) then `sortOrder`. Each task's
 * `completed` flag is relative to `date` (see `mapTaskRow`), NOT the DB's
 * absolute generated column — a task completed on some other day still shows
 * as open here if `date` falls before that completion.
 */
export async function getDayView(db: AppDatabase, date: string): Promise<TaskResponse[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(lte(tasks.createdDate, date), or(isNull(tasks.completedDate), gte(tasks.completedDate, date))))
    .orderBy(categoryOrderExpr, asc(tasks.sortOrder));

  const commentsByTaskId = await getCommentsForTaskIds(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) =>
    mapTaskRow(row, (commentsByTaskId.get(row.id) ?? []).map(mapCommentRow), { relativeToDate: date }),
  );
}

/** Every task, oldest-created first, with `completed` absolute (not relative to any date) — used by export. */
export async function getAllTasks(db: AppDatabase): Promise<TaskResponse[]> {
  const rows = await db.select().from(tasks).orderBy(asc(tasks.createdDate), categoryOrderExpr, asc(tasks.sortOrder));

  const commentsByTaskId = await getCommentsForTaskIds(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => mapTaskRow(row, (commentsByTaskId.get(row.id) ?? []).map(mapCommentRow)));
}
