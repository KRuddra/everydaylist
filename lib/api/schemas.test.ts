import { describe, expect, it } from "vitest";

import {
  calendarDateSchema,
  commentCreateRequestSchema,
  loginRequestSchema,
  searchQuerySchema,
  statsQuerySchema,
  taskCompletionActionSchema,
  taskCreateRequestSchema,
  taskPatchRequestSchema,
  taskReorderRequestSchema,
  uuidSchema,
} from "./schemas";

const VALID_UUID = "0e6a6f2a-2f2a-4f2a-8f2a-2f2a4f2a8f2a";

describe("calendarDateSchema", () => {
  it("accepts a real calendar date", () => {
    expect(calendarDateSchema.safeParse("2024-06-15").success).toBe(true);
  });

  it("accepts a leap day in a leap year", () => {
    expect(calendarDateSchema.safeParse("2024-02-29").success).toBe(true);
  });

  it("rejects a calendar date that doesn't exist (2024-02-30)", () => {
    const result = calendarDateSchema.safeParse("2024-02-30");
    expect(result.success).toBe(false);
  });

  it("rejects a leap day in a non-leap year (2023-02-29)", () => {
    expect(calendarDateSchema.safeParse("2023-02-29").success).toBe(false);
  });

  it("rejects a month out of range", () => {
    expect(calendarDateSchema.safeParse("2024-13-01").success).toBe(false);
  });

  it("rejects a malformed (non-YYYY-MM-DD) string", () => {
    expect(calendarDateSchema.safeParse("2024-6-15").success).toBe(false);
    expect(calendarDateSchema.safeParse("06/15/2024").success).toBe(false);
    expect(calendarDateSchema.safeParse("not-a-date").success).toBe(false);
  });
});

describe("uuidSchema", () => {
  it("accepts a valid UUID", () => {
    expect(uuidSchema.safeParse(VALID_UUID).success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("loginRequestSchema", () => {
  it("accepts a non-empty password", () => {
    expect(loginRequestSchema.safeParse({ password: "hunter2" }).success).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(loginRequestSchema.safeParse({ password: "" }).success).toBe(false);
  });

  it("rejects a missing password field", () => {
    expect(loginRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("taskCreateRequestSchema", () => {
  const base = { id: VALID_UUID, category: "reminders" as const, title: "Water the plants" };

  it("accepts a minimal valid payload", () => {
    expect(taskCreateRequestSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a full valid payload with optional fields", () => {
    const result = taskCreateRequestSchema.safeParse({
      ...base,
      priority: "high",
      dueDate: "2024-06-20",
      createdDate: "2024-06-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(taskCreateRequestSchema.safeParse({ ...base, title: "" }).success).toBe(false);
  });

  it("rejects a title that is only whitespace (trimmed to empty)", () => {
    expect(taskCreateRequestSchema.safeParse({ ...base, title: "   " }).success).toBe(false);
  });

  it("rejects an unknown category", () => {
    expect(taskCreateRequestSchema.safeParse({ ...base, category: "groceries" }).success).toBe(false);
  });

  it("rejects a non-UUID id", () => {
    expect(taskCreateRequestSchema.safeParse({ ...base, id: "not-a-uuid" }).success).toBe(false);
  });
});

describe("taskCompletionActionSchema", () => {
  it("accepts a valid complete action with a date", () => {
    const result = taskCompletionActionSchema.safeParse({ action: "complete", date: "2024-06-15" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid reopen action", () => {
    expect(taskCompletionActionSchema.safeParse({ action: "reopen" }).success).toBe(true);
  });

  it("rejects a complete action missing its date", () => {
    expect(taskCompletionActionSchema.safeParse({ action: "complete" }).success).toBe(false);
  });

  it("rejects an unknown action", () => {
    expect(taskCompletionActionSchema.safeParse({ action: "archive" }).success).toBe(false);
  });
});

describe("taskPatchRequestSchema", () => {
  it("accepts a single field edit", () => {
    expect(taskPatchRequestSchema.safeParse({ title: "New title" }).success).toBe(true);
  });

  it("accepts a completion-only patch", () => {
    const result = taskPatchRequestSchema.safeParse({ completion: { action: "reopen" } });
    expect(result.success).toBe(true);
  });

  it("rejects an empty body (no field edit and no completion action)", () => {
    expect(taskPatchRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a body containing only explicit-undefined keys", () => {
    expect(taskPatchRequestSchema.safeParse({ title: undefined }).success).toBe(false);
  });
});

describe("commentCreateRequestSchema", () => {
  const base = { id: VALID_UUID };

  it("accepts a valid comment body", () => {
    expect(commentCreateRequestSchema.safeParse({ ...base, body: "Still waiting on this." }).success).toBe(true);
  });

  it("rejects an empty (post-trim) body", () => {
    expect(commentCreateRequestSchema.safeParse({ ...base, body: "   " }).success).toBe(false);
  });

  it("rejects a body over the 2000-character limit", () => {
    const tooLong = "a".repeat(2001);
    expect(commentCreateRequestSchema.safeParse({ ...base, body: tooLong }).success).toBe(false);
  });

  it("accepts a body at exactly the 2000-character limit", () => {
    const atLimit = "a".repeat(2000);
    expect(commentCreateRequestSchema.safeParse({ ...base, body: atLimit }).success).toBe(true);
  });
});

describe("statsQuerySchema", () => {
  it("accepts from <= to", () => {
    expect(statsQuerySchema.safeParse({ from: "2024-06-01", to: "2024-06-30" }).success).toBe(true);
  });

  it("accepts from === to", () => {
    expect(statsQuerySchema.safeParse({ from: "2024-06-01", to: "2024-06-01" }).success).toBe(true);
  });

  it("rejects from > to", () => {
    const result = statsQuerySchema.safeParse({ from: "2024-06-30", to: "2024-06-01" });
    expect(result.success).toBe(false);
  });
});

describe("searchQuerySchema", () => {
  it("defaults q to an empty string when omitted", () => {
    const result = searchQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.success && result.data.q).toBe("");
  });

  it("trims surrounding whitespace from q", () => {
    const result = searchQuerySchema.safeParse({ q: "  groceries  " });
    expect(result.success).toBe(true);
    expect(result.success && result.data.q).toBe("groceries");
  });

  it("accepts an explicit empty string", () => {
    expect(searchQuerySchema.safeParse({ q: "" }).success).toBe(true);
  });
});

describe("taskReorderRequestSchema", () => {
  it("accepts a category with at least one item", () => {
    const result = taskReorderRequestSchema.safeParse({
      category: "coop",
      items: [{ id: VALID_UUID, sortOrder: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty items array", () => {
    const result = taskReorderRequestSchema.safeParse({ category: "coop", items: [] });
    expect(result.success).toBe(false);
  });
});
