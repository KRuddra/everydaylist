import { cn } from "@/lib/utils";
import type { CategorySlug } from "@/lib/config/categories";

const CATEGORY_DOT_CLASS: Record<CategorySlug, string> = {
  reminders: "bg-category-reminders",
  coop: "bg-category-coop",
  courses: "bg-category-courses",
  diet: "bg-category-diet",
};

interface CategoryDotProps {
  category: CategorySlug;
  size?: "xs" | "sm";
  className?: string;
}

/** Small colored dot atom for category identity — `CategorySection` headers and `SearchResultItem`. */
export function CategoryDot({ category, size = "sm", className }: CategoryDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 rounded-full",
        size === "xs" ? "size-1.5" : "size-2.5",
        CATEGORY_DOT_CLASS[category],
        className,
      )}
    />
  );
}
