import { guard, json, readJson } from "./_lib/guard.js";

const BASE_URL = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS = 25;

// Fixed values are set here so a client cannot turn off safe search for kids.
const ROUTES = {
  search({ q, maxResults, pageToken }) {
    if (typeof q !== "string" || !q.trim()) return null;
    const params = {
      part: "snippet",
      type: "video",
      videoEmbeddable: "true",
      safeSearch: "strict",
      q: q.slice(0, 200),
      maxResults: String(Math.min(Number(maxResults) || 20, MAX_RESULTS)),
    };
    if (typeof pageToken === "string" && pageToken) params.pageToken = pageToken.slice(0, 100);
    return params;
  },
  videos({ id }) {
    if (!/^[\w-]+(,[\w-]+){0,49}$/.test(id ?? "")) return null;
    return { part: "contentDetails,statistics", id };
  },
};

export async function POST(request) {
  const refused = guard(request, "youtube", 20);
  if (refused) return refused;

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return json(503, { error: "YouTube search is not configured" });

  const body = await readJson(request, 2_000);
  const route = body && Object.hasOwn(ROUTES, body.path) ? ROUTES[body.path] : null;
  const params = route?.(body.params ?? {});
  if (!params) return json(400, { error: "Invalid request" });

  const url = new URL(`${BASE_URL}/${body.path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("key", key);

  const upstream = await fetch(url);
  if (!upstream.ok) {
    console.error("YouTube request failed", upstream.status);
    return json(502, { error: "YouTube search is unavailable" });
  }
  return new Response(upstream.body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
