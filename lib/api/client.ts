import type { z } from "zod";

import { ApiError, ApiSchemaError } from "@/lib/api/errors";
import {
  commentCreateRequestSchema,
  commentListResponseSchema,
  commentResponseSchema,
  dayViewResponseSchema,
  errorResponseSchema,
  exportResponseSchema,
  loginRequestSchema,
  loginResponseSchema,
  logoutResponseSchema,
  searchResponseSchema,
  statsResponseSchema,
  taskCreateRequestSchema,
  taskDeleteResponseSchema,
  taskPatchRequestSchema,
  taskReorderRequestSchema,
  taskReorderResponseSchema,
  taskResponseSchema,
  type CommentCreateRequest,
  type CommentListResponse,
  type CommentResponse,
  type DayViewResponse,
  type ExportResponse,
  type LoginResponse,
  type LogoutResponse,
  type SearchResponse,
  type StatsResponse,
  type TaskCreateRequest,
  type TaskDeleteResponse,
  type TaskPatchRequest,
  type TaskReorderRequest,
  type TaskReorderResponse,
  type TaskResponse,
} from "@/lib/api/schemas";

/**
 * Thin, typed `fetch` wrappers — one per `docs/API_CONTRACT.md` endpoint.
 *
 * Every request body is validated against its request schema before being
 * sent (fails fast on a caller bug) and every response body is validated
 * against its response schema before being returned (fails fast on a
 * server/client contract drift) — see `request()` below. Non-2xx responses
 * are parsed as `errorResponseSchema` and thrown as `ApiError`.
 */

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiSchemaError(`Response body from ${response.url} was not valid JSON.`);
  }
}

async function request<TSchema extends z.ZodTypeAny>(
  input: string,
  init: RequestInit,
  responseSchema: TSchema,
): Promise<z.infer<TSchema>> {
  const response = await fetch(input, {
    ...init,
    credentials: "same-origin",
    headers: { ...JSON_HEADERS, ...init.headers },
  });

  const body = await parseJsonBody(response);

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    if (parsedError.success) {
      throw new ApiError(parsedError.data.error.code, parsedError.data.error.message, response.status);
    }
    throw new ApiError(
      "INTERNAL_ERROR",
      `Request to ${input} failed with status ${response.status}.`,
      response.status,
    );
  }

  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiSchemaError(
      `Response from ${input} did not match the expected schema: ${parsed.error.message}`,
    );
  }
  return parsed.data as z.infer<TSchema>;
}

function toSearchParams(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export const apiClient = {
  login: (password: string): Promise<LoginResponse> =>
    request(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(loginRequestSchema.parse({ password })) },
      loginResponseSchema,
    ),

  logout: (): Promise<LogoutResponse> =>
    request("/api/auth/logout", { method: "POST" }, logoutResponseSchema),

  getDay: (date: string): Promise<DayViewResponse> =>
    request(`/api/days/${date}`, { method: "GET" }, dayViewResponseSchema),

  createTask: (input: TaskCreateRequest): Promise<TaskResponse> =>
    request(
      "/api/tasks",
      { method: "POST", body: JSON.stringify(taskCreateRequestSchema.parse(input)) },
      taskResponseSchema,
    ),

  patchTask: (id: string, input: TaskPatchRequest): Promise<TaskResponse> =>
    request(
      `/api/tasks/${id}`,
      { method: "PATCH", body: JSON.stringify(taskPatchRequestSchema.parse(input)) },
      taskResponseSchema,
    ),

  deleteTask: (id: string): Promise<TaskDeleteResponse> =>
    request(`/api/tasks/${id}`, { method: "DELETE" }, taskDeleteResponseSchema),

  addComment: (taskId: string, input: CommentCreateRequest): Promise<CommentResponse> =>
    request(
      `/api/tasks/${taskId}/comments`,
      { method: "POST", body: JSON.stringify(commentCreateRequestSchema.parse(input)) },
      commentResponseSchema,
    ),

  getComments: (taskId: string): Promise<CommentListResponse> =>
    request(`/api/tasks/${taskId}/comments`, { method: "GET" }, commentListResponseSchema),

  reorderTasks: (input: TaskReorderRequest): Promise<TaskReorderResponse> =>
    request(
      "/api/tasks/reorder",
      { method: "POST", body: JSON.stringify(taskReorderRequestSchema.parse(input)) },
      taskReorderResponseSchema,
    ),

  getStats: (from: string, to: string): Promise<StatsResponse> =>
    request(`/api/stats?${toSearchParams({ from, to })}`, { method: "GET" }, statsResponseSchema),

  search: (q: string): Promise<SearchResponse> =>
    request(`/api/search?${toSearchParams({ q })}`, { method: "GET" }, searchResponseSchema),

  getExport: (): Promise<ExportResponse> =>
    request("/api/export", { method: "GET" }, exportResponseSchema),
};

/**
 * `GET /api/export` is one-tap in the UI (see `ExportButton`), but the
 * request itself is a plain JSON fetch (not a browser navigation), so the
 * server's `Content-Disposition` header never gets a chance to trigger a
 * native download. This fetches + validates the export via `apiClient`,
 * then synthesizes the download client-side (Blob + object URL + a
 * throwaway anchor click) using the same filename convention as the server.
 */
export async function downloadExport(): Promise<ExportResponse> {
  const data = await apiClient.getExport();
  const filename = `everydaylist-export-${data.exportedAt.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
  return data;
}
