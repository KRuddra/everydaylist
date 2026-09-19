import type { ErrorCode } from "@/lib/api/schemas";

/**
 * Thrown by `lib/api/client.ts` for any non-2xx API response. Carries the
 * server's stable `code` (from `errorResponseSchema`) so callers can branch
 * on it (e.g. show "Incorrect password" vs a generic toast) without
 * string-matching `message`, and the HTTP `status` for cases that care
 * (e.g. treating a replayed `DELETE`'s `404` as "already gone").
 *
 * Deliberately a single class carrying a runtime `code`, rather than the
 * per-code subclass hierarchy `lib/errors/errors.ts` uses server-side: the
 * client receives an arbitrary code at response time and branches on it
 * dynamically, whereas the server always knows which error it's throwing
 * ahead of time.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Thrown when a response body doesn't match the schema its endpoint
 * promises — a client/server contract mismatch, not a domain error. Should
 * never happen against a correctly deployed backend; surfaced distinctly
 * from `ApiError` so callers don't accidentally treat it as a normal
 * domain failure (e.g. retry it, or show it as if it were a validation
 * error).
 */
export class ApiSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiSchemaError";
  }
}
