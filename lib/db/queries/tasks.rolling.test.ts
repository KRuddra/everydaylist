// @vitest-environment node
import { randomUUID } from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { forwardSqlPath, latestMigrationTag, readStatements } from "@/scripts/lib/migrationSql";

import { createTask, getDayView, patchTask } from "./tasks";

/**
 * Fills the gaps in the rolling day-view matrix left by `smoke.test.ts`
 * (which already covers: idempotent create, never-completed rollover,
 * same-day completion, completed-on-a-later-day, complete->reopen, comments,
 * reorder+delete, and stats). This file owns the same pglite + migration
 * harness pattern, but a distinct set of calendar months (2024-07 onward) so
 * it can run standalone or alongside `smoke.test.ts` without any shared
 * table-state assumptions.
 */
describe("lib/db/queries/tasks — rolling day-view matrix (pglite)", () => {
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

  it("created D0, completed D3: open D0-D2, struck exactly on D3, absent D4+, reopens back to open everywhere", async () => {
    const { task } = await createTask(db, {
      id: randomUUID(),
      category: "reminders",
      title: "Renew passport",
      priority: null,
      dueDate: null,
      createdDate: "2024-07-01", // D0
    });

    // D0, D1, D2: created but not yet completed — open on every day up to
    // (and including) the day before completion.
    for (const day of ["2024-07-01", "2024-07-02", "2024-07-03"]) {
      const view = await getDayView(db, day);
      expect(view.find((t) => t.id === task.id)).toMatchObject({ completed: false });
    }

    // Complete on D3 (2024-07-04).
    await patchTask(db, task.id, {}, { action: "complete", date: "2024-07-04" });

    // D3: struck.
    const d3 = await getDayView(db, "2024-07-04");
    expect(d3.find((t) => t.id === task.id)).toMatchObject({ completed: true });

    // D4 and beyond: the task has scrolled out of the rolling view entirely.
    for (const day of ["2024-07-05", "2024-07-06", "2024-07-10"]) {
      const view = await getDayView(db, day);
      expect(view.find((t) => t.id === task.id)).toBeUndefined();
    }

    // Reopening brings it back into every day's view (D0 through well past D4).
    await patchTask(db, task.id, {}, { action: "reopen" });
    for (const day of ["2024-07-01", "2024-07-04", "2024-07-05", "2024-07-10"]) {
      const view = await getDayView(db, day);
      expect(view.find((t) => t.id === task.id)).toMatchObject({ completed: false });
    }
  });

  it("a browsed day strictly before its createdDate never shows the task at all", async () => {
    const { task } = await createTask(db, {
      id: randomUUID(),
      category: "courses",
      title: "Submit assignment",
      priority: null,
      dueDate: null,
      createdDate: "2024-07-15",
    });

    const dayBeforeCreation = await getDayView(db, "2024-07-14");
    expect(dayBeforeCreation.find((t) => t.id === task.id)).toBeUndefined();

    const creationDay = await getDayView(db, "2024-07-15");
    expect(creationDay.find((t) => t.id === task.id)).toMatchObject({ completed: false });
  });

  it("an overdue task (past dueDate, not completed) still rolls over — dueDate never gates the rolling query", async () => {
    const { task } = await createTask(db, {
      id: randomUUID(),
      category: "coop",
      title: "Pay HOA dues",
      priority: null,
      dueDate: "2024-07-05", // long past by the time we check 2024-07-20
      createdDate: "2024-07-01",
    });

    const wellPastDue = await getDayView(db, "2024-07-20");
    const found = wellPastDue.find((t) => t.id === task.id);
    // Still present and still open — the rolling query only cares about
    // createdDate/completedDate, never dueDate (overdue-ness is a client-side
    // rendering concern layered on top, not a filter on inclusion).
    expect(found).toMatchObject({ completed: false, dueDate: "2024-07-05" });
  });

  it("completing a task on a past day being browsed sets completedDate to that day, not to \"today\"", async () => {
    const { task } = await createTask(db, {
      id: randomUUID(),
      category: "reminders",
      title: "Backfilled task",
      priority: null,
      dueDate: null,
      createdDate: "2024-07-01",
    });

    // Simulate completing it while browsing a specific past day (2024-07-03),
    // not "today" — `patchTask`'s `date` argument is exactly this.
    const updated = await patchTask(db, task.id, {}, { action: "complete", date: "2024-07-03" });
    expect(updated.completedDate).toBe("2024-07-03");

    const completionDay = await getDayView(db, "2024-07-03");
    expect(completionDay.find((t) => t.id === task.id)).toMatchObject({ completed: true });

    // A day before the completion date still sees it as open (browsing history).
    const dayBefore = await getDayView(db, "2024-07-02");
    expect(dayBefore.find((t) => t.id === task.id)).toMatchObject({ completed: false });
  });
});
