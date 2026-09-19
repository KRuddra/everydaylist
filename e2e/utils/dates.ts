/**
 * Minimal `YYYY-MM-DD` calendar-date arithmetic for e2e specs — intentionally
 * a small, self-contained duplicate of `lib/dates/calendarDate.ts`'s logic
 * (not an import from `@/lib/...`) so these specs have zero dependency on
 * the app's module resolution/aliasing working under Playwright's own TS
 * transform, and stay obviously pure/reviewable in isolation.
 */
export function addDays(date: string, delta: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  return shifted.toISOString().slice(0, 10);
}

/** A short, collision-resistant suffix for uniquely-named test fixtures (task titles, etc.). */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
