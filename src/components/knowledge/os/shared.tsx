import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { fetchAllBrands } from "@/services/brands";

// Knowledge OS: the brands a person may manage knowledge for (super admins: every brand; brand admins: theirs).
export interface KosBrand { id: string; name: string; slug: string }
export const useKosBrands = () => {
  const { memberships, isSuperAdmin, user } = useWorkspace();
  const [brands, setBrands] = useState<KosBrand[] | null>(null);
  useEffect(() => {
    const own = memberships.filter((m) => m.brand && m.role === "brand_admin").map((m) => ({ id: m.brand!.id, name: m.brand!.name, slug: m.brand!.slug }));
    if (!isSuperAdmin) { setBrands(own); return; }
    fetchAllBrands().then((rows) => setBrands((rows as unknown as KosBrand[]).map((b) => ({ id: b.id, name: b.name, slug: b.slug })))).catch(() => setBrands(own));
  }, [memberships, isSuperAdmin]);
  return { brands, isSuperAdmin, userId: user?.id ?? null };
};

export const fmtDay = (d: string | null | undefined) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const inputCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
