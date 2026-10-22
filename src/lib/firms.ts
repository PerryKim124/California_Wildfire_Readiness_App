// NASA FIRMS fire detections for California. The FIRMS MAP_KEY stays on the server:
// the browser calls the firms-california Supabase Edge Function, or, when Supabase
// isn't configured (or the function isn't deployed yet during development), the
// local /api/firms/california route served by vite.config.ts.

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { FiresResponse } from "../../supabase/functions/_shared/firms.ts";

export type { FireDetection, FiresResponse } from "../../supabase/functions/_shared/firms.ts";

export type FiresResult = FiresResponse & { via: "Supabase Edge Function" | "local dev server" };

const EDGE_FUNCTION = "firms-california";
const LOCAL_ENDPOINT = `${import.meta.env.BASE_URL}api/firms/california`;

function checked(body: unknown): FiresResponse {
  if (!body || typeof body !== "object" || !Array.isArray((body as FiresResponse).detections)) throw new Error("The fire data service returned an unexpected response.");
  return body as FiresResponse;
}

class NotDeployed extends Error {}

async function fromEdgeFunction(signal?: AbortSignal): Promise<FiresResponse> {
  const { data, error } = await supabase!.functions.invoke(EDGE_FUNCTION, { method: "GET", signal, timeout: 30_000 });
  if (!error) return checked(data);
  if (signal?.aborted) throw error;
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    const body = await response.json().catch(() => null);
    if (response.status === 404 && body?.code === "NOT_FOUND") throw new NotDeployed("The firms-california Edge Function isn't deployed.");
    throw new Error(body?.error ?? body?.message ?? `Fire data request failed (HTTP ${response.status}).`);
  }
  throw new Error("Couldn't reach the fire data service. Check your connection and try again.");
}

async function fromLocalRoute(signal?: AbortSignal): Promise<FiresResponse> {
  let response: Response;
  try {
    response = await fetch(LOCAL_ENDPOINT, { signal, headers: { Accept: "application/json" } });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error("Couldn't reach the fire data service. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? `Fire data request failed (HTTP ${response.status}).`);
  return checked(body);
}

export async function fetchCaliforniaFires(signal?: AbortSignal): Promise<FiresResult> {
  if (!supabase) return { ...(await fromLocalRoute(signal)), via: "local dev server" };
  try {
    return { ...(await fromEdgeFunction(signal)), via: "Supabase Edge Function" };
  } catch (e) {
    if (!(e instanceof NotDeployed)) throw e;
    // Development only: keep working before the function is deployed.
    if (import.meta.env.DEV) return { ...(await fromLocalRoute(signal)), via: "local dev server" };
    throw new Error("Fire data isn't available yet: the firms-california Edge Function hasn't been deployed.");
  }
}

// Shared copy of the feed for views that only read it (the dashboard's local overview and
// the evacuation map), so moving between pages doesn't re-request FIRMS every time. FIRMS
// updates about every 15 minutes; a copy older than `maxAgeMs` is fetched again.
let shared: { at: number; request: Promise<FiresResult> } | null = null;
export function getCaliforniaFires(maxAgeMs = 5 * 60_000): Promise<FiresResult> {
  if (!shared || Date.now() - shared.at > maxAgeMs) {
    const request = fetchCaliforniaFires();
    shared = { at: Date.now(), request };
    request.catch(() => { if (shared?.request === request) shared = null; }); // retry next time
  }
  return shared.request;
}
