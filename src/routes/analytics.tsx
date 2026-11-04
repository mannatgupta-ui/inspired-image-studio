import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Info, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel, DemoBadge, chartTooltip, axis } from "@/components/ui-hs/bits";
import { Tooltip as UiTip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmt, insights, MONTHS, scoreSeries, seasonalAverages, yearlyTotals, YEARS, median } from "@/lib/fire-data";
import { useSelectedSeries } from "@/lib/use-series";
import { useSelection } from "@/lib/store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Historical Analytics — HOTSPOT SYNC" },
      { name: "description", content: "Monthly, seasonal, yearly and anomaly analysis of harmonised satellite fire hotspots." },
      { property: "og:title", content: "Historical Analytics — HOTSPOT SYNC" },
      { property: "og:description", content: "Trends, seasonality and anomalies in 26 years of fire activity." },
    ],
  }),
  component: Analytics,
});

const levelColor = { below: "var(--primary)", normal: "var(--heat-2)", elevated: "var(--amber)", extreme: "var(--critical)" } as const;

function Analytics() {
  const sel = useSelection();
  const series = useSelectedSeries();
  const [from, setFrom] = useState(2012);
  const scored = useMemo(() => scoreSeries(series), [series]);
  const monthly = scored.filter((c) => c.year >= from).map((c) => ({ t: `${MONTHS[c.month]} ${c.year}`, v: c.harmonised, m: Math.round(c.median) }));
  const seasonal = seasonalAverages(series);
  const topMonths = [...seasonal].sort((a, b) => b.avg - a.avg).slice(0, 3).map((s) => s.month);
  const years = yearlyTotals(series);
  const yMed = median(years.map((y) => y.harmonised));
  const anomalies = scored.filter((c) => c.year >= from).map((c) => ({ t: `${MONTHS[c.month]} ${c.year}`, d: +c.deviationPct.toFixed(1), level: c.level }));
  const notes = useMemo(() => insights(series), [series]);

  // "current" month = latest month in record
  const cur = scored[scored.length - 1];
  const diff = cur.harmonised - cur.median;
  const status = { below: "Below historical levels", normal: "Within normal variation", elevated: "Elevated", extreme: "Exceptionally high" }[cur.level];

  return (
    <div className="pb-12">
      <PageHeader eyebrow="Analytical workspace" title="Historical Analytics" desc={`Showing ${sel.label}. Every figure and insight below is computed from the selected dataset.`}
        right={<div className="flex items-center gap-2 text-xs"><DemoBadge /><span className="eyebrow">From</span><select value={from} onChange={(e) => setFrom(+e.target.value)} className="rounded border border-input bg-background px-2 py-1 font-mono">{YEARS.map((y) => <option key={y}>{y}</option>)}</select></div>} />

      <div className="grid gap-4 px-4 pt-6 md:px-8 lg:grid-cols-3">
        <Panel className="lg:col-span-2" eyebrow="Chart 1" title="Monthly fire activity vs historical median">
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={monthly}>
                <defs><linearGradient id="mo" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--solar)" stopOpacity={0.4} /><stop offset="1" stopColor="var(--solar)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" {...axis} minTickGap={50} />
                <YAxis {...axis} tickFormatter={fmt} width={44} />
                <Tooltip {...chartTooltip} cursor={{ stroke: "var(--primary)", strokeDasharray: "3 3" }} formatter={(v: number) => v.toLocaleString()} />
                <Area type="monotone" dataKey="v" name="Harmonised" stroke="var(--solar)" fill="url(#mo)" strokeWidth={1.6} />
                <Line type="monotone" dataKey="m" name="Historical median" stroke="var(--primary)" strokeDasharray="4 3" dot={false} strokeWidth={1.2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel eyebrow="Critical periods" title="Generated insights">
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n} className="flex gap-3 rounded-md border border-border bg-background/40 p-3 text-sm leading-relaxed"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber" />{n}</li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Chart 2" title="Seasonal burning pattern">
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={seasonal}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" {...axis} />
                <YAxis {...axis} tickFormatter={fmt} width={40} />
                <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="avg" name="Avg hotspots" radius={[3, 3, 0, 0]}>
                  {seasonal.map((s) => <Cell key={s.month} fill={topMonths.includes(s.month) ? "var(--solar)" : "var(--heat-2)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel eyebrow="Chart 3" title="Yearly totals">
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={years}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" {...axis} minTickGap={20} />
                <YAxis {...axis} tickFormatter={fmt} width={44} />
                <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} />
                <ReferenceLine y={yMed} stroke="var(--primary)" strokeDasharray="3 3" />
                <Bar dataKey="harmonised" name="Harmonised" radius={[2, 2, 0, 0]}>
                  {years.map((y) => <Cell key={y.year} fill={y.harmonised > yMed * 1.25 ? "var(--critical)" : y.harmonised > yMed * 1.1 ? "var(--amber)" : "var(--heat-2)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel eyebrow="Current month vs median" title={`${MONTHS[cur.month]} ${cur.year}`} right={
          <TooltipProvider><UiTip><TooltipTrigger aria-label="Baseline methodology"><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-xs">Baseline = median of the same calendar month across all other years in the record. Deviation is descriptive, not a fire prediction.</TooltipContent></UiTip></TooltipProvider>
        }>
          <div className="grid grid-cols-2 gap-3 font-mono">
            {[["CURRENT MONTH", cur.harmonised.toLocaleString(), "text-solar"], ["HISTORICAL MEDIAN", Math.round(cur.median).toLocaleString(), "text-primary"], ["ABS. DIFFERENCE", `${diff > 0 ? "+" : ""}${Math.round(diff).toLocaleString()}`, ""], ["DEVIATION", `${cur.deviationPct > 0 ? "+" : ""}${cur.deviationPct.toFixed(1)}%`, ""]].map(([k, v, c]) => (
              <div key={k} className="rounded-md border border-border bg-background/40 p-3"><div className="text-[10px] text-muted-foreground">{k}</div><div className={`mt-1 text-lg ${c}`}>{v}</div></div>
            ))}
          </div>
          <div className="mt-4">
            <div className="relative h-2 rounded-full bg-gradient-to-r from-primary via-heat-2 via-50% to-critical">
              <span className="absolute -top-1 h-4 w-1 rounded bg-foreground" style={{ left: `${Math.max(0, Math.min(100, 50 + cur.deviationPct / 3))}%` }} />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground"><span>BELOW</span><span>NORMAL</span><span>ELEVATED</span><span>EXCEPTIONAL</span></div>
            <p className="mt-3 text-sm" style={{ color: levelColor[cur.level] }}>{status}</p>
          </div>
        </Panel>

        <Panel className="lg:col-span-3" eyebrow="Chart 4" title="Anomaly analysis — deviation from monthly baseline (%)" right={
          <div className="flex gap-3 font-mono text-[10px]">{(["below", "normal", "elevated", "extreme"] as const).map((l) => <span key={l} className="flex items-center gap-1.5 uppercase text-muted-foreground"><span className="h-2 w-2 rounded-sm" style={{ background: levelColor[l] }} />{l}</span>)}</div>
        }>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={anomalies}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" {...axis} minTickGap={50} />
                <YAxis {...axis} width={44} unit="%" />
                <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                <Bar dataKey="d" name="Deviation %">{anomalies.map((a, i) => <Cell key={i} fill={levelColor[a.level]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
