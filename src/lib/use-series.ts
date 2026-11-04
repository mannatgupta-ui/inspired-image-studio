import { useMemo } from "react";
import { useSelection } from "./store";
import { globalSeries, regionSeries, type MonthRecord } from "./fire-data";

/** Monthly records for the current selection (region, drawn box, or global). */
export function useSelectedSeries(): MonthRecord[] {
  const sel = useSelection();
  return useMemo(() => {
    const ids = sel.regionId === "global" ? [] : sel.regionIds;
    if (!ids.length) return globalSeries();
    const all = ids.map(regionSeries);
    return all[0].map((rec, i) => ({
      year: rec.year,
      month: rec.month,
      modis: all.reduce((s, a) => s + a[i].modis, 0),
      viirs: rec.viirs == null ? null : all.reduce((s, a) => s + (a[i].viirs ?? 0), 0),
      harmonised: all.reduce((s, a) => s + a[i].harmonised, 0),
    }));
  }, [sel.regionId, sel.regionIds]);
}
