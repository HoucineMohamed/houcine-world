import { createContext, useContext } from "react";
import type { Membership } from "@/services/brands";
import type { User } from "@supabase/supabase-js";

export interface WorkspaceContextValue {
  user: User | null;
  memberships: Membership[];
  platformRole: string | null;
  isSuperAdmin: boolean;
  roleForBrand: (brandId?: string) => string | null;
  reload: () => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  user: null,
  memberships: [],
  platformRole: null,
  isSuperAdmin: false,
  roleForBrand: () => null,
  reload: () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);
