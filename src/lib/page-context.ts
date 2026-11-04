import { MONTHS, REGIONS, insights, scoreSeries, seasonalAverages, yearlyTotals, type MonthRecord } from "./fire-data";
import type { Selection } from "./store";

export const PAGE_GUIDES: Record<string, { name: string; guide: string; suggestions: string[] }> = {
  "/": {
    name: "Overview",
    guide: "Overview page: a spinning 3D Earth with orbiting satellites and fire markers, summary stat cards (total hotspots, peak month, active regions), and a 2D world fire map. The header region picker changes the selected area for every page.",
    suggestions: ["Summarise fire activity here", "Which month peaks?", "What do the markers mean?"],
  },
  "/explorer": {
    name: "Fire Explorer",
    guide: "Fire Explorer: left control panel (Select/Draw area, bounding box S/W/N/E inputs, sensor toggle Harmonised/MODIS/VIIRS, visualisation Hotspots/Heatmap/Cell grid, layer opacity). Centre: 3D Globe / 2D Map switch — press 'Select area' then click the Earth (16°×24° box) or drag on the 2D map. Right: selected-area stats, monthly hotspot chart with year range, export. Bottom: region breakdown, seasonal profile and yearly totals for the selection. All sections can be resized by dragging the dividers.",
    suggestions: ["How do I select an area?", "Explain the selected area stats", "Which year was worst here?"],
  },
  "/calendar": {
    name: "Burning Calendar",
    guide: "Burning Calendar: a heat grid of years (rows, 2000–2025) by months (columns), coloured by deviation from the monthly historical median. Hover a cell for details, click to pin it, click year labels to compare years.",
    suggestions: ["Which months are most anomalous?", "How do I compare years?", "What do the colours mean?"],
  },
  "/analytics": {
    name: "Historical Analytics",
    guide: "Historical Analytics: monthly activity vs historical median, generated insights on critical periods, seasonal burning pattern, yearly totals, current month vs median, and anomaly deviation chart (%).",
    suggestions: ["What are the key insights?", "Is this year above normal?", "Explain the anomaly chart"],
  },
  "/harmonisation": {
    name: "Sensor Harmonisation",
    guide: "Sensor Harmonisation: compares raw MODIS (1 km pixels, since 2000) and VIIRS (375 m pixels, since 2012) counts with the harmonised series. VIIRS detects about 3.4× more fires than MODIS; harmonised values rescale VIIRS to MODIS-equivalent so the 2000–2025 record is consistent.",
    suggestions: ["Why harmonise sensors?", "MODIS vs VIIRS differences", "How big is the scaling?"],
  },
};

export function guideFor(path: string) {
  return PAGE_GUIDES[path] ?? PAGE_GUIDES["/"];
}

export function buildPageContext(path: string, sel: Selection, series: MonthRecord[]) {
  const g = guideFor(path);
  const years = yearlyTotals(series).map((y) => `${y.year}: ${y.harmonised}`).join(", ");
  const seasonal = seasonalAverages(series).map((s) => `${s.month} ${s.avg}`).join(", ");
  const recent = scoreSeries(series).slice(-12).map((c) => `${MONTHS[c.month]} ${c.year}: ${c.harmonised} (median ${Math.round(c.median)}, ${c.deviationPct.toFixed(0)}%, ${c.level})`).join("; ");
  const regions = sel.regionId === "global" ? "all monitored regions" : sel.regionIds.map((id) => REGIONS.find((r) => r.id === id)?.name ?? id).join(", ") || "none";
  return `## Current page: ${g.name}
${g.guide}

## Current selection
${sel.label}${sel.bbox ? ` — box S ${sel.bbox[0].toFixed(1)}, W ${sel.bbox[1].toFixed(1)}, N ${sel.bbox[2].toFixed(1)}, E ${sel.bbox[3].toFixed(1)}` : ""}. Regions included: ${regions}.
Monitored regions in app: ${REGIONS.map((r) => r.name).join(", ")}.

## Data for selection (demonstration data, harmonised MODIS-equivalent counts)
Yearly totals: ${years}
Average by month: ${seasonal}
Last 12 months vs median: ${recent}
Insights: ${insights(series).join(" ")}`;
}
