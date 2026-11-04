import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, DemoBadge, chartTooltip, axis } from "@/components/ui-hs/bits";
import { ExportDialog } from "@/components/export/ExportDialog";
import { fmt, MONTHS, scoreSeries, YEARS, type ScoredCell } from "@/lib/fire-data";
import { useSelectedSeries } from "@/lib/use-series";
import { useSelection } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Burning Activity Calendar — HOTSPOT SYNC" },
      { name: "description", content: "Year × month heatmap of harmonised active-fire hotspots from 2000 to today." },
      { property: "og:title", content: "Burning Activity Calendar — HOTSPOT SYNC" },
      { property: "og:description", content: "Explore 26 years of harmonised fire activity month by month." },
    ],
  }),
  component: CalendarPage,
});

const SCALE = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4", "bg-heat-5"];
const LABELS = ["Zero", "Low", "Moderate", "Elevated", "High", "Extreme"];

function bucket(v: number, max: number) {
  if (v <= 0) return 0;
  const r = Math.sqrt(v / max);
  return r < 0.2 ? 1 : r < 0.4 ? 2 : r < 0.6 ? 3 : r < 0.8 ? 4 : 5;
}

function CalendarPage() {
  const sel = useSelection();
  const series = useSelectedSeries();
  const cells = useMemo(() => scoreSeries(series), [series]);
  const max = Math.max(...cells.map((c) => c.harmonised));
  const [from, setFrom] = useState(2000);
  const [to, setTo] = useState(2025);
  const [hover, setHover] = useState<ScoredCell | null>(null);
  const [picked, setPicked] = useState<ScoredCell | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [compare, setCompare] = useState<number[]>([2019, 2023]);

  const years = YEARS.filter((y) => y >= from && y <= to).reverse();
  const info = hover ?? picked;
  const compareData = MONTHS.map((m, i) => {
    const row: Record<string, number | string> = { month: m };
    compare.forEach((y) => (row[y] = cells.find((c) => c.year === y && c.month === i)?.harmonised ?? 0));
    return row;
  });
  const compareColors = ["var(--primary)", "var(--solar)", "var(--gold)", "var(--ice)"];

  return (
    <div className="pb-12">
      <PageHeader eyebrow="Signature view" title="Burning Activity Calendar" desc={`Harmonised monthly hotspot counts for ${sel.label}. Hover a cell for its historical context; click to pin it.`}
        right={<div className="flex items-center gap-2"><DemoBadge /><ExportDialog fromYear={from} toYear={to} /></div>} />

      <div className="grid gap-4 px-4 pt-6 md:px-8 2xl:grid-cols-[1fr_340px]">
        <Panel>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="eyebrow">Years</span>
            <select value={from} onChange={(e) => setFrom(+e.target.value)} className="rounded border border-input bg-background px-2 py-1 font-mono">{YEARS.map((y) => <option key={y}>{y}</option>)}</select>
            <span className="text-muted-foreground">to</span>
            <select value={to} onChange={(e) => setTo(+e.target.value)} className="rounded border border-input bg-background px-2 py-1 font-mono">{YEARS.map((y) => <option key={y}>{y}</option>)}</select>
            <label className="ml-2 flex cursor-pointer items-center gap-2 text-muted-foreground"><input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} className="accent-primary" />Highlight anomalous months</label>
            <div className="ml-auto flex items-center gap-1">
              {SCALE.map((s, i) => <div key={s} className="flex flex-col items-center gap-1"><span className={cn("h-3 w-8", s, i === 0 && "rounded-l", i === 5 && "rounded-r")} /><span className="font-mono text-[9px] text-muted-foreground">{LABELS[i]}</span></div>)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[52px_repeat(12,1fr)] gap-[3px]">
                <div />
                {MONTHS.map((m) => <div key={m} className="pb-1 text-center font-mono text-[10px] uppercase text-muted-foreground">{m}</div>)}
                {years.map((y) => (
                  <div key={y} className="contents">
                    <button onClick={() => setCompare((c) => c.includes(y) ? c.filter((x) => x !== y) : [...c, y].slice(-4))}
                      className={cn("pr-2 text-right font-mono text-[11px] leading-6", compare.includes(y) ? "text-primary" : "text-muted-foreground hover:text-foreground")}>{y}</button>
                    {MONTHS.map((_, m) => {
                      const c = cells.find((x) => x.year === y && x.month === m)!;
                      const b = bucket(c.harmonised, max);
                      const anomalous = c.level === "extreme" && c.median > 50;
                      const isPicked = picked?.year === y && picked.month === m;
                      return (
                        <button key={m} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)} onClick={() => setPicked(c)}
                          aria-label={`${MONTHS[m]} ${y}: ${c.harmonised} hotspots`}
                          className={cn("h-6 rounded-[3px] transition-all duration-150 hover:scale-110 hover:ring-1 hover:ring-ice", SCALE[b],
                            highlight && !anomalous && "opacity-25", highlight && anomalous && "ring-1 ring-critical",
                            isPicked && "ring-2 ring-primary glow-cyan")} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel eyebrow={picked && !hover ? "Pinned month" : "Cell inspector"} title={info ? `${MONTHS[info.month]} ${info.year}` : "Hover a cell"}>
            {info ? (
              <dl className="space-y-3 font-mono text-xs">
                <Row k="Harmonised hotspots" v={info.harmonised.toLocaleString()} c="text-solar text-lg" />
                <Row k="Historical median" v={Math.round(info.median).toLocaleString()} />
                <Row k="Anomaly score (log₂)" v={info.anomaly.toFixed(2)} />
                <Row k="Deviation from baseline" v={`${info.deviationPct > 0 ? "+" : ""}${info.deviationPct.toFixed(1)}%`} c={info.deviationPct > 25 ? "text-amber" : info.deviationPct < -25 ? "text-primary" : ""} />
                <Row k="Classification" v={info.level.toUpperCase()} c={info.level === "extreme" ? "text-critical" : info.level === "elevated" ? "text-amber" : "text-ice"} />
                <Row k="MODIS / VIIRS raw" v={`${fmt(info.modis)} / ${info.viirs == null ? "n/a" : fmt(info.viirs)}`} />
              </dl>
            ) : <p className="text-sm text-muted-foreground">Each cell is the number of harmonised active-fire hotspots in that month.</p>}
          </Panel>
          <Panel eyebrow="Click year labels to compare" title="Year comparison">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={compareData}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" {...axis} />
                  <YAxis {...axis} tickFormatter={fmt} width={36} />
                  <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {compare.map((y, i) => <Bar key={y} dataKey={String(y)} fill={compareColors[i % 4]} radius={[2, 2, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, c }: { k: string; v: string; c?: string }) {
  return <div className="flex items-baseline justify-between border-b border-border pb-2"><dt className="text-muted-foreground">{k}</dt><dd className={c}>{v}</dd></div>;
}
