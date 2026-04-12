/**
 * RAG (Retrieval-Augmented Generation) engine for BashaBuddy.
 *
 * PRIMARY PATH — Semantic Embedding Retrieval (OpenAI text-embedding-3-small):
 *   1. On first use, embed all 36 cultural context entries → cache in localStorage
 *   2. At query time, embed the query → cosine similarity vs all cached embeddings
 *   3. Return top-N entries by similarity score
 *
 * FALLBACK PATH — TF-IDF keyword scoring (no API key / offline):
 *   Used when embeddings are unavailable or the API call fails.
 *   Keyword match weights: keyword list +3, title +2, content +1 (cap 6), category +2
 *
 * Architecture:
 *   Query → createEmbedding() → cosine similarity → top-N → format prompt context
 *                             ↓ (on error)
 *   Query → tokenise()       → TF-IDF score      → top-N → format prompt context
 */

import culturalData from "../data/culturalContext.json";
import { createEmbedding } from "./openai";

// ─── Embedding cache ───────────────────────────────────────────────────────────
// Stored as: { version: string, entries: [{ id, embedding: number[] }] }

const CACHE_KEY     = "bhashabuddy_rag_embeddings_v1";
const CACHE_VERSION = "1.0";

function loadEmbeddingCache() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CACHE_VERSION) return null;
    return parsed; // { version, entries: [{id, embedding}] }
  } catch {
    return null;
  }
}

function saveEmbeddingCache(entries) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ version: CACHE_VERSION, entries }));
  } catch {
    // localStorage might be full — non-fatal
  }
}

// ─── Vector math ───────────────────────────────────────────────────────────────

/** Dot product of two equal-length number arrays. */
function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** L2 norm of a vector. */
function norm(a) {
  return Math.sqrt(dot(a, a));
}

/** Cosine similarity (0–1, higher = more similar). */
function cosine(a, b) {
  const d = norm(a) * norm(b);
  return d > 0 ? dot(a, b) / d : 0;
}

// ─── Embedding cache builder ───────────────────────────────────────────────────

let _embeddingBuildPromise = null;

/**
 * Ensure all cultural entries are embedded and cached.
 * Batches API calls sequentially to avoid rate limits.
 * Returns the full cache object { version, entries }.
 */
async function ensureEmbeddingCache() {
  // Return existing promise if already building
  if (_embeddingBuildPromise) return _embeddingBuildPromise;

  const existing = loadEmbeddingCache();
  if (existing && existing.entries.length === culturalData.length) {
    return existing;
  }

  _embeddingBuildPromise = (async () => {
    const existingMap = new Map((existing?.entries || []).map((e) => [e.id, e.embedding]));
    const entries = [];

    for (const entry of culturalData) {
      // Re-use cached embedding if available
      if (existingMap.has(entry.id)) {
        entries.push({ id: entry.id, embedding: existingMap.get(entry.id) });
        continue;
      }
      // Embed: title + keywords + first 80 words of content
      const text = `${entry.title}. ${(entry.keywords || []).join(", ")}. ${entry.content.split(" ").slice(0, 80).join(" ")}`;
      try {
        const embedding = await createEmbedding(text);
        entries.push({ id: entry.id, embedding });
      } catch {
        // If a single entry fails, skip it (TF-IDF will cover it)
      }
    }

    saveEmbeddingCache(entries);
    _embeddingBuildPromise = null;
    return { version: CACHE_VERSION, entries };
  })();

  return _embeddingBuildPromise;
}

// ─── Semantic retrieval (primary path) ────────────────────────────────────────

/**
 * Retrieve top-N entries using OpenAI embedding cosine similarity.
 * @param {string} query
 * @param {string} language
 * @param {number} n
 * @returns {Promise<Object[]>}  Array of culturalContext entries
 */
async function retrieveContextSemantic(query, language, n) {
  const cache = await ensureEmbeddingCache();
  if (!cache || !cache.entries.length) throw new Error("No embedding cache");

  const queryEmbedding = await createEmbedding(query);

  // Build map from entry id → entry object
  const entryById = Object.fromEntries(culturalData.map((e) => [e.id, e]));

  // Language-aware filtering
  const langCompatible = cache.entries.filter(({ id }) => {
    const entry = entryById[id];
    return !entry?.languages || entry.languages.includes(language) || entry.languages.includes("english");
  });

  const pool = langCompatible.length > 0 ? langCompatible : cache.entries;

  // Score by cosine similarity
  const scored = pool
    .map(({ id, embedding }) => ({ entry: entryById[id], score: cosine(queryEmbedding, embedding) }))
    .filter(({ entry, score }) => entry && score > 0)
    .sort((a, b) => b.score - a.score);

  // Deduplicate by category for diversity
  const seen    = new Set();
  const diverse = [];
  for (const { entry } of scored) {
    if (diverse.length >= n) break;
    if (!seen.has(entry.category) || diverse.length < n - 1) {
      diverse.push(entry);
      seen.add(entry.category);
    }
  }

  return diverse.slice(0, n);
}

// ─── TF-IDF fallback ──────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "in", "it", "of", "on", "to", "and", "or", "for",
  "my", "me", "i", "we", "he", "she", "they", "this", "that", "with", "from",
  "was", "are", "be", "has", "had", "do", "did", "at", "by", "up", "as",
  "make", "story", "write", "about", "once", "upon", "time", "one", "two",
]);

function tokenise(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function scoreEntry(entry, tokens) {
  if (!tokens.length) return 0;
  const keywordsLower = (entry.keywords || []).map((k) => k.toLowerCase());
  const titleTokens   = tokenise(entry.title || "");
  const contentTokens = tokenise(entry.content || "");
  const categoryLower = (entry.category || "").toLowerCase();
  let score = 0;
  let contentHits = 0;
  for (const token of tokens) {
    if (keywordsLower.some((k) => k.includes(token) || token.includes(k))) score += 3;
    if (titleTokens.some((t) => t.includes(token) || token.includes(t)))   score += 2;
    if (contentHits < 6 && contentTokens.some((t) => t.includes(token))) { score += 1; contentHits += 1; }
    if (categoryLower.includes(token)) score += 2;
  }
  return score;
}

function retrieveContextTfIdf(query, language, n) {
  const tokens = tokenise(query);
  if (!tokens.length) return [];
  const langCompatible = culturalData.filter(
    (e) => !e.languages || e.languages.includes(language) || e.languages.includes("english")
  );
  const pool = langCompatible.length > 0 ? langCompatible : culturalData;
  const scored = pool
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  const seen    = new Set();
  const diverse = [];
  for (const { entry } of scored) {
    if (diverse.length >= n) break;
    if (!seen.has(entry.category) || diverse.length < n - 1) {
      diverse.push(entry);
      seen.add(entry.category);
    }
  }
  return diverse.slice(0, n);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve top-N culturally relevant entries for a query.
 * Tries semantic embedding retrieval first; falls back to TF-IDF on failure.
 *
 * @param {string}  query
 * @param {string}  language  'hindi' | 'tamil' | 'telugu' | 'kannada' | 'english'
 * @param {number}  [n=3]
 * @returns {Promise<Object[]>}
 */
export async function retrieveContext(query, language = "hindi", n = 3) {
  try {
    const results = await retrieveContextSemantic(query, language, n);
    if (results.length > 0) return results;
  } catch {
    // Embedding path failed (no API key, network error, etc.) — fall back
  }
  return retrieveContextTfIdf(query, language, n);
}

/**
 * Format retrieved cultural entries into a concise prompt injection string.
 */
export function formatContextForPrompt(entries) {
  if (!entries || entries.length === 0) return "";
  const lines = entries.map((e) => {
    const moralLine    = e.moral ? ` Core moral: "${e.moral}"` : "";
    const contentShort = e.content.split(" ").slice(0, 90).join(" ");
    return `• [${e.category.toUpperCase()}] ${e.title}: ${contentShort}${moralLine}`;
  });
  return (
    "\n\nAuthentic Indian Cultural Context — weave 1–2 of these details naturally " +
    "into the story without listing them explicitly:\n" +
    lines.join("\n")
  );
}

/**
 * Retrieve and format in one call.
 * Returns a Promise<string> (previously was sync — callers must await).
 */
export async function getStoryContext(query, language, n = 3) {
  const entries = await retrieveContext(query, language, n);
  return formatContextForPrompt(entries);
}

/**
 * Kick off the embedding cache build in the background on app load.
 * Call this once from App.jsx or a top-level component.
 * Safe to call multiple times (idempotent).
 */
export function prewarmEmbeddingCache() {
  ensureEmbeddingCache().catch(() => {
    // Background prewarming failure is non-fatal — TF-IDF will handle it
  });
}
