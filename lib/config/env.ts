import { z } from "zod";

/**
 * Server-side environment loader.
 *
 * Every server module that needs configuration imports from here — never read
 * `process.env.X` directly elsewhere. Validation runs once at import time and
 * fails fast with a descriptive error, so a missing/invalid variable surfaces
 * at boot rather than deep in a request.
 *
 * Do NOT import this module from Client Components — it reads server secrets.
 * Client-safe values live in `clientEnv.ts`.
 */
const serverSchema = z.object({
  /** Postgres (Supabase) connection string. */
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** Secret used to sign/verify the JWT session cookie (min 32 chars). */
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  /** bcrypt hash of the single shared app password. */
  APP_PASSWORD_HASH: z.string().min(1, "APP_PASSWORD_HASH is required"),
  /** Fixed IANA timezone used for all day-boundary / rollover logic. */
  APP_TIMEZONE: z.string().min(1, "APP_TIMEZONE is required"),
  /** Max login attempts allowed per rate-limit window. */
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  /** Duration (ms) of the login rate-limit window. */
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(900_000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function loadEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment variables:\n${details}`);
  }
  return parsed.data;
}

export const env = loadEnv();
