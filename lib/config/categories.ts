/**
 * The fixed set of task categories.
 *
 * This is the single source of truth for categories across the app (UI,
 * validation, and the database `category` column constraint). Adding a new
 * category later is a one-line change here — no migration is required because
 * the DB stores `category` as free text validated against these slugs.
 */
export const CATEGORIES = [
  { slug: "reminders", label: "Reminders" },
  { slug: "coop", label: "Coop" },
  { slug: "courses", label: "Courses" },
] as const;

export type Category = (typeof CATEGORIES)[number];
export type CategorySlug = Category["slug"];

/** Ordered list of category slugs, e.g. for validation and iteration. */
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [
  CategorySlug,
  ...CategorySlug[],
];

const CATEGORY_BY_SLUG = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
) as Record<CategorySlug, Category>;

/** Human-readable label for a category slug. Total over the `CategorySlug` type. */
export function getCategoryLabel(slug: CategorySlug): string {
  return CATEGORY_BY_SLUG[slug].label;
}

/** Type guard: is an arbitrary string one of the known category slugs? */
export function isCategorySlug(value: string): value is CategorySlug {
  return value in CATEGORY_BY_SLUG;
}
