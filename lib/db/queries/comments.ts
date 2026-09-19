import { asc, eq } from "drizzle-orm";

import type { CommentCreateRequest } from "@/lib/api/schemas";
import type { AppDatabase } from "@/lib/db/client";
import { taskComments, type TaskCommentRow } from "@/lib/db/schema";
import { InternalServerError, TaskNotFoundError } from "@/lib/errors/errors";

import { getTaskById } from "./tasks";

/** All comments for a single task, oldest first. Throws `TaskNotFoundError` if the parent task doesn't exist. */
export async function listComments(db: AppDatabase, taskId: string): Promise<TaskCommentRow[]> {
  const task = await getTaskById(db, taskId);
  if (!task) {
    throw new TaskNotFoundError(`Task ${taskId} was not found.`);
  }

  return db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt));
}

/**
 * Creates a comment, idempotent on `input.id` (see
 * docs/API_CONTRACT.md's Idempotency & Offline Replay): a replayed `id`
 * returns the original stored comment unchanged rather than erroring or
 * re-applying the new `body`. Throws `TaskNotFoundError` if `taskId` doesn't
 * name an existing task.
 */
export async function createComment(
  db: AppDatabase,
  taskId: string,
  input: CommentCreateRequest,
): Promise<{ comment: TaskCommentRow; isNew: boolean }> {
  const task = await getTaskById(db, taskId);
  if (!task) {
    throw new TaskNotFoundError(`Task ${taskId} was not found.`);
  }

  const [inserted] = await db
    .insert(taskComments)
    .values({ id: input.id, taskId, body: input.body })
    .onConflictDoNothing({ target: taskComments.id })
    .returning();

  if (inserted) {
    return { comment: inserted, isNew: true };
  }

  const [existing] = await db.select().from(taskComments).where(eq(taskComments.id, input.id));
  if (!existing) {
    // Insert conflicted (id already existed) but the row is now gone — only
    // possible if the parent task was deleted between the conflict and this
    // read (comments cascade-delete with their task). Not a validated
    // client-facing failure, so this is a genuine internal error.
    throw new InternalServerError(
      `Comment ${input.id} conflicted on insert but could not be found afterward.`,
    );
  }
  return { comment: existing, isNew: false };
}
