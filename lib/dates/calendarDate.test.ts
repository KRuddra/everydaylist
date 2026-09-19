import { describe, expect, it } from "vitest";

import { addDaysToCalendarDate } from "./calendarDate";

describe("addDaysToCalendarDate", () => {
  it("adds days within the same month", () => {
    expect(addDaysToCalendarDate("2024-06-10", 3)).toBe("2024-06-13");
  });

  it("subtracts days within the same month", () => {
    expect(addDaysToCalendarDate("2024-06-10", -3)).toBe("2024-06-07");
  });

  it("rolls over into the next month", () => {
    expect(addDaysToCalendarDate("2024-01-31", 1)).toBe("2024-02-01");
  });

  it("rolls back into the previous month", () => {
    expect(addDaysToCalendarDate("2024-02-01", -1)).toBe("2024-01-31");
  });

  it("rolls over into the next year", () => {
    expect(addDaysToCalendarDate("2024-12-31", 1)).toBe("2025-01-01");
  });

  it("rolls back into the previous year", () => {
    expect(addDaysToCalendarDate("2025-01-01", -1)).toBe("2024-12-31");
  });

  it("lands on Feb 29 in a leap year", () => {
    expect(addDaysToCalendarDate("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("rolls from Feb 29 into March in a leap year", () => {
    expect(addDaysToCalendarDate("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("skips Feb 29 in a non-leap year", () => {
    expect(addDaysToCalendarDate("2023-02-28", 1)).toBe("2023-03-01");
  });

  it("is a no-op for delta 0", () => {
    expect(addDaysToCalendarDate("2024-06-10", 0)).toBe("2024-06-10");
  });

  it("handles multi-month jumps in a single call", () => {
    expect(addDaysToCalendarDate("2024-01-01", 60)).toBe("2024-03-01");
  });
});
