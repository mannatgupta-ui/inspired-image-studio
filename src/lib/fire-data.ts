// Demonstration dataset generator for HOTSPOT SYNC.
// Deterministic (seeded) so every render and export is reproducible.
// All values are SYNTHETIC demo data shaped like NASA FIRMS monthly aggregates.

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const START_YEAR = 2000;
export const END_YEAR = 2025;
export const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);
export const VIIRS_START = 2012;

export type Sensor = "MODIS" | "VIIRS";

export interface Region {
  id: string;
  name: string;
  center: [number, number];
  bounds: [[number, number], [number, number]]; // [[south, west],[north, east]]
  peakMonth: number; // 0-11
  spread: number;
  base: number;
}

export const REGIONS: Region[] = [
  { id: "amazon", name: "Amazon Basin", center: [-8, -60], bounds: [[-16, -72], [0, -46]], peakMonth: 8, spread: 1.6, base: 9000 },
  { id: "sahel", name: "Sahel & Central Africa", center: [8, 18], bounds: [[0, 0], [14, 34]], peakMonth: 0, spread: 1.8, base: 14000 },
  { id: "sa-africa", name: "Southern Africa", center: [-13, 25], bounds: [[-20, 14], [-6, 36]], peakMonth: 7, spread: 1.5, base: 12000 },
  { id: "seasia", name: "Mainland SE Asia", center: [18, 101], bounds: [[10, 94], [26, 108]], peakMonth: 2, spread: 1.0, base: 7000 },
  { id: "india", name: "Indo-Gangetic Plain", center: [28, 78], bounds: [[22, 70], [32, 88]], peakMonth: 3, spread: 1.4, base: 4200 },
  { id: "siberia", name: "Eastern Siberia", center: [62, 125], bounds: [[54, 105], [70, 145]], peakMonth: 6, spread: 0.9, base: 3500 },
  { id: "australia", name: "Northern Australia", center: [-16, 132], bounds: [[-22, 120], [-11, 146]], peakMonth: 9, spread: 1.4, base: 5200 },
  { id: "california", name: "Western North America", center: [42, -120], bounds: [[34, -126], [52, -110]], peakMonth: 7, spread: 0.9, base: 1800 },
  { id: "indonesia", name: "Indonesia (Sumatra–Borneo)", center: [-1, 108], bounds: [[-5, 98], [4, 118]], peakMonth: 8, spread: 0.8, base: 3000 },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Years with a strong burning anomaly per region (e.g. El Niño years)
const EVENT_YEARS: Record<string, number[]> = {
  amazon: [2005, 2010, 2019, 2024],
  indonesia: [2006, 2015, 2019, 2023],
  australia: [2002, 2012, 2019],
  siberia: [2003, 2012, 2019, 2021],
  california: [2018, 2020, 2021],
  seasia: [2007, 2016, 2023],
  india: [2016, 2021],
  sahel: [2004, 2016],
  "sa-africa": [2008, 2017],
};

export interface MonthRecord {
  year: number;
  month: number; // 0-11
  modis: number;
  viirs: number | null; // null before VIIRS availability
  harmonised: number;
}

const cache = new Map<string, MonthRecord[]>();

/** Monthly records for a region. VIIRS detects ~3.4× more than MODIS; harmonised = MODIS-equivalent scale. */
export function regionSeries(regionId: string): MonthRecord[] {
  const hit = cache.get(regionId);
  if (hit) return hit;
  const r = REGIONS.find((x) => x.id === regionId)!;
  const rand = mulberry32(regionId.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const out: MonthRecord[] = [];
  for (const year of YEARS) {
    const trend = 1 + (year - START_YEAR) * 0.006;
    const event = EVENT_YEARS[r.id]?.includes(year) ? 1.7 + rand() * 0.6 : 1;
    for (let m = 0; m < 12; m++) {
      let d = Math.abs(m - r.peakMonth);
      d = Math.min(d, 12 - d);
      const season = Math.exp(-(d * d) / (2 * r.spread * r.spread));
      const noise = 0.75 + rand() * 0.5;
      const truth = r.base * season * trend * noise * (season > 0.3 ? event : 1);
      const modis = Math.round(truth * (0.92 + rand() * 0.16));
      const viirs = year >= VIIRS_START ? Math.round(truth * 3.4 * (0.92 + rand() * 0.16)) : null;
      const harmonised = viirs == null ? modis : Math.round((modis + viirs / 3.4) / 2);
      out.push({ year, month: m, modis, viirs, harmonised });
    }
  }
  cache.set(regionId, out);
  return out;
}

export function globalSeries(): MonthRecord[] {
  const all = REGIONS.map((r) => regionSeries(r.id));
  return all[0].map((rec, i) => ({
    year: rec.year,
    month: rec.month,
    modis: all.reduce((s, a) => s + a[i].modis, 0),
    viirs: rec.viirs == null ? null : all.reduce((s, a) => s + (a[i].viirs ?? 0), 0),
    harmonised: all.reduce((s, a) => s + a[i].harmonised, 0),
  }));
}

export function seriesFor(regionId: string | "global") {
  return regionId === "global" ? globalSeries() : regionSeries(regionId);
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Historical median per calendar month, built from all years EXCEPT the one being scored. */
export function baselineFor(records: MonthRecord[], year: number, month: number) {
  return median(records.filter((r) => r.month === month && r.year !== year).map((r) => r.harmonised));
}

export type AnomalyLevel = "below" | "normal" | "elevated" | "extreme";

export function classify(deviationPct: number): AnomalyLevel {
  if (deviationPct < -25) return "below";
  if (deviationPct <= 25) return "normal";
  if (deviationPct <= 75) return "elevated";
  return "extreme";
}

export interface ScoredCell extends MonthRecord {
  median: number;
  deviationPct: number;
  anomaly: number; // ratio-based score, log2(count/median)
  level: AnomalyLevel;
}

export function scoreSeries(records: MonthRecord[]): ScoredCell[] {
  return records.map((r) => {
    const med = baselineFor(records, r.year, r.month);
    const deviationPct = med === 0 ? 0 : ((r.harmonised - med) / med) * 100;
    const anomaly = med === 0 ? 0 : Math.log2((r.harmonised + 1) / (med + 1));
    return { ...r, median: med, deviationPct, anomaly, level: classify(deviationPct) };
  });
}

export function yearlyTotals(records: MonthRecord[]) {
  return YEARS.map((year) => {
    const rs = records.filter((r) => r.year === year);
    return {
      year,
      modis: rs.reduce((s, r) => s + r.modis, 0),
      viirs: rs[0]?.viirs == null ? null : rs.reduce((s, r) => s + (r.viirs ?? 0), 0),
      harmonised: rs.reduce((s, r) => s + r.harmonised, 0),
    };
  });
}

export function seasonalAverages(records: MonthRecord[]) {
  return MONTHS.map((name, m) => {
    const rs = records.filter((r) => r.month === m);
    return { month: name, avg: Math.round(rs.reduce((s, r) => s + r.harmonised, 0) / rs.length) };
  });
}

/** Text insights derived from the data (never hardcoded). */
export function insights(records: MonthRecord[]): string[] {
  const seasonal = seasonalAverages(records);
  const total = seasonal.reduce((s, x) => s + x.avg, 0) || 1;
  let best = 0, bestStart = 0;
  for (let i = 0; i < 12; i++) {
    const sum = seasonal[i].avg + seasonal[(i + 1) % 12].avg + seasonal[(i + 2) % 12].avg;
    if (sum > best) { best = sum; bestStart = i; }
  }
  const scored = scoreSeries(records).filter((c) => c.median > 50);
  const top = [...scored].sort((a, b) => b.deviationPct - a.deviationPct)[0];
  const years = yearlyTotals(records);
  const topYear = [...years].sort((a, b) => b.harmonised - a.harmonised)[0];
  const out = [
    `${MONTHS[bestStart]} to ${MONTHS[(bestStart + 2) % 12]} accounts for ${Math.round((best / total) * 100)}% of average annual hotspot activity in the selected region.`,
    `${topYear.year} was the most active year on record, with ${topYear.harmonised.toLocaleString()} harmonised hotspots.`,
  ];
  if (top) out.push(`${MONTHS[top.month]} ${top.year} recorded ${Math.round(top.deviationPct)}% more activity than its historical median — the strongest anomaly in the record.`);
  return out;
}

export interface Hotspot {
  id: number;
  lat: number;
  lng: number;
  sensor: Sensor;
  frp: number; // fire radiative power, MW
  confidence: "low" | "nominal" | "high";
  date: string;
  region: string;
}

let hotspotCache: Hotspot[] | null = null;
/** A sample of individual detections for the latest month (demo). */
export function sampleHotspots(): Hotspot[] {
  if (hotspotCache) return hotspotCache;
  const rand = mulberry32(42);
  const out: Hotspot[] = [];
  let id = 1;
  for (const r of REGIONS) {
    const n = Math.round(r.base / 60);
    for (let i = 0; i < n; i++) {
      const [[s, w], [nn, e]] = r.bounds;
      // cluster around a few seeds inside region
      const cx = w + (e - w) * (0.2 + 0.6 * rand());
      const cy = s + (nn - s) * (0.2 + 0.6 * rand());
      const lat = Math.max(s, Math.min(nn, cy + (rand() - 0.5) * (nn - s) * 0.5));
      const lng = Math.max(w, Math.min(e, cx + (rand() - 0.5) * (e - w) * 0.5));
      out.push({
        id: id++,
        lat: +lat.toFixed(4),
        lng: +lng.toFixed(4),
        sensor: rand() < 0.72 ? "VIIRS" : "MODIS",
        frp: +(2 + rand() ** 3 * 220).toFixed(1),
        confidence: rand() < 0.15 ? "low" : rand() < 0.7 ? "nominal" : "high",
        date: `2025-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
        region: r.id,
      });
    }
  }
  hotspotCache = out;
  return out;
}

/** Approximate area of a lat/lng bounding box in km². */
export function bboxAreaKm2(south: number, west: number, north: number, east: number) {
  const R = 6371;
  const rad = Math.PI / 180;
  return Math.abs((R * R * (east - west) * rad) * (Math.sin(north * rad) - Math.sin(south * rad)));
}

/** Regions whose bounds intersect a selection box. */
export function regionsInBox(south: number, west: number, north: number, east: number) {
  return REGIONS.filter((r) => {
    const [[s, w], [n, e]] = r.bounds;
    return !(e < west || w > east || n < south || s > north);
  });
}

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  return [keys.join(","), ...rows.map((r) => keys.map((k) => r[k] ?? "").join(","))].join("\n");
}

export function downloadCSV(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const fmt = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n));
