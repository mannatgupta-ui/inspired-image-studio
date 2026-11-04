import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const LazyFireMap = lazy(() => import("@/components/maps/FireMap"));
export const LazyEarth = lazy(() => import("@/components/earth/EarthScene"));

export function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  return ok ? <Suspense fallback={fallback}>{children}</Suspense> : <>{fallback}</>;
}

export function MapFallback() {
  return <div className="flex h-full w-full items-center justify-center bg-surface font-mono text-xs text-muted-foreground">INITIALISING GEOSPATIAL LAYER…</div>;
}

export function Panel({ title, eyebrow, right, children, className, resizable = true }: { title?: string; eyebrow?: string; right?: ReactNode; children: ReactNode; className?: string; resizable?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [h, setH] = useState<number | null>(null);
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const y0 = e.clientY, h0 = ref.current?.getBoundingClientRect().height ?? 300;
    const move = (ev: PointerEvent) => setH(Math.max(140, Math.min(1400, h0 + ev.clientY - y0)));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); document.body.style.cursor = ""; };
    document.body.style.cursor = "row-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <section ref={ref} data-resized={h != null ? "" : undefined} style={h != null ? { height: h } : undefined} className={cn("panel relative p-5", resizable && "pb-6", className)}>
      {(title || eyebrow) && (
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h3 className="mt-1 text-base font-semibold">{title}</h3>}
          </div>
          {right}
        </div>
      )}
      <div className="panel-body">{children}</div>
      {resizable && (
        <div onPointerDown={start} onDoubleClick={() => setH(null)} title="Drag to resize · double-click to reset"
          className="group absolute inset-x-0 bottom-0 flex h-4 cursor-row-resize items-center justify-center">
          <span className="h-[3px] w-10 rounded-full bg-border transition-colors group-hover:bg-primary" />
        </div>
      )}
    </section>
  );
}

export function DemoBadge() {
  return <span className="rounded border border-amber/30 bg-amber/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-amber">DEMONSTRATION DATA</span>;
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface/60 p-0.5">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={cn("rounded px-3 py-1 text-xs transition-colors", value === o.v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

export const chartTooltip = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, fontFamily: "JetBrains Mono" },
  labelStyle: { color: "var(--muted-foreground)" },
  itemStyle: { color: "var(--foreground)" },
};
export const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
