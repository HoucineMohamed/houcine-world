import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const WorkspaceNotFound = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="max-w-md text-center">
      <h1 className="text-5xl font-bold text-foreground mb-2">404</h1>
      <p className="text-muted-foreground mb-6">This workspace page does not exist.</p>
      <Button asChild><Link to="/workspace">Back to my workspace</Link></Button>
    </div>
  </div>
);

export default WorkspaceNotFound;
