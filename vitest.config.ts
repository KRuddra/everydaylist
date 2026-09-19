import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the `@/*` -> `./*` alias from tsconfig.json.
    alias: [{ find: /^@\//, replacement: `${rootDir}` }],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    // Playwright specs live in ./e2e and run under a different runner.
    exclude: ["node_modules", ".next", "e2e/**"],
    // Cap concurrency: the default `forks` pool spawns one process per test
    // file, which overwhelms a loaded machine ("Failed to start forks worker").
    // The lighter `threads` pool with a small worker cap runs reliably and fast.
    // (Vitest 4+ removed `poolOptions`; `maxWorkers` is now a top-level option.)
    pool: "threads",
    maxWorkers: 2,
  },
});
