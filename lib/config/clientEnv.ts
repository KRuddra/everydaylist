import { z } from "zod";

/**
 * Client-safe environment.
 *
 * Only `NEXT_PUBLIC_*` variables belong here — they are inlined into the client
 * bundle at build time and must never contain secrets. Safe to import from both
 * server and client code.
 *
 * `NEXT_PUBLIC_APP_TIMEZONE` must be kept in sync with the server's
 * `APP_TIMEZONE` so the browser computes the same "today" as the server.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_TIMEZONE: z
    .string()
    .min(1, "NEXT_PUBLIC_APP_TIMEZONE is required"),
});

export type ClientEnv = z.infer<typeof clientSchema>;

function loadClientEnv(): ClientEnv {
  // NEXT_PUBLIC_* vars must be referenced statically so Next can inline them.
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_TIMEZONE: process.env.NEXT_PUBLIC_APP_TIMEZONE,
  });
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid client environment variables:\n${details}`);
  }
  return parsed.data;
}

export const clientEnv = loadClientEnv();
