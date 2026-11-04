import { useState } from "react";
import { Download, FileDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useSelection } from "@/lib/store";
import { useSelectedSeries } from "@/lib/use-series";
import { downloadCSV, MONTHS, sampleHotspots, scoreSeries } from "@/lib/fire-data";

type Kind = "monthly" | "calendar" | "hotspots";

export function ExportDialog({ fromYear = 2000, toYear = 2025 }: { fromYear?: number; toYear?: number }) {
  const sel = useSelection();
  const series = useSelectedSeries();
  const [kind, setKind] = useState<Kind>("monthly");
  const [progress, setProgress] = useState<number | null>(null);

  const inRange = series.filter((r) => r.year >= fromYear && r.year <= toYear);
  const hotspots = sampleHotspots().filter((h) => {
    if (!sel.bbox) return sel.regionId === "global" || sel.regionIds.includes(h.region);
    const [s, w, n, e] = sel.bbox;
    return h.lat >= s && h.lat <= n && h.lng >= w && h.lng <= e;
  });

  const rows = () => {
    if (kind === "monthly") return inRange.map((r) => ({ year: r.year, month: MONTHS[r.month], modis_count: r.modis, viirs_count: r.viirs ?? "", harmonised_count: r.harmonised }));
    if (kind === "calendar") return scoreSeries(series).filter((r) => r.year >= fromYear && r.year <= toYear).map((r) => ({ year: r.year, month: MONTHS[r.month], harmonised_count: r.harmonised, historical_median: r.median, deviation_pct: r.deviationPct.toFixed(1), level: r.level }));
    // only attributes actually present in the sample records
    return hotspots.map((h) => ({ latitude: h.lat, longitude: h.lng, sensor: h.sensor, acq_date: h.date, frp_mw: h.frp, confidence: h.confidence }));
  };
  const count = kind === "hotspots" ? hotspots.length : inRange.length;

  const run = () => {
    setProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 20;
      setProgress(p);
      if (p >= 100) {
        clearInterval(t);
        downloadCSV(`hotspot-sync_${kind}_${sel.label.replace(/\W+/g, "-").toLowerCase()}.csv`, rows());
        setTimeout(() => setProgress(null), 600);
      }
    }, 120);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20">
          <Download className="h-3.5 w-3.5" /> Export data
        </button>
      </DialogTrigger>
      <DialogContent className="z-[2000] border-border bg-surface">
        <DialogHeader><DialogTitle className="font-display">Export dataset</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-2">
            {([["monthly", "Monthly counts"], ["calendar", "Calendar + anomalies"], ["hotspots", "Hotspot records"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setKind(k)} className={`rounded-md border p-3 text-left text-xs ${kind === k ? "border-primary/60 bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-y-2 font-mono text-xs">
            <dt className="text-muted-foreground">AREA</dt><dd>{sel.label}</dd>
            <dt className="text-muted-foreground">DATE RANGE</dt><dd>{kind === "hotspots" ? "Latest sample (2025)" : `${fromYear} – ${toYear}`}</dd>
            <dt className="text-muted-foreground">RECORDS</dt><dd>{count.toLocaleString()}</dd>
            <dt className="text-muted-foreground">FORMAT</dt><dd>CSV (UTF-8)</dd>
          </dl>
          {kind === "hotspots" && <p className="text-xs text-muted-foreground">Includes only attributes present in the sample: lat, lon, sensor, date, FRP, confidence.</p>}
          {progress !== null && <Progress value={progress} className="h-1" />}
          <button onClick={run} disabled={progress !== null || !count} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            <FileDown className="h-4 w-4" /> {progress !== null ? "Preparing…" : "Download CSV"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
