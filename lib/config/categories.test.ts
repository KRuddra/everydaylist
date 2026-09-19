import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  CATEGORY_SLUGS,
  getCategoryLabel,
  isCategorySlug,
} from "./categories";

describe("categories config", () => {
  it("exposes exactly the three fixed categories in order", () => {
    expect(CATEGORY_SLUGS).toEqual(["reminders", "coop", "courses"]);
    expect(CATEGORIES).toHaveLength(3);
  });

  it("maps each slug to its label", () => {
    expect(getCategoryLabel("reminders")).toBe("Reminders");
    expect(getCategoryLabel("coop")).toBe("Coop");
    expect(getCategoryLabel("courses")).toBe("Courses");
  });

  it("recognises known slugs and rejects unknown ones", () => {
    expect(isCategorySlug("coop")).toBe(true);
    expect(isCategorySlug("groceries")).toBe(false);
  });
});
