import { timingSafeEqual } from "node:crypto";
import { guard, json, readJson } from "../_lib/guard.js";

const BASE_URL = "https://api.openai.com/v1";
const MAX_BODY_CHARS = 3_000_000;

// Fine-tuning costs real money, so unlike the other routes it needs a secret.
function isAdmin(request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const given = Buffer.from(request.headers.get("x-admin-token") ?? "");
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

const ACTIONS = {
  upload({ jsonl, filename }, key) {
    if (typeof jsonl !== "string" || !jsonl) return null;
    const form = new FormData();
    form.append("purpose", "fine-tune");
    form.append("file", new Blob([jsonl], { type: "application/json" }), String(filename ?? "training.jsonl").slice(0, 80));
    return fetch(`${BASE_URL}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
  },
  create({ trainingFileId, suffix }, key) {
    if (!/^file-[\w-]{1,100}$/.test(trainingFileId ?? "")) return null;
    return fetch(`${BASE_URL}/fine_tuning/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        training_file: trainingFileId,
        model: "gpt-4o-mini-2024-07-18",
        suffix: /^[\w-]{1,18}$/.test(suffix ?? "") ? suffix : "bashabuddy",
      }),
    });
  },
  status({ jobId }, key) {
    if (!/^ftjob-[\w-]{1,100}$/.test(jobId ?? "")) return null;
    return fetch(`${BASE_URL}/fine_tuning/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
  },
};

export async function POST(request) {
  const refused = guard(request, "fine-tune", 10);
  if (refused) return refused;
  if (!isAdmin(request)) return json(403, { error: "Forbidden" });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(503, { error: "AI is not configured" });

  const body = await readJson(request, MAX_BODY_CHARS);
  const action = body && Object.hasOwn(ACTIONS, body.action) ? ACTIONS[body.action] : null;
  const pending = action?.(body, key);
  if (!pending) return json(400, { error: "Invalid request" });

  const upstream = await pending;
  if (!upstream.ok) {
    console.error("OpenAI fine-tune failed", upstream.status);
    return json(502, { error: "AI service unavailable" });
  }
  return new Response(upstream.body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
