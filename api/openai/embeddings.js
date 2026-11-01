import { guard, json, readJson } from "../_lib/guard.js";

const MAX_INPUT_CHARS = 4_000;

export async function POST(request) {
  const refused = guard(request, "embeddings", 60);
  if (refused) return refused;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(503, { error: "AI is not configured" });

  const body = await readJson(request, MAX_INPUT_CHARS * 2);
  if (typeof body?.input !== "string" || !body.input || body.input.length > MAX_INPUT_CHARS) {
    return json(400, { error: "Invalid request" });
  }

  const upstream = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: body.input }),
  });

  if (!upstream.ok) {
    console.error("OpenAI embedding failed", upstream.status);
    return json(502, { error: "AI service unavailable" });
  }
  return new Response(upstream.body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
