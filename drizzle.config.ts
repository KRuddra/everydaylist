import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so load the env file Next would normally read.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

// `drizzle-kit generate` only reads the schema and needs no connection, so a
// placeholder is fine there. `drizzle-kit migrate` will fail clearly against
// the placeholder if DATABASE_URL is genuinely missing.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://placeholder/placeholder";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
