import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Globe2, Map, CalendarDays, LineChart, Satellite, ChevronsLeft, Search, Bell, Radio,
} from "lucide-react";
import { useSelection, setSelection } from "@/lib/store";
import { REGIONS } from "@/lib/fire-data";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: Globe2 },
  { to: "/explorer", label: "Fire Explorer", icon: Map },
  { to: "/calendar", label: "Burning Calendar", icon: CalendarDays },
  { to: "/analytics", label: "Historical Analytics", icon: LineChart },
  { to: "/harmonisation", label: "Sensor Harmonisation", icon: Satellite },
] as const;

function Logo({ compact }: { compact: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-9 w-9 shrink-0">
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/80 to-surface-2 glow-cyan" />
        <div className="absolute inset-0 rounded-full border border-primary/40 animate-orbit">
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-amber glow-fire" />
        </div>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-sm font-bold tracking-[0.2em]">HOTSPOT</div>
          <div className="font-mono text-[10px] tracking-[0.35em] text-primary">SYNC</div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [compact, setCompact] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const sel = useSelection();

  return (
    <div className="flex min-h-screen w-full ambient">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 md:flex",
          compact ? "w-[68px]" : "w-60",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Logo compact={compact} />
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {NAV.map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                title={n.label}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded bg-primary glow-cyan" />}
                <n.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                {!compact && <span className="truncate">{n.label}</span>}
              </Link>
            );
          })}
        </nav>
        {!compact && (
          <div className="mx-3 mb-3 space-y-3 rounded-md border border-border bg-surface/60 p-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow">System</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" /> NOMINAL
              </span>
            </div>
            <div>
              <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>COVERAGE</span><span>2000–2025</span>
              </div>
              <div className="h-1 overflow-hidden rounded bg-surface-2">
                <div className="h-full w-[96%] bg-gradient-to-r from-primary to-ice" />
              </div>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">v1.0.0 · Space Apps 2026</div>
          </div>
        )}
        <button
          onClick={() => setCompact((c) => !c)}
          className="mx-3 mb-4 flex items-center justify-center gap-2 rounded-md border border-border py-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <ChevronsLeft className={cn("h-4 w-4 transition-transform", compact && "rotate-180")} />
          {!compact && "Collapse"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[1000] flex h-16 items-center gap-3 border-b border-border glass px-4 md:px-6">
          <div className="md:hidden"><Logo compact /></div>
          <div className="relative hidden max-w-xs flex-1 lg:block">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search region, coordinates…"
              className="h-9 w-full rounded-md border border-input bg-surface/60 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const q = e.currentTarget.value.toLowerCase();
                const r = REGIONS.find((x) => x.name.toLowerCase().includes(q));
                if (r) setSelection({ regionId: r.id, label: r.name, regionIds: [r.id], bbox: null });
              }}
            />
          </div>
          <select
            value={sel.regionId}
            onChange={(e) => {
              const r = REGIONS.find((x) => x.id === e.target.value);
              setSelection(r ? { regionId: r.id, label: r.name, regionIds: [r.id], bbox: null } : { regionId: "global", label: "Global", regionIds: [], bbox: null });
            }}
            className="h-9 rounded-md border border-input bg-surface/60 px-2 text-sm outline-none"
            aria-label="Region"
          >
            <option value="global">Global · all regions</option>
            {sel.regionId === "custom" && <option value="custom">{sel.label}</option>}
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <span className="hidden rounded-md border border-input px-2.5 py-1.5 font-mono text-xs text-muted-foreground sm:inline">
            FIRMS · MODIS C6.1 + VIIRS 375m
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-2 font-mono text-[11px] text-success sm:flex">
              <Radio className="h-3.5 w-3.5 animate-pulse-dot" /> DEMO FEED
            </span>
            <button className="relative rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-solar" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-surface-2 font-mono text-xs text-primary">NA</div>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="shrink-0 rounded px-3 py-1.5 text-xs text-muted-foreground" activeProps={{ className: "bg-surface-2 text-foreground" }} activeOptions={{ exact: n.to === "/" }}>
              {n.label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, desc, right }: { eyebrow: string; title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-8 md:px-8">
      <div>
        <div className="eyebrow text-primary">{eyebrow}</div>
        <h1 className="mt-2 text-2xl font-semibold md:text-3xl">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {right}
    </div>
  );
}
