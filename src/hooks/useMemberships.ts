import { useCallback, useEffect, useState } from "react";
import { fetchMemberships, fetchPlatformRole, type Membership } from "@/services/brands";

export const useMemberships = (userId: string | null) => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setMemberships([]);
      setPlatformRole(null);
      setLoading(false);
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
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const isSuperAdmin = platformRole === "super_admin";
  const roleForBrand = (brandId?: string) =>
    memberships.find((m) => m.brand_id === brandId)?.role ?? null;

  return { memberships, platformRole, isSuperAdmin, roleForBrand, loading, error, reload: load };
};
