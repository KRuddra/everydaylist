import { NextResponse } from "next/server";
import { ZodError } from "zod";

import type { ErrorResponse } from "@/lib/api/schemas";

import { AppError, InternalServerError, ValidationError } from "./errors";

/**
 * The single funnel every route handler uses to turn a caught error into a
 * response. Never build an ad-hoc `NextResponse.json({ error }, { status })`
 * in a route handler — always `catch (error) { return toErrorResponse(error); }`.
 *
 * Maps:
 * - `AppError` (and subclasses) -> its own `code`/`httpStatus`/`message`.
 * - `ZodError` (a request body/params/query that failed `.parse()`) -> `ValidationError` (400).
 * - Anything else (unexpected/unhandled) -> `InternalServerError` (500), logged
 *   server-side so it's not silently swallowed, but never leaked to the client.
 */
export function toErrorResponse(error: unknown): NextResponse<ErrorResponse> {
  const appError = normalizeError(error);

  if (appError.code === "INTERNAL_ERROR") {
    // Intentional server-side log for unexpected failures — never leaked to the client.
    console.error(error);
  }

  return NextResponse.json(
    { error: { code: appError.code, message: appError.message } },
    { status: appError.httpStatus },
  );
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof ZodError) {
    return new ValidationError(firstZodIssueMessage(error));
  }
  return new InternalServerError();
}

function firstZodIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "The request was invalid.";
}
