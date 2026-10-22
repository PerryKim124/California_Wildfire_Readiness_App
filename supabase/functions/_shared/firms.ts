// Server-side access to the NASA FIRMS US/Canada WFS service.
//
// Server only, runtime-neutral (standard fetch, no Node or Deno APIs). It is used by
// the firms-california Supabase Edge Function (Deno) and by the local
// /api/firms/california route in vite.config.ts (Node). The MAP_KEY comes from the
// FIRMS_MAP_KEY environment variable and must never be sent to the browser, logged,
// or included in error messages.
//
// Service details verified against the WFS GetCapabilities and
// DescribeFeatureType responses for USA_contiguous_and_Hawaii, and live requests:
//   - host firms2.modaps.eosdis.nasa.gov (US/Canada MAP_KEYs are rejected by firms.*)
//   - layer ms:fires_modis_24hrs (MODIS, last 24 hours)
//   - default CRS urn:ogc:def:crs:EPSG::4326 (BBOX axis order latitude, longitude)
//   - output format "application/json; subtype=geojson"
//   - attributes: latitude, longitude, brightness, scan, track, acq_date,
//     acq_time, confidence, brightness_2, frp, daynight, acq_datetime
// Docs: https://firms2.modaps.eosdis.nasa.gov/mapserver/usfs/wfs-info

import { CALIFORNIA_BOUNDARY } from "./california-boundary.ts";
import { CALIFORNIA_PLACES } from "./california-places.ts";

export type FireDetection = {
  id: string;
  latitude: number;
  longitude: number;
  acquiredAt: string | null; // ISO 8601, UTC
  instrument: string;
  confidence: number | null; // percent, 0–100
  brightness: number | null; // Kelvin, channel 21/22
  brightness2: number | null; // Kelvin, channel 31
  frp: number | null; // fire radiative power, MW
  daynight: "Day" | "Night" | null;
  nearest: NearestPlace | null;
};

// The closest Census place to a detection, e.g. 9 mi NE of Three Rivers.
export type NearestPlace = { name: string; miles: number; direction: string };

export type FiresResponse = {
  source: { name: string; service: string; layer: string; url: string };
  timeRange: string;
  retrievedAt: string; // when the server received the data from FIRMS (ISO 8601)
  limit: number; // max records requested from FIRMS
  received: number; // records FIRMS returned inside the California bounding box
  outsideCalifornia: number; // in the bounding box but outside the state boundary
  invalid: number; // records skipped for missing or invalid coordinates
  truncated: boolean; // FIRMS returned `limit` records, so some may be missing
  detections: FireDetection[];
};

const WFS_URL = "https://firms2.modaps.eosdis.nasa.gov/mapserver/wfs/USA_contiguous_and_Hawaii";
const LAYER = "ms:fires_modis_24hrs";
const CRS = "urn:ogc:def:crs:EPSG::4326";
const LIMIT = 2000;
const TIMEOUT_MS = 20_000;

type Ring = [number, number][]; // [longitude, latitude] pairs
const polygons: Ring[][] = CALIFORNIA_BOUNDARY.geometry.coordinates;

// California's bounding box from the boundary itself, padded slightly so the
// WFS filter never clips a point that the polygon test would keep.
const bounds = (() => {
  let south = 90, west = 180, north = -90, east = -180;
  for (const polygon of polygons) for (const [lon, lat] of polygon[0]) {
    south = Math.min(south, lat); north = Math.max(north, lat);
    west = Math.min(west, lon); east = Math.max(east, lon);
  }
  const pad = 0.05;
  return { south: south - pad, west: west - pad, north: north + pad, east: east + pad };
})();

// Ray casting; the first ring of each polygon is its outline, any others are holes.
function inRing(lon: number, lat: number, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function inCalifornia(lat: number, lon: number) {
  if (lat < bounds.south || lat > bounds.north || lon < bounds.west || lon > bounds.east) return false;
  return polygons.some(([outline, ...holes]) => inRing(lon, lat, outline) && !holes.some((h) => inRing(lon, lat, h)));
}

const EARTH_RADIUS_MI = 3958.8;
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const rad = (deg: number) => (deg * Math.PI) / 180;

// Nearest place, treating each place as a circle with its land area so large cities
// aren't beaten by a small neighbor's center point. `miles` is the distance from that
// approximate edge (0 = inside), and `direction` runs from the place to the detection
// (so "NE of Three Rivers" means northeast of town).
export function nearestPlace(lat: number, lon: number): NearestPlace | null {
  let best: { name: string; lat: number; lon: number; edge: number } | null = null;
  for (const [name, plat, plon, radius] of CALIFORNIA_PLACES) {
    const dLat = rad(lat - plat), dLon = rad(lon - plon);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(plat)) * Math.cos(rad(lat)) * Math.sin(dLon / 2) ** 2;
    const edge = Math.max(0, 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(a))) - radius);
    if (!best || edge < best.edge) best = { name, lat: plat, lon: plon, edge };
  }
  if (!best) return null;
  const y = Math.sin(rad(lon - best.lon)) * Math.cos(rad(lat));
  const x = Math.cos(rad(best.lat)) * Math.sin(rad(lat)) - Math.sin(rad(best.lat)) * Math.cos(rad(lat)) * Math.cos(rad(lon - best.lon));
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return { name: best.name, miles: Math.round(best.edge * 10) / 10, direction: COMPASS[Math.round(bearing / 45) % 8] };
}

export class FirmsError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function featureUrl(mapKey: string) {
  const params = new URLSearchParams({
    SERVICE: "WFS",
    REQUEST: "GetFeature",
    VERSION: "2.0.0",
    TYPENAMES: LAYER,
    STARTINDEX: "0",
    COUNT: String(LIMIT),
    SRSNAME: CRS,
    // EPSG:4326 in WFS 2.0 uses latitude/longitude axis order.
    BBOX: [bounds.south, bounds.west, bounds.north, bounds.east].map((n) => n.toFixed(4)).join(",") + "," + CRS,
    OUTPUTFORMAT: "application/json; subtype=geojson",
  });
  // Encode spaces as %20 rather than "+" (literal plus signs are already %2B).
  return `${WFS_URL}/${encodeURIComponent(mapKey)}/?${params.toString().replace(/\+/g, "%20")}`;
}

const num = (value: unknown) => {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

// acq_date is "YYYY-MM-DD" and acq_time is HHMM in UTC (e.g. 930 = 09:30).
function acquiredAt(date: unknown, time: unknown) {
  const hhmm = num(time);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || hhmm == null) return null;
  const padded = String(Math.trunc(hhmm)).padStart(4, "0");
  const iso = `${date}T${padded.slice(0, 2)}:${padded.slice(2)}:00Z`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function toDetection(props: Record<string, unknown>): FireDetection | null {
  const latitude = num(props.latitude), longitude = num(props.longitude);
  if (latitude == null || longitude == null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const confidence = num(props.confidence);
  const daynight = props.daynight === "D" ? "Day" : props.daynight === "N" ? "Night" : null;
  const time = acquiredAt(props.acq_date, props.acq_time);
  return {
    id: `${time ?? "unknown"}_${latitude.toFixed(4)}_${longitude.toFixed(4)}`,
    latitude, longitude,
    acquiredAt: time,
    instrument: "MODIS (Terra/Aqua)",
    confidence: confidence != null && confidence >= 0 && confidence <= 100 ? confidence : null,
    brightness: num(props.brightness),
    brightness2: num(props.brightness_2),
    frp: num(props.frp),
    daynight,
    nearest: nearestPlace(latitude, longitude),
  };
}

export async function fetchCaliforniaFires(mapKey: string | undefined): Promise<FiresResponse> {
  if (!mapKey) throw new FirmsError("Fire data isn't configured: the server is missing FIRMS_MAP_KEY.", 503);

  let response: Response;
  try {
    response = await fetch(featureUrl(mapKey), { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    throw new FirmsError(timedOut ? "NASA FIRMS took too long to respond. Try again shortly." : "Couldn't reach NASA FIRMS. Try again shortly.", 502);
  }

  const text = await response.text();
  if (!response.ok) {
    // FIRMS answers an invalid or over-limit MAP_KEY with 403 and a plain-text message.
    const detail = /transaction limit/i.test(text) ? " The MAP_KEY is invalid or has exceeded its transaction limit." : "";
    throw new FirmsError(`NASA FIRMS rejected the request (HTTP ${response.status}).${detail}`, 502);
  }

  let geojson: { features?: { properties?: Record<string, unknown> }[] };
  try {
    geojson = JSON.parse(text);
  } catch {
    // WFS errors (e.g. an OGC ExceptionReport) come back as XML with HTTP 200.
    throw new FirmsError("NASA FIRMS returned an unexpected response instead of fire data.", 502);
  }
  const features = Array.isArray(geojson.features) ? geojson.features : [];

  const detections: FireDetection[] = [];
  const seen = new Set<string>();
  let invalid = 0, outsideCalifornia = 0;
  for (const feature of features) {
    const detection = feature?.properties ? toDetection(feature.properties) : null;
    if (!detection) { invalid++; continue; }
    if (!inCalifornia(detection.latitude, detection.longitude)) { outsideCalifornia++; continue; }
    if (seen.has(detection.id)) continue;
    seen.add(detection.id);
    detections.push(detection);
  }

  return {
    source: { name: "NASA FIRMS (LANCE) US/Canada", service: "WFS · USA_contiguous_and_Hawaii", layer: LAYER, url: "https://firms2.modaps.eosdis.nasa.gov/usfs/" },
    timeRange: "Last 24 hours",
    retrievedAt: new Date().toISOString(),
    limit: LIMIT,
    received: features.length,
    outsideCalifornia,
    invalid,
    truncated: features.length >= LIMIT,
    detections,
  };
}
