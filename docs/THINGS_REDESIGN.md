# Everyday List → Things 3 Visual Redesign Spec

Design-only deliverable. Re-skins the existing, working app (`docs/UI_SPEC.md`) to read as a
faithful clone of **Things 3 by Cultured Code**'s visual language: warm near-white canvas,
one calm blue accent, flat borderless rows, a circular fill-and-check checkbox, and big
confident screen titles. This is a **token swap + mechanical class/structural tweaks** on
top of the *existing* component tree — no new components, no rebuild. `app/globals.css`
itself is not touched by this agent; values below are ready to paste.

All `oklch()` values below were verified against the sRGB gamut and WCAG contrast ratios by
converting through the OKLab matrices (Björn Ottosson's formulas) rather than eyeballed —
noted inline where a ratio is load-bearing.

---

## 1. Token set

### 1.1 `:root` (light) — full replacement block

Same variable names as the current `app/globals.css`. Diffed against current values in
the "changed?" column further down.

```css
:root {
  --background: oklch(0.985 0.004 90);
  --foreground: oklch(0.205 0.008 260);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.205 0.008 260);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.205 0.008 260);
  --primary: oklch(0.55 0.17 254);
  --primary-foreground: oklch(0.99 0.005 90);
  --secondary: oklch(0.955 0.005 90);
  --secondary-foreground: oklch(0.30 0.01 260);
  --muted: oklch(0.955 0.005 90);
  --muted-foreground: oklch(0.54 0.014 260);
  --accent: oklch(0.93 0.035 254);
  --accent-foreground: oklch(0.32 0.09 254);
  --destructive: oklch(0.58 0.22 25);
  --border: oklch(0.91 0.005 90);
  --input: oklch(0.91 0.005 90);
  --ring: oklch(0.55 0.17 254 / 0.5);
  --chart-1: oklch(0.60 0.10 240);  /* = category-reminders */
  --chart-2: oklch(0.68 0.12 55);   /* = category-coop */
  --chart-3: oklch(0.58 0.11 300);  /* = category-courses */
  --chart-4: oklch(0.55 0.17 254);  /* = completed (now = primary, see §5) */
  --chart-5: oklch(0.58 0.20 25);   /* = overdue */
  --radius: 0.625rem; /* was 0.75rem — Things' corners read closer to 8–10px, not 12px */

  /* Semantic extensions */
  --category-reminders: oklch(0.60 0.10 240);
  --category-coop: oklch(0.68 0.12 55);
  --category-courses: oklch(0.58 0.11 300);
  --priority-low: oklch(0.62 0.04 150);
  --priority-medium: oklch(0.74 0.13 70);
  --priority-high: oklch(0.58 0.19 25);
  --completed: oklch(0.55 0.17 254);
  --completed-foreground: oklch(0.99 0.005 90);
  --overdue: oklch(0.58 0.20 25);
  --overdue-foreground: oklch(0.99 0.005 90);

  /* New: Things' "Today" gold star */
  --today: oklch(0.79 0.16 85);
}
```

### 1.2 `.dark` — full replacement block

```css
.dark {
  --background: oklch(0.17 0.006 260);
  --foreground: oklch(0.94 0.004 90);
  --card: oklch(0.215 0.006 260);
  --card-foreground: oklch(0.94 0.004 90);
  --popover: oklch(0.215 0.006 260);
  --popover-foreground: oklch(0.94 0.004 90);
  --primary: oklch(0.68 0.15 254);
  --primary-foreground: oklch(0.99 0.005 90);
  --secondary: oklch(0.255 0.006 260);
  --secondary-foreground: oklch(0.90 0.005 90);
  --muted: oklch(0.255 0.006 260);
  --muted-foreground: oklch(0.66 0.012 260);
  --accent: oklch(0.28 0.05 254);
  --accent-foreground: oklch(0.82 0.08 254);
  --destructive: oklch(0.70 0.19 25);
  --border: oklch(1 0 0 / 8%);
  --input: oklch(1 0 0 / 12%);
  --ring: oklch(0.68 0.15 254 / 0.55);
  --chart-1: oklch(0.74 0.11 240);
  --chart-2: oklch(0.78 0.12 55);
  --chart-3: oklch(0.74 0.11 300);
  --chart-4: oklch(0.68 0.15 254);
  --chart-5: oklch(0.70 0.16 25);

  /* Semantic extensions */
  --category-reminders: oklch(0.74 0.11 240);
  --category-coop: oklch(0.78 0.12 55);
  --category-courses: oklch(0.74 0.11 300);
  --priority-low: oklch(0.68 0.03 150);
  --priority-medium: oklch(0.80 0.13 70);
  --priority-high: oklch(0.70 0.18 25);
  --completed: oklch(0.68 0.15 254);
  --completed-foreground: oklch(0.99 0.005 90);
  --overdue: oklch(0.70 0.16 25);
  --overdue-foreground: oklch(0.99 0.005 90);

  --today: oklch(0.82 0.15 85);
}
```

`--radius` is not re-declared in `.dark` in the current file (it's a `:root`-only variable
that cascades) — leave that structure alone.

### 1.3 `@theme inline` — only one new line needed

Everything else (`--color-category-*`, `--color-priority-*`, `--color-completed*`,
`--color-overdue*`) already exists and needs no change — the values just flow through.
Append one line for the new star token:

```css
  --color-today: var(--today);
```

This unlocks `text-today` / `fill-today` / `border-today` utilities, same pattern as
`--color-completed` etc.

### 1.4 What actually changed, and why

| Token | Old | New | Why |
|---|---|---|---|
| `--primary` / `--ring` | `oklch(0.53 0.13 224)` — a teal-leaning blue | `oklch(0.55 0.17 254)` (≈ `#0C71D1`) | This **is** the redesign's headline change: hue moved from 224 (teal-blue) to 254 (Things' true blue, ≈ real Things `#1482FD` family), chroma raised from 0.13→0.17 for a more confident, saturated accent while staying "restrained" (not 0.2+). L=0.55 was chosen (not the brief's midpoint ~0.58) specifically so it passes **4.5:1** both as white-on-fill (buttons/checkbox) *and* as text-on-background (links, active nav label) — see §5 accessibility notes. |
| `--completed` / `--chart-4` | `oklch(0.62 0.17 150)` (green) | `oklch(0.55 0.17 254)` — **same value as `--primary`** | Deliberate divergence from the generic "green = done" convention. Things has no green anywhere; it signals completion with its one blue accent everywhere (checkbox fill, ring, activity). Aliasing `--completed` to the same blue means `TaskItem`'s checked-checkbox override, `ProgressRing`'s stroke, `HeatmapCell`'s green buckets, and `SearchResultItem`'s check glyph **all become Things-blue with zero component code changes** — a pure token-level cascade. See §4 before/after. |
| `--radius` | `0.75rem` (12px) | `0.625rem` (10px) | Reverts to the scaffold's original value. Things' corner radii read closer to 8–10px (`--radius-lg` = 10px, `--radius-md` = 8px under the existing `calc()` formula) than the previous spec's softer 12px. Dialog/Card outer shells use `rounded-xl` → 14px, still calm for a modal-sized surface. |
| `--background` | `oklch(0.99 0.003 95)` | `oklch(0.985 0.004 90)` | Negligible nudge — the existing warm off-white canvas was already right for Things; not worth re-inventing. |
| `--foreground` | `oklch(0.22 0.01 260)` | `oklch(0.205 0.008 260)` | Slightly darker/inkier for the new large bold titles to read with real authority. |
| `--muted` (hover highlight fuel) | `oklch(0.96 0.006 95)` | `oklch(0.955 0.005 90)` | Same family, paired with `TaskItem`'s hover opacity going from `/60` to full-strength (§2) for a clearly visible (not washed-out) row highlight, matching Things' selection fill. |
| `--accent` / `--accent-foreground` | hue 224 (old teal-blue) | hue 254 (matches new primary) | Kept as the "soft blue-tinted fill" role (active desktop nav pill, `<mark>` highlight) — just re-hued to match the new primary so the whole app reads as one consistent blue, not two. |
| `--category-*` | chroma 0.14–0.17 | chroma 0.10–00.12 | Desaturated across the board — "restrained chroma, Things is calm" applies to category dots too, not just the accent. Hues kept close to original so existing visual identity (blue/orange/purple) isn't lost, just quieted. |
| `--priority-medium` | amber, hue 85 | amber-orange, hue 70 | Shifted toward Things' actual flag orange rather than a yellow-gold (freed up hue 85 exclusively for the new `--today` star so the two never look similar). |
| `--overdue` / `--destructive` | identical value (both `oklch(0.577 0.245 27.325)`) | distinct chroma (0.20 vs 0.22 light; 0.16 vs 0.19 dark) | Kept as separate tokens per the original rationale, now genuinely differentiated (not just aliased) so "task is overdue" and "you're about to delete something" don't read as the exact same red. |
| `--today` (new) | — | `oklch(0.79 0.16 85)` / dark `oklch(0.82 0.15 85)` | Things' signature warm gold star for the Today list — see AppNav in §2. |

Update the two hardcoded `themeColor` values in `app/layout.tsx`'s `viewport` export to match
(these can't be `var()` references — they're literal meta-tag colors):
`oklch(0.985 0.004 90)` (light) / `oklch(0.17 0.006 260)` (dark).

### 1.5 Typography value (recommended, highest-leverage font change)

The app currently loads Geist Sans via `next/font/google` as `--font-sans`. Geist is clean
but reads as a distinct "product sans" — not SF Pro. Since this is an Apple-ecosystem clone
running as a PWA (often installed to an iPhone home screen), the single highest-fidelity
typography change is switching the font stack to prefer the real system font on Apple
devices, falling back to Geist elsewhere:

```css
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
  var(--font-geist-sans), "Segoe UI", Roboto, ui-sans-serif, system-ui, sans-serif;
```

This is a bigger authenticity win than any font-size tweak below — on an actual iPhone/Mac
this renders in genuine SF Pro, which Geist can only approximate. Flagging as recommended
but optional since it's a font-stack change in `app/globals.css`'s `@theme inline` block,
not a pure color-token swap.

---

## 2. Per-component restyle table

Ordered by visual impact. "Cascade-only" means the component needs **no class/structural
edit** — the new tokens alone produce the Things look.

### `components/ui/checkbox.tsx` — the signature element

| Aspect | Current | New |
|---|---|---|
| Shape | `rounded-[4px]` (square) | `rounded-full` (circle) |
| Size | `size-4` (16px) | `size-5` (20px) |
| Border | `border border-input` (1px) | `border-[1.5px] border-muted-foreground/45` — the hairline `--border`/`--input` token is tuned for near-invisible separators elsewhere; the unchecked ring needs to stay legible as a tap target, so pull from `--muted-foreground` at reduced opacity instead. |
| Checked fill | `data-checked:border-primary data-checked:bg-primary` (already present) | **No change** — once `--primary` = Things blue (§1), this line already produces the exact "circle fills solid blue" behavior. |
| Check glyph | `<CheckIcon />` at `[&>svg]:size-3.5`, default stroke-width 2 | `[&>svg]:size-3 [&>svg]:stroke-[3]` — a slightly smaller, bolder-stroked check reads more like Things' confident checkmark than a thin default glyph. |
| Transition | `transition-colors` (Tailwind default duration = 150ms already) | No change needed — already the "~150ms" the brief asks for. Optionally add `[&_svg]:transition-transform data-checked:[&_svg]:animate-in data-checked:[&_svg]:zoom-in-50` for a subtle pop-in on the check mark (nice-to-have, not required). |
| Focus ring | `focus-visible:ring-3 focus-visible:ring-ring/50` | No change — keep, still correct with the re-hued `--ring`. |
| Disabled/invalid states | unchanged | No change — token cascade only. |

Result class string for the root:
```
peer relative flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-muted-foreground/45 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground
```
(drop the `dark:bg-input/30` fill-on-empty and the aria-invalid red-ring block only if they
visually clash with the new thin ring; otherwise keep as-is — they're orthogonal to the
shape change.)

### `components/task/TaskItem.tsx` — the row

| Aspect | Current | New |
|---|---|---|
| Row wrapper | `flex w-full items-stretch gap-1 rounded-lg transition-colors hover:bg-muted/60` | `flex w-full items-stretch gap-1 rounded-lg transition-colors hover:bg-muted` — full-strength hover fill (not `/60`), radius auto-updates to 10px via the new `--radius`. Already flat/borderless — **no other change needed here**, this file was already following Things' "no card chrome" rule. |
| Checkbox tap zone | `flex shrink-0 items-center py-3 pr-2 pl-3` | `flex shrink-0 items-center py-3.5 pr-2 pl-4` — roomier, matches the taller row. |
| Row min-height / padding | `min-h-12 ... py-3` on the title button | `min-h-14 ... py-3.5` (56px rows instead of 48px) — Things rows are noticeably roomy. |
| Checked-state override | `struck && "border-completed bg-completed text-completed-foreground data-checked:border-completed data-checked:bg-completed"` | **Leave as-is** (zero-diff) — since `--completed` now equals `--primary`'s value, this already renders Things blue. Optional follow-up cleanup once the redesign lands: delete this override entirely, since `checkbox.tsx`'s own `data-checked:bg-primary` now produces the identical result — not required for correctness. |
| Title | `line-clamp-2 text-base` | Add explicit `font-normal` (make the "titles are regular weight, not medium" intent explicit in code, even though it's the default today). |
| Struck title | `text-muted-foreground line-through` | No change — already correctly pairs with the checkbox fill+check (3-way signal: fill, glyph, text color/line). |
| Comment icon | `MessageCircle` muted → `text-foreground` when count > 0 | No change — cascades. |

### `components/task/CategorySection.tsx` — section header

| Aspect | Current | New |
|---|---|---|
| Heading | `text-lg font-semibold` (18px) + `CategoryDot` + label | `text-base font-semibold` (16px) — Things' project/area headings are medium-bold but not oversized; the *screen* title (Today/Stats/Search) should be the visually dominant text, not the section heading. |
| Count indicator | `<Badge variant="secondary" className="font-normal">{n}/{n}</Badge>` (pill chip) | Replace the `Badge` with a plain `<span className="text-xs font-normal text-muted-foreground">{completedCount} / {tasks.length}</span>` — Things does not put a pill/chip next to its list headings; it's plain small type. This is a structural (JSX) change, not just a class swap. |
| Section gap (parent page) | `gap-6` (24px) between `CategorySection`s | `gap-8` (32px) — airier separation between categories. |
| "+ Add task" row | `Button variant="ghost" size="sm"` muted | Add `hover:text-primary` so the add-row tints Things blue on hover/focus (currently only gets the generic `hover:bg-muted hover:text-foreground` from the ghost variant). |
| Empty-category copy | `text-sm text-muted-foreground` "No tasks yet — add one below" | No change — already calm/quiet, matches Things' tone. |

### `components/task/CategoryDot.tsx`

| Aspect | Current | New |
|---|---|---|
| `size="sm"` | `size-2` (8px) | `size-2.5` (10px) — slightly bolder presence since it's now the *only* color cue in the header (no more colored badge chrome nearby). |
| `size="xs"` | `size-1.5` (6px) | No change (used in compact `SearchResultItem`). |
| Color mapping | `bg-category-*` | No change — cascades to the new desaturated category tokens. |

### `components/task/TaskComposer.tsx`

| Aspect | Current | New |
|---|---|---|
| Input | `Input` default (`h-8`) | `h-9` — matches the roomier row height it's replacing inline. |
| Dialog-mode category `Tabs` | active tab: `data-active:bg-background data-active:text-foreground` (neutral) | Add `data-active:text-primary` to `TabsTrigger` so the selected category tab picks up Things blue, not just a neutral "selected" gray. |
| Placeholder copy | "Add a task…" | No change. |

### `components/task/PriorityFlag.tsx` / `components/task/DueDateBadge.tsx`

Cascade-only for color (`text-priority-*`, `border-overdue`/`text-overdue`) — zero class
changes. One icon swap for fidelity: `DueDateBadge`'s default (non-overdue) icon
`CalendarClock` → plain `Calendar` (Things' due-date glyph in list rows is a simple
calendar, not a calendar-with-clock). Keep `AlertTriangle` for the overdue state.

### `components/task/TaskDetailDialog.tsx`

Cascade-only for the dialog chrome (`bg-popover`, `ring-1 ring-foreground/10`, `rounded-xl`
→ now 14px) — already borderless-card-style, already close to a Things inspector popover.
One optional enhancement: give the Priority/Due-date trigger `Button`s a "set" visual state
— when `task.priority`/`task.dueDate` is non-null, add `text-primary border-primary/30
bg-accent` to the trigger so an active value reads as a filled Things-blue chip instead of a
plain outline button in both the "set" and "unset" states. `Button variant="destructive"`
(delete) — cascade-only, now uses the re-tuned `--destructive` red.

### `components/task/CommentThread.tsx`

Cascade-only — `bg-muted` bubble automatically becomes the new warm neutral, `rounded-lg`
automatically becomes 10px.

### `components/shell/AppNav.tsx` — nav treatment (second-highest-impact change)

| Aspect | Current | New |
|---|---|---|
| Today icon | `ListChecks` | `Star` (lucide-react) — Things' literal gold star for its Today list. When active: `text-today fill-today/25` (fill uses `--color-today` at reduced opacity for a filled-star look without a flat solid glyph); when inactive: plain `text-muted-foreground` outline star. |
| History / Stats / Search icons | `History`, `BarChart3`, `Search` | No change — already reasonable choices. |
| Bottom tab bar (mobile) active state | `font-medium text-primary` (color/weight only, no pill) | No change — matches Things' iOS tab bar (simple tint change, no background pill on the bottom bar). |
| **Desktop sidebar** active state | Same as mobile — color/weight only, **no background fill** | This is the gap vs. the brief. Add a rounded blue-tinted pill behind the active icon+label at `md:`+: |

```tsx
className={cn(
  "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground md:flex-none md:gap-1 md:mx-2 md:rounded-xl md:px-3 md:py-2.5",
  item.active && "font-medium text-primary hover:text-primary md:bg-accent",
)}
```
This gives the desktop rail a soft rounded blue-tinted fill behind the active item, icon
and label both tinted `text-primary`, exactly matching Things' macOS sidebar treatment —
`--accent` was specifically re-hued in §1 to serve this role.

### `components/shell/OfflineBanner.tsx` / `components/shell/ExportButton.tsx`

Cascade-only — `text-destructive` (offline) and neutral ghost icon button pick up the new
tokens automatically; no structural change.

### `components/shell/DayNavigator.tsx`

| Aspect | Current | New |
|---|---|---|
| Center date label | `Button variant="ghost" size="sm" className="gap-1.5 font-medium"` | `font-semibold` — slightly firmer weight to match the new bold-title language used elsewhere. |
| Chevron buttons | `Button variant="ghost" size="icon"` | No change. |

### `app/(app)/layout.tsx` — header shell

| Aspect | Current | New |
|---|---|---|
| App name | `<h1 className="text-lg font-semibold">Everyday List</h1>` | `<h1 className="text-sm font-medium text-muted-foreground">Everyday List</h1>` — de-emphasize the app-name utility label; Things' own chrome doesn't foreground branding in the toolbar. The *real* big title becomes each screen's own heading (see below). |
| Header bottom border | `border-b border-border` | `border-b border-border/60` — soften toward "near-invisible," while keeping enough separation that content doesn't visually collide with the sticky header while scrolling. |
| Header background | `bg-background/95 backdrop-blur-sm` | No change — this floating-blur treatment is already correctly Things/iOS-native. |

### Screen titles (`app/(app)/page.tsx`, `stats/page.tsx`, `search/page.tsx` — via a shared class, not a new component)

| Screen | Current | New |
|---|---|---|
| Today `<h2>` | `text-xl font-semibold` (20px/28, 600) "{date} · Today" | `text-[28px] leading-9 font-bold tracking-tight` — a genuine Things-style large title. Keep the `ProgressRing` sibling on the same row. |
| Stats `<h2>` | `text-xl font-semibold` "Stats" | Same new large-title treatment. |
| Search (no visible `<h2>`, `SearchInput` is the de facto header) | — | No change — search intentionally leads with the input field, matching Things' search overlay. |
| "Activity" sub-heading (Stats) | `text-lg font-semibold` (18px) | Keep — this is a *section* heading under the big title, same tier as `CategorySection`'s 16px heading; bump down from 18px to `text-base font-semibold` for consistency with the `CategorySection` change above. |

### `components/stats/ProgressRing.tsx`

Cascade-only — `stroke="var(--completed)"` (progress arc) and `stroke="var(--muted)"`
(track) automatically become "Things blue arc on a pale warm-gray track" once §1's token
values land. No component change.

### `components/stats/StreakBadge.tsx`

| Aspect | Current | New |
|---|---|---|
| Flame icon color (current streak, count > 0) | `text-priority-high` (red) | `text-today` (gold) — a streak is a celebratory/positive metric; the alarm-red priority color is the wrong semantic borrow. Reassign to the warm gold star token instead. |
| `Card` wrapper | `ring-1 ring-foreground/10` | `ring-1 ring-border` (softer, matches the new hairline `--border` rather than a foreground-derived ring) — this is a `card.tsx` primitive-level change (see below), affects `LoginForm`'s `Card` too. |

### `components/ui/card.tsx` (primitive, affects `StreakBadge`, Stats stat-row `Card`, `LoginForm`)

`ring-1 ring-foreground/10` → `ring-1 ring-border` — calmer, ties the card boundary to the
same hairline token used for separators elsewhere instead of a foreground-derived tint.

### `components/stats/CalendarHeatmap.tsx` / `components/stats/HeatmapCell.tsx`

Cascade-only — `bg-completed/30`, `bg-completed/65`, `bg-completed` (partial/100% buckets)
automatically become a Things-blue alpha ramp instead of green; `no-tasks` dashed outline
and `0%` `bg-muted` are unaffected. No component change.

### `components/auth/LoginForm.tsx`

| Aspect | Current | New |
|---|---|---|
| `CardTitle` "Everyday List" | `text-center text-xl` (20px) | `text-center text-2xl font-bold` (24px, bold) — a confident lock-screen title matching the new large-title language. |
| `Button` "Unlock" | `variant="default"` | No change — cascades to Things blue automatically. |
| Eye/EyeOff toggle | ghost icon button | No change. |
| `Card` ring | (see `card.tsx` above) | Cascade via primitive change. |

### `components/shared/EmptyState.tsx`

| Aspect | Current | New |
|---|---|---|
| Icon | `size-8 text-muted-foreground` | `size-10 text-muted-foreground/70` — slightly larger, slightly softer; reads calmer, less "error-y" for the non-error case. |
| Title | `text-sm font-medium` | `text-base font-medium text-foreground` — matches the bumped-up type scale. |
| Vertical padding | `py-8` | `py-12` — more breathing room, consistent with "generous whitespace" principle. |
| Default empty icon | `Inbox` | No change required; optional: a warmer icon (e.g. `Sparkles`) for the genuinely-empty (non-error) states specifically, to lean into "Things has friendly, calm empty states" — flagged as optional polish, not required. |

### `components/shared/ListSkeleton.tsx`

`h-12` shimmer rows → `h-14` — matches `TaskItem`'s new 56px row height so the loading
state doesn't visibly shift/resize once real content paints.

### `components/search/SearchInput.tsx` / `components/search/SearchResultItem.tsx`

Cascade-only: `<mark>`'s `bg-accent text-accent-foreground` becomes a pale Things-blue
highlight; the inline `Check` glyph (`text-completed`) becomes Things blue. One class
tweak for row-hover consistency with `TaskItem`: `hover:bg-muted/60` → `hover:bg-muted`.

---

## 3. Type scale & spacing

### 3.1 Type scale (final, supersedes `docs/UI_SPEC.md` §4.4 where it differs)

| Token / class | Size / line-height | Weight | Usage |
|---|---|---|---|
| `text-xs` | 12px / 16px | 400 | Timestamps, comment counts, rollover-hint captions, category counts |
| `text-sm` | 14px / 20px | 400 | Body secondary, comments, snippet text |
| `text-base` | 16px / 24px | 400 | Task titles, form inputs |
| `text-base font-semibold` | 16px / 24px | 600 | Category/section headers (`CategorySection`, "Activity") — **down from 18px** |
| `text-2xl font-bold` | 24px / 32px | 700 | Lock-screen title (`LoginForm`), big stat numbers |
| `text-[28px] leading-9 font-bold tracking-tight` | 28px / 36px | 700 | **New** — screen titles ("Today", "Stats") — this is the "big bold friendly heading" Things is known for; previously 20px/semibold, the single biggest typographic change in this redesign |

Everything not listed (badges, buttons) inherits Tailwind defaults unchanged from the
current primitives.

### 3.2 Spacing (deltas from `docs/UI_SPEC.md` §4.5)

| Element | Old | New |
|---|---|---|
| Checkbox size | 16px (`size-4`) | **20px (`size-5`)** |
| Checkbox border | 1px | **1.5px** |
| `TaskItem` row min-height | 48px (`min-h-12`) | **56px (`min-h-14`)** |
| `TaskItem` row vertical padding | `py-3` | **`py-3.5`** |
| Gap between `CategorySection`s | `space-y-6` (24px) | **`space-y-8` (32px)** |
| `EmptyState` vertical padding | `py-8` | **`py-12`** |
| `--radius` base | 0.75rem (12px) | **0.625rem (10px)** → `--radius-lg`=10px, `--radius-md`=8px, `--radius-xl`=14px |
| Everything else in UI_SPEC §4.5 (screen padding `px-4`/`px-8`, `AppNav` `h-14`, `QuickAddFab` 56px/`bottom-20 right-4`, `HeatmapCell` 13px) | — | **Unchanged** — already correctly Things-proportioned or a bespoke feature (heatmap) with no Things equivalent to match against. |

---

## 4. Before/after — the four highest-impact changes

**1. The checkbox.** Before: a 16px square with a 1px flat gray border, filling to a green
`--completed` square with a thin checkmark when checked. After: a 20px **circle** with a
1.5px muted ring, filling solid **Things blue** with a bold white checkmark on check — the
single element most responsible for an app "feeling like Things." Achieved via `rounded-lg
→ rounded-full`, `size-4 → size-5`, and the `--completed` token now equaling `--primary`, so
the existing checked-state logic in both `checkbox.tsx` and `TaskItem.tsx` needs **no
rewiring** — the color change is 100% token-driven.

**2. Palette — from teal-blue-on-cool-white to warm-white-with-Things-blue.** Before:
`--primary` sat at hue 224 (a teal-leaning blue) with lower chroma (0.13), paired with a
cool-neutral background. After: hue 254, chroma 0.17 — genuinely close to Things' real
accent (`#1482FD` family) — against the same warm off-white canvas, now slightly warmer/
deeper (`--foreground` inkier) so the new large titles have real presence. Every other
"done"/progress surface (checkbox, `ProgressRing`, heatmap, search check glyph) inherits
this same blue via the `--completed` alias, so the whole app reads as **one** calm accent
color instead of blue-for-brand + green-for-done — exactly Things' restrained palette
philosophy.

**3. The task row.** Before/after here is subtler than it looks: `TaskItem` was *already*
flat and borderless (no card/shadow), which is the hard part of a Things row to get right.
The changes are refinements, not a rebuild: hover highlight goes from a washed-out `/60`
opacity to a clearly visible full-strength `bg-muted` fill (Things' selection highlight is
confidently visible, not a faint wash), row height grows from 48px to 56px for roomier
thumb-friendly spacing, and the checkbox tap-zone padding grows to match. The net effect is
a calmer, airier list without touching the row's fundamental (correct) flat structure.

**4. Headers.** Before: the app-name ("Everyday List," 18px semibold) was the most
visually dominant text in the header, and each screen's own title ("Today," "Stats") was a
comparatively modest 20px. After: inverted — the app name shrinks to a quiet 14px
muted-foreground utility label, and each screen's own title grows to a genuine **28px bold**
large title, which is the specific typographic signature that makes Things' "Today" screen
feel confident and editorial rather than utilitarian. Category section headers also step
down from 18px to 16px so there's a clear three-tier hierarchy (28px screen title → 16px
section header → 16px/14px row content) instead of the previous two adjacent sizes (20px/
18px) that competed with each other.

---

## 5. Accessibility caveats

- **Primary blue contrast is the one value in this spec that was solved by search, not by
  eye.** `oklch(0.55 0.17 254)` (`#0C71D1`) was chosen specifically because it clears
  **4.5:1 in both directions**: as white text/icon on a blue fill (checkbox check, filled
  `Button` labels) it measures **~4.9:1**, and as blue text/icon directly on the light
  `--background` (links, active nav label, active tab) it measures **~4.7:1**. Both exceed
  WCAG AA body-text (4.5:1). This sits at the lower edge of the brief's suggested L range
  (0.55–0.62) rather than the midpoint — deliberately, to keep both contrast directions
  passing rather than choosing the single most "Things-vivid" value and failing one of them.
- **Dark-mode primary is a known, explicit trade-off.** `oklch(0.68 0.15 254)` was chosen to
  read as a clearly legible, vivid blue **against the dark background** (text/icon use:
  ~6.6:1, comfortably passing), but white label text *on top of* that same blue fill (e.g.
  the "Unlock"/"Add" filled buttons in dark mode) only measures **~2.9:1** — below AA's
  4.5:1 body-text threshold, though it does clear the 3:1 "large text/UI component"
  threshold. This mirrors Apple's own dark-mode `systemBlue` filled-button treatment (also
  not strictly AA-compliant at small sizes) and was accepted here rather than darkening the
  accent and losing dark-mode vividness. If strict AA-for-all-text is a hard requirement,
  the mitigation is to bump filled-button label text to `font-semibold` at ≥16px (qualifies
  as "large text," passes at 3:1) rather than re-darkening `--primary`.
- **Completion is still never signaled by color alone.** The checkbox change (circle + solid
  fill + white checkmark glyph) plus the struck title (`line-through` + `text-muted-
  foreground`) plus each row's `aria-label` appending "completed" (already implemented in
  `TaskItem.tsx`/`SearchResultItem.tsx`) together give three independent non-color signals —
  this redesign doesn't remove or weaken any of them, it only changes the fill's hue.
- **Focus-visible rings are untouched.** Every primitive's `focus-visible:ring-3
  focus-visible:ring-ring/50` treatment is preserved as-is; only `--ring`'s hue changes to
  match the new primary. Do not drop these when applying the class changes in §2.
- **`--muted-foreground` (secondary text, captions, separators)** was re-verified at the new
  background value: `oklch(0.54 0.014 260)` on `oklch(0.985 0.004 90)` measures **~4.8:1**,
  passing AA for the small caption/badge text it's used on.
- **Category dot colors are decorative, not load-bearing for meaning** — category identity
  is also conveyed by the adjacent text label ("Reminders"/"Coop"/"Courses"), so the reduced
  chroma in §1 (calmer dots) doesn't reduce accessibility, only saturation.
- **`HeatmapCell`'s four-bucket system already avoids color-only encoding** (dashed outline
  for `no-tasks`, distinct fill for `0%` vs. the blue ramp for `partial`/`100%`) and needs no
  change here — flagging only that the ramp's hue moves from green to blue (§1), which does
  not affect the bucket's non-color differentiators.
