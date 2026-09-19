# Everyday List

A personal daily work tracker (PWA) that syncs across iPhone and laptop. Tasks
under fixed categories — **Reminders, Coop, Courses** — roll over day to day
until you strike them complete, with per-task comments and browsable history.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 + shadcn/ui ·
Supabase Postgres + Drizzle ORM · TanStack Query (offline-persisted) · Serwist (PWA)
· `jose` + bcryptjs auth. Deployed on Vercel.

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in the values (see comments in the file)
pnpm db:migrate              # apply database migrations
pnpm db:seed                 # optional: load sample data
pnpm dev                     # http://localhost:3000
```

Required environment variables are documented in [`.env.example`](./.env.example).
Generate the two secrets with:

```bash
openssl rand -base64 48                                              # AUTH_SECRET
node -e "console.log(require('bcryptjs').hashSync(process.argv[1],12))" "your-password"   # APP_PASSWORD_HASH
```

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build (webpack — required for the service worker) |
| `pnpm start` | Serve the production build |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test` / `pnpm test:e2e` | Vitest unit/component / Playwright e2e |
| `pnpm db:generate` | Generate a Drizzle migration from the schema |
| `pnpm db:migrate` / `pnpm db:migrate:down` | Apply / roll back migrations |
| `pnpm db:seed` | Seed sample data |

## Testing the PWA / offline

Offline behavior needs a production build (the service worker is disabled in dev):

```bash
pnpm build && pnpm start      # then use DevTools → Network → Offline
E2E_PROD=1 pnpm test:e2e      # run e2e against the production build
```

See [`docs/PROJECT_PLAN.md`](./docs/PROJECT_PLAN.md) for the full task breakdown.
