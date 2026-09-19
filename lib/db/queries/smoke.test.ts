// @vitest-environment node
import { randomUUID } from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { forwardSqlPath, latestMigrationTag, readStatements } from "@/scripts/lib/migrationSql";

import { createComment, listComments } from "./comments";
import { getCompletionDays, getStatsDayRows } from "./stats";
import { buildStatsResponse } from "@/lib/stats/buildStatsResponse";
import { createTask, deleteTask, getDayView, patchTask, reorderTasks } from "./tasks";

/**
 * Stage 5's own correctness gate — runs the query layer directly (not
 * through HTTP route handlers) against an in-process pglite instance, the
 * same approach `scripts/verify-migration.ts` uses for schema checks. This
 * is deliberately a *smoke* test covering the highest-risk behaviors called
 * out in the Stage 5 brief (idempotency, the rolling day-view's
 * date-relative `completed` flag, completion/reopen, comments, stats).
 * Comprehensive/isolated unit + integration tests are Stage 7's job.
 *
 * Each `describe` block below uses a distinct, non-overlapping calendar
 * month so the tests can safely share one pglite instance (and its
 * cross-test completion history) without any test's assertions depending on
 * another test's data.
 */
describe("lib/db/queries smoke test (pglite)", () => {
  let client: PGlite;
  let db: PgliteDatabase;

  beforeAll(async () => {
    client = new PGlite({ extensions: { pg_trgm } });
    db = drizzle(client);

    const tag = latestMigrationTag();
    for (const statement of readStatements(forwardSqlPath(tag))) {
      await client.exec(statement);
    }
  });

  afterAll(async () => {
    await client.close();
  });

  it("create is idempotent on id: 201-equivalent (isNew) then 200-equivalent (existing, unchanged)", async () => {
    const id = randomUUID();
    const input = {
      id,
      category: "reminders" as const,
      title: "Water the plants",
      priority: null,
      dueDate: null,
      createdDate: "2024-01-15",
    };

    const first = await createTask(db, input);
    expect(first.isNew).toBe(true);
    expect(first.task.title).toBe("Water the plants");

    // Replay with a different title — the stored resource must win, unchanged.
    const second = await createTask(db, { ...input, title: "This title should be ignored" });
    expect(second.isNew).toBe(false);
    expect(second.task.id).toBe(first.task.id);
    expect(second.task.title).toBe("Water the plants");
    expect(second.task.createdAt.getTime()).toBe(first.task.createdAt.getTime());
  });

  describe("rolling day-view — completed relative to the requested date", () => {
    it("an open task rolls over into future days", async () => {
      const { task } = await createTask(db, {
        id: randomUUID(),
        category: "reminders",
        title: "Rolls over, never completed",
        priority: null,
        dueDate: null,
        createdDate: "2024-02-05",
      });

      const day0 = await getDayView(db, "2024-02-05");
      const day2 = await getDayView(db, "2024-02-07");

      expect(day0.find((t) => t.id === task.id)).toMatchObject({ completed: false });
      expect(day2.find((t) => t.id === task.id)).toMatchObject({ completed: false });
    });

    it("a task completed the same day it's created shows completed on that day, then scrolls out", async () => {
      const { task } = await createTask(db, {
        id: randomUUID(),
        category: "reminders",
        title: "Completed same day",
        priority: null,
        dueDate: null,
        createdDate: "2024-02-05",
      });
      await patchTask(db, task.id, {}, { action: "complete", date: "2024-02-05" });

      const sameDay = await getDayView(db, "2024-02-05");
      const nextDay = await getDayView(db, "2024-02-06");

      expect(sameDay.find((t) => t.id === task.id)).toMatchObject({ completed: true });
      expect(nextDay.find((t) => t.id === task.id)).toBeUndefined();
    });

    it("a task completed on a later day still shows open on an earlier day being browsed historically", async () => {
      const { task } = await createTask(db, {
        id: randomUUID(),
        category: "reminders",
        title: "Completed several days later",
        priority: null,
        dueDate: null,
        createdDate: "2024-02-05",
      });

      const beforeCompletion = await getDayView(db, "2024-02-05");
      expect(beforeCompletion.find((t) => t.id === task.id)).toMatchObject({ completed: false });

      await patchTask(db, task.id, {}, { action: "complete", date: "2024-02-08" });

      // Browsing the original (past) day again: still "open" as of that day.
      const pastDayAfterCompletion = await getDayView(db, "2024-02-05");
      expect(pastDayAfterCompletion.find((t) => t.id === task.id)).toMatchObject({ completed: false });

      const completionDay = await getDayView(db, "2024-02-08");
      expect(completionDay.find((t) => t.id === task.id)).toMatchObject({ completed: true });

      const dayAfterCompletion = await getDayView(db, "2024-02-09");
      expect(dayAfterCompletion.find((t) => t.id === task.id)).toBeUndefined();
    });
  });

  it("complete then reopen clears completedDate", async () => {
    const { task } = await createTask(db, {
      id: randomUUID(),
      category: "reminders",
      title: "Complete then reopen",
      priority: null,
      dueDate: null,
      createdDate: "2024-03-10",
    });

    const completed = await patchTask(db, task.id, {}, { action: "complete", date: "2024-03-10" });
    expect(completed.completedDate).toBe("2024-03-10");

    const reopened = await patchTask(db, task.id, {}, { action: "reopen" });
    expect(reopened.completedDate).toBeNull();
  });

  it("adding a comment is idempotent on id and doesn't touch completion", async () => {
    const { task } = await createTask(db, {
      id: randomUUID(),
      category: "reminders",
      title: "Task with a comment",
      priority: null,
      dueDate: null,
      createdDate: "2024-04-01",
    });

    const commentId = randomUUID();
    const first = await createComment(db, task.id, { id: commentId, body: "Waiting on a reply." });
    expect(first.isNew).toBe(true);

    const second = await createComment(db, task.id, { id: commentId, body: "This body should be ignored" });
    expect(second.isNew).toBe(false);
    expect(second.comment.body).toBe("Waiting on a reply.");

    const comments = await listComments(db, task.id);
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe("Waiting on a reply.");

    // Adding a comment must not touch the task's own completion state.
    const stillOpen = await getDayView(db, "2024-04-01");
    expect(stillOpen.find((t) => t.id === task.id)).toMatchObject({ completed: false });
  });

  it("reorder persists new sort positions scoped to a category, and delete removes the task", async () => {
    const category = "coop" as const;
    const a = await createTask(db, {
      id: randomUUID(),
      category,
      title: "A",
      priority: null,
      dueDate: null,
      createdDate: "2024-05-01",
    });
    const b = await createTask(db, {
      id: randomUUID(),
      category,
      title: "B",
      priority: null,
      dueDate: null,
      createdDate: "2024-05-01",
    });

    await reorderTasks(db, category, [
      { id: a.task.id, sortOrder: 5 },
      { id: b.task.id, sortOrder: 1 },
    ]);

    const dayView = await getDayView(db, "2024-05-01");
    const ids = dayView.filter((t) => t.category === category).map((t) => t.id);
    expect(ids.indexOf(b.task.id)).toBeLessThan(ids.indexOf(a.task.id));

    await deleteTask(db, a.task.id);
    await expect(deleteTask(db, a.task.id)).rejects.toThrow();
  });

  // Deliberately the last `it` in this file (see the `DELETE FROM tasks`
  // below) — vitest runs tests within a file sequentially in source order by
  // default, so this can safely claim the whole table for itself as long as
  // nothing is appended after it.
  it("stats: percent per day and current/longest streak over full history", async () => {
    // Earlier tests left still-open tasks behind, and the rolling predicate
    // correctly keeps counting an open task as "in play" forever (that's the
    // whole point of rollover) — so without a clean slate here, this test's
    // `inPlay` counts would include every prior test's open tasks too.
    // `getCompletionDays` is scoped to the whole table by design (streaks are
    // whole-history), so this test needs to own the entire table, not just a
    // date range.
    await client.exec("DELETE FROM tasks");

    // June 1–3: each day has 2 in-play tasks and exactly 1 completed on that
    // day (50%), and every day has >=1 completion, so both streaks are 3.
    const t1 = await createTask(db, {
      id: randomUUID(),
      category: "reminders",
      title: "t1",
      priority: null,
      dueDate: null,
      createdDate: "2024-06-01",
    });
    const t2 = await createTask(db, {
      id: randomUUID(),
      category: "reminders",
      title: "t2",
      priority: null,
      dueDate: null,
      createdDate: "2024-06-01",
    });
    await patchTask(db, t1.task.id, {}, { action: "complete", date: "2024-06-01" });

    const t3 = await createTask(db, {
      id: randomUUID(),
      category: "reminders",
      title: "t3",
      priority: null,
      dueDate: null,
      createdDate: "2024-06-02",
    });
    await patchTask(db, t3.task.id, {}, { action: "complete", date: "2024-06-02" });

    const t4 = await createTask(db, {
      id: randomUUID(),
      category: "reminders",
      title: "t4",
      priority: null,
      dueDate: null,
      createdDate: "2024-06-03",
    });
    await patchTask(db, t4.task.id, {}, { action: "complete", date: "2024-06-03" });

    void t2; // kept open the whole range, on purpose (contributes to inPlay only)

    const dayRows = await getStatsDayRows(db, "2024-06-01", "2024-06-03");
    expect(dayRows).toEqual([
      { day: "2024-06-01", inPlay: 2, completed: 1 },
      { day: "2024-06-02", inPlay: 2, completed: 1 },
      { day: "2024-06-03", inPlay: 2, completed: 1 },
    ]);

    const completionDays = await getCompletionDays(db);
    const response = buildStatsResponse(dayRows, completionDays, "2024-06-03");

    expect(response.days.every((day) => day.percent === 50)).toBe(true);
    expect(response.currentStreak).toBe(3);
    expect(response.longestStreak).toBe(3);
  });
});
