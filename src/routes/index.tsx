import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Flame, CalendarRange, TrendingUp, Database, ArrowRight } from "lucide-react";
import { ClientOnly, LazyEarth, LazyFireMap, MapFallback, Panel, DemoBadge, Seg } from "@/components/ui-hs/bits";
import { fmt, globalSeries, MONTHS, REGIONS, seasonalAverages, yearlyTotals, type Sensor } from "@/lib/fire-data";
import type { Viz } from "@/components/maps/FireMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HOTSPOT SYNC — Earth Fire Intelligence Command Centre" },
      { name: "description", content: "Unified MODIS + VIIRS satellite intelligence for monitoring and understanding Earth's burning activity." },
      { property: "og:title", content: "HOTSPOT SYNC — Understanding fire across time and space" },
      { property: "og:description", content: "Harmonised satellite active-fire analytics and a 25-year burning activity calendar." },
    ],
  }),
  component: Overview,
});

function Spark({ data, color }: { data: number[]; color: string }) {
  const d = data.map((v, i) => ({ i, v }));
  const id = color.replace(/\W/g, "");
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={d}>
        <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={0.4} /><stop offset="1" stopColor={color} stopOpacity={0} /></linearGradient></defs>
        <Area dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Overview() {
  const g = useMemo(() => globalSeries(), []);
  const years = useMemo(() => yearlyTotals(g), [g]);
  const seasonal = useMemo(() => seasonalAverages(g), [g]);
  const total = years.reduce((s, y) => s + y.harmonised, 0);
  const top = [...years].sort((a, b) => b.harmonised - a.harmonised)[0]!;
  const avgYear = total / years.length;
  const peak = [...seasonal].sort((a, b) => b.avg - a.avg)[0]!;
  const seasonalMean = seasonal.reduce((s, x) => s + x.avg, 0) / 12;
  const last = years[years.length - 1];
  const [sensors, setSensors] = useState<Sensor[]>(["MODIS", "VIIRS"]);
  const [viz, setViz] = useState<Viz>("points");

  const kpis = [
    { icon: Flame, label: "Total Detected Hotspots", value: fmt(total), note: `${((last.harmonised / avgYear - 1) * 100).toFixed(1)}% vs annual mean (2025)`, spark: years.map((y) => y.harmonised), color: "var(--solar)" },
    { icon: TrendingUp, label: "Highest Activity Year", value: String(top.year), note: `+${((top.harmonised / avgYear - 1) * 100).toFixed(0)}% above baseline`, spark: years.map((y) => y.harmonised), color: "var(--amber)" },
    { icon: CalendarRange, label: "Peak Burning Month", value: peak.month, note: `${(peak.avg / seasonalMean).toFixed(1)}× monthly mean`, spark: seasonal.map((s) => s.avg), color: "var(--gold)" },
    { icon: Database, label: "Historical Coverage", value: "26 yrs", note: "MODIS 2000– · VIIRS 2012–", spark: years.map((y) => (y.viirs ? 2 : 1)), color: "var(--primary)" },
  ];

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="relative h-[calc(100vh-4rem)] min-h-[620px] overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <ClientOnly fallback={<div className="h-full w-full bg-background" />}><LazyEarth /></ClientOnly>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

        <div className="pointer-events-none relative z-10 flex h-full flex-col justify-center px-6 md:px-12">
          <div className="max-w-xl">
            <div className="flex items-center gap-3"><span className="eyebrow text-primary">NASA Space Apps 2026 · Earth Observation</span></div>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] md:text-5xl xl:text-[3.5rem]">
              UNDERSTANDING FIRE.<br /><span className="bg-gradient-to-r from-amber via-solar to-critical bg-clip-text text-transparent">ACROSS TIME AND SPACE.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground">Unified satellite intelligence for monitoring, analysing, and understanding Earth's burning activity.</p>
            <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
              <Link to="/explorer" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-xs font-semibold tracking-wider text-primary-foreground glow-cyan hover:bg-ice">EXPLORE FIRE ACTIVITY <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/calendar" className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/50 px-5 py-3 text-xs font-semibold tracking-wider hover:border-primary/50">VIEW HISTORICAL CALENDAR</Link>
            </div>
          </div>
        </div>

        <div className="absolute right-4 top-6 z-10 hidden w-64 space-y-2 lg:block">
          {[
            ["TOTAL HOTSPOTS", fmt(total), "text-solar"],
            ["ACTIVE REGIONS", String(REGIONS.length), "text-amber"],
            ["HISTORICAL COVERAGE", "2000 — 2025", "text-primary"],
            ["LATEST DATA UPDATE", "2025-12-31 23:59Z", "text-ice"],
          ].map(([k, v, c]) => (
            <div key={k} className="glass rounded-md px-4 py-3">
              <div className="eyebrow">{k}</div>
              <div className={`mt-1 font-mono text-lg ${c}`}>{v}</div>
            </div>
          ))}
          <div className="pt-1 text-right"><DemoBadge /></div>
        </div>

        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
          <span className="eyebrow">Scroll</span>
          <div className="h-8 w-5 rounded-full border border-border p-1"><div className="mx-auto h-2 w-1 rounded bg-primary animate-scroll-cue" /></div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 px-4 pt-8 sm:grid-cols-2 md:px-8 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="panel group p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30">
            <div className="flex items-center justify-between">
              <span className="eyebrow">{k.label}</span>
              <k.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="mt-3 font-display text-3xl font-semibold">{k.value}</div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{k.note}</div>
            <div className="mt-3"><Spark data={k.spark} color={k.color} /></div>
          </div>
        ))}
      </section>

      {/* Global map */}
      <section className="px-4 pt-6 md:px-8">
        <Panel eyebrow="Live geospatial layer" title="Global fire activity" right={
          <div className="flex flex-wrap items-center gap-2">
            <Seg value={viz} onChange={setViz} options={[{ v: "points", l: "Points" }, { v: "heat", l: "Heat" }, { v: "grid", l: "Grid" }]} />
            <Seg value={sensors.join("+")} onChange={(v) => setSensors(v.split("+") as Sensor[])} options={[{ v: "MODIS+VIIRS", l: "All" }, { v: "MODIS", l: "MODIS" }, { v: "VIIRS", l: "VIIRS" }]} />
          </div>
        }>
          <div className="relative h-[520px] overflow-hidden rounded-md border border-border">
            <ClientOnly fallback={<MapFallback />}><LazyFireMap sensors={sensors} viz={viz} showRegions /></ClientOnly>
            <div className="glass absolute bottom-4 left-4 z-[500] rounded-md p-3 text-xs">
              <div className="eyebrow mb-2">FRP (MW)</div>
              {[["#FFB547", "< 30 · low"], ["#FF7939", "30–100 · moderate"], ["#FF4D4D", "> 100 · intense"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-2 py-0.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} /><span className="font-mono text-[11px] text-muted-foreground">{l}</span></div>
              ))}
            </div>
          </div>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">Peak global month: {MONTHS[seasonal.indexOf(peak)]} · Showing a representative sample of detections · Demonstration data</p>
        </Panel>
      </section>
    </div>
  );
}
