import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui-hs/bits";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology & Data Transparency — HOTSPOT SYNC" },
      { name: "description", content: "Data sources, aggregation, harmonisation, baselines and limitations behind HOTSPOT SYNC." },
      { property: "og:title", content: "Methodology — HOTSPOT SYNC" },
      { property: "og:description", content: "How NASA FIRMS data becomes a burning activity calendar." },
    ],
  }),
  component: Methodology,
});

const STAGES = ["NASA FIRMS DATA", "DATA CLEANING", "SENSOR HARMONISATION", "SPATIAL AGGREGATION", "MONTHLY HOTSPOT COUNTS", "HISTORICAL BASELINES", "BURNING ACTIVITY CALENDAR"];

const SECTIONS: { t: string; b: string; status: "actual" | "planned" }[] = [
  { t: "Data sources", b: "NASA FIRMS active-fire products: MODIS Collection 6.1 (Terra, Aqua) and VIIRS 375 m (Suomi NPP, NOAA-20, NOAA-21).", status: "actual" },
  { t: "Spatial aggregation", b: "Detections are binned to a regular grid and to user-drawn boundaries; counts are summed per cell.", status: "actual" },
  { t: "Temporal aggregation", b: "Detections are grouped by calendar month (UTC acquisition date).", status: "actual" },
  { t: "Harmonisation approach", b: "VIIRS counts are scaled to a MODIS-equivalent level using an overlap-period ratio; where both sensors exist the results are averaged. The demo uses an illustrative fixed ratio.", status: "planned" },
  { t: "Zero-count handling", b: "Months with no detections are recorded as explicit zeros, not missing values, so medians are not inflated.", status: "actual" },
  { t: "Historical median", b: "For each month, the baseline is the median of the same calendar month across all other years.", status: "actual" },
  { t: "Anomaly calculation", b: "Deviation % = (count − median) / median. Anomaly score = log₂((count+1)/(median+1)). Bands: below < −25%, normal ±25%, elevated ≤ 75%, extreme > 75%. Anomalies describe the past — they are not fire predictions.", status: "actual" },
  { t: "Data limitations", b: "Cloud cover, smoke, overpass timing and sensor changes affect detection. Hotspots are thermal anomalies, not burned area. All figures in this prototype are synthetic demonstration data.", status: "actual" },
  { t: "Dataset updates", b: "Planned monthly refresh from FIRMS archive and near-real-time feeds.", status: "planned" },
];

function Methodology() {
  return (
    <div className="pb-12">
      <PageHeader eyebrow="Scientific documentation" title="Methodology & Data Transparency" desc="What we do with the data, step by step — and what is still illustrative." />
      <div className="px-4 pt-6 md:px-8">
        <Panel eyebrow="Processing pipeline" title="From satellite pixel to calendar cell">
          <div className="flex flex-col items-stretch gap-0 lg:flex-row lg:items-center">
            {STAGES.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col items-center lg:flex-row">
                <div className={`w-full rounded-md border px-3 py-4 text-center font-mono text-[11px] tracking-wider ${i === 0 ? "border-primary/50 text-primary" : i === STAGES.length - 1 ? "border-solar/60 text-solar glow-fire" : "border-border text-foreground"} bg-background/50`}>
                  <div className="mb-1 text-[9px] text-muted-foreground">0{i + 1}</div>{s}
                </div>
                {i < STAGES.length - 1 && (
                  <svg className="h-8 w-6 shrink-0 lg:h-6 lg:w-8" viewBox="0 0 32 24" aria-hidden>
                    <line x1="0" y1="12" x2="32" y2="12" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="4 4" className="animate-flow hidden lg:block" />
                    <line x1="16" y1="0" x2="16" y2="24" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="4 4" className="animate-flow lg:hidden" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </Panel>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SECTIONS.map((s) => (
            <Panel key={s.t} title={s.t} right={<span className={`rounded px-2 py-0.5 font-mono text-[10px] ${s.status === "actual" ? "bg-success/10 text-success" : "bg-amber/10 text-amber"}`}>{s.status === "actual" ? "IMPLEMENTED" : "PLANNED / ILLUSTRATIVE"}</span>}>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.b}</p>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
