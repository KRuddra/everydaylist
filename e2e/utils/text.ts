/** Escapes regex metacharacters so a dynamic string (e.g. a unique test task title) is safe to embed in a `RegExp`. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
