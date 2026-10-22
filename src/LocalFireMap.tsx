import { useEffect, useRef } from "react";
import L from "leaflet";
import type { FireDetection } from "./lib/firms";
import type { MapPlace, SavedRoute } from "./lib/household";
import { PRIMARY_ROUTE, addFires, createMap, destinationIcon, escapeHtml, homeIcon } from "./lib/mapBase";

type Props = {
  home: MapPlace;
  /** True when `home` is only the city center (no address set yet). */
  approximate: boolean;
  destination: MapPlace | null;
  route: SavedRoute | null;
  fires: FireDetection[];
  radiusMiles: number;
};

const METERS_PER_MILE = 1609.344;

// Compact map for the dashboard's "Local wildfire overview": the household's home, a
// radius ring for "nearby", the saved primary evacuation route, and live fire detections.
// Scroll-wheel zoom is off so scrolling the dashboard doesn't get captured by the map.
export default function LocalFireMap({ home, approximate, destination, route, fires, radiusMiles }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const m = createMap(container.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; layer.current = null; };
  }, []);

  // Redraw everything when any input changes; there are only a handful of shapes.
  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    // Frame the radius first: Leaflet can't measure a circle until the map has a view, so the
    // bounds come from the home point and radius rather than from the circle layer.
    const radius = radiusMiles * METERS_PER_MILE;
    m.fitBounds(L.latLng(home.lat, home.lng).toBounds(radius * 2), { padding: [6, 6] });
    L.circle([home.lat, home.lng], { radius, color: "#d84a27", weight: 1.5, dashArray: "4 6", fill: true, fillColor: "#d84a27", fillOpacity: 0.04, interactive: false }).addTo(g);
    addFires(g, fires);
    if (route) L.polyline(route.line, { ...PRIMARY_ROUTE, weight: 4 }).bindTooltip(`Saved evacuation route · ${route.miles.toFixed(1)} mi`, { sticky: true }).addTo(g);
    if (destination) L.marker([destination.lat, destination.lng], { icon: destinationIcon, keyboard: false }).bindTooltip(`<b>Destination</b><br>${escapeHtml(destination.label)}`).addTo(g);
    L.marker([home.lat, home.lng], { icon: homeIcon, keyboard: false }).bindTooltip(approximate ? "Your city (set your address on the Evacuation page for accuracy)" : "Home").addTo(g);
  }, [home, approximate, destination, route, fires, radiusMiles]);

  return <div ref={container} className="local-map" role="img" aria-label={`Map of fire detections within ${radiusMiles} miles of your home`}/>;
}
