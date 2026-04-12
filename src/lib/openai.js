const BASE_URL = "https://api.openai.com/v1";

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

function getKey() {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) throw new Error("VITE_OPENAI_API_KEY is not set in .env");
  return key;
}

/**
 * Single-shot chat completion. Returns the assistant's reply as a string.
 */
export async function chatCompletion(
  messages,
  { model = "gpt-4o-mini", temperature = 0.7, max_tokens = 400 } = {}
) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI embedding ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.data[0].embedding; // number[]
}

/**
 * Upload a JSONL string as a training file to OpenAI Files API.
 * Returns the file object { id, filename, ... }.
 */
export async function uploadTrainingFile(jsonlContent, filename = "training.jsonl") {
  const blob = new Blob([jsonlContent], { type: "application/json" });
  const formData = new FormData();
  formData.append("purpose", "fine-tune");
  formData.append("file", blob, filename);

  const res = await fetch(`${BASE_URL}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getKey()}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`File upload ${res.status}: ${err}`);
  }
  return res.json();
}

/**
 * Create a fine-tuning job from an already-uploaded training file.
 * Returns the fine-tune job object { id, status, model, ... }.
 */
export async function createFineTuneJob(trainingFileId, suffix = "bashabuddy") {
  const res = await fetch(`${BASE_URL}/fine_tuning/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({
      training_file: trainingFileId,
      model: "gpt-4o-mini-2024-07-18",
      suffix,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Fine-tune job ${res.status}: ${err}`);
  }
  return res.json();
}

/**
 * Get the status of an existing fine-tuning job.
 * Status values: validating_files | queued | running | succeeded | failed | cancelled
 */
export async function getFineTuneJob(jobId) {
  const res = await fetch(`${BASE_URL}/fine_tuning/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${getKey()}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Fine-tune status ${res.status}: ${err}`);
  }
  return res.json();
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
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
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
