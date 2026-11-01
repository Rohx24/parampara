const BASE_URL = "/api/openai";
const ADMIN_TOKEN_KEY = "bashabuddy_admin_token";

// ── Instant TTS via browser Web Speech API ────────────────────────────────────
// Uses the best available neural voice (Google/Microsoft/Apple) — zero latency.
// Preferred voice priority: Google > Microsoft > Apple > any.

let _voiceCache = null;

function _getBestEnglishVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Priority list — these are the neural voices that sound most human
  const preferred = [
    (v) => /google/i.test(v.name) && v.lang.startsWith("en"),
    (v) => /microsoft.*natural/i.test(v.name) && v.lang.startsWith("en"),
    (v) => /microsoft/i.test(v.name) && v.lang.startsWith("en"),
    (v) => /zira|david|mark|hazel|susan|george/i.test(v.name) && v.lang.startsWith("en"),
    (v) => /samantha|karen|moira|daniel|oliver/i.test(v.name) && v.lang.startsWith("en"),
    (v) => v.lang === "en-US",
    (v) => v.lang.startsWith("en"),
  ];

  for (const match of preferred) {
    const found = voices.find(match);
    if (found) return found;
  }
  return voices[0] ?? null;
}

export function openaiSpeak(text, _voice = "nova") {
  return new Promise((resolve, reject) => {
    if (!text || !window.speechSynthesis) { reject(new Error("no speech")); return; }
    window.speechSynthesis.cancel();

    const speak = () => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 0.92;
      utter.pitch = 1;
      const voice = _voiceCache || _getBestEnglishVoice();
      if (voice) { _voiceCache = voice; utter.voice = voice; }
      utter.onend = resolve;
      utter.onerror = reject;
      window.speechSynthesis.speak(utter);
    };

    // Voices may not be loaded yet on first call — wait for them
    if (window.speechSynthesis.getVoices().length > 0) {
      speak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { speak(); };
    }
  });
}

export function stopOpenaiSpeak() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

/**
 * Single-shot chat completion. Returns the assistant's reply as a string.
 */
export async function chatCompletion(
  messages,
  { model = "gpt-4o-mini", temperature = 0.7, max_tokens = 400 } = {}
) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature, max_tokens }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content ?? "";
}

/**
 * Create an embedding vector for a text string using text-embedding-3-small.
 * Returns a Float32Array (1536-dimensional).
 */
export async function createEmbedding(text) {
  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: text }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI embedding ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.data[0].embedding; // number[]
}

/**
 * Fine-tuning runs on the server and needs the admin token, which is kept only
 * for this browser tab.
 */
async function fineTuneRequest(body) {
  let token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) {
    token = window.prompt("Enter the admin token to use fine-tuning") ?? "";
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
  const res = await fetch(`${BASE_URL}/fine-tune`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-token": token },
    body: JSON.stringify(body),
  });
  if (res.status === 403) sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Fine-tune ${res.status}: ${err}`);
  }
  return res.json();
}

/**
 * Upload a JSONL string as a training file.
 * Returns the file object { id, filename, ... }.
 */
export function uploadTrainingFile(jsonlContent, filename = "training.jsonl") {
  return fineTuneRequest({ action: "upload", jsonl: jsonlContent, filename });
}

/**
 * Create a fine-tuning job from an already-uploaded training file.
 * Returns the fine-tune job object { id, status, model, ... }.
 */
export function createFineTuneJob(trainingFileId, suffix = "bashabuddy") {
  return fineTuneRequest({ action: "create", trainingFileId, suffix });
}

/**
 * Get the status of an existing fine-tuning job.
 * Status values: validating_files | queued | running | succeeded | failed | cancelled
 */
export function getFineTuneJob(jobId) {
  return fineTuneRequest({ action: "status", jobId });
}

/**
 * Streaming chat completion. Calls onChunk(text) for every token received.
 * Returns a promise that resolves when the stream ends.
 */
export async function streamCompletion(
  messages,
  onChunk,
  { model = "gpt-4o-mini", temperature = 0.8, max_tokens = 700 } = {}
) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature, max_tokens, stream: true }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const chunk = json.choices?.[0]?.delta?.content;
        if (chunk) onChunk(chunk);
      } catch {
        // skip malformed SSE chunks
      }
    }
  }
}
