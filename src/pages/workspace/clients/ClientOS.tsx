import React, { createContext, Suspense, useContext, useEffect, useMemo, useState } from "react";
import { Link, Navigate, NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Gauge, Users, Handshake, FolderKanban, FileSignature, ScrollText, PackageCheck, Inbox, MessagesSquare, LineChart, Settings, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { fetchAllBrands } from "@/services/brands";
import { clientOsApi, type SearchHit } from "@/services/clientOs";
import { inputCls } from "@/components/command/ui";

// Houcine.world Client OS, internal side (docs/client-os.md): relationships, external access, projects, proposals,
// contracts, deliverables, requests, communication and analytics. Super admins see every brand (with a brand filter);
// brand admins see the brands they administer. The database decides every read and write; this page only chooses
// what to ask for.

export interface ClientOsBrand { id: string; name: string }
interface Ctx {
  brands: ClientOsBrand[];
  /** The brands in view: null = every brand (super admin, no filter). */
  brandIds: string[] | null;
  scopeBrands: ClientOsBrand[];
  isSuperAdmin: boolean;
  userId: string | null;
  link: (section: string, extra?: Record<string, string>) => string;
  brandName: (id: string | null | undefined) => string;
}
const ClientOsContext = createContext<Ctx | null>(null);
export const useClientOs = () => {
  const v = useContext(ClientOsContext);
  if (!v) throw new Error("useClientOs outside Client OS");
  return v;
};

const load = (name: string) => React.lazy(() => import(`../../../components/clientos/internal/${name}.tsx`));
const SECTIONS = [
  { id: "", label: "Overview", icon: Gauge, Component: load("Overview") },
  { id: "clients", label: "Clients", icon: Users, Component: load("Relationships") },
  { id: "partners", label: "Partners", icon: Handshake, Component: load("Relationships") },
  { id: "projects", label: "Projects", icon: FolderKanban, Component: load("Projects") },
  { id: "proposals", label: "Proposals", icon: FileSignature, Component: load("Proposals") },
  { id: "contracts", label: "Contracts", icon: ScrollText, Component: load("Contracts") },
  { id: "deliverables", label: "Deliverables", icon: PackageCheck, Component: load("Deliverables") },
  { id: "requests", label: "Requests", icon: Inbox, Component: load("Requests") },
  { id: "communications", label: "Communications", icon: MessagesSquare, Component: load("Communications") },
  { id: "analytics", label: "Analytics", icon: LineChart, Component: load("Analytics") },
  { id: "settings", label: "Settings", icon: Settings, Component: load("SettingsPage") },
] as const;

const HIT_SECTION: Record<string, string> = { client: "clients", partner: "partners", organization: "clients", project: "projects", proposal: "proposals", contract: "contracts", deliverable: "deliverables", request: "requests" };

const SearchBox = ({ link }: { link: Ctx["link"] }) => {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (q.trim().length < 2) { setHits(null); return; }
    const t = setTimeout(() => { clientOsApi.search(q, null, 10, page * 10).then(setHits).catch(() => setHits([])); }, 250);
    return () => clearTimeout(t);
  }, [q, page]);
  return (
    <div className="relative w-full sm:w-72">
      <label className="sr-only" htmlFor="cos-search">Search Client OS</label>
      <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <input id="cos-search" className={cn(inputCls, "pl-8")} placeholder="Search clients, projects, proposals…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
      {hits && (
        <div className="absolute right-0 z-20 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-lg" role="listbox" aria-label="Search results">
          {hits.length === 0 ? <p className="p-2 text-xs text-muted-foreground">Nothing you may see matches.</p> : hits.map((h) => (
            <Link key={`${h.kind}:${h.id}:${h.brand_id}`} role="option" to={link(HIT_SECTION[h.kind] ?? "", { id: h.id })} onClick={() => setQ("")} className="block rounded px-2 py-1.5 text-sm hover:bg-muted">
              <span className="font-medium">{h.title}</span> <span className="text-xs text-muted-foreground">· {h.kind}{h.subtitle ? ` · ${h.subtitle}` : ""}</span>
            </Link>
          ))}
          <div className="flex justify-between p-1 text-xs">
            <button type="button" className="underline disabled:opacity-40" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button type="button" className="underline disabled:opacity-40" disabled={(hits?.length ?? 0) < 10} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

const ClientOS = () => {
  const { memberships, isSuperAdmin, user } = useWorkspace();
  const { section = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [all, setAll] = useState<ClientOsBrand[] | null>(null);

  useEffect(() => {
    const own = memberships.filter((m) => m.brand && m.role === "brand_admin").map((m) => ({ id: m.brand!.id, name: m.brand!.name }));
    if (!isSuperAdmin) return setAll(own);
    fetchAllBrands().then((rows) => setAll((rows as unknown as { id: string; name: string }[]).map((b) => ({ id: b.id, name: b.name })))).catch(() => setAll(own));
  }, [memberships, isSuperAdmin]);

  const brands = useMemo(() => all ?? [], [all]);
  const filter = params.get("brand");
  const scopeBrands = filter ? brands.filter((b) => b.id === filter) : brands;
  const brandIds = filter ? [filter] : isSuperAdmin ? null : brands.map((b) => b.id);
  const link = (s: string, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams();
    if (filter) q.set("brand", filter);
    for (const [k, v] of Object.entries(extra)) q.set(k, v);
    const qs = q.toString();
    return `/workspace/clients${s ? `/${s}` : ""}${qs ? `?${qs}` : ""}`;
  };
  const current = SECTIONS.find((s) => s.id === section);
  if (!current) return <Navigate to={link("")} replace />;
  if (all !== null && !isSuperAdmin && brands.length === 0) return <Navigate to="/workspace/denied" replace />;
  const Component = current.Component;
  const ctx: Ctx = { brands, brandIds, scopeBrands, isSuperAdmin, userId: user?.id ?? null, link, brandName: (id) => (id ? brands.find((b) => b.id === id)?.name ?? "Another brand" : "Global") };

  return (
    <ClientOsContext.Provider value={ctx}>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border px-4 py-3 md:px-8"><Link to="/workspace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Workspace</Link></div>
        <main className="p-4 md:p-8">
          <div className="command-center mx-auto w-full max-w-[1500px] space-y-5 text-sm">
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Houcine.world · Client OS</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{filter ? scopeBrands[0]?.name ?? "Brand" : isSuperAdmin ? "All brands" : brands.map((b) => b.name).join(", ") || "Your brands"}</h1>
                <p className="mt-1 text-xs text-muted-foreground">Clients, partners and service delivery · {isSuperAdmin ? "super admin view" : "brands you administer"}</p>
              </div>
              <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
                <SearchBox link={link} />
                {brands.length > 1 && (
                  <label className="text-xs"><span className="sr-only">Brand</span>
                    <select aria-label="Brand filter" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={filter ?? ""} onChange={(e) => navigate(`/workspace/clients${section ? `/${section}` : ""}${e.target.value ? `?brand=${e.target.value}` : ""}`)}>
                      <option value="">{isSuperAdmin ? "All brands" : "All my brands"}</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </header>
            <nav aria-label="Client OS" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <NavLink key={id || "overview"} to={link(id)} end className={({ isActive }) => cn("flex shrink-0 items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isActive ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                  <Icon className="h-4 w-4" aria-hidden="true" /> {label}
                </NavLink>
              ))}
            </nav>
            {all === null ? <p className="text-muted-foreground" role="status">Loading…</p> : (
              <Suspense fallback={<p className="text-muted-foreground" role="status">Loading…</p>}><Component key={section} /></Suspense>
            )}
          </div>
        </main>
      </div>
    </ClientOsContext.Provider>
  );
};

export default ClientOS;
