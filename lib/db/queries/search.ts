import { desc, eq, ilike, sql } from "drizzle-orm";

import type { SearchResultItem, TaskPriority } from "@/lib/api/schemas";
import type { CategorySlug } from "@/lib/config/categories";
import type { AppDatabase } from "@/lib/db/client";
import { taskComments, tasks, type TaskRow } from "@/lib/db/schema";

function toResultBase(row: TaskRow): Omit<SearchResultItem, "matchedIn" | "matchedText"> {
  return {
    taskId: row.id,
    category: row.category as CategorySlug,
    title: row.title,
    priority: row.priority as TaskPriority | null,
    dueDate: row.dueDate,
    createdDate: row.createdDate,
    completedDate: row.completedDate,
    completed: row.completedDate !== null,
  };
}

/**
 * Matches `q` (case-insensitive substring, backed by the `pg_trgm` GIN
 * indexes on `tasks.title`/`task_comments.body`) against task titles and
 * comment bodies. Empty/whitespace-only `q` returns `[]` (not an error — see
 * docs/API_CONTRACT.md's `/api/search` section). Title matches are listed
 * before comment matches; each group is ranked by `pg_trgm` similarity to
 * `q`, most relevant first.
 */
export async function searchTasksAndComments(db: AppDatabase, q: string): Promise<SearchResultItem[]> {
  const query = q.trim();
  if (query === "") {
    return [];
  }

  const pattern = `%${query}%`;

  const titleMatches = await db
    .select()
    .from(tasks)
    .where(ilike(tasks.title, pattern))
    .orderBy(desc(sql`similarity(${tasks.title}, ${query})`));

  const commentMatches = await db
    .select({ comment: taskComments, task: tasks })
    .from(taskComments)
    .innerJoin(tasks, eq(taskComments.taskId, tasks.id))
    .where(ilike(taskComments.body, pattern))
    .orderBy(desc(sql`similarity(${taskComments.body}, ${query})`));

  const results: SearchResultItem[] = titleMatches.map((row) => ({
    ...toResultBase(row),
    matchedIn: "title",
    matchedText: row.title,
  }));

  for (const { comment, task } of commentMatches) {
    results.push({
      ...toResultBase(task),
      matchedIn: "comment",
      matchedText: comment.body,
    });
  }

  return results;
}
