import { describe, expect, it } from "vitest";

import { calculateCurrentStreak, calculateLongestStreak } from "./streaks";

describe("calculateCurrentStreak", () => {
  it("continues counting backward across consecutive completion days ending today", () => {
    const completionDays = new Set(["2024-06-01", "2024-06-02", "2024-06-03"]);
    expect(calculateCurrentStreak(completionDays, "2024-06-03")).toBe(3);
  });

  it("breaks the streak at the first gap walking backward from today", () => {
    // 06-01 and 06-03 have completions, but 06-02 doesn't — the streak
    // ending today (06-03) is only 1 day long.
    const completionDays = new Set(["2024-06-01", "2024-06-03"]);
    expect(calculateCurrentStreak(completionDays, "2024-06-03")).toBe(1);
  });

  it("is 0 when today has no completion at all, even with an empty history", () => {
    expect(calculateCurrentStreak(new Set(), "2024-06-03")).toBe(0);
  });

  it("does not grant a grace day — is 0 when today has no completion yet, even if yesterday did", () => {
    // By design (see the function's docstring): a streak "in progress"
    // requires *today* to already have a completion. A prior day's
    // completion alone doesn't keep it alive into an unfinished today.
    const completionDays = new Set(["2024-06-01", "2024-06-02"]);
    expect(calculateCurrentStreak(completionDays, "2024-06-03")).toBe(0);
  });

  it("only counts the run immediately adjacent to today, ignoring an earlier separate run", () => {
    const completionDays = new Set(["2024-05-01", "2024-05-02", "2024-06-02", "2024-06-03"]);
    expect(calculateCurrentStreak(completionDays, "2024-06-03")).toBe(2);
  });
});

describe("calculateLongestStreak", () => {
  it("is 0 for an empty history", () => {
    expect(calculateLongestStreak(new Set())).toBe(0);
  });

  it("is 1 for a single isolated completion day", () => {
    expect(calculateLongestStreak(new Set(["2024-06-01"]))).toBe(1);
  });

  it("finds the longest run among multiple disjoint runs", () => {
    // Two separate runs: 06-01..06-02 (length 2) and 06-05..06-08 (length 4).
    const completionDays = new Set([
      "2024-06-01",
      "2024-06-02",
      "2024-06-05",
      "2024-06-06",
      "2024-06-07",
      "2024-06-08",
    ]);
    expect(calculateLongestStreak(completionDays)).toBe(4);
  });

  it("can be longer than the current streak when the longest run is in the past", () => {
    // Longest historical run is 5 days long (06-01..06-05), but the current
    // streak (ending 06-10) is a fresh, shorter run.
    const completionDays = new Set([
      "2024-06-01",
      "2024-06-02",
      "2024-06-03",
      "2024-06-04",
      "2024-06-05",
      "2024-06-09",
      "2024-06-10",
    ]);
    expect(calculateLongestStreak(completionDays)).toBe(5);
    expect(calculateCurrentStreak(completionDays, "2024-06-10")).toBe(2);
  });

  it("handles a run spanning a month boundary", () => {
    const completionDays = new Set(["2024-01-30", "2024-01-31", "2024-02-01", "2024-02-02"]);
    expect(calculateLongestStreak(completionDays)).toBe(4);
  });
});
