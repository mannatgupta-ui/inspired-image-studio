import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Satellite } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, DemoBadge, Seg, chartTooltip, axis } from "@/components/ui-hs/bits";
import { fmt, MONTHS, yearlyTotals, YEARS } from "@/lib/fire-data";
import { useSelectedSeries } from "@/lib/use-series";

export const Route = createFileRoute("/harmonisation")({
  head: () => ({
    meta: [
      { title: "Sensor Harmonisation — HOTSPOT SYNC" },
      { name: "description", content: "How MODIS and VIIRS fire detections are harmonised into one consistent time series." },
      { property: "og:title", content: "Sensor Harmonisation — HOTSPOT SYNC" },
      { property: "og:description", content: "Raw MODIS vs raw VIIRS vs harmonised hotspot counts." },
    ],
  }),
  component: Harmonisation,
});

const SATS = [
  { family: "MODIS", res: "1 km", since: "2000", color: "text-amber", platforms: ["Terra (2000–)", "Aqua (2002–)"], text: "Moderate Resolution Imaging Spectroradiometer. The long historical backbone of the record, with coarser pixels that miss small fires." },
  { family: "VIIRS", res: "375 m", since: "2012", color: "text-primary", platforms: ["Suomi NPP (2012–)", "NOAA-20 (2018–)", "NOAA-21 (2023–)"], text: "Visible Infrared Imaging Radiometer Suite. Finer pixels detect many more, smaller fires — roughly 3–4× MODIS counts." },
];

function Harmonisation() {
  const series = useSelectedSeries();
  const [mode, setMode] = useState<"monthly" | "yearly">("yearly");
  const [show, setShow] = useState({ modis: true, viirs: true, harmonised: true });
  const [from, setFrom] = useState(2008);
  const data = useMemo(() => {
    if (mode === "yearly") return yearlyTotals(series).filter((y) => y.year >= from).map((y) => ({ t: String(y.year), ...y }));
    return series.filter((r) => r.year >= from).map((r) => ({ t: `${MONTHS[r.month]} ${r.year}`, ...r }));
  }, [series, mode, from]);

  return (
    <div className="pb-12">
      <PageHeader eyebrow="MODIS ⟷ VIIRS" title="Sensor Harmonisation" desc="Raw sensor records disagree because each instrument sees fire differently. Harmonisation rescales them to one consistent, comparable series." right={<DemoBadge />} />
      <div className="grid gap-4 px-4 pt-6 md:px-8 lg:grid-cols-3">
        <Panel className="lg:col-span-3" eyebrow="Before vs after" title="Raw vs harmonised counts" right={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Seg value={mode} onChange={setMode} options={[{ v: "yearly", l: "Yearly" }, { v: "monthly", l: "Monthly" }]} />
            {(["modis", "viirs", "harmonised"] as const).map((k) => (
              <label key={k} className="flex items-center gap-1.5 font-mono uppercase text-muted-foreground"><input type="checkbox" className="accent-primary" checked={show[k]} onChange={(e) => setShow({ ...show, [k]: e.target.checked })} />{k}</label>
            ))}
            <select value={from} onChange={(e) => setFrom(+e.target.value)} className="rounded border border-input bg-background px-2 py-1 font-mono">{YEARS.map((y) => <option key={y}>{y}</option>)}</select>
          </div>
        }>
          <div className="h-80">
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" {...axis} minTickGap={40} />
                <YAxis {...axis} tickFormatter={fmt} width={48} />
                <Tooltip {...chartTooltip} formatter={(v: number) => v?.toLocaleString()} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {show.modis && <Line dataKey="modis" name="Raw MODIS" stroke="var(--amber)" dot={false} strokeWidth={1.5} />}
                {show.viirs && <Line dataKey="viirs" name="Raw VIIRS" stroke="var(--primary)" dot={false} strokeWidth={1.5} connectNulls={false} />}
                {show.harmonised && <Line dataKey="harmonised" name="Harmonised" stroke="var(--solar)" dot={false} strokeWidth={2.5} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Note the step in raw totals when VIIRS starts in 2012 — the harmonised line removes it.</p>
        </Panel>

        {SATS.map((s) => (
          <Panel key={s.family} eyebrow={`Since ${s.since} · ${s.res} pixels`} title={s.family} right={<Satellite className={`h-5 w-5 ${s.color}`} />}>
            <p className="text-sm text-muted-foreground">{s.text}</p>
            <ul className="mt-3 space-y-1.5 font-mono text-xs">{s.platforms.map((p) => <li key={p} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-current" />{p}</li>)}</ul>
          </Panel>
        ))}

        <Panel eyebrow="Methodology" title="How harmonisation works">
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><b className="text-foreground">Resolution:</b> 1 km vs 375 m pixels change what a "hotspot" means.</li>
            <li><b className="text-foreground">Sensitivity:</b> VIIRS catches small, cool fires MODIS misses.</li>
            <li><b className="text-foreground">Frequency:</b> more overpasses per day = more detections.</li>
            <li><b className="text-foreground">Aggregation:</b> counts summed per grid cell per month.</li>
            <li><b className="text-foreground">Scaling:</b> VIIRS rescaled to MODIS-equivalent, then averaged where both exist. <span className="text-amber">(illustrative ratio in this demo)</span></li>
            <li><b className="text-foreground">Baseline:</b> median of same month across other years.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
