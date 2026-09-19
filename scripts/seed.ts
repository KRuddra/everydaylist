import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgliteDatabase } from "drizzle-orm/pglite";

import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/config/categories";
import {
  taskComments,
  tasks,
  type NewTaskCommentRow,
  type NewTaskRow,
} from "@/lib/db/schema";

/**
 * Seed realistic sample data for Everyday List.
 *
 * Generic over the drizzle driver so the same seeding logic runs against
 * both a real Neon database (the CLI entrypoint below) and an in-process
 * pglite instance (`scripts/verify-migration.ts`), without duplicating the
 * data-generation logic between the two.
 */
export type SeedDb = NeonHttpDatabase | PgliteDatabase;

export interface SeedResult {
  taskCount: number;
  commentCount: number;
}

/** How many days of rolling history to generate, ending on (and including) today. */
const HISTORY_DAYS = 14;

const PRIORITIES = ["high", "medium", "low", null] as const;

const TITLES_BY_CATEGORY: Record<CategorySlug, readonly string[]> = {
  reminders: [
    "Call the dentist to reschedule",
    "Pay electricity bill",
    "Renew car insurance",
    "Pick up dry cleaning",
    "Water the plants",
    "Send birthday card to Mom",
    "Book flight for conference",
    "Return library books",
    "Schedule car oil change",
    "Confirm dinner reservation",
    "Refill prescription",
    "Update passport photo",
    "Cancel unused subscription",
    "Back up laptop files",
  ],
  coop: [
    "Weekly co-op grocery order",
    "Coordinate carpool schedule for the week",
    "Submit co-op volunteer hours",
    "Plan co-op potluck menu",
    "Email co-op board about budget",
    "Organize co-op tool shed",
    "Draft co-op newsletter",
    "Review co-op membership renewals",
    "Set up co-op childcare rotation",
    "Update co-op shared calendar",
    "Follow up on co-op maintenance request",
    "Prepare co-op meeting agenda",
    "Collect co-op dues",
    "Coordinate co-op garden cleanup",
  ],
  courses: [
    "Finish React advanced patterns module",
    "Submit database design assignment",
    "Watch lecture on distributed systems",
    "Complete TypeScript generics exercises",
    "Review lecture notes for midterm",
    "Start capstone project proposal",
    "Read chapter 5 of the algorithms textbook",
    "Practice SQL query optimization problems",
    "Submit peer review for classmate's project",
    "Prepare slides for course presentation",
    "Complete weekly quiz on system design",
    "Revise essay draft for writing course",
    "Join study group session",
    "Finish Docker/Kubernetes lab",
  ],
};

const COMMENT_POOL = [
  "Ran out of time today, pushing to tomorrow.",
  "Waiting on a reply before I can finish this.",
  "Started but got interrupted, will pick back up.",
  "Still relevant, just deprioritized this week.",
  "Blocked on a response from someone else.",
  "Need to double check details before marking this done.",
  "Finally made progress, should wrap up soon.",
  "Turns out this took longer than expected.",
  "Rescheduled — new plan is later this week.",
  "Following up again, no response yet.",
];

type TaskState =
  | "completed_same_day"
  | "rolled_over_open"
  | "completed_days_later"
  | "overdue_open";

const STATE_ROTATION: readonly TaskState[] = [
  "completed_same_day",
  "rolled_over_open",
  "completed_days_later",
  "overdue_open",
];

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, delta: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Picks a task state for a given (day offset from today, category index)
 * pair, falling back to an earlier-in-the-lifecycle state when the day is
 * too recent for the "natural" state to make sense (e.g. a task created
 * yesterday can't yet be overdue against a due date several days out).
 */
function pickState(dayOffset: number, categoryIndex: number): TaskState {
  const state = STATE_ROTATION[(dayOffset + categoryIndex) % STATE_ROTATION.length];
  if (state === "completed_days_later" && dayOffset < 3) {
    return "completed_same_day";
  }
  if (state === "overdue_open" && dayOffset < 3) {
    return "rolled_over_open";
  }
  return state;
}

/** Number of comments (0-3) to attach, biased toward "why isn't this done yet" states. */
function pickCommentCount(dayOffset: number, categoryIndex: number, state: TaskState): number {
  const seed = (dayOffset * 7 + categoryIndex * 3) % 5;
  // Independent hash (different coefficients than `state`'s own rotation) so
  // the "bump to 3 comments" case is actually reachable for overdue tasks.
  const bumpToThree = (dayOffset * 3 + categoryIndex * 2) % 5 === 0;
  if (state === "overdue_open") {
    return bumpToThree ? 3 : 2;
  }
  if (state === "rolled_over_open" && seed % 2 === 0) {
    return 1;
  }
  if (state === "completed_days_later" && seed === 0) {
    return 2;
  }
  if (seed === 4) {
    return 1;
  }
  return 0;
}

interface PlannedTask {
  row: NewTaskRow;
  commentCount: number;
}

function planTask(
  today: Date,
  dayOffset: number,
  category: CategorySlug,
  categoryIndex: number,
  sortOrder: number,
  id: string,
): PlannedTask {
  const createdDateObj = addDays(today, -dayOffset);
  const createdDate = toDateString(createdDateObj);
  const state = pickState(dayOffset, categoryIndex);
  const titles = TITLES_BY_CATEGORY[category];
  const title = titles[(HISTORY_DAYS - 1 - dayOffset) % titles.length];
  const priority = PRIORITIES[(dayOffset + categoryIndex) % PRIORITIES.length];

  let completedDate: string | null = null;
  let dueDate: string | null = null;

  switch (state) {
    case "completed_same_day": {
      completedDate = createdDate;
      dueDate = dayOffset % 2 === 0 ? createdDate : null;
      break;
    }
    case "completed_days_later": {
      const delay = Math.min(dayOffset, 3 + categoryIndex);
      completedDate = toDateString(addDays(createdDateObj, delay));
      dueDate = null;
      break;
    }
    case "overdue_open": {
      completedDate = null;
      dueDate = toDateString(addDays(createdDateObj, 2));
      break;
    }
    case "rolled_over_open": {
      completedDate = null;
      dueDate = dayOffset % 2 === 0 ? null : toDateString(addDays(today, 3));
      break;
    }
  }

  const commentCount = pickCommentCount(dayOffset, categoryIndex, state);

  return {
    row: {
      id,
      category,
      title,
      priority,
      dueDate,
      createdDate,
      completedDate,
      sortOrder,
    },
    commentCount,
  };
}

function buildCommentRows(taskId: string, count: number, dayOffset: number, categoryIndex: number): NewTaskCommentRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: randomUUID(),
    taskId,
    body: COMMENT_POOL[(dayOffset + categoryIndex + i) % COMMENT_POOL.length],
  }));
}

/**
 * Seeds ~14 days of realistic rolling history across all three categories:
 * a mix of same-day completions, tasks that rolled over and are still open,
 * tasks completed several days after creation, overdue open tasks (past
 * `dueDate`, never completed), and several tasks carrying 1-3 comments.
 */
export async function seed(db: SeedDb): Promise<SeedResult> {
  const today = startOfUtcDay(new Date());
  const sortCounters: Record<CategorySlug, number> = {
    reminders: 0,
    coop: 0,
    courses: 0,
  };

  const taskRows: NewTaskRow[] = [];
  const commentRows: NewTaskCommentRow[] = [];

  for (let dayOffset = HISTORY_DAYS - 1; dayOffset >= 0; dayOffset--) {
    CATEGORY_SLUGS.forEach((category, categoryIndex) => {
      sortCounters[category] += 10;
      const taskId = randomUUID();
      const planned = planTask(today, dayOffset, category, categoryIndex, sortCounters[category], taskId);
      taskRows.push(planned.row);
      if (planned.commentCount > 0) {
        commentRows.push(
          ...buildCommentRows(taskId, planned.commentCount, dayOffset, categoryIndex),
        );
      }
    });
  }

  if (taskRows.length > 0) {
    await db.insert(tasks).values(taskRows);
  }
  if (commentRows.length > 0) {
    await db.insert(taskComments).values(commentRows);
  }

  return { taskCount: taskRows.length, commentCount: commentRows.length };
}

// ---------------------------------------------------------------------------
// CLI entrypoint — `pnpm db:seed`. Not invoked when this module is imported
// by scripts/verify-migration.ts, only when run directly via tsx.
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  } else if (existsSync(".env")) {
    process.loadEnvFile(".env");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to run the seed script. Set it in .env.local or the environment.",
    );
  }

  const db = drizzle(databaseUrl);
  const result = await seed(db);
  console.log(`Seeded ${result.taskCount} tasks and ${result.commentCount} comments.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  });
}
