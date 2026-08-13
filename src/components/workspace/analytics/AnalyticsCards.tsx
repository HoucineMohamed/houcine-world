import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

/** Modular tile primitives: every analytics widget (website today, social later) uses these. */
export const MetricCard = ({
  label, value, hint, icon: Icon,
}: { label: string; value: string | number; hint?: string; icon?: LucideIcon }) => (
  <Card className="bg-card border-border">
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      {Icon && <Icon className="w-4 h-4 text-accent" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

export const Panel = ({
  title, actions, className, children,
}: { title: string; actions?: React.ReactNode; className?: string; children: React.ReactNode }) => (
  <Card className={`bg-card border-border ${className ?? ""}`}>
    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
      <CardTitle className="text-base">{title}</CardTitle>
      {actions}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <p className="text-center text-sm text-muted-foreground py-10">{children}</p>
);
