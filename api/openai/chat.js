import { guard, json, readJson } from "../_lib/guard.js";

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_MESSAGES = 20;
const MAX_BODY_CHARS = 30_000;
const MAX_TOKENS = 2_500;
const ROLES = new Set(["system", "user", "assistant"]);

function validMessages(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= MAX_MESSAGES &&
    messages.every((m) => ROLES.has(m?.role) && typeof m?.content === "string")
  );
}

// The browser cannot pick a costlier model: anything but the configured
// fine-tuned model falls back to the default.
function chooseModel(requested) {
  const fineTuned = process.env.OPENAI_FINE_TUNED_MODEL;
  return fineTuned && requested === fineTuned ? fineTuned : DEFAULT_MODEL;
}

function clamp(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
}

export async function POST(request) {
  const refused = guard(request, "chat", 40);
  if (refused) return refused;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(503, { error: "AI is not configured" });

  const body = await readJson(request, MAX_BODY_CHARS);
  if (!body || !validMessages(body.messages)) return json(400, { error: "Invalid request" });

  const stream = body.stream === true;
  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: chooseModel(body.model),
      messages: body.messages.map(({ role, content }) => ({ role, content })),
      temperature: clamp(body.temperature, 0, 2, 0.7),
      max_tokens: clamp(body.max_tokens, 1, MAX_TOKENS, 400),
      stream,
    }),
  });

  if (!upstream.ok) {
    console.error("OpenAI chat failed", upstream.status);
    return json(upstream.status === 429 ? 429 : 502, { error: "AI service unavailable" });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": stream ? "text/event-stream" : "application/json",
      "Cache-Control": "no-store",
    },
  });
}
