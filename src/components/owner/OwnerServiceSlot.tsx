import { Component, lazy, Suspense, type ReactNode } from "react";
import { useSession } from "@/hooks/useSession";
import { useMemberships } from "@/hooks/useMemberships";
import { SHOW_PUBLIC_TEASER } from "@/config/publicTeaser";

// Both cards are separate chunks, fetched only when they are about to render
// (see docs/trades-integration.md). This file deliberately holds no card text.
// The cards live in index.tsx files so the chunk file names stay generic
// ("index-<hash>.js"). With SHOW_PUBLIC_TEASER false the teaser import is
// removed from the build entirely.
const PrivateWorkspaceCard = lazy(() => import("./card"));
const InvitationTeaserCard = SHOW_PUBLIC_TEASER ? lazy(() => import("./teaser")) : null;

/** A chunk that fails to load renders nothing instead of breaking the page. */
class RenderNothingOnError extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * One extra slot in the Services grid. Uses the EXISTING super-admin check
 * (profiles.platform_role === "super_admin" via useMemberships). Fails closed:
 * while the session or role is loading, on any error, or for anyone else, it
 * renders nothing (or the link-less teaser when SHOW_PUBLIC_TEASER is true).
 * UX only: Houcine.Trades enforces its own login.
 */
const OwnerServiceSlot = () => {
  const { user, loading: sessionLoading } = useSession();
  const { isSuperAdmin, loading, error } = useMemberships(user?.id ?? null);

  const confirmedSuperAdmin = !sessionLoading && !loading && !error && !!user && isSuperAdmin;

  if (confirmedSuperAdmin) {
    return (
      <RenderNothingOnError>
        <Suspense fallback={null}>
          <PrivateWorkspaceCard />
        </Suspense>
      </RenderNothingOnError>
    );
  }

  if (InvitationTeaserCard && !sessionLoading && !loading) {
    return (
      <RenderNothingOnError>
        <Suspense fallback={null}>
          <InvitationTeaserCard />
        </Suspense>
      </RenderNothingOnError>
    );
  }

  return null;
};

export default OwnerServiceSlot;
