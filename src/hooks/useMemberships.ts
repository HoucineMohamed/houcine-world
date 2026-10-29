import { useCallback, useEffect, useState } from "react";
import { fetchMemberships, fetchPlatformRole, type Membership } from "@/services/brands";

export const useMemberships = (userId: string | null) => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which user the role and memberships were loaded for. Until it matches the current user, access is still loading:
  // the session can arrive one render before this effect starts, and in that gap an owner-only page would otherwise
  // see "not a super admin" and redirect to the denied page.
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!userId) {
      setMemberships([]);
      setPlatformRole(null);
      setLoading(false);
      setLoadedFor(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [role, rows] = await Promise.all([fetchPlatformRole(userId), fetchMemberships(userId)]);
      setPlatformRole(role);
      setMemberships(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspace access");
    } finally {
      setLoading(false);
      setLoadedFor(userId);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const isSuperAdmin = platformRole === "super_admin";
  const roleForBrand = (brandId?: string) =>
    memberships.find((m) => m.brand_id === brandId)?.role ?? null;

  return { memberships, platformRole, isSuperAdmin, roleForBrand, loading: loading || loadedFor !== userId, error, reload: load };
};
