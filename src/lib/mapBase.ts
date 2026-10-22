// Leaflet setup shared by the evacuation map and the dashboard's local map: basemap, pins,
// route styles, and fire markers styled like the Wildfire Risk map (src/FireMap.tsx).

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FireDetection } from "./firms";

export const FIRE_STYLE: L.CircleMarkerOptions = { radius: 6, color: "#7f1d1d", weight: 1, fillColor: "#dc2626", fillOpacity: 0.85 };
export const PRIMARY_ROUTE: L.PolylineOptions = { color: "#1d6047", weight: 5, opacity: 0.9, lineCap: "round", lineJoin: "round" };
export const BACKUP_ROUTE: L.PolylineOptions = { color: "#2b6693", weight: 5, opacity: 0.9, dashArray: "2 9", lineCap: "round", lineJoin: "round" };
// The route not currently selected is drawn thin and faded so the selected one reads first.
export const INACTIVE_ROUTE: L.PolylineOptions = { weight: 3, opacity: 0.45 };

// Basemap for the evacuation and dashboard maps. OpenStreetMap's standard tiles are free and need no key
// (CARTO's basemaps now return "API key required" tiles). OSM's tile policy asks for
// attribution and light use; a busy production deployment should use a tile provider.
// The tiles are slightly desaturated in CSS (.leaflet-tile-pane) so fires and routes stand out.
export const BASEMAP_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const BASEMAP_OPTIONS: L.TileLayerOptions = {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

/** A Leaflet map with the app's basemap and OpenStreetMap/NASA attribution. */
export function createMap(container: HTMLElement, options: L.MapOptions = {}) {
  const map = L.map(container, { preferCanvas: true, minZoom: 5, ...options });
  L.tileLayer(BASEMAP_URL, BASEMAP_OPTIONS).addTo(map);
  map.attributionControl.addAttribution('Fires: <a href="https://firms2.modaps.eosdis.nasa.gov/usfs/">NASA FIRMS</a>');
  return map;
}

// Pin markers built from HTML (L.divIcon) instead of Leaflet's default image icons, whose
// image paths break under bundlers. The letter keeps them readable without relying on color.
function pin(kind: "home" | "destination", letter: string, label: string) {
  return L.divIcon({ className: "", html: `<div class="map-pin-icon map-pin-${kind}" aria-label="${label}"><span>${letter}</span></div>`, iconSize: [30, 38], iconAnchor: [15, 36], tooltipAnchor: [0, -32] });
}
export const homeIcon = pin("home", "H", "Home");
export const destinationIcon = pin("destination", "D", "Destination");

/** One red circle per satellite detection, with a short hover label. */
export function addFires(layer: L.LayerGroup, fires: FireDetection[]) {
  for (const f of fires) {
    const where = f.nearest ? ` · ${f.nearest.miles} mi ${f.nearest.direction} of ${escapeHtml(f.nearest.name)}` : "";
    L.circleMarker([f.latitude, f.longitude], FIRE_STYLE).bindTooltip(`Satellite fire detection${where}`, { direction: "top", offset: [0, -6] }).addTo(layer);
  }
}

/** Leaflet tooltips render HTML; place labels come from search results, so escape them. */
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
