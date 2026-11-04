import { MapContainer, TileLayer, CircleMarker, Rectangle, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { sampleHotspots, type Sensor, REGIONS } from "@/lib/fire-data";

export type Viz = "points" | "heat" | "grid";

export interface FireMapProps {
  sensors: Sensor[];
  viz: Viz;
  opacity?: number;
  drawing?: boolean;
  selection?: [number, number, number, number] | null;
  onSelect?: (b: [number, number, number, number]) => void;
  flyTo?: [[number, number], [number, number]] | null;
  height?: string;
  showRegions?: boolean;
}

const fireColor = (frp: number) => (frp > 100 ? "#FF4D4D" : frp > 30 ? "#FF7939" : "#FFB547");

function DrawBox({ active, onDone }: { active: boolean; onDone?: ((b: [number, number, number, number]) => void) | undefined }) {
  const map = useMap();
  const [start, setStart] = useState<L.LatLng | null>(null);
  const [cur, setCur] = useState<L.LatLng | null>(null);
  useEffect(() => {
    if (active) map.dragging.disable();
    else map.dragging.enable();
    map.getContainer().style.cursor = active ? "crosshair" : "";
  }, [active, map]);
  useMapEvents({
    mousedown(e) { if (active) { setStart(e.latlng); setCur(e.latlng); } },
    mousemove(e) { if (active && start) setCur(e.latlng); },
    mouseup() {
      if (active && start && cur) {
        const b: [number, number, number, number] = [
          Math.min(start.lat, cur.lat), Math.min(start.lng, cur.lng), Math.max(start.lat, cur.lat), Math.max(start.lng, cur.lng),
        ];
        if (b[2] - b[0] > 0.2 && b[3] - b[1] > 0.2) onDone?.(b);
      }
      setStart(null); setCur(null);
    },
  });
  if (!start || !cur) return null;
  return <Rectangle bounds={[[start.lat, start.lng], [cur.lat, cur.lng]]} pathOptions={{ color: "#39D5FF", weight: 1, dashArray: "4 4", fillOpacity: 0.08 }} />;
}

function Fly({ to }: { to?: [[number, number], [number, number]] | null }) {
  const map = useMap();
  useEffect(() => { if (to) map.flyToBounds(to, { duration: 1.2, padding: [30, 30] }); }, [to, map]);
  return null;
}

export default function FireMap({ sensors, viz, opacity = 1, drawing, selection, onSelect, flyTo, height = "100%", showRegions }: FireMapProps) {
  const pts = useMemo(() => sampleHotspots().filter((h) => sensors.includes(h.sensor)), [sensors]);
  const renderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
  const grid = useMemo(() => {
    if (viz !== "grid") return [];
    const cells = new Map<string, { lat: number; lng: number; n: number }>();
    for (const p of pts) {
      const lat = Math.floor(p.lat / 2) * 2, lng = Math.floor(p.lng / 2) * 2;
      const k = `${lat},${lng}`;
      const c = cells.get(k) ?? { lat, lng, n: 0 };
      c.n++; cells.set(k, c);
    }
    return [...cells.values()];
  }, [pts, viz]);
  const maxN = Math.max(1, ...grid.map((g) => g.n));

  return (
    <MapContainer center={[10, 20]} zoom={2} minZoom={2} worldCopyJump style={{ height, width: "100%" }} zoomControl preferCanvas>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO · Demo data'
      />
      {showRegions && REGIONS.map((r) => (
        <Rectangle key={r.id} bounds={r.bounds} pathOptions={{ color: "#39D5FF", weight: 0.6, opacity: 0.35, fillOpacity: 0.02, dashArray: "2 4" }}>
          <Tooltip sticky>{r.name}</Tooltip>
        </Rectangle>
      ))}
      {viz === "points" && pts.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={p.sensor === "VIIRS" ? 2.2 : 3.2} renderer={renderer}
          pathOptions={{ color: fireColor(p.frp), fillColor: fireColor(p.frp), weight: p.sensor === "MODIS" ? 1 : 0, fillOpacity: 0.85 * opacity, opacity: opacity }}>
          <Tooltip>
            <div className="font-mono text-[11px]">
              {p.sensor} · {p.date}<br />{p.lat.toFixed(3)}, {p.lng.toFixed(3)}<br />FRP {p.frp} MW · {p.confidence}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
      {viz === "heat" && pts.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={14} renderer={renderer}
          pathOptions={{ stroke: false, fillColor: fireColor(p.frp), fillOpacity: 0.06 * opacity }} />
      ))}
      {viz === "grid" && grid.map((g) => (
        <Rectangle key={`${g.lat},${g.lng}`} bounds={[[g.lat, g.lng], [g.lat + 2, g.lng + 2]]}
          pathOptions={{ weight: 0.4, color: "#82E5FF", opacity: 0.2, fillColor: g.n / maxN > 0.6 ? "#E94B3C" : g.n / maxN > 0.3 ? "#F58A42" : g.n / maxN > 0.1 ? "#E6B85C" : "#3B91A5", fillOpacity: 0.65 * opacity }}>
          <Tooltip><span className="font-mono text-[11px]">{g.n} detections · 2° cell</span></Tooltip>
        </Rectangle>
      ))}
      {selection && (
        <Rectangle bounds={[[selection[0], selection[1]], [selection[2], selection[3]]]} pathOptions={{ color: "#39D5FF", weight: 1.5, fillOpacity: 0.06 }} />
      )}
      <DrawBox active={!!drawing} onDone={onSelect} />
      <Fly to={flyTo} />
    </MapContainer>
  );
}
