const BASE_URL = "https://api.openai.com/v1";

// ── OpenAI TTS ────────────────────────────────────────────────────────────────
// Cache blob URLs so repeated calls for the same text don't hit the API twice.
const _ttsCache = new Map();
let _currentAudio = null;

export async function openaiSpeak(text, voice = "nova") {
  if (!text) return;
  if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
  const key = `${voice}::${text}`;
  let url = _ttsCache.get(key);
  if (!url) {
    const res = await fetch(`${BASE_URL}/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getKey()}` },
      body: JSON.stringify({ model: "tts-1", input: text, voice }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS ${res.status}`);
    const blob = await res.blob();
    url = URL.createObjectURL(blob);
    _ttsCache.set(key, url);
  }
  const audio = new Audio(url);
  _currentAudio = audio;
  audio.play();
  return audio;
}

export function stopOpenaiSpeak() {
  if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
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
