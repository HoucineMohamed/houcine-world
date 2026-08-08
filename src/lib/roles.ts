// Mirrors public.brand_role_rank(role text) in Postgres.
// Adding a role here + in the DB check constraint makes it appear everywhere automatically.
export const BRAND_ROLES = [
  { value: "viewer", label: "Viewer", rank: 10 },
  { value: "editor", label: "Editor", rank: 20 },
  { value: "content_manager", label: "Content Manager", rank: 30 },
  { value: "moderator", label: "Moderator", rank: 40 },
  { value: "brand_admin", label: "Brand Admin", rank: 50 },
] as const;

export type BrandRole = (typeof BRAND_ROLES)[number]["value"];

export const brandRoleRank = (role?: string | null): number =>
  BRAND_ROLES.find((r) => r.value === role)?.rank ?? 0;

export const brandRoleLabel = (role?: string | null): string =>
  BRAND_ROLES.find((r) => r.value === role)?.label ?? String(role ?? "—");

/** UX-only helper. Real enforcement lives in the RLS policies. */
export const atLeast = (role: string | null | undefined, min: BrandRole) =>
  brandRoleRank(role) >= brandRoleRank(min);
