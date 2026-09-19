import { z } from "zod";

import { CATEGORY_SLUGS } from "@/lib/config/categories";

/**
 * Zod validation schemas — the API contract's source of truth.
 *
 * Every request and response body sent or received by `app/api/**` route
 * handlers must be parsed through one of these schemas. `docs/API_CONTRACT.md`
 * documents which schema applies to which endpoint; this file is the
 * executable half of that contract.
 *
 * Conventions:
 * - Named exports only (no default export).
 * - Every schema has a corresponding `z.infer` type export of the same name
 *   (PascalCase), e.g. `taskResponseSchema` -> `TaskResponse`.
 * - "Request" schemas validate client input; "Response" schemas describe
 *   what the server sends back. They're only split out when they actually
 *   differ (e.g. a response includes server-assigned fields like `id`,
 *   `createdAt`, or the derived `completed` flag).
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Matches a calendar date string shaped like `YYYY-MM-DD` (no time part). */
export const CALENDAR_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True if `value` is a real calendar date (rejects e.g. `2024-02-30` or
 * `2024-13-01`), given it already matches `CALENDAR_DATE_REGEX`.
 */
function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Reusable calendar-date schema, e.g. `dueDate`, `createdDate`,
 * `completedDate`, and the `[date]` route param / `from`/`to` query params.
 * Deliberately a plain `YYYY-MM-DD` string (not a `Date`/ISO-datetime) since
 * rollover and rendering are day-boundary concerns, not instants in time.
 */
export const calendarDateSchema = z
  .string()
  .regex(CALENDAR_DATE_REGEX, "Must be a date in YYYY-MM-DD format")
  .refine(isRealCalendarDate, "Must be a valid calendar date");
export type CalendarDate = z.infer<typeof calendarDateSchema>;

/** Client- or server-generated UUID (v4 or v7 both validate). */
export const uuidSchema = z.uuid();
export type Uuid = z.infer<typeof uuidSchema>;

/** Server-generated ISO 8601 UTC datetime string, e.g. `createdAt`/`updatedAt`. */
export const isoDateTimeSchema = z.iso.datetime();
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

/**
 * One of the three fixed category slugs. Sourced from `lib/config/categories`
 * so this schema can never drift from the app's single source of truth for
 * categories — never hardcode the slug list here.
 */
export const categorySchema = z.enum(CATEGORY_SLUGS);

/** Task priority flag. `null` (not this schema) represents "no priority". */
export const taskPrioritySchema = z.enum(["low", "medium", "high"]);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

/** Generic `{ success: true }` body for endpoints with no meaningful payload. */
export const successResponseSchema = z.object({ success: z.literal(true) });
export type SuccessResponse = z.infer<typeof successResponseSchema>;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Canonical domain error codes. See `docs/API_CONTRACT.md` for the full
 * taxonomy (HTTP status + implementing `lib/errors/*` class per code).
 */
export const errorCodeSchema = z.enum([
  "INVALID_CREDENTIALS",
  "RATE_LIMITED",
  "UNAUTHORIZED",
  "VALIDATION_ERROR",
  "TASK_NOT_FOUND",
  "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** The single canonical JSON error response shape used by every endpoint. */
export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** `POST /api/auth/login` request body. */
export const loginRequestSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** `POST /api/auth/login` success response body (the cookie carries the session). */
export const loginResponseSchema = successResponseSchema;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

/** `POST /api/auth/logout` success response body. */
export const logoutResponseSchema = successResponseSchema;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/** A comment as returned by the API. */
export const commentResponseSchema = z.object({
  id: uuidSchema,
  taskId: uuidSchema,
  body: z.string(),
  createdAt: isoDateTimeSchema,
});
export type CommentResponse = z.infer<typeof commentResponseSchema>;

/**
 * `POST /api/tasks/[id]/comments` request body. `id` is client-generated for
 * the same offline/idempotency reasons as task creation — see
 * `taskCreateRequestSchema`.
 */
export const commentCreateRequestSchema = z.object({
  id: uuidSchema,
  body: z.string().trim().min(1, "Comment cannot be empty").max(2000, "Comment must be 2000 characters or fewer"),
});
export type CommentCreateRequest = z.infer<typeof commentCreateRequestSchema>;

/** `GET /api/tasks/[id]/comments` response body. */
export const commentListResponseSchema = z.array(commentResponseSchema);
export type CommentListResponse = z.infer<typeof commentListResponseSchema>;

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/** A task as returned by the API, including its comments. */
export const taskResponseSchema = z.object({
  id: uuidSchema,
  category: categorySchema,
  title: z.string(),
  priority: taskPrioritySchema.nullable(),
  dueDate: calendarDateSchema.nullable(),
  createdDate: calendarDateSchema,
  completedDate: calendarDateSchema.nullable(),
  /** Derived from `completedDate !== null`. Response-only; never sent by clients. */
  completed: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  comments: z.array(commentResponseSchema),
});
export type TaskResponse = z.infer<typeof taskResponseSchema>;

/**
 * `POST /api/tasks` request body.
 *
 * `id` is client-generated (UUID v4/v7) so task creation is idempotent: a
 * request whose `id` already exists is a no-op success that returns the
 * existing resource unchanged, never a 409 or a merge of the new fields. This
 * lets the offline outbox safely replay a queued create after reconnecting.
 *
 * `createdDate` is optional — when omitted the server defaults it to the
 * server's current date (in `APP_TIMEZONE`). `sortOrder` is never
 * client-supplied on create; the server appends the task to the end of its
 * category.
 */
export const taskCreateRequestSchema = z.object({
  id: uuidSchema,
  category: categorySchema,
  title: z.string().trim().min(1, "Title cannot be empty").max(500, "Title must be 500 characters or fewer"),
  priority: taskPrioritySchema.nullable().optional(),
  dueDate: calendarDateSchema.nullable().optional(),
  createdDate: calendarDateSchema.optional(),
});
export type TaskCreateRequest = z.infer<typeof taskCreateRequestSchema>;

/** The editable, non-completion fields of a task. All optional (PATCH semantics). */
export const taskEditFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(500, "Title must be 500 characters or fewer").optional(),
  priority: taskPrioritySchema.nullable().optional(),
  dueDate: calendarDateSchema.nullable().optional(),
  category: categorySchema.optional(),
});
export type TaskEditFields = z.infer<typeof taskEditFieldsSchema>;

/**
 * Completion state change, expressed as an explicit action rather than a raw
 * `completedDate` write. `"complete"` sets `completedDate` to the given
 * `date` (so completing a task while browsing a past day marks it complete
 * *on that day*, not on today); `"reopen"` clears `completedDate` back to
 * `null`. See `docs/API_CONTRACT.md` for the full rationale.
 */
export const taskCompletionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("complete"), date: calendarDateSchema }),
  z.object({ action: z.literal("reopen") }),
]);
export type TaskCompletionAction = z.infer<typeof taskCompletionActionSchema>;

/**
 * `PATCH /api/tasks/[id]` request body. Combines field edits and/or a
 * completion action in one request; at least one of them must be present.
 */
export const taskPatchRequestSchema = taskEditFieldsSchema
  .extend({ completion: taskCompletionActionSchema.optional() })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "PATCH body must include at least one field edit or a completion action",
  });
export type TaskPatchRequest = z.infer<typeof taskPatchRequestSchema>;

/** `DELETE /api/tasks/[id]` success response body. */
export const taskDeleteResponseSchema = successResponseSchema;
export type TaskDeleteResponse = z.infer<typeof taskDeleteResponseSchema>;

/** One entry in a `POST /api/tasks/reorder` request. */
export const taskReorderItemSchema = z.object({
  id: uuidSchema,
  sortOrder: z.number().int(),
});
export type TaskReorderItem = z.infer<typeof taskReorderItemSchema>;

/**
 * `POST /api/tasks/reorder` request body. Reordering is scoped to a single
 * category per request (sort order is only ever meaningful within a
 * category), so the request names the category being reordered plus the
 * full ordered `items` list for it.
 */
export const taskReorderRequestSchema = z.object({
  category: categorySchema,
  items: z.array(taskReorderItemSchema).min(1, "items must contain at least one entry"),
});
export type TaskReorderRequest = z.infer<typeof taskReorderRequestSchema>;

/** `POST /api/tasks/reorder` success response body. */
export const taskReorderResponseSchema = successResponseSchema;
export type TaskReorderResponse = z.infer<typeof taskReorderResponseSchema>;

// ---------------------------------------------------------------------------
// Day view
// ---------------------------------------------------------------------------

/**
 * `GET /api/days/[date]` response body. `tasks` is a flat array (each task
 * already carries its own `category`), pre-sorted by the server in category
 * order (per `CATEGORY_SLUGS`) then `sortOrder` — clients should not re-sort.
 */
export const dayViewResponseSchema = z.object({
  date: calendarDateSchema,
  tasks: z.array(taskResponseSchema),
});
export type DayViewResponse = z.infer<typeof dayViewResponseSchema>;

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/** `GET /api/stats` query parameters. */
export const statsQuerySchema = z
  .object({ from: calendarDateSchema, to: calendarDateSchema })
  .refine((data) => data.from <= data.to, {
    message: "`from` must be on or before `to`",
    path: ["from"],
  });
export type StatsQuery = z.infer<typeof statsQuerySchema>;

/** Per-day completion figures within a `GET /api/stats` response. */
export const statsDayEntrySchema = z.object({
  day: calendarDateSchema,
  /** Count of tasks in play that day (rolling-query result size for `day`). */
  inPlay: z.number().int().nonnegative(),
  /** Count of those tasks struck complete on `day` specifically. */
  completed: z.number().int().nonnegative(),
  /** `completed / inPlay * 100`, rounded; `0` when `inPlay` is `0`. */
  percent: z.number().min(0).max(100),
});
export type StatsDayEntry = z.infer<typeof statsDayEntrySchema>;

/** `GET /api/stats` response body. */
export const statsResponseSchema = z.object({
  days: z.array(statsDayEntrySchema),
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
});
export type StatsResponse = z.infer<typeof statsResponseSchema>;

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** `GET /api/search` query parameters. Missing/empty `q` is valid (not an error). */
export const searchQuerySchema = z.object({
  q: z.string().trim().default(""),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** One matching task in a `GET /api/search` response, with enough context to link back to its day. */
export const searchResultItemSchema = z.object({
  taskId: uuidSchema,
  category: categorySchema,
  title: z.string(),
  priority: taskPrioritySchema.nullable(),
  dueDate: calendarDateSchema.nullable(),
  createdDate: calendarDateSchema,
  completedDate: calendarDateSchema.nullable(),
  completed: z.boolean(),
  /** Whether `q` matched the task's title or one of its comments. */
  matchedIn: z.enum(["title", "comment"]),
  /** The matched text: the title itself, or the matching comment's body. */
  matchedText: z.string(),
});
export type SearchResultItem = z.infer<typeof searchResultItemSchema>;

/** `GET /api/search` response body — a bare array; empty when there are no matches. */
export const searchResponseSchema = z.array(searchResultItemSchema);
export type SearchResponse = z.infer<typeof searchResponseSchema>;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** `GET /api/export` response body — a full JSON backup of every task and its comments. */
export const exportResponseSchema = z.object({
  exportedAt: isoDateTimeSchema,
  tasks: z.array(taskResponseSchema),
});
export type ExportResponse = z.infer<typeof exportResponseSchema>;
