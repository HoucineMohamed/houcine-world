import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Bell, BarChart3, MessageSquare,
  Settings as SettingsIcon, LogOut, Globe, ChevronDown, KeyRound, Menu, Brain, Gauge, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabaseClient";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { useActiveBrand, clearBrandMemory } from "@/hooks/useActiveBrand";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { brandRoleLabel } from "@/lib/roles";
import logoH from "@/assets/logo-h.png";
import PrivateWorkspaceEntry from "@/components/owner/PrivateWorkspaceEntry";

const NAV = [
  { to: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "bookings", label: "Bookings", icon: CalendarDays },
  { to: "notifications", label: "Notifications", icon: Bell },
  { to: "analytics", label: "Analytics", icon: BarChart3 },
  { to: "messages", label: "Messages", icon: MessageSquare },
  { to: "command", label: "Command Center", icon: Gauge },
  { to: "settings", label: "Settings", icon: SettingsIcon },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
  }`;

const WorkspaceShell = ({ children }: { children: React.ReactNode }) => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { memberships, isSuperAdmin, user } = useWorkspace();
  const { brand, role } = useActiveBrand();
  const [unread, setUnread] = useState(0);

  const loadUnread = async () => {
    if (!brandId) return;
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .is("read_at", null);
    setUnread(count ?? 0);
  };

  useEffect(() => { loadUnread(); /* eslint-disable-next-line */ }, [brandId]);
  useRealtimeTable("notifications", brandId, loadUnread);

  const signOut = async () => {
    await supabase.auth.signOut();
    clearBrandMemory();
    navigate("/workspace/login", { replace: true });
  };

  const switchTo = (id: string) => navigate(`/workspace/${id}/dashboard`);

  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // The same links in the sidebar (md and up) and in the menu sheet (phones). The role checks are
  // the same isSuperAdmin checks as before, and the owner slot renders nothing for anyone else.
  const navItems = (
    <>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={`/workspace/${brandId}/${to}`} className={navLinkClass} onClick={closeMenu}>
          <Icon className="w-4 h-4" aria-hidden="true" />
          {label}
          {to === "notifications" && unread > 0 && (
            <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full px-2">
              {unread}
            </span>
          )}
        </NavLink>
      ))}
      {isSuperAdmin && (
        <NavLink to="/workspace/ecosystem" className={navLinkClass} onClick={closeMenu}>
          <Globe className="w-4 h-4" aria-hidden="true" /> Ecosystem
        </NavLink>
      )}
      {isSuperAdmin && (
        <NavLink to="/workspace/platform-credentials" className={navLinkClass} onClick={closeMenu}>
          <KeyRound className="w-4 h-4" aria-hidden="true" /> Platform Credentials
        </NavLink>
      )}
      {isSuperAdmin && (
        <NavLink to="/workspace/command" className={navLinkClass} onClick={closeMenu}>
          <Radar className="w-4 h-4" aria-hidden="true" /> Global Command Center
        </NavLink>
      )}
      {isSuperAdmin && (
        <NavLink to="/workspace/knowledge" className={navLinkClass} onClick={closeMenu}>
          <Brain className="w-4 h-4" aria-hidden="true" /> Knowledge Studio
        </NavLink>
      )}
      <PrivateWorkspaceEntry variant="sidebar" />
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card/40">
        <Link to="/" className="flex items-center px-5 py-5">
          <img src={logoH} alt="Houcine.world" className="h-10 w-auto" />
        </Link>
        <nav aria-label="Workspace" className="flex-1 px-3 space-y-1">
          {navItems}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden shrink-0" aria-label="Open workspace menu">
                    <Menu className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 flex flex-col">
                  <SheetTitle className="px-5 pt-5 text-base">Workspace</SheetTitle>
                  <SheetDescription className="sr-only">Pages of this workspace</SheetDescription>
                  <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {navItems}
                  </nav>
                </SheetContent>
              </Sheet>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="max-w-[60vw]">
                    <span className="truncate">{brand?.name ?? "Select brand"}</span>
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 bg-popover z-50">
                  <DropdownMenuLabel>Switch brand</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {memberships.map((m) => (
                    <DropdownMenuItem key={m.brand_id} onClick={() => switchTo(m.brand_id)}>
                      <span className="truncate">{m.brand?.name ?? m.brand_id}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{brandRoleLabel(m.role)}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/workspace/select")}>
                    All my brands…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="hidden sm:inline">{user?.email}</span>
              <span className="text-xs rounded-full border border-border px-2 py-0.5">
                {isSuperAdmin ? "Super Admin" : brandRoleLabel(role)}
              </span>
              <Button variant="ghost" size="sm" className="md:hidden" onClick={signOut} aria-label="Sign out">
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
};

export default WorkspaceShell;
