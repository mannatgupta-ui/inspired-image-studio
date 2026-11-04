import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Square, RotateCcw, Crosshair, Layers, MapPin } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClientOnly, LazyEarth, LazyFireMap, MapFallback, Panel, DemoBadge, Seg, chartTooltip, axis } from "@/components/ui-hs/bits";
import { ExportDialog } from "@/components/export/ExportDialog";
import type { Viz } from "@/components/maps/FireMap";
import { bboxAreaKm2, fmt, MONTHS, REGIONS, regionsInBox, sampleHotspots, type Sensor } from "@/lib/fire-data";
import { setSelection, useSelection } from "@/lib/store";
import { useSelectedSeries } from "@/lib/use-series";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title: "Fire Explorer — HOTSPOT SYNC" },
      { name: "description", content: "Draw an area on the map to analyse MODIS, VIIRS and harmonised fire hotspots." },
      { property: "og:title", content: "Fire Explorer — HOTSPOT SYNC" },
      { property: "og:description", content: "Interactive geospatial workspace for satellite fire hotspot analysis." },
    ],
  }),
  component: Explorer,
});

function Explorer() {
  const sel = useSelection();
  const series = useSelectedSeries();
  const [sensors, setSensors] = useState<Sensor[]>(["MODIS", "VIIRS"]);
  const [viz, setViz] = useState<Viz>("points");
  const [opacity, setOpacity] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [view, setView] = useState<"globe" | "map">("globe");
  const [fromYear, setFromYear] = useState(2015);
  const [toYear, setToYear] = useState(2025);
  const [fly, setFly] = useState<[[number, number], [number, number]] | null>(null);
  const [coords, setCoords] = useState({ s: "", w: "", n: "", e: "" });

  const region = REGIONS.find((r) => r.id === sel.regionId);
  const bbox = sel.bbox ?? (region ? [region.bounds[0][0], region.bounds[0][1], region.bounds[1][0], region.bounds[1][1]] as [number, number, number, number] : null);

  const applyBox = (b: [number, number, number, number]) => {
    const rs = regionsInBox(...b);
    setSelection({ regionId: rs.length ? "custom" : "global", label: `Custom area (${b.map((x) => x.toFixed(1)).join(", ")})`, bbox: b, regionIds: rs.map((r) => r.id) });
    setDrawing(false);
    setFly([[b[0], b[1]], [b[2], b[3]]]);
  };

  const inBox = useMemo(() => {
    const pts = sampleHotspots().filter((h) => sensors.includes(h.sensor));
    if (!bbox) return pts;
    return pts.filter((h) => h.lat >= bbox[0] && h.lat <= bbox[2] && h.lng >= bbox[1] && h.lng <= bbox[3]);
  }, [bbox, sensors]);

  const monthly = series.filter((r) => r.year >= fromYear && r.year <= toYear).map((r) => ({
    t: `${MONTHS[r.month]} ${String(r.year).slice(2)}`,
    v: sensors.length === 2 ? r.harmonised : sensors[0] === "MODIS" ? r.modis : r.viirs ?? 0,
  }));
  const total = monthly.reduce((s, x) => s + x.v, 0);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 xl:flex-row">
      <div className="w-full shrink-0 space-y-4 xl:w-[300px]">
        <div className="glass space-y-4 rounded-lg p-4">
        <ClientOnly fallback={<MapFallback />}>
          {view === "globe" ? (
            <LazyEarth
              spin={!drawing}
              selection={bbox}
              onPick={drawing ? (lat, lng) => {
                const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
                applyBox([clamp(lat - 8, -85, 85), clamp(lng - 12, -180, 180), clamp(lat + 8, -85, 85), clamp(lng + 12, -180, 180)]);
              } : undefined}
            />
          ) : (
            <LazyFireMap sensors={sensors} viz={viz} opacity={opacity} drawing={drawing} selection={bbox} onSelect={applyBox} flyTo={fly} showRegions />
          )}
        </ClientOnly>
        <div className="absolute right-3 top-3 z-[500]">
          <Seg value={view} onChange={(v) => { setView(v); setDrawing(false); }} options={[{ v: "globe", l: "3D Globe" }, { v: "map", l: "2D Map" }]} />
        </div>
        {view === "globe" && (
          <div className="glass absolute bottom-3 right-3 z-[500] max-w-[240px] rounded-lg p-3 text-xs text-muted-foreground">
            {drawing ? "Click anywhere on the Earth to select a 16° × 24° area." : "Drag to rotate · scroll to zoom. Press “Select area” then click the Earth."}
          </div>
        )}

        <div className="glass absolute left-14 top-3 z-[500] w-[270px] space-y-4 rounded-lg p-4">
          <div className="flex items-center justify-between"><span className="eyebrow text-primary">Control panel</span><DemoBadge /></div>
          <div className="flex gap-2">
            <button onClick={() => setDrawing((d) => !d)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border py-2 text-xs ${drawing ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <Square className="h-3.5 w-3.5" /> {drawing ? (view === "globe" ? "Click the Earth…" : "Drag on map…") : (view === "globe" ? "Select area" : "Draw area")}
            </button>
            <button title="Zoom to selection" disabled={!bbox} onClick={() => bbox && setFly([[bbox[0], bbox[1]], [bbox[2], bbox[3]]])} className="rounded-md border border-border px-2.5 text-muted-foreground hover:text-foreground disabled:opacity-40"><Crosshair className="h-3.5 w-3.5" /></button>
            <button title="Reset" onClick={() => { setSelection({ regionId: "global", label: "Global", bbox: null, regionIds: [] }); setFly([[-60, -170], [75, 170]]); }} className="rounded-md border border-border px-2.5 text-muted-foreground hover:text-foreground"><RotateCcw className="h-3.5 w-3.5" /></button>
          </div>
          <div>
            <div className="eyebrow mb-1.5">Bounding box (S, W, N, E)</div>
            <div className="grid grid-cols-4 gap-1">
              {(["s", "w", "n", "e"] as const).map((k) => (
                <input key={k} placeholder={k.toUpperCase()} value={coords[k]} onChange={(e) => setCoords({ ...coords, [k]: e.target.value })}
                  className="h-8 w-full rounded border border-input bg-background/60 px-1.5 font-mono text-[11px] outline-none focus:border-primary/60" />
              ))}
            </div>
            <button onClick={() => { const b = [coords.s, coords.w, coords.n, coords.e].map(Number); if (b.every((x) => !isNaN(x)) && b[2] > b[0] && b[3] > b[1]) applyBox(b as [number, number, number, number]); }}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded border border-border py-1.5 text-xs text-muted-foreground hover:text-foreground"><MapPin className="h-3 w-3" /> Apply coordinates</button>
          </div>
          <div><div className="eyebrow mb-1.5">Sensor</div>
            <Seg value={sensors.join("+")} onChange={(v) => setSensors(v.split("+") as Sensor[])} options={[{ v: "MODIS+VIIRS", l: "Harmonised" }, { v: "MODIS", l: "MODIS" }, { v: "VIIRS", l: "VIIRS" }]} />
          </div>
          <div><div className="eyebrow mb-1.5 flex items-center gap-1"><Layers className="h-3 w-3" /> Visualisation</div>
            <Seg value={viz} onChange={setViz} options={[{ v: "points", l: "Hotspots" }, { v: "heat", l: "Heatmap" }, { v: "grid", l: "Cell grid" }]} />
          </div>
          <div>
            <div className="eyebrow mb-1.5 flex justify-between"><span>Layer opacity</span><span>{Math.round(opacity * 100)}%</span></div>
            <input type="range" min={0.2} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="w-full accent-primary" />
          </div>
        </div>
      </div>

      <aside className="w-full space-y-4 xl:w-[380px]">
        <Panel eyebrow="Selected area" title={sel.label}>
          <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div><dt className="text-muted-foreground">AREA</dt><dd className="mt-1 text-lg text-foreground">{bbox ? fmt(bboxAreaKm2(...bbox)) + " km²" : "Global"}</dd></div>
            <div><dt className="text-muted-foreground">SAMPLE DETECTIONS</dt><dd className="mt-1 text-lg text-solar">{inBox.length.toLocaleString()}</dd></div>
            <div><dt className="text-muted-foreground">MONTHLY TOTAL</dt><dd className="mt-1 text-lg text-amber">{fmt(total)}</dd></div>
            <div><dt className="text-muted-foreground">REGIONS</dt><dd className="mt-1 text-lg">{sel.bbox ? sel.regionIds.length : sel.regionId === "global" ? REGIONS.length : sel.regionIds.length}</dd></div>
          </dl>
          {bbox && <div className="mt-3 rounded border border-border bg-background/40 p-2 font-mono text-[11px] text-muted-foreground">S {bbox[0].toFixed(2)} · W {bbox[1].toFixed(2)} · N {bbox[2].toFixed(2)} · E {bbox[3].toFixed(2)}</div>}
          {sel.regionId === "custom" && !sel.regionIds.length && <p className="mt-2 text-xs text-muted-foreground">No monitored region intersects this box.</p>}
        </Panel>
        <Panel eyebrow="Monthly records" title="Hotspot counts" right={
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <select value={fromYear} onChange={(e) => setFromYear(+e.target.value)} className="rounded border border-input bg-background px-1 py-0.5">{Array.from({ length: 26 }, (_, i) => 2000 + i).map((y) => <option key={y}>{y}</option>)}</select>
            –
            <select value={toYear} onChange={(e) => setToYear(+e.target.value)} className="rounded border border-input bg-background px-1 py-0.5">{Array.from({ length: 26 }, (_, i) => 2000 + i).map((y) => <option key={y}>{y}</option>)}</select>
          </div>
        }>
          <div className="h-48">
            <ResponsiveContainer>
              <AreaChart data={monthly}>
                <defs><linearGradient id="ex" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--solar)" stopOpacity={0.45} /><stop offset="1" stopColor="var(--solar)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" {...axis} interval="preserveStartEnd" minTickGap={40} />
                <YAxis {...axis} tickFormatter={fmt} width={40} />
                <Tooltip {...chartTooltip} formatter={(v: number) => v.toLocaleString()} />
                <Area dataKey="v" name="Hotspots" stroke="var(--solar)" fill="url(#ex)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <div className="flex justify-end"><ExportDialog fromYear={fromYear} toYear={toYear} /></div>
      </aside>
    </div>
  );
}
