# Everyday List — UI Spec (v1)

Design-only deliverable for Stage 2 (T2.1–T2.8). Covers 5 screens, a shared component
inventory, theme tokens, and a state matrix. No code is written here; `frontend-developer`
implements from this spec against the primitives in `components/ui/` (shadcn/ui, Base UI
variant) + `lucide-react` icons.

**Scaffold facts this spec builds on** (from repo inspection):
- Primitives installed: `button`, `input`, `checkbox`, `dialog`, `badge`, `tabs`, `sonner`,
  `textarea`, `label`, `card`, `popover`, `separator`, `calendar`.
- Tailwind v4 token model already in `app/globals.css`: `:root` / `.dark` CSS vars +
  `@theme inline` mapping (`--color-X: var(--X)`). This spec's new tokens (§4) follow the
  exact same pattern.
- Categories are fixed and ordered: `reminders` → Reminders, `coop` → Coop,
  `courses` → Courses (`lib/config/categories.ts`). Order is always Reminders, Coop,
  Courses — never re-sorted or user-reorderable.
- `--radius` currently `0.625rem`. This spec proposes bumping it to `0.75rem` (§4) for a
  softer, calmer mobile feel — flag this as an intentional change, not an oversight.

---

## 0. Design Principles

- **Calm, not busy.** Muted neutrals + one brand accent (teal-blue) + category accents used
  sparingly (dots/borders, not full-bleed color blocks).
- **Thumb-first.** Primary actions (check off, add, comment) live in the bottom half of the
  screen or are reachable without a hand-shift on a 390px-wide phone.
- **Strikethrough is never the only signal.** Every completed state pairs a filled/checked
  `Checkbox` (color + icon) with the strikethrough text (color/contrast, not just a line).
- **No dead ends offline.** Every screen has a defined offline behavior (§5); nothing shows
  a blank white screen or a browser error page.
- **One task model, reused everywhere.** `TaskItem` is the single source of truth for how a
  task renders; Today, Day, and Search results all compose it (Search uses a compact
  variant — see `SearchResultItem`).

---

## 1. App Shell (shared across Today / Day / Stats / Search)

Applies to all authenticated screens. Screen specs in §2 only describe what's *different*.

```
┌─────────────────────────────────────────┐  ← sticky header, h-14
│ Everyday List        [⚠ Offline] [⬇] [⋮] │
├─────────────────────────────────────────┤
│                                           │
│           (screen content,               │
│            scrolls independently)        │
│                                           │
│                                    [ + ]  │ ← QuickAddFab (Today/Day only)
├─────────────────────────────────────────┤
│   [Today]  [History]  [Stats]  [Search]  │  ← AppNav, sticky bottom, h-14–16
└─────────────────────────────────────────┘
   safe-area-inset-bottom padding included
```

| Region | Spec |
|---|---|
| **Header/nav** | `<768px`: sticky top header (title + status icons) + sticky bottom tab bar (`AppNav`, 4 items: Today, History, Stats, Search — Login is unauthenticated and has no shell). `>=768px`: header stays; `AppNav` switches to a fixed left sidebar (same 4 items, icon+label, vertical); content area gets `max-w-2xl` and centers with `px-8`. Active tab: filled icon + `text-primary` + `font-medium`; current route also reflected in `<title>`/`aria-current="page"`. |
| **Offline indicator placement** | Persistent small icon+label in the header, immediately left of the export button (`WifiOff` icon, `text-destructive`, label "Offline" hidden below `sm:` to save space, icon always visible). Rendered by `OfflineBanner`. On every online↔offline *transition* (not on steady state), also fire a 3s `sonner` toast ("You're offline — changes will sync later." / "Back online — syncing…") — transient, not a persistent component. |
| **Export button placement** | Requirement says "one-tap" — so it is a direct, always-visible icon button in the header (`Download` icon, `Button variant="ghost" size="icon"`, `aria-label="Export backup"`), *not* nested in a menu. Tap → immediate `GET /api/export` → browser download; button shows a spinner in place of the icon while the request is in flight, then a `sonner` success toast ("Backup exported"). Disabled (with `title`/`aria-describedby` tooltip "Unavailable offline") when `OfflineBanner` is in the offline state. |
| **Overflow menu** | `Button variant="ghost" size="icon"` (`MoreVertical`) → `Popover` with: "Install app" (replays `IOSInstallHint`), "Logout". Kept separate from Export specifically because Export must stay one-tap. |
| **QuickAddFab** | Fixed `bottom-20 right-4` (clears the bottom tab bar + safe-area by 16px), 56px circle, `Plus` icon, `variant="default"`, `aria-label="Add task"`. Present on Today and Day only (not Stats/Search/Login). Opens `TaskComposer` inside a `Dialog` with an internal category `Tabs` selector (see §3 `TaskComposer`). |
| **z-index / stacking** | header & bottom nav: sticky, standard stacking context; FAB: sits above list content, below overlays; `Dialog`/`Popover` overlays use the primitives' default (top); `sonner` toasts render above everything. |

---

## 2. Screens

### 2.1 Today (landing, `/`)

**Purpose:** default view — today's rolling task list, grouped by the 3 fixed categories.

```
[Header — see §1]
Thu, Sep 18 · Today                    (28%) ◔   ← ProgressRing sm, tap → Stats
─────────────────────────────────────────
● Reminders                          2 / 5
  ☐ Book dentist appointment      🚩 📅Sep20 💬2
  ☑ ~~Pay electricity bill~~
  ☐ Renew passport            🚩🔴 📅Sep15‼ 💬0
  + Add task
─────────────────────────────────────────
● Coop                                0 / 2
  ☐ Draft Q3 roadmap doc          🚩 📅Sep19 💬1
  ☐ Review PR #482
  + Add task
─────────────────────────────────────────
● Courses                             1 / 1
  ☑ ~~Finish Ch.4 exercises~~
  No other tasks yet — add one below
  + Add task
─────────────────────────────────────────
[Bottom nav]                              [+]
```

**Anatomy — `TaskItem` row** (min-height 48px, full-width tap target except the checkbox
sub-zone):

| Element | Detail |
|---|---|
| `Checkbox` | Leading, wrapped in its own ~44×44px tap zone (`py-3 pl-4 pr-2`). Toggling fires the complete/reopen mutation optimistically. Checked state: `bg-completed border-completed text-completed-foreground`. |
| Title | `text-base`, truncates to 2 lines then ellipsis. Completed: `line-through text-muted-foreground` **and** the checked checkbox — strikethrough is never the sole signal. |
| Rollover hint (conditional) | If `created_date < viewed_date`, a `text-xs text-muted-foreground` caption under the title: "since Sep 15". Applies on Today and Day alike — helps recall why an old task is still around. |
| `PriorityFlag` | Small flag icon, color = priority token (§4). Omitted for `low` by default to reduce visual noise (flag only rendered for medium/high — low priority shows no icon, which *is* the "low" signal). |
| `DueDateBadge` | `Badge variant="outline"` compact, `CalendarClock` icon + short date ("Sep 20"). Switches to overdue styling (§4 `--overdue`) + `AlertTriangle` icon + "‼" affix when due date < *real* today and task not completed on any day. |
| Comment affordance | Trailing `MessageCircle` icon + count (0 shown muted, >0 shown `text-foreground`). Not a separate tiny button — the **whole row** (outside the checkbox zone) is the tap target that opens `TaskDetailDialog` on that task, comment icon is just the visual affordance. |
| Reorder (secondary, low-emphasis) | Drag handle (`GripVertical`) appears only in a row's `:hover`/long-press "edit mode" — supports the backend reorder capability (per-category order) without adding a persistent icon to every row. Not a primary interaction for v1; flagged for `frontend-developer` to confirm timing with `T5.7`/`T6.9`. |

**Add-task entry point:** two complementary paths, both render the same `TaskComposer`:
1. **Inline, per-category** (primary): a low-emphasis "+ Add task" row at the bottom of each
   `CategorySection`. Tapping swaps it in-place for an inline `TaskComposer` (`Input` for
   title, autofocus, keyboard `Enter` submits, `Escape`/blur-empty cancels). Category is
   implicit — zero extra taps, matches one-hand/thumb-reach goal.
2. **`QuickAddFab`** (secondary/convenience): opens `TaskComposer` in a `Dialog` with a
   `Tabs` category selector, for when the user is scrolled past the target section.

**Header sub-row:** date label + `ProgressRing` (sm, 28px, tap → Stats page) showing today's
completion %.

**Interactions summary:** tap checkbox → toggle complete (today's date). Tap row → open
`TaskDetailDialog`. Tap "+ Add task" → inline composer. Tap FAB → dialog composer. Tap
`ProgressRing` → navigate to Stats.

---

### 2.2 Day (browse a past date, `/day/[date]`)

**Purpose:** read + interact with any past date's rolling task set. Reuses the Today body
1:1 (`CategorySection` × 3, same `TaskItem`), swaps the sub-header for `DayNavigator` and
adds a "viewing past day" banner.

```
[Header — see §1]
 ‹        Thu, Sep 11  📅         ›
┌───────────────────────────────────────┐
│ Viewing a past day        [Back to Today] │
└───────────────────────────────────────┘
[Category sections — identical to Today]
[Bottom nav]                              [+]
```

| Element | Detail |
|---|---|
| `DayNavigator` | `‹` / `›` icon buttons (`ChevronLeft`/`ChevronRight`) step ±1 day. `›` is disabled (not hidden — keeps layout stable + is a clearer a11y state) when the current date is today (no future browsing). Center: date label + `CalendarDays` icon, tappable → `Popover` containing the `calendar` primitive for jump-to-date. |
| "Viewing past day" banner | `bg-muted` full-width strip directly under `DayNavigator`. Only rendered when `date !== today`. Includes a `Button variant="ghost" size="sm"` "Back to Today" shortcut. This is the primary visual distinction from Today (in addition to the nav swap). |
| Rolled-over task | No special badge beyond the standard rollover hint caption (§2.1) — a task with `created_date < D` and not yet completed on any day ≤ D simply appears, unstruck, exactly like any other open task. Per spec: struck only if `completed_date === D` exactly. |
| Checking a task here | Sets `completed_date = D` (the *viewed* date), never today's real date — same `TaskItem` component, different mutation target date passed as a prop/context. |
| Overdue on Day | Evaluated against **real today**, not the viewed date — a task due 3 days before the viewed date is still flagged overdue even when browsing further back, since "overdue" is a property of the task, not the day being viewed. |
| Add-task on Day | Same inline "+ Add task" / FAB pattern as Today. Backfilling a past day is allowed (no stated restriction); new task's `created_date = D`. |
| Offline + jump-to-date | Dates without a locally cached response show an inline empty note "Not available offline" inside the `Popover` day cell (calendar primitive `disabled` state) rather than a broken empty page. |

---

### 2.3 Stats (`/stats`)

**Purpose:** motivation surface — today's %, streaks, and a heatmap of history.

```
[Header — see §1]
┌───────────┬───────────┬───────────┐
│   Today    │  Current  │  Longest  │
│  ◔ 28%     │  🔥 4     │  🔥 11    │
└───────────┴───────────┴───────────┘
  Activity
  ░░▒▒▓▓██░░▒▒▓▓██░░▒▒▓▓██ ...  (scrolls →, snapped to most recent week)
  Sep            Aug            Jul
[Bottom nav]
```

| Element | Detail |
|---|---|
| Stat row | 3 `Card`s (`size="sm"`) in a `flex` row: `ProgressRing` (lg, 96px, % centered — today's completion), `StreakBadge` ×2 (current, longest — `Flame` icon + count). |
| `CalendarHeatmap` | Horizontally scrollable (`overflow-x-auto`, `snap-x`), GitHub-style week columns × day-of-week rows, defaults scrolled to the most recent column. Each `HeatmapCell` ~13px with 2–3px gap, `role="gridcell"`, `aria-label="Sep 18 — 3 of 5 tasks done (60%)"`. Tap a cell → navigate to that `Day` view (mirrors Search's "link back to that day"). |
| Cell states (4 semantic buckets, per spec) | `no-tasks`: dashed outline, transparent fill (no activity that day — nothing to grade). `0%` (tasks existed, none done): solid `bg-muted` fill, no green — deliberately *not* red/destructive, since a 0% day isn't an error state, just an unfinished one. `partial` (1–99%): `--completed` green at 3 opacity steps (33/66/100% of token alpha) for a smooth gradient within the bucket. `100%`: full-strength `--completed`. |
| Empty history (new user) | All cells `no-tasks`; `StreakBadge` shows "0" with encouraging copy "Complete a task to start a streak" instead of just "0". |
| Stale offline data | If the last stats fetch is cached, a small `text-xs text-muted-foreground` "Updated Sep 17, 9:04 PM" caption appears under the heatmap. |

---

### 2.4 Search (`/search`)

**Purpose:** full-text search across all past days' task titles and comments.

```
[Header — see §1]
🔍 [ Search tasks and comments...      ] ✕
─────────────────────────────────────────
● Renew passport                    Sep 15
  Due date badge shown here if overdue
  "...forgot to bring photo, rescheduling"
─────────────────────────────────────────
● Book dentist appointment          Sep 12
  matched in title
[Bottom nav]
```

| Element | Detail |
|---|---|
| `SearchInput` | `Input` wrapped with a leading `Search` icon and a trailing clear `✕` button (shown only when non-empty). Autofocus on mount. Debounced 300ms before firing the query. `aria-label="Search tasks and comments"`. |
| `SearchResultItem` | `CategoryDot` + task title (bold match substring via `<mark>`) + right-aligned date `Badge variant="outline"` (tap-through target for the whole row). Below the title: the matched snippet — either "matched in title" styling (plain, no prefix) or, if the match is a comment, `text-sm text-muted-foreground` with a small quote treatment, e.g. `"...forgot to bring photo..."`. If the underlying task is completed, a small inline `Check` glyph (not full strikethrough — this is a single-line snippet, not a full `TaskItem`) precedes the title. `DueDateBadge` compact variant shown inline only if overdue (keeps rows lean). Tap → navigate to that date's `Day` view (or `Today` if `date === today`). |
| Blank state (no query yet) | Centered `Search` icon (muted) + "Search your tasks and comments" — no recent-search list in v1. |
| Loading | `ListSkeleton` (3 shimmering rows) while a debounced query is in flight. |
| Empty results | Centered `SearchX` icon + `"No results for “{query}”"` + muted subtext "Try a different keyword". Rendered by `EmptyState`. |
| Offline | Search requires the server-side trigram index — no offline fallback in v1. `SearchInput` gets `disabled` + inline note "Search needs a connection" below it (paired with the header's `OfflineBanner`). |

---

### 2.5 Login (`/login`)

**Purpose:** single shared-password gate. No `AppNav`/header shell — minimal, centered.

```
        Everyday List

   ┌─────────────────────┐
   │  Password             │
   │  [ ●●●●●●●●●●  👁 ]   │
   │                        │
   │  [     Unlock      ]  │
   └─────────────────────┘
   ⚠ Incorrect password. Try again.
```

| Element | Detail |
|---|---|
| `LoginForm` | Centered `Card` (`max-w-sm`), `Label` + `Input type="password"` with an in-field `Eye`/`EyeOff` toggle `Button` (`variant="ghost" size="icon-sm"`, `aria-label="Show/Hide password"`), full-width `Button` "Unlock". `<form>` semantics so `Enter` submits from the password field (full keyboard operability). |
| Invalid-password state | Inline `text-sm text-destructive` message under the input, `role="alert"`, `AlertCircle` icon prefix: "Incorrect password. Try again." Input gets `aria-invalid` (primitive already styles this — red ring/border). Persistent inline message, **not** a toast-only error (toasts aren't reliably accessible/persistent). Focus returns to the input after a failed attempt. |
| Rate-limit-exceeded (locked out) | Input + Button both `disabled`. Message swaps to a `Clock` icon + "Too many attempts. Try again in {mm:ss}." — a client-side countdown (from the server's `retryAfter`) ticks down and re-enables the form at 0. Still `role="alert"` on first render (announced once, not every tick). |
| Loading (submitting) | `Button` shows an inline spinner + "Unlocking…" label; input `disabled` during the request. |
| Success | Redirect to Today; no lingering UI needed on this screen. |

---

## 3. Component Inventory (T2.6)

25 components. PascalCase filenames under `components/` (project has no existing
`components/` subfolder convention beyond `components/ui/` — recommend
`components/{task,shell,stats,search,auth}/ComponentName.tsx` grouped by feature, or flat
`components/ComponentName.tsx` if the project prefers flat; defer final folder split to
`frontend-developer` per "follow existing project structure").

| Component | Purpose | Key props / variants | Composes (primitives) |
|---|---|---|---|
| `AppNav` | Primary navigation (Today/History/Stats/Search) | `variant: "bottom-bar" \| "sidebar"` (responsive, auto-picked); `active` route | `Button`-like links, `lucide-react` icons |
| `OfflineBanner` | Persistent offline indicator in header | `status: "online" \| "offline"` | icon + text; triggers `sonner` toast on transition |
| `ExportButton` | One-tap JSON backup download | `state: "idle" \| "loading" \| "disabled"` | `Button size="icon"`, `sonner` |
| `IOSInstallHint` | Dismissible "Add to Home Screen" banner for iOS Safari, non-standalone | `dismissed: boolean` (persisted) | `Card`/inline banner, `Button` (dismiss) |
| `CategorySection` | One category's header + list + add-row | `category: CategorySlug`; `tasks`; `completedCount/total` | `Separator`, `CategoryDot`, `Badge` (count) |
| `TaskList` | Renders an ordered list of `TaskItem` for a category | `tasks`; `onToggle`; `onOpen` | — (layout only) |
| `TaskItem` | Single task row: checkbox, title, flags, badges, comment affordance | `task`; `struck`; `overdue`; `showRolloverHint`; `dragHandle?: boolean` | `Checkbox`, `PriorityFlag`, `DueDateBadge` |
| `PriorityFlag` | Priority indicator icon | `priority: "low" \| "medium" \| "high"` (low renders nothing) | `lucide-react` `Flag` + priority token color |
| `DueDateBadge` | Due date chip, overdue-aware | `date`; `overdue: boolean`; `variant: "default" \| "compact"` | `Badge variant="outline"` |
| `TaskComposer` | Add-task input (inline or in `Dialog`) | `mode: "inline" \| "dialog"`; `defaultCategory?` (inline) / category `Tabs` (dialog) | `Input`, `Tabs`, `Button` |
| `QuickAddFab` | Floating action button opening `TaskComposer` (dialog mode) | — | `Button size="icon-lg"`, `Dialog` |
| `TaskDetailDialog` | Focused view for one task: title, `PriorityFlag`/`DueDateBadge` (editable via `Popover`), `CommentThread` | `taskId`; `open`; `onOpenChange` | `Dialog`, `Popover`, `Calendar` (due date edit), `PriorityFlag`, `DueDateBadge` |
| `CategoryDot` | Small colored dot atom for category identity | `category: CategorySlug`; `size: "xs" \| "sm"` | plain span, category token color |
| `CommentThread` | List of comments for a task (used inside `TaskDetailDialog`) | `comments`; `loading`; `error` | list of comment bubbles; `ListSkeleton`, `EmptyState` |
| `CommentComposer` | Add-comment input, pinned to bottom of `TaskDetailDialog` | `onSubmit`; `disabled` (offline-safe — queues) | `Textarea`, `Button` |
| `DayNavigator` | Prev/next + jump-to-date for the Day screen | `date`; `canGoForward: boolean` | `Button size="icon"`, `Popover` + `Calendar` |
| `ProgressRing` | Circular completion % indicator | `value: number`; `size: "sm" \| "lg"`; `showLabel?: boolean` | inline SVG (no primitive; new) |
| `StreakBadge` | Current/longest streak counter card | `label`; `count`; `variant: "current" \| "longest"` | `Card` |
| `CalendarHeatmap` | GitHub-style activity grid | `days: {date, pct, hasTasks}[]`; `onSelectDay` | grid of `HeatmapCell` |
| `HeatmapCell` | One day's cell in the heatmap | `bucket: "no-tasks" \| "0%" \| "partial" \| "100%"`; `intensity?: 1\|2\|3` | `Popover`/native `title` for tooltip |
| `SearchInput` | Debounced search field with clear button | `value`; `onChange`; `loading` | `Input`, `Button size="icon-xs"` (clear) |
| `SearchResultItem` | One search hit: title, snippet, date, link | `result`; matched-field indicator | `CategoryDot`, `Badge` (date), `<mark>` |
| `EmptyState` | Generic empty/error placeholder (icon + message + optional retry) | `variant: "empty" \| "error"`; `icon`; `title`; `description`; `onRetry?` | `Button` (retry) |
| `ListSkeleton` | Loading placeholder rows/blocks | `rows?: number`; `variant: "row" \| "block"` | plain shimmer divs |
| `LoginForm` | Password form with all auth states | `state: "idle" \| "loading" \| "invalid" \| "locked"`; `retryAfterSeconds?` | `Card`, `Label`, `Input`, `Button` |

---

## 4. Theme Tokens (T2.7)

Ready to paste into `app/globals.css`. Same token names/pattern already used there
(`shadcn` Tailwind v4 model: raw value in `:root`/`.dark`, exposed via `@theme inline` as
`--color-X: var(--X)`). `frontend-developer` pastes; **not applied by this agent.**

### 4.1 Core tokens — `:root` (light)

```css
:root {
  --background: oklch(0.99 0.003 95);
  --foreground: oklch(0.22 0.01 260);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.22 0.01 260);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.22 0.01 260);
  --primary: oklch(0.53 0.13 224);
  --primary-foreground: oklch(0.99 0.005 95);
  --secondary: oklch(0.96 0.006 95);
  --secondary-foreground: oklch(0.30 0.01 260);
  --muted: oklch(0.96 0.006 95);
  --muted-foreground: oklch(0.52 0.015 260);
  --accent: oklch(0.93 0.03 224);
  --accent-foreground: oklch(0.30 0.08 224);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.90 0.006 95);
  --input: oklch(0.90 0.006 95);
  --ring: oklch(0.65 0.10 224);
  --chart-1: oklch(0.55 0.14 240);  /* = category-reminders */
  --chart-2: oklch(0.62 0.15 55);   /* = category-coop */
  --chart-3: oklch(0.56 0.17 300);  /* = category-courses */
  --chart-4: oklch(0.62 0.17 150);  /* = completed */
  --chart-5: oklch(0.577 0.245 27.325); /* = overdue */
  --radius: 0.75rem; /* was 0.625rem — softer, calmer feel for a mobile task list */

  /* Semantic extensions (new) */
  --category-reminders: oklch(0.55 0.14 240);
  --category-coop: oklch(0.62 0.15 55);
  --category-courses: oklch(0.56 0.17 300);
  --priority-low: oklch(0.60 0.05 150);
  --priority-medium: oklch(0.74 0.15 85);
  --priority-high: oklch(0.58 0.20 18);
  --completed: oklch(0.62 0.17 150);
  --completed-foreground: oklch(0.99 0.005 95);
  --overdue: oklch(0.577 0.245 27.325);
  --overdue-foreground: oklch(0.99 0.005 95);
}
```

### 4.2 Core tokens — `.dark`

```css
.dark {
  --background: oklch(0.19 0.012 260);
  --foreground: oklch(0.94 0.005 95);
  --card: oklch(0.23 0.012 260);
  --card-foreground: oklch(0.94 0.005 95);
  --popover: oklch(0.23 0.012 260);
  --popover-foreground: oklch(0.94 0.005 95);
  --primary: oklch(0.72 0.12 224);
  --primary-foreground: oklch(0.15 0.01 260);
  --secondary: oklch(0.28 0.012 260);
  --secondary-foreground: oklch(0.90 0.005 95);
  --muted: oklch(0.28 0.012 260);
  --muted-foreground: oklch(0.65 0.01 260);
  --accent: oklch(0.30 0.04 224);
  --accent-foreground: oklch(0.85 0.06 224);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.72 0.12 224 / 0.6);
  --chart-1: oklch(0.72 0.12 240);
  --chart-2: oklch(0.76 0.13 55);
  --chart-3: oklch(0.74 0.14 300);
  --chart-4: oklch(0.70 0.16 150);
  --chart-5: oklch(0.704 0.191 22.216);

  /* Semantic extensions (new) */
  --category-reminders: oklch(0.72 0.12 240);
  --category-coop: oklch(0.76 0.13 55);
  --category-courses: oklch(0.74 0.14 300);
  --priority-low: oklch(0.68 0.05 150);
  --priority-medium: oklch(0.80 0.14 85);
  --priority-high: oklch(0.68 0.18 18);
  --completed: oklch(0.70 0.16 150);
  --completed-foreground: oklch(0.15 0.01 150);
  --overdue: oklch(0.704 0.191 22.216);
  --overdue-foreground: oklch(0.15 0.01 25);
}
```

### 4.3 `@theme inline` additions (append inside the existing block)

```css
  --color-category-reminders: var(--category-reminders);
  --color-category-coop: var(--category-coop);
  --color-category-courses: var(--category-courses);
  --color-priority-low: var(--priority-low);
  --color-priority-medium: var(--priority-medium);
  --color-priority-high: var(--priority-high);
  --color-completed: var(--completed);
  --color-completed-foreground: var(--completed-foreground);
  --color-overdue: var(--overdue);
  --color-overdue-foreground: var(--overdue-foreground);
```

Usage pattern once pasted: `bg-category-reminders/10 text-category-reminders`,
`text-priority-high`, `bg-completed text-completed-foreground`,
`border-overdue text-overdue`, matching how `destructive` is already used in
`badge.tsx`/`button.tsx` (`bg-destructive/10 text-destructive`).

**Why `--overdue`/`--completed` are separate tokens from `--destructive`:** `--overdue`
currently equals `--destructive`'s value 1:1 — kept as its own variable so overdue styling
can diverge later (e.g., amber instead of red) without touching real error/destructive UI.
`--completed` is intentionally a *different hue family* (green) at higher chroma than
`--priority-low` (also green-ish but desaturated) so "done" and "low priority" never read as
the same color at a glance.

### 4.4 Type scale

| Token | Size / line-height | Weight | Usage |
|---|---|---|---|
| `text-xs` | 12px / 16px | 400 | Timestamps, comment counts, rollover hint captions |
| `text-sm` | 14px / 20px | 400 | Body secondary, comments, snippet text, badges |
| `text-base` | 16px / 24px | 400–500 | Task titles, form inputs (≥16px avoids iOS auto-zoom) |
| `text-lg` | 18px / 28px | 600 | Category section headers |
| `text-xl` | 20px / 28px | 600 | Screen titles ("Today", "Stats") |
| `text-2xl` | 24px / 32px | 700 | Big stat numbers (streak count, ring %) |

`--font-heading` already aliases `--font-sans` in `globals.css` — no separate display font
needed; weight does the differentiation.

### 4.5 Spacing notes

- Base unit: 4px (Tailwind default scale, unchanged).
- Screen horizontal padding: `px-4` (16px) mobile, `px-8` at `md:`+.
- Gap between `CategorySection`s: `space-y-6` (24px).
- `TaskItem` row: `min-h-12` (48px), `py-3`, checkbox tap-zone ≥44×44px (Apple HIG minimum).
- `AppNav` bottom bar height: `h-14` (56px) + `env(safe-area-inset-bottom)` padding.
- `QuickAddFab`: 56px circle, `bottom-20 right-4` (clears nav + safe area by 16px).
- `HeatmapCell`: 13px square, 2–3px gap.
- Radius scale derives from `--radius` (now 0.75rem) via existing `--radius-sm/md/lg/xl`
  formula in `globals.css` — no change to that formula, only the base value.

---

## 5. State Matrix (T2.8)

Screen × state. Every cell maps to ≥1 component from §3.

| Screen | Struck (completed) | Overdue | Offline | Empty | Loading | Error |
|---|---|---|---|---|---|---|
| **Today** | `TaskItem`: checked `Checkbox` (`bg-completed`) + `line-through text-muted-foreground` title. | `DueDateBadge` switches to `--overdue` styling + `AlertTriangle`, only when not struck. | `OfflineBanner` icon in header; `ExportButton` disabled; everything else stays optimistic/interactive. | Per-category `EmptyState` (compact: "No tasks yet — add one below") when that category has 0 tasks — the screen itself is never fully empty (3 sections always render). | `ListSkeleton` (3 rows) per `CategorySection` on first load; header/nav render instantly from app-shell cache. | `EmptyState` (error variant) replaces a section's list: "Couldn't load today's tasks" + Retry `Button`; paired `sonner` toast. |
| **Day** | Same as Today, but struck reflects `completed_date === viewed date` only (§2.2). | Same rule, evaluated against *real* today regardless of viewed date. | Same `OfflineBanner`; `DayNavigator`'s jump-to-date `Popover` shows uncached dates as disabled ("Not available offline"). | Per-category `EmptyState`; if the entire day has zero tasks across all categories, a single page-level note may replace all three ("No tasks recorded for this day"). | `ListSkeleton`, shown only if a date switch takes >150ms (avoid flicker on cached dates). | `EmptyState` (error) + `DayNavigator`'s `›` stays correctly disabled/enabled regardless of the error. |
| **Stats** | No task rows here; a `HeatmapCell` at `100%` bucket is the closest analog ("fully struck day"). | Not applicable on this screen (no per-task display) — explicitly out of scope here. | `OfflineBanner`; heatmap/streaks render from last cached snapshot with a "Updated {time}" caption. | New-user state: all `HeatmapCell`s = `no-tasks`; `StreakBadge` shows "0" + encouraging copy instead of bare zero. | `ListSkeleton` (`variant="block"`) shaped placeholders for the stat row + heatmap grid. | `EmptyState` (error) + Retry, replacing the stat row/heatmap. |
| **Search** | `SearchResultItem` shows a small inline `Check` glyph next to the title (not full strikethrough — it's a snippet, not a full row). | `SearchResultItem` shows compact `DueDateBadge` inline, only if overdue. | `SearchInput` disabled + inline "Search needs a connection"; paired with header `OfflineBanner`. | `EmptyState`: `SearchX` icon + "No results for “{query}”" + "Try a different keyword". | `ListSkeleton` (3 rows) while the debounced query is in flight. | `EmptyState` (error, compact/inline) under `SearchInput` + Retry. |
| **Login** | Not applicable. | Not applicable. | `OfflineBanner` (inline variant above the form) + `LoginForm` submit disabled — login requires a live network call, can't be served from cache. | Not applicable (form always has its fields). | `LoginForm` `state="loading"`: spinner in `Button`, inputs disabled. | `LoginForm` `state="invalid"` (inline message, §2.5) or `state="locked"` (countdown, §2.5). |

---

## 6. Accessibility Checklist (ties to the stated constraints)

- Every icon-only `Button` has `aria-label` (`ExportButton`, `QuickAddFab`, nav icons,
  password show/hide, day-nav chevrons, search clear).
- Focus-visible rings are already baked into all primitives (`focus-visible:ring-ring/50`)
  — do not override/remove them in any composite.
- Full add → complete → comment flow is keyboard-operable: `Tab` to "+ Add task" → `Enter`
  opens inline `TaskComposer` → type → `Enter` submits → `Tab` to `Checkbox` → `Space`
  toggles → `Tab`/`Enter` on the row opens `TaskDetailDialog` (focus-trapped by the `Dialog`
  primitive) → `Tab` to `CommentComposer` `Textarea` → submit via a visible `Button` (not
  Enter-to-submit, since `Textarea` needs multi-line `Enter`).
  `Escape` closes the dialog and returns focus to the triggering row.
- Strikethrough always pairs with the checked `Checkbox` state + color change — never the
  only completion signal (also true in `SearchResultItem`'s `Check` glyph).
  `TaskItem`/`SearchResultItem` completion is additionally exposed via
  `aria-label`/visually-hidden text (e.g., "Renew passport, completed"), not color alone.
- `HeatmapCell`s: `role="gridcell"` + descriptive `aria-label` (date, count, %) since color
  alone can't convey the bucket to screen-reader/colorblind users.
- Rate-limit `role="alert"` fires once on state entry, not on every countdown tick
  (avoids screen-reader spam).
- Color pairs (category, priority, completed, overdue) are chosen with distinct
  lightness/chroma, not hue alone, so they remain distinguishable for common color-vision
  deficiencies — `frontend-developer`/`accessibility-tester` should still run a contrast
  check pass (WCAG AA, 4.5:1 body text / 3:1 large text + UI components) once implemented,
  since exact contrast can't be fully verified without rendering.

---

## 7. Assumptions & Handoff Notes

Flagging decisions made without an explicit spec, for `api-designer`/`db-architect`/
`frontend-developer` awareness:

- **Task editing/deleting** isn't in the stated core loop (add → strike → comment). This
  spec adds a minimal edit surface (priority/due-date only, via `Popover`s inside
  `TaskDetailDialog`) since `PROJECT_PLAN.md` Stage 5 (T5.7) already plans an `update`
  mutation. No delete UI is specified — confirm with `project-manager` whether delete is
  in scope before `api-designer` locks the endpoint table.
- **Reorder** (T5.7/T6.9 in `PROJECT_PLAN.md`) is acknowledged in `TaskItem` (optional drag
  handle) but intentionally low-emphasis/not fully specified here, since it wasn't in this
  task's screen requirements — revisit before `frontend-developer` builds it.
- **Comment thread surfaced as a `Dialog`**, not an inline accordion, so it works with the
  installed primitive set as-is (no new accordion primitive needed) and avoids list reflow
  on mobile.
- **`--radius` bumped from `0.625rem` to `0.75rem`** — intentional, not a typo; revert is a
  one-line change if rejected.
- All oklch values are proposals tuned by eye against the existing neutral scaffold; exact
  contrast ratios should be spot-checked once rendered (see §6).
