// Shared protection for the /api routes. API keys live only on the server, so
// these routes are the one path to OpenAI and YouTube.
//
// The rate limit is per server instance, so it slows abuse but cannot stop it.
// The monthly budget set on the OpenAI project is the hard limit on spend.

const WINDOW_MS = 60_000;
const MAX_TRACKED = 10_000;
const hits = new Map();

export function json(status, body) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Blocks other websites from calling these routes from a visitor's browser. */
function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function isOverLimit(request, route, limit) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const key = `${route}:${ip}`;
  const now = Date.now();
  if (hits.size > MAX_TRACKED) hits.clear();
  const entry = hits.get(key);
  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

/** Returns an error response if the request must be refused, otherwise null. */
export function guard(request, route, limitPerMinute) {
  if (!isSameOrigin(request)) return json(403, { error: "Forbidden" });
  if (isOverLimit(request, route, limitPerMinute)) {
    return json(429, { error: "Too many requests. Please wait a minute." });
  }
  return null;
}

/** Parses a JSON body, returning null if it is too large or malformed. */
export async function readJson(request, maxChars) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxChars * 4) return null;
  const text = await request.text();
  if (text.length > maxChars) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export function resetRateLimits() {
  hits.clear();
}
