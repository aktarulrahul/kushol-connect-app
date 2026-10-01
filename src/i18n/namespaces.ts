// Catalog namespace registry (02-design-system/02-solution-approach.md §1.1). One owner module per
// namespace; a module adding a namespace updates the registry there and here in the same change.
// The web repo holds the same list in its own src/i18n/namespaces.ts.
export const NAMESPACES = [
  "common", // 02
  "validation", // 02
  "errors", // 01 codes → 02 copy
  "auth", // 03
  "verification", // 03
  "hierarchy", // 04
  "chat", // 05
  "notices", // 05
  "notifications", // 06
  "settings", // 03
  "landing", // 07
  "admin", // 07
  "school", // 07
  "vendor", // 07
  "ai", // 08
  "analytics", // 09
  "tuition", // 10
  "marketplace", // 10/11
  "commerce", // 11
  "payments", // 12
  "ads", // 13
  "events", // 13
  "sync", // 14
  "ops", // 15
] as const;

export type Namespace = (typeof NAMESPACES)[number];

/** Key format (02 `01` §6): namespace, then dot-separated lower snake_case segments. */
export const KEY_PATTERN = new RegExp(`^(${NAMESPACES.join("|")})\\.[a-z0-9_]+(\\.[a-z0-9_-]+)*$`);
