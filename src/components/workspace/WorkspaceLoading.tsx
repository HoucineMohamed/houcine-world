import React from "react";
import { Loader2 } from "lucide-react";

export const WorkspaceLoading = ({ label = "Loading workspace…" }: { label?: string }) => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
    <Loader2 className="w-7 h-7 animate-spin text-accent" />
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export default WorkspaceLoading;
