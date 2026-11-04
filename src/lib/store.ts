import { useSyncExternalStore } from "react";

// Tiny shared selection store: which area the analytics pages describe.
export interface Selection {
  regionId: string | "global";
  label: string;
  bbox: [number, number, number, number] | null; // s, w, n, e
  regionIds: string[];
}

let state: Selection = { regionId: "global", label: "Global", bbox: null, regionIds: [] };
const subs = new Set<() => void>();

export function setSelection(s: Partial<Selection>) {
  state = { ...state, ...s };
  subs.forEach((f) => f());
}

export function useSelection() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
    () => state,
  );
}
