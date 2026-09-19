import type { ErrorCode } from "@/lib/api/schemas";

/**
 * Base class for every domain error thrown by backend code. Every route
 * handler funnels caught errors through `toErrorResponse` (see
 * `lib/errors/httpError.ts`), which maps `code`/`httpStatus`/`message` onto
 * the `errorResponseSchema` JSON shape. Never throw a generic `Error` for an
 * expected/validated failure — always use one of the subclasses below (see
 * `docs/API_CONTRACT.md`'s Error Taxonomy for the full code -> class -> HTTP
 * status mapping).
 */
export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly httpStatus: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** `POST /api/auth/login` with a password that doesn't match `APP_PASSWORD_HASH`. */
export class InvalidCredentialsError extends AppError {
  readonly code = "INVALID_CREDENTIALS" as const;
  readonly httpStatus = 401;

  constructor(message = "Incorrect password.") {
    super(message);
  }
}

/** `POST /api/auth/login` exceeding `LOGIN_RATE_LIMIT_MAX` within the configured window. */
export class RateLimitedError extends AppError {
  readonly code = "RATE_LIMITED" as const;
  readonly httpStatus = 429;

  constructor(message = "Too many login attempts. Please try again later.") {
    super(message);
  }
}

/**
 * Missing/invalid/expired session. Normally thrown by `proxy.ts` before a
 * route handler runs (see `docs/API_CONTRACT.md`), but also usable by any
 * server code that independently verifies the session (`lib/auth/guard.ts`).
 */
export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED" as const;
  readonly httpStatus = 401;

  constructor(message = "Authentication required.") {
    super(message);
  }
}

/**
 * A request body/params/query failed Zod validation, or failed a semantic
 * check the schema alone can't express (e.g. `from > to`, an empty `PATCH`
 * body).
 */
export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR" as const;
  readonly httpStatus = 400;

  constructor(message = "The request was invalid.") {
    super(message);
  }
}

/** A task lookup (by `id`, or by `id` within a `category` for reorder) found nothing. */
export class TaskNotFoundError extends AppError {
  readonly code = "TASK_NOT_FOUND" as const;
  readonly httpStatus = 404;

  constructor(message: string) {
    super(message);
  }
}

/** Catch-all for any unhandled exception in a route handler. Never used for an expected failure. */
export class InternalServerError extends AppError {
  readonly code = "INTERNAL_ERROR" as const;
  readonly httpStatus = 500;

  constructor(message = "An unexpected error occurred.") {
    super(message);
  }
}
