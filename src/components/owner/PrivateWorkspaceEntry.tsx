import { Component, lazy, Suspense, type ReactNode } from "react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

// One owner-only slot inside the workspace. Uses the EXISTING super-admin check (isSuperAdmin
// from the workspace context, i.e. profiles.platform_role === "super_admin"). Only after it
// passes is the entry's chunk fetched; for anyone else nothing is rendered or downloaded.
// This file deliberately holds no entry text (see docs/trades-integration.md).
// UX only: the private app enforces its own separate login.

const NavEntry = lazy(() => import("./card").then((m) => ({ default: m.N })));
const EcosystemEntry = lazy(() => import("./card").then((m) => ({ default: m.E })));

/** A chunk that fails to load renders nothing instead of breaking the workspace. */
class RenderNothingOnError extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const PrivateWorkspaceEntry = ({ variant }: { variant: "sidebar" | "ecosystem" }) => {
  const { isSuperAdmin } = useWorkspace();
  if (isSuperAdmin !== true) return null;
  const Entry = variant === "sidebar" ? NavEntry : EcosystemEntry;
  return (
    <RenderNothingOnError>
      <Suspense fallback={null}>
        <Entry />
      </Suspense>
    </RenderNothingOnError>
  );
};

export default PrivateWorkspaceEntry;
