import { describe, expect, it } from "vitest";

import { todayInTimeZone } from "./today";

/**
 * `todayInTimeZone` is the one place "now" gets resolved to a calendar date
 * — every rollover/rendering decision downstream depends on this being
 * correct across DST transitions and calendar boundaries, not just on an
 * arbitrary weekday.
 */
describe("todayInTimeZone", () => {
  it("resolves a standard day correctly in a fixed IANA timezone", () => {
    // 2024-06-15T15:00:00Z is 11:00 EDT (UTC-4) in America/Toronto — well
    // clear of any boundary, so this is the "nothing interesting happening" case.
    const now = new Date("2024-06-15T15:00:00.000Z");
    expect(todayInTimeZone("America/Toronto", now)).toBe("2024-06-15");
  });

  it("resolves the same instant differently in two different timezones", () => {
    const now = new Date("2024-06-15T02:00:00.000Z");
    // 02:00 UTC is still 2024-06-14 in Toronto (UTC-4 in June) but already
    // 2024-06-15 in a UTC+... zone ahead of London — proves the function
    // actually uses `timeZone`, not the host/system zone.
    expect(todayInTimeZone("America/Toronto", now)).toBe("2024-06-14");
    expect(todayInTimeZone("Pacific/Auckland", now)).toBe("2024-06-15");
  });

  it("stays on the correct local date just before and after local midnight", () => {
    // America/Toronto is UTC-4 (EDT) on 2024-06-15 — local midnight is
    // 04:00 UTC. One second either side must resolve to different days.
    const justBeforeMidnight = new Date("2024-06-15T03:59:59.000Z");
    const justAfterMidnight = new Date("2024-06-15T04:00:00.000Z");
    expect(todayInTimeZone("America/Toronto", justBeforeMidnight)).toBe("2024-06-14");
    expect(todayInTimeZone("America/Toronto", justAfterMidnight)).toBe("2024-06-15");
  });

  it("resolves correctly on a DST spring-forward day (America/Toronto, 2024-03-10)", () => {
    // Clocks jump from 02:00 EST straight to 03:00 EDT. Pick instants that
    // bracket the local-midnight boundary (05:00 UTC, since Toronto is still
    // UTC-5/EST at that instant) and confirm the calendar date is still
    // exactly what a human would expect, independent of the mid-day jump.
    const localMidnight = new Date("2024-03-10T05:00:00.000Z");
    const justBeforeLocalMidnight = new Date("2024-03-10T04:59:59.000Z");
    expect(todayInTimeZone("America/Toronto", justBeforeLocalMidnight)).toBe("2024-03-09");
    expect(todayInTimeZone("America/Toronto", localMidnight)).toBe("2024-03-10");

    // Later the same day, after the spring-forward jump, still the same calendar date.
    const midAfternoon = new Date("2024-03-10T19:30:00.000Z"); // 15:30 EDT
    expect(todayInTimeZone("America/Toronto", midAfternoon)).toBe("2024-03-10");
  });

  it("resolves correctly on a DST fall-back day (America/Toronto, 2024-11-03)", () => {
    // Clocks fall back from 02:00 EDT to 01:00 EST — 01:00-02:00 local time
    // happens twice. Toronto is UTC-4 (EDT) right up until 06:00 UTC, then
    // UTC-5 (EST) after. Local midnight that morning is 04:00 UTC.
    const justBeforeLocalMidnight = new Date("2024-11-03T03:59:59.000Z");
    const localMidnight = new Date("2024-11-03T04:00:00.000Z");
    expect(todayInTimeZone("America/Toronto", justBeforeLocalMidnight)).toBe("2024-11-02");
    expect(todayInTimeZone("America/Toronto", localMidnight)).toBe("2024-11-03");

    // The repeated 1am-2am local hour, both times it occurs, is still 11-03.
    const firstOneAm = new Date("2024-11-03T05:30:00.000Z"); // 01:30 EDT (first pass)
    const secondOneAm = new Date("2024-11-03T06:30:00.000Z"); // 01:30 EST (after fall-back)
    expect(todayInTimeZone("America/Toronto", firstOneAm)).toBe("2024-11-03");
    expect(todayInTimeZone("America/Toronto", secondOneAm)).toBe("2024-11-03");
  });

  it("resolves correctly across a year boundary", () => {
    // 2024-12-31 23:30 EST is 2025-01-01 04:30 UTC.
    const justBeforeNewYear = new Date("2025-01-01T04:29:00.000Z");
    const justAfterNewYear = new Date("2025-01-01T05:01:00.000Z");
    expect(todayInTimeZone("America/Toronto", justBeforeNewYear)).toBe("2024-12-31");
    expect(todayInTimeZone("America/Toronto", justAfterNewYear)).toBe("2025-01-01");
  });

  it("defaults `now` to the real current instant when omitted", () => {
    const result = todayInTimeZone("America/Toronto");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
