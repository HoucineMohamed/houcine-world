import { createContext, useContext } from "react";

export interface ActiveBrand {
  id: string;
  name: string;
  slug: string;
  status: string;
  service?: { name: string; slug: string } | null;
}

export interface ActiveBrandContextValue {
  brand: ActiveBrand | null;
  role: string | null;
  isSuperAdmin: boolean;
  reload: () => void;
}

export const ActiveBrandContext = createContext<ActiveBrandContextValue>({
  brand: null,
  role: null,
  isSuperAdmin: false,
  reload: () => {},
});

export const useActiveBrand = () => useContext(ActiveBrandContext);

const KEY = "workspace:lastBrandId";
export const rememberBrand = (id: string) => {
  try {
    const prev = JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
    const next = [id, ...prev.filter((p) => p !== id)].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* ignore */ }
};
export const recentBrands = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as string[]; } catch { return []; }
};
export const clearBrandMemory = () => localStorage.removeItem(KEY);
