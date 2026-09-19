import { describe, expect, it } from "vitest";

import { buildStatsResponse } from "./buildStatsResponse";

describe("buildStatsResponse", () => {
  it("combines range-scoped day percentages with whole-history streaks", () => {
    const dayRows = [
      { day: "2024-06-01", inPlay: 2, completed: 1 },
      { day: "2024-06-02", inPlay: 2, completed: 2 },
    ];
    const completionDays = new Set(["2024-06-01", "2024-06-02"]);

    const response = buildStatsResponse(dayRows, completionDays, "2024-06-02");

    expect(response.days).toEqual([
      { day: "2024-06-01", inPlay: 2, completed: 1, percent: 50 },
      { day: "2024-06-02", inPlay: 2, completed: 2, percent: 100 },
    ]);
    expect(response.currentStreak).toBe(2);
    expect(response.longestStreak).toBe(2);
  });

  it("computes streaks over the full completion history, not just the queried day range", () => {
    // `dayRows` only covers June 3rd, but the streak history goes back to
    // June 1st — `currentStreak`/`longestStreak` must reflect the full
    // 3-day run, not just the single day present in `dayRows`.
    const dayRows = [{ day: "2024-06-03", inPlay: 1, completed: 1 }];
    const completionDays = new Set(["2024-06-01", "2024-06-02", "2024-06-03"]);

    const response = buildStatsResponse(dayRows, completionDays, "2024-06-03");

    expect(response.days).toHaveLength(1);
    expect(response.currentStreak).toBe(3);
    expect(response.longestStreak).toBe(3);
  });

  it("today not yet productive but yesterday was: currentStreak is 0 today, longestStreak still reflects the past run", () => {
    const completionDays = new Set(["2024-06-01", "2024-06-02"]);
    const response = buildStatsResponse([], completionDays, "2024-06-03");

    expect(response.currentStreak).toBe(0);
    expect(response.longestStreak).toBe(2);
  });

  it("returns zeroed streaks and an empty days array for a brand-new user with no history", () => {
    const response = buildStatsResponse([], new Set(), "2024-06-03");
    expect(response).toEqual({ days: [], currentStreak: 0, longestStreak: 0 });
  });
});
