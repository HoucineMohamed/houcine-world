import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const WorkspaceDenied = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="max-w-md text-center">
      <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">Permission denied</h1>
      <p className="text-muted-foreground mb-6">
        You are signed in, but you do not have access to this brand's workspace.
        Ask a brand admin to grant you access.
      </p>
      <Button asChild><Link to="/workspace">Back to my workspace</Link></Button>
    </div>
  </div>
);

export default WorkspaceDenied;
