// Geography helpers for the evacuation planner and the dashboard's local overview:
// address search (OpenStreetMap Nominatim), driving routes (OSRM), and the distance math
// used to check routes against NASA FIRMS fire detections.
//
// Both services are free, keyless, and allow browser requests, but they're community
// services with usage policies (Nominatim: at most 1 request/second, no search-as-you-type).
// So searches only run when the person submits, Nominatim calls are spaced out, and
// results are cached. A production deployment should switch to a hosted provider.

import type { FireDetection } from "./firms";

/** A point on the map with a human-readable label. */
export type Place = { label: string; lat: number; lng: number };
/** [latitude, longitude], the order Leaflet uses. */
export type LatLng = [number, number];

export type Route = {
  coords: LatLng[];
  meters: number;
  seconds: number;
  /** Main roads in driving order, longest stretches first (e.g. "I 15", "CA 56"). */
  roads: string[];
  /** Waypoint the route was forced through (backup routes only), for navigation links. */
  via: LatLng | null;
};

export type RoutePlan = {
  primary: Route;
  backup: Route | null;
  /** Share of the backup route that runs on the same roads as the primary, 0–1. */
  backupOverlap: number | null;
};

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org/route/v1/driving";
// Search inside a box around California so "Main Street" doesn't land in another state.
const CA_VIEWBOX = "-124.6,42.1,-114.0,32.4";
const MILES_PER_METER = 1 / 1609.344;
const EARTH_RADIUS_MI = 3958.8;

// ---- address search ---------------------------------------------------------

let lastNominatim = 0;
const searchCache = new Map<string, Promise<Place[]>>();

// Space Nominatim requests at least 1.1 s apart, per its usage policy.
async function nominatim<T>(path: string, signal?: AbortSignal): Promise<T> {
  const wait = lastNominatim + 1100 - Date.now();
  lastNominatim = Math.max(Date.now(), lastNominatim + 1100);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const response = await fetch(`${NOMINATIM}${path}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Address search failed (HTTP ${response.status}).`);
  return response.json() as Promise<T>;
}

// Nominatim labels are long ("Poway, San Diego County, California, 92064, United States");
// keep the first few parts and drop the country.
function shortLabel(displayName: string) {
  return displayName.split(", ").filter((part) => part !== "United States").slice(0, 3).join(", ");
}

/** Up to 5 matching places in or near California. */
export function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const key = query.trim().toLowerCase();
  if (!key) return Promise.resolve([]);
  if (!searchCache.has(key)) {
    const params = new URLSearchParams({ q: query.trim(), format: "jsonv2", limit: "5", countrycodes: "us", viewbox: CA_VIEWBOX, bounded: "1" });
    const request = nominatim<{ display_name: string; lat: string; lon: string }[]>(`/search?${params}`, signal)
      .then((rows) => rows.map((r) => ({ label: shortLabel(r.display_name), lat: Number(r.lat), lng: Number(r.lon) })));
    request.catch(() => searchCache.delete(key)); // don't cache failures or aborts
    searchCache.set(key, request);
  }
  return searchCache.get(key)!;
}

/** A label for a point someone clicked or got from their device's location. */
export async function describePoint(lat: number, lng: number, signal?: AbortSignal): Promise<string> {
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "jsonv2", zoom: "17" });
    const r = await nominatim<{ display_name?: string }>(`/reverse?${params}`, signal);
    if (r.display_name) return shortLabel(r.display_name);
  } catch (e) {
    if (signal?.aborted) throw e;
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; // fall back to coordinates
}

// ---- distance math ----------------------------------------------------------

const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in miles. */
export function milesBetween(a: LatLng, b: LatLng) {
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

/** Compass direction from `from` to `to`, e.g. "NE". */
export function directionTo(from: LatLng, to: LatLng) {
  const y = Math.sin(rad(to[1] - from[1])) * Math.cos(rad(to[0]));
  const x = Math.cos(rad(from[0])) * Math.sin(rad(to[0])) - Math.sin(rad(from[0])) * Math.cos(rad(to[0])) * Math.cos(rad(to[1] - from[1]));
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(((bearing + 360) % 360) / 45) % 8];
}

// Shortest distance from a point to a polyline, in miles. Uses a flat projection around the
// point, which is accurate to well under 1% over the tens of miles an evacuation covers.
export function milesToLine(point: LatLng, line: LatLng[]) {
  if (line.length === 1) return milesBetween(point, line[0]);
  const kx = Math.cos(rad(point[0])) * 69.17, ky = 69.17; // miles per degree of longitude / latitude
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const ax = (line[i - 1][1] - point[1]) * kx, ay = (line[i - 1][0] - point[0]) * ky;
    const bx = (line[i][1] - point[1]) * kx, by = (line[i][0] - point[0]) * ky;
    const dx = bx - ax, dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

export const toMiles = (meters: number) => meters * MILES_PER_METER;

/** The fire detection closest to a route, or null when there are none. */
export function nearestFireToLine(line: LatLng[], fires: FireDetection[]) {
  let best: { fire: FireDetection; miles: number } | null = null;
  for (const fire of fires) {
    const miles = milesToLine([fire.latitude, fire.longitude], line);
    if (!best || miles < best.miles) best = { fire, miles };
  }
  return best;
}

// Keep every Nth point so a route can be stored in the household profile and redrawn
// on the dashboard without saving thousands of coordinates.
export function simplifyLine(line: LatLng[], maxPoints = 150): LatLng[] {
  if (line.length <= maxPoints) return line.map(([a, b]) => [+a.toFixed(5), +b.toFixed(5)]);
  const step = (line.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) => line[Math.round(i * step)]).map(([a, b]) => [+a.toFixed(5), +b.toFixed(5)]);
}

// ---- routing ----------------------------------------------------------------

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
  legs: { steps: { name: string; ref?: string; distance: number }[] }[];
};

// Road names ranked by how far the route travels on each, so the summary names the
// highways people will recognize rather than the first side street.
function mainRoads(route: OsrmRoute) {
  const byRoad = new Map<string, number>();
  for (const step of route.legs.flatMap((l) => l.steps)) {
    const name = (step.ref || step.name).split(";")[0].trim();
    if (name) byRoad.set(name, (byRoad.get(name) ?? 0) + step.distance);
  }
  return [...byRoad].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
}

function toRoute(r: OsrmRoute, via: LatLng | null): Route {
  return { coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]), meters: r.distance, seconds: r.duration, roads: mainRoads(r), via };
}

async function osrm(points: LatLng[], alternatives: boolean, signal?: AbortSignal): Promise<OsrmRoute[]> {
  const path = points.map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(";");
  const params = new URLSearchParams({ overview: "full", geometries: "geojson", steps: "true", alternatives: String(alternatives) });
  let response: Response;
  try {
    response = await fetch(`${OSRM}/${path}?${params}`, { signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error("Couldn't reach the routing service. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.code !== "Ok") {
    throw new Error(body?.code === "NoRoute" ? "No driving route was found between these places." : `Routing failed (${body?.message ?? `HTTP ${response.status}`}).`);
  }
  return body.routes;
}

/** Share of `line`'s points lying within ~0.1 mi of `other`: how much road the two share. */
export function overlap(line: LatLng[], other: LatLng[]) {
  // Sample long routes so this stays fast; 200 points is plenty to measure overlap.
  const step = Math.max(1, Math.floor(line.length / 200));
  let near = 0, total = 0;
  for (let i = 0; i < line.length; i += step, total++) if (milesToLine(line[i], other) < 0.1) near++;
  return total ? near / total : 0;
}

// Plans the primary (fastest) route plus a backup that avoids it as much as the roads allow,
// following CAL FIRE's advice to know two ways out. OSRM's own alternatives are used when it
// offers a usefully different one; otherwise the backup is forced through a point off to one
// side of the primary route, trying both sides and keeping the one that shares the least road.
export async function planRoutes(home: Place, destination: Place, signal?: AbortSignal): Promise<RoutePlan> {
  const start: LatLng = [home.lat, home.lng], end: LatLng = [destination.lat, destination.lng];
  const [fastest, ...alternatives] = await osrm([start, end], true, signal);
  const primary = toRoute(fastest, null);
  // A backup that takes more than ~twice as long (or 20 extra minutes for short trips) isn't a realistic option.
  const maxSeconds = Math.max(primary.seconds * 2.2, primary.seconds + 20 * 60);
  const candidates: { route: Route; overlap: number }[] = alternatives
    .map((r) => toRoute(r, null))
    .map((route) => ({ route, overlap: overlap(route.coords, primary.coords) }));

  if (!candidates.some((c) => c.overlap < 0.5)) {
    // Detour points: perpendicular to the home→destination line at its midpoint, offset by
    // about a third of the trip length (at least ~1 mile), on each side.
    const mid: LatLng = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const kx = Math.cos(rad(mid[0]));
    const dx = (end[1] - start[1]) * kx, dy = end[0] - start[0];
    const length = Math.hypot(dx, dy) || 1e-9;
    const offset = Math.max(0.015, length * 0.35); // degrees of latitude (~1 mi minimum)
    for (const side of [1, -1]) {
      const via: LatLng = [mid[0] + (side * dx * offset) / length, mid[1] - (side * dy * offset) / length / kx];
      try {
        const [r] = await osrm([start, via, end], false, signal); // one at a time, to go easy on the shared server
        const route = toRoute(r, via);
        candidates.push({ route, overlap: overlap(route.coords, primary.coords) });
      } catch (e) {
        if (signal?.aborted) throw e; // a failed detour just means one fewer candidate
      }
    }
  }

  const best = candidates.filter((c) => c.route.seconds <= maxSeconds && c.overlap < 0.85).sort((a, b) => a.overlap - b.overlap || a.route.seconds - b.route.seconds)[0];
  return { primary, backup: best?.route ?? null, backupOverlap: best?.overlap ?? null };
}

/** Google Maps driving directions, so people can preview or practice a route on their phone. */
export function directionsUrl(home: Place, destination: Place, via: LatLng | null) {
  const params = new URLSearchParams({ api: "1", origin: `${home.lat},${home.lng}`, destination: `${destination.lat},${destination.lng}`, travelmode: "driving" });
  if (via) params.set("waypoints", `${via[0].toFixed(5)},${via[1].toFixed(5)}`);
  return `https://www.google.com/maps/dir/?${params}`;
}
