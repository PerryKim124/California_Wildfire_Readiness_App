// Supabase Edge Function: NASA FIRMS fire detections inside California.
//
// The browser calls this function (src/lib/firms.ts) so the FIRMS MAP_KEY never
// leaves the server. Set the key as a function secret, never in source:
//   supabase secrets set FIRMS_MAP_KEY=<your key>
//   supabase functions deploy firms-california
// Requests carry the project's anon key (added by supabase-js), so the default JWT
// verification stays on.

import { FirmsError, fetchCaliforniaFires } from "../_shared/firms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // supabase-js invokes functions with POST; plain GET works too. Neither takes input.
  if (req.method !== "GET" && req.method !== "POST") return json(405, { error: "Method not allowed." });

  try {
    return json(200, await fetchCaliforniaFires(Deno.env.get("FIRMS_MAP_KEY")));
  } catch (error) {
    const status = error instanceof FirmsError ? error.status : 500;
    const message = error instanceof FirmsError ? error.message : "Unexpected error while loading fire data.";
    console.error(`[firms-california] ${message}`);
    return json(status, { error: message });
  }
});
