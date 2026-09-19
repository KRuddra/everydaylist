import { describe, expect, it } from "vitest";

import { calculateDayEntries } from "./percent";

describe("calculateDayEntries", () => {
  it("is 0% when nothing was completed", () => {
    const [entry] = calculateDayEntries([{ day: "2024-06-01", inPlay: 4, completed: 0 }]);
    expect(entry).toEqual({ day: "2024-06-01", inPlay: 4, completed: 0, percent: 0 });
  });

  it("is 100% when everything in play was completed", () => {
    const [entry] = calculateDayEntries([{ day: "2024-06-01", inPlay: 4, completed: 4 }]);
    expect(entry?.percent).toBe(100);
  });

  it("rounds a partial completion percentage", () => {
    // 1/3 = 33.33...% -> rounds to 33.
    const [entry] = calculateDayEntries([{ day: "2024-06-01", inPlay: 3, completed: 1 }]);
    expect(entry?.percent).toBe(33);
  });

  it("rounds a partial completion percentage up when appropriate", () => {
    // 2/3 = 66.66...% -> rounds to 67.
    const [entry] = calculateDayEntries([{ day: "2024-06-01", inPlay: 3, completed: 2 }]);
    expect(entry?.percent).toBe(67);
  });

  it("is 0%, not NaN or Infinity, when inPlay is 0", () => {
    const [entry] = calculateDayEntries([{ day: "2024-06-01", inPlay: 0, completed: 0 }]);
    expect(entry?.percent).toBe(0);
    expect(Number.isFinite(entry?.percent)).toBe(true);
  });

  it("maps multiple rows independently, preserving order", () => {
    const entries = calculateDayEntries([
      { day: "2024-06-01", inPlay: 2, completed: 0 },
      { day: "2024-06-02", inPlay: 2, completed: 1 },
      { day: "2024-06-03", inPlay: 2, completed: 2 },
    ]);
    expect(entries.map((e) => e.percent)).toEqual([0, 50, 100]);
    expect(entries.map((e) => e.day)).toEqual(["2024-06-01", "2024-06-02", "2024-06-03"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(calculateDayEntries([])).toEqual([]);
  });
});
