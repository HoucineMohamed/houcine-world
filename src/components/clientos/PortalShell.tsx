import React, { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { inputCls } from "@/components/command/ui";
import logoH from "@/assets/logo-h.png";

// The frame of the external portals (clients at /portal, partners at /partners): Houcine.world's identity, a calmer
// layout than the Workspace, and its own sign-in. Signing in proves who someone is; what they may see is decided by
// their accepted invitations (portal memberships) in the database.

export const PortalSignIn = ({ title }: { title: string }) => {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const next = location.pathname + location.search + location.hash;
  const magic = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    setBusy(false);
    setMsg(error ? { text: error.message, error: true } : { text: "A sign-in link was sent to this address. Open it on this device.", error: false });
  };
  const withPassword = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMsg({ text: error.message, error: true });
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logoH} alt="Houcine.world" className="mx-auto h-12 w-auto" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with the email address your invitation was sent to.</p>
        </div>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void (password ? withPassword() : magic()); }}>
          <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Email</span><input className={inputCls} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Password (leave empty to get a sign-in link)</span><input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <Button type="submit" className="w-full" disabled={busy || !email}>{password ? "Sign in" : "Email me a sign-in link"}</Button>
        </form>
        {msg && <p role={msg.error ? "alert" : "status"} className={cn("text-center text-sm", msg.error ? "text-destructive" : "text-muted-foreground")}>{msg.text}</p>}
      </div>
    </div>
  );
};

export interface PortalNavItem { to: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }

export const PortalShell = ({ kind, nav, children }: { kind: "client" | "partner"; nav: PortalNavItem[]; children: React.ReactNode }) => {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const title = kind === "client" ? "Client portal" : "Partner portal";
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background" role="status"><span className="h-8 w-8 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" aria-hidden="true" /><span className="sr-only">Loading…</span></div>;
  if (!user) return <PortalSignIn title={`Houcine.world ${title}`} />;
  const links = (
    <>{nav.map(({ to, label, icon: Icon, badge }) => (
      <NavLink key={to} to={to} end={to === "/portal" || to === "/partners"} onClick={() => setOpen(false)}
        className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
        {!!badge && <span className="ml-auto rounded-full bg-destructive px-2 text-xs text-destructive-foreground" aria-label={`${badge} waiting`}>{badge}</span>}
      </NavLink>))}</>
  );
  const signOut = async () => { await supabase.auth.signOut(); navigate(kind === "client" ? "/portal" : "/partners", { replace: true }); };
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
        <Link to="/" className="flex items-center gap-2 px-5 py-5"><img src={logoH} alt="Houcine.world" className="h-9 w-auto" /><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{kind === "client" ? "Client" : "Partner"}</span></Link>
        <nav aria-label={title} className="flex-1 space-y-1 px-3">{links}</nav>
        <div className="border-t border-border p-3"><Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Sign out</Button></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-card/60 px-4 py-3 backdrop-blur-sm md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="sm" aria-label={`Open the ${title.toLowerCase()} menu`}><Menu className="h-5 w-5" aria-hidden="true" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetTitle>{title}</SheetTitle><SheetDescription className="sr-only">Sections</SheetDescription>
              <nav aria-label={`${title} (menu)`} className="mt-4 space-y-1">{links}</nav>
              <Button variant="ghost" size="sm" className="mt-4 w-full justify-start" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Sign out</Button>
            </SheetContent>
          </Sheet>
          <img src={logoH} alt="Houcine.world" className="h-8 w-auto" />
          <span className="w-9" />
        </header>
        <main className="command-center mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 text-sm md:p-8">{children}</main>
      </div>
    </div>
  );
};

export const PortalHeading = ({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) => (
  <header>
    {eyebrow && <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>}
    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
    {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
  </header>
);
