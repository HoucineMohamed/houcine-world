import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { fetchAllBrands } from "@/services/brands";
import { recentBrands } from "@/hooks/useActiveBrand";
import { brandRoleLabel } from "@/lib/roles";

interface Row { id: string; name: string; service?: string; status: string; role?: string }

const BrandSelect = () => {
  const { memberships, isSuperAdmin } = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [allBrands, setAllBrands] = useState<Row[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchAllBrands()
      .then((rows) =>
        setAllBrands(
          rows.map((b) => ({
            id: b.id, name: b.name, status: b.status,
            service: (b as { service?: { name?: string } }).service?.name ?? "—",
          }))
        )
      )
      .catch(() => setAllBrands([]));
  }, [isSuperAdmin]);

  const rows: Row[] = useMemo(() => {
    if (isSuperAdmin) return allBrands;
    const recents = recentBrands();
    return [...memberships]
      .map((m) => ({
        id: m.brand_id,
        name: m.brand?.name ?? m.brand_id,
        service: m.brand?.service?.name ?? "—",
        status: m.brand?.status ?? "active",
        role: m.role,
      }))
      .sort((a, b) => {
        const ai = recents.indexOf(a.id), bi = recents.indexOf(b.id);
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return a.name.localeCompare(b.name);
      });
  }, [memberships, isSuperAdmin, allBrands]);

  const filtered = rows.filter(
    (r) => r.name.toLowerCase().includes(query.toLowerCase()) ||
           (r.service ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    filtered.forEach((r) => {
      const key = r.service ?? "—";
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-1">Choose a brand</h1>
        <p className="text-muted-foreground mb-8">
          {isSuperAdmin ? "All brands across the ecosystem." : "Brands you have access to."}
        </p>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9" placeholder="Search brands or services…"
            value={query} onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {grouped.map(([service, items]) => (
          <section key={service} className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{service}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((b) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/workspace/${b.id}/dashboard`)}
                  className="text-left rounded-xl border border-border bg-card p-5 hover:border-accent transition-colors"
                >
                  <div className="text-lg font-semibold text-foreground">{b.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {b.status}{b.role ? ` · ${brandRoleLabel(b.role)}` : ""}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

        {!filtered.length && (
          <p className="text-muted-foreground text-sm">No brands match your search.</p>
        )}
      </div>
    </div>
  );
};

export default BrandSelect;
