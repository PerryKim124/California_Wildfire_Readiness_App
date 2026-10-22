import { useEffect, useRef } from "react";
import L from "leaflet";
import type { FireDetection } from "./lib/firms";
import type { MapPlace } from "./lib/household";
import type { LatLng, RoutePlan } from "./lib/geo";
import { BACKUP_ROUTE, INACTIVE_ROUTE, PRIMARY_ROUTE, addFires, createMap, destinationIcon, escapeHtml, homeIcon } from "./lib/mapBase";

export type PickTarget = "home" | "destination";

type Props = {
  home: MapPlace | null;
  destination: MapPlace | null;
  plan: RoutePlan | null;
  active: "primary" | "backup";
  fires: FireDetection[];
  /** When set, the next map click places this pin. */
  pickMode: PickTarget | null;
  onPick: (target: PickTarget, lat: number, lng: number) => void;
  /** Where to center when no home is set yet (e.g. the household's city). */
  fallbackCenter: LatLng | null;
};

// Rough frame of California, used before any place is known.
const CALIFORNIA: L.LatLngBoundsExpression = [[32.5, -124.4], [42.0, -114.1]];

// Interactive evacuation map: home and destination pins (draggable), the primary and backup
// routes, and live NASA FIRMS fire detections. It only draws what it's given; the
// Evacuation page owns the state and does the planning.
export default function EvacuationMap({ home, destination, plan, active, fires, pickMode, onPick, fallbackCenter }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ routes: L.LayerGroup; fires: L.LayerGroup; pins: L.LayerGroup } | null>(null);
  // Leaflet handlers are bound once, so they read the latest props through this ref.
  const latest = useRef({ pickMode, onPick });
  latest.current = { pickMode, onPick };

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const m = createMap(container.current, { scrollWheelZoom: true });
    m.fitBounds(CALIFORNIA);
    // The fire layer sits under the routes and pins so they stay clickable.
    layers.current = { fires: L.layerGroup().addTo(m), routes: L.layerGroup().addTo(m), pins: L.layerGroup().addTo(m) };
    m.on("click", (e: L.LeafletMouseEvent) => {
      const { pickMode: target, onPick: pick } = latest.current;
      if (target) pick(target, e.latlng.lat, e.latlng.lng);
    });
    map.current = m;
    return () => { m.remove(); map.current = null; layers.current = null; };
  }, []);

  // Crosshair cursor while waiting for a click to place a pin.
  useEffect(() => { container.current?.classList.toggle("is-picking", pickMode != null); }, [pickMode]);

  // Home and destination pins. Dragging a pin moves that place.
  useEffect(() => {
    const pins = layers.current?.pins;
    if (!pins) return;
    pins.clearLayers();
    for (const [target, place, icon] of [["home", home, homeIcon], ["destination", destination, destinationIcon]] as const) {
      if (!place) continue;
      L.marker([place.lat, place.lng], { icon, draggable: true, keyboard: true, title: `${target === "home" ? "Home" : "Destination"}: ${place.label}`, alt: target === "home" ? "Home" : "Destination" })
        .bindTooltip(`<b>${target === "home" ? "Home" : "Destination"}</b><br>${escapeHtml(place.label)}<br><small>Drag to adjust</small>`, { direction: "top" })
        .on("dragend", (e) => { const p = (e.target as L.Marker).getLatLng(); latest.current.onPick(target, p.lat, p.lng); })
        .addTo(pins);
    }
  }, [home, destination]);

  // Routes: the unselected one is drawn first, thin and faded, so the selected one is on top.
  useEffect(() => {
    const routes = layers.current?.routes;
    if (!routes) return;
    routes.clearLayers();
    if (!plan) return;
    const draw = (which: "primary" | "backup") => {
      const route = which === "primary" ? plan.primary : plan.backup;
      if (!route) return;
      const style = which === "primary" ? PRIMARY_ROUTE : BACKUP_ROUTE;
      L.polyline(route.coords, which === active ? style : { ...style, ...INACTIVE_ROUTE })
        .bindTooltip(which === "primary" ? "Primary route" : "Backup route", { sticky: true })
        .addTo(routes);
    };
    draw(active === "primary" ? "backup" : "primary");
    draw(active);
  }, [plan, active]);

  useEffect(() => {
    const layer = layers.current?.fires;
    if (!layer) return;
    layer.clearLayers();
    addFires(layer, fires);
  }, [fires]);

  // Frame the trip whenever the places or routes change (not when switching routes, which
  // would make the map jump while comparing them).
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const points: LatLng[] = [...(plan?.primary.coords ?? []), ...(plan?.backup?.coords ?? [])];
    for (const p of [home, destination]) if (p) points.push([p.lat, p.lng]);
    if (points.length > 1) m.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 14 });
    else if (points.length === 1) m.setView(points[0], 13);
    else if (fallbackCenter) m.setView(fallbackCenter, 11);
  }, [home, destination, plan, fallbackCenter]);

  // The legend sits beside the frame (not inside it) so on phones it can drop below the map
  // instead of covering it; on wider screens CSS floats it over the map's corner.
  return <div className="evac-map">
    <div className="evac-map-frame">
      <div ref={container} className="evac-map-canvas" role="region" aria-label="Evacuation route map. Use the search boxes to set places; the map also accepts clicks when placing a pin."/>
      {pickMode && <div className="evac-pick-hint" role="status">Click the map to place your {pickMode === "home" ? "home" : "destination"}</div>}
    </div>
    <div className="fire-legend evac-legend" aria-label="Map legend">
      <b>Legend</b>
      <span><i className="map-pin-icon map-pin-home mini"><span>H</span></i>Home</span>
      <span><i className="map-pin-icon map-pin-destination mini"><span>D</span></i>Destination</span>
      <span><i className="evac-legend-line primary"/>Primary route</span>
      <span><i className="evac-legend-line backup"/>Backup route</span>
      <span><i className="fire-legend-dot"/>Fire detection (24 h)</span>
    </div>
  </div>;
}
