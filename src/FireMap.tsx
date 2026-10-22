import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CALIFORNIA_BOUNDARY } from "../supabase/functions/_shared/california-boundary.ts";
import { fetchCaliforniaFires, type FireDetection, type FiresResult } from "./lib/firms";

const FIRE_STYLE: L.CircleMarkerOptions = { radius: 5, color: "#7f1d1d", weight: 1, fillColor: "#dc2626", fillOpacity: 0.9 };
const AREA_STYLE: L.CircleMarkerOptions = { color: "#c2410c", weight: 2, dashArray: "4 3", fillColor: "#f97316", fillOpacity: 0.18 };
const BOUNDARY_STYLE: L.PathOptions = { color: "#225a43", weight: 2, fill: false, interactive: false };
const AREA_GAP_KM = 3; // detections closer than this (chained) count as one fire area
const LABELED_AREAS = 8; // permanent map labels for the largest areas; the rest label on hover
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

const pacific = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
const utc = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

type FireArea = {
  id: string;
  label: string;
  detections: FireDetection[];
  center: L.LatLng;
  bounds: L.LatLngBounds;
  latest: string | null;
  maxConfidence: number | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function ago(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function placeLabel(d: FireDetection) {
  const p = d.nearest;
  if (!p) return `Near ${d.latitude.toFixed(2)}, ${d.longitude.toFixed(2)}`;
  return p.miles < 1 ? `In ${p.name}` : `${Math.round(p.miles)} mi ${p.direction} of ${p.name}`;
}

const kmBetween = (a: FireDetection, b: FireDetection) => L.latLng(a.latitude, a.longitude).distanceTo([b.latitude, b.longitude]) / 1000;

// Group detections into fire areas: any two within AREA_GAP_KM end up in the same area.
function groupIntoAreas(detections: FireDetection[]): FireArea[] {
  const parent = detections.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (let i = 0; i < detections.length; i++)
    for (let j = i + 1; j < detections.length; j++)
      if (kmBetween(detections[i], detections[j]) <= AREA_GAP_KM) parent[root(i)] = root(j);

  const groups = new Map<number, FireDetection[]>();
  detections.forEach((d, i) => groups.set(root(i), [...(groups.get(root(i)) ?? []), d]));

  return [...groups.values()].map((members) => {
    const center = L.latLng(members.reduce((s, d) => s + d.latitude, 0) / members.length, members.reduce((s, d) => s + d.longitude, 0) / members.length);
    const central = members.reduce((best, d) => (center.distanceTo([d.latitude, d.longitude]) < center.distanceTo([best.latitude, best.longitude]) ? d : best));
    const times = members.map((d) => d.acquiredAt).filter((t): t is string => t != null).sort();
    const confidences = members.map((d) => d.confidence).filter((c): c is number => c != null);
    return {
      id: central.id,
      label: placeLabel(central),
      detections: members,
      center,
      bounds: L.latLngBounds(members.map((d) => [d.latitude, d.longitude] as [number, number])),
      latest: times[times.length - 1] ?? null,
      maxConfidence: confidences.length ? Math.max(...confidences) : null,
    };
  }).sort((a, b) => b.detections.length - a.detections.length || (b.latest ?? "").localeCompare(a.latest ?? ""));
}

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
const mapsLink = (lat: number, lon: number) => `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(5)},${lon.toFixed(5)}`;

function detectionPopup(d: FireDetection) {
  const row = (label: string, value: string | null) => `<div class="fire-pop-row"><span>${label}</span><b>${escapeHtml(value ?? "Not available")}</b></div>`;
  const when = d.acquiredAt ? new Date(d.acquiredAt) : null;
  return `<div class="fire-pop">
    <strong>Fire detection</strong>
    <p class="fire-pop-place">${escapeHtml(placeLabel(d))}</p>
    ${row("Detected", when ? pacific.format(when) : null)}
    ${when ? row("Detected (UTC)", `${utc.format(when)} UTC`) : ""}
    ${row("Coordinates", `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}`)}
    ${row("Satellite / instrument", d.instrument)}
    ${row("Confidence", d.confidence != null ? `${Math.round(d.confidence)}%` : null)}
    ${row("Brightness (Ch. 21/22)", d.brightness != null ? `${d.brightness.toFixed(1)} K` : null)}
    ${row("Brightness (Ch. 31)", d.brightness2 != null ? `${d.brightness2.toFixed(1)} K` : null)}
    ${row("Fire radiative power", d.frp != null ? `${d.frp.toFixed(1)} MW` : null)}
    ${row("Day / night", d.daynight)}
    <a class="fire-pop-link" href="${mapsLink(d.latitude, d.longitude)}" target="_blank" rel="noreferrer">Open location in Google Maps ↗</a>
  </div>`;
}

function areaPopup(a: FireArea) {
  return `<div class="fire-pop">
    <strong>Fire area · ${escapeHtml(a.label)}</strong>
    <div class="fire-pop-row"><span>Detections</span><b>${a.detections.length}</b></div>
    <div class="fire-pop-row"><span>Most recent</span><b>${a.latest ? escapeHtml(pacific.format(new Date(a.latest))) : "Not available"}</b></div>
    <div class="fire-pop-row"><span>Highest confidence</span><b>${a.maxConfidence != null ? `${Math.round(a.maxConfidence)}%` : "Not available"}</b></div>
    <small>Nearby detections (within ${AREA_GAP_KM} km of each other) grouped as one area. Zoom in and click a red dot for its details.</small>
  </div>`;
}

function RefreshIcon() {
  return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>;
}

export default function FireMap() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const californiaBounds = useRef<L.LatLngBounds | null>(null);
  const fireLayer = useRef<L.LayerGroup | null>(null);
  const areaMarkers = useRef(new Map<string, L.CircleMarker>());
  const request = useRef<AbortController | null>(null);
  const [data, setData] = useState<FiresResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const areas = useMemo(() => groupIntoAreas(data?.detections ?? []), [data]);

  const showCalifornia = useCallback(() => {
    if (map.current && californiaBounds.current) map.current.fitBounds(californiaBounds.current, { padding: [12, 12] });
  }, []);

  // Create the Leaflet map once, framed on California.
  useEffect(() => {
    if (!container.current) return;
    const m = L.map(container.current, { preferCanvas: true, minZoom: 4 });
    const esriCredit = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';
    const terrain = L.tileLayer(`${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19, attribution: `${esriCredit} — Esri, HERE, Garmin, USGS, NPS` });
    const streets = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });
    const satellite = L.layerGroup([
      L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19, attribution: `${esriCredit} — Esri, Maxar, Earthstar Geographics` }),
      L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19 }),
    ]);
    terrain.addTo(m);
    L.control.layers({ Terrain: terrain, Streets: streets, Satellite: satellite }, undefined, { position: "topright" }).addTo(m);
    L.control.scale({ imperial: true, metric: false, position: "bottomright" }).addTo(m);

    const outline = L.geoJSON(CALIFORNIA_BOUNDARY as GeoJSON.Feature, { style: BOUNDARY_STYLE }).addTo(m);
    californiaBounds.current = outline.getBounds();
    m.fitBounds(californiaBounds.current, { padding: [12, 12] });
    m.attributionControl.addAttribution('Fire data: <a href="https://firms2.modaps.eosdis.nasa.gov/usfs/">NASA FIRMS</a> · Boundary &amp; places: U.S. Census Bureau');
    fireLayer.current = L.layerGroup().addTo(m);
    map.current = m;

    // Leaflet measures its container once; re-measure when the layout changes size.
    const resize = new ResizeObserver(() => m.invalidateSize());
    resize.observe(container.current);
    return () => { resize.disconnect(); m.remove(); map.current = null; fireLayer.current = null; };
  }, []);

  const load = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    fetchCaliforniaFires(controller.signal).then(
      (result) => { setData(result); setError(null); },
      (e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Couldn't load fire data."); },
    ).finally(() => { if (request.current === controller) { setLoading(false); setNow(Date.now()); } });
  }, []);

  useEffect(() => { load(); return () => request.current?.abort(); }, [load]);

  // Keep the "updated N min ago" label current.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Draw a labeled halo per fire area, then one red dot per detection at its reported position.
  useEffect(() => {
    const layer = fireLayer.current;
    if (!layer) return;
    layer.clearLayers();
    areaMarkers.current.clear();
    areas.forEach((area, i) => {
      const marker = L.circleMarker(area.center, { ...AREA_STYLE, radius: 12 + Math.min(18, Math.sqrt(area.detections.length) * 4) })
        .bindPopup(areaPopup(area), { maxWidth: 280 })
        .bindTooltip(`${escapeHtml(area.label)} · ${plural(area.detections.length, "detection")}`, { permanent: i < LABELED_AREAS, direction: "right", offset: [14, 0], className: "fire-area-label" })
        .addTo(layer);
      areaMarkers.current.set(area.id, marker);
    });
    for (const d of data?.detections ?? []) {
      L.circleMarker([d.latitude, d.longitude], FIRE_STYLE)
        .bindPopup(detectionPopup(d), { maxWidth: 290 })
        .bindTooltip(escapeHtml(placeLabel(d)), { direction: "top", offset: [0, -6] })
        .addTo(layer);
    }
  }, [areas, data]);

  const focusArea = (area: FireArea) => {
    const m = map.current;
    if (!m) return;
    m.flyToBounds(area.bounds.pad(0.5), { maxZoom: 12, duration: 0.8 });
    m.once("moveend", () => areaMarkers.current.get(area.id)?.openPopup());
    container.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const count = data?.detections.length ?? 0;
  const firstLoad = loading && !data;

  return <div className="fire-map">
    <div className="fire-map-toolbar">
      <div>
        <span className="kicker">ACTIVE FIRE DETECTIONS · CALIFORNIA</span>
        <h2>{data ? `${plural(count, "detection")} in ${plural(areas.length, "area")}` : "Satellite fire detections"} <span className="badge badge-orange">{data?.timeRange ?? "Last 24 hours"}</span></h2>
      </div>
      <div className="fire-map-actions">
        <button className="btn btn-secondary" onClick={showCalifornia}>Show all of California</button>
        <button className="btn btn-secondary" onClick={load} disabled={loading} aria-label="Refresh fire data">
          <span className={loading ? "fire-spin" : ""}><RefreshIcon/></span><span>{loading ? "Refreshing…" : "Refresh"}</span>
        </button>
      </div>
    </div>

    {error && data && <div className="fire-alert" role="alert">Refresh failed: {error} Showing the last successful data.</div>}
    {data?.truncated && <div className="fire-alert" role="status">FIRMS returned its maximum of {data.limit.toLocaleString()} records for this area, so some detections may be missing.</div>}

    <div className="fire-map-frame">
      <div ref={container} className="fire-map-canvas" role="region" aria-label="Interactive map of NASA FIRMS fire detections in California"/>

      <div className="fire-legend" aria-label="Map legend">
        <b>Legend</b>
        <span><i className="fire-legend-area"/>Fire area (nearby detections)</span>
        <span><i className="fire-legend-dot"/>Satellite fire detection (~1 km)</span>
        <span><i className="fire-legend-line"/>California boundary</span>
        <small>Click an area or dot for details.</small>
      </div>

      {firstLoad && <div className="fire-overlay" role="status"><span className="fire-spin"><RefreshIcon/></span> Loading NASA FIRMS fire detections…</div>}
      {error && !data && !loading && <div className="fire-overlay fire-overlay-error" role="alert">
        <b>Fire data is unavailable</b><span>{error}</span><button className="btn btn-primary" onClick={load}>Try again</button>
      </div>}
      {data && count === 0 && !loading && <div className="fire-overlay" role="status">
        <b>No fire detections in California</b><span>NASA FIRMS reported no MODIS detections inside the state in the {data.timeRange.toLowerCase()}.</span>
      </div>}
    </div>

    {areas.length > 0 && <div className="fire-areas">
      <h3>Where the fires are <small>Select an area to zoom to it</small></h3>
      <ul>{areas.map((area) => <li key={area.id}>
        <button onClick={() => focusArea(area)}>
          <i className="fire-legend-dot"/>
          <div>
            <b>{area.label}</b>
            <small>{plural(area.detections.length, "detection")}{area.latest ? ` · last seen ${pacific.format(new Date(area.latest))}` : ""}{area.maxConfidence != null ? ` · up to ${Math.round(area.maxConfidence)}% confidence` : ""}</small>
          </div>
          <span aria-hidden="true">→</span>
        </button>
      </li>)}</ul>
    </div>}

    <div className="fire-map-meta">
      <span>Source: <a href={data?.source.url ?? "https://firms2.modaps.eosdis.nasa.gov/usfs/"} target="_blank" rel="noreferrer">NASA FIRMS (LANCE) US/Canada</a> · WFS layer <code>{data?.source.layer ?? "ms:fires_modis_24hrs"}</code> · FIRMS refreshes about every 15 minutes</span>
      <span>{data ? <>Last retrieved {pacific.format(new Date(data.retrievedAt))} ({ago(data.retrievedAt, now)}) via {data.via}</> : "Not retrieved yet"}</span>
    </div>
  </div>;
}
