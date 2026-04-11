/**
 * RAG (Retrieval-Augmented Generation) engine for BashaBuddy.
 *
 * Uses keyword-based TF-IDF-style scoring to retrieve the most relevant
 * Indian cultural context entries for a given story query. Retrieved entries
 * are injected into GPT story generation prompts, implementing the RAG pattern
 * without requiring a vector database.
 *
 * Architecture:
 *   Query → tokenise → score each entry → top-N → format as prompt context
 */

import culturalData from "../data/culturalContext.json";

// Stop-words to exclude from scoring (common but non-informative tokens)
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "in", "it", "of", "on", "to", "and", "or", "for",
  "my", "me", "i", "we", "he", "she", "they", "this", "that", "with", "from",
  "was", "are", "be", "has", "had", "do", "did", "at", "by", "up", "as",
  "make", "story", "write", "about", "once", "upon", "time", "one", "two",
]);

/**
 * Tokenise a query string into lowercase non-stop-word tokens (length ≥ 3).
 * @param {string} text
 * @returns {string[]}
 */
function tokenise(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

/**
 * Score a single cultural entry against an array of query tokens.
 * Scoring weights:
 *   - keyword list match  : +3 per hit (highest precision signal)
 *   - title word match    : +2 per hit
 *   - content word match  : +1 per hit (capped at 6 to avoid long-doc bias)
 *   - category match      : +2 flat
 * @param {Object} entry   A culturalContext entry
 * @param {string[]} tokens Tokenised query
 * @returns {number}
 */
function scoreEntry(entry, tokens) {
  if (!tokens.length) return 0;

  const keywordsLower = (entry.keywords || []).map((k) => k.toLowerCase());
  const titleTokens   = tokenise(entry.title || "");
  const contentTokens = tokenise(entry.content || "");
  const categoryLower = (entry.category || "").toLowerCase();

  let score = 0;
  let contentHits = 0;

  for (const token of tokens) {
    // Keyword list match — highest weight
    if (keywordsLower.some((k) => k.includes(token) || token.includes(k))) {
      score += 3;
    }
    // Title match
    if (titleTokens.some((t) => t.includes(token) || token.includes(t))) {
      score += 2;
    }
    // Content match (cap at 6 hits to prevent length bias)
    if (contentHits < 6 && contentTokens.some((t) => t.includes(token))) {
      score += 1;
      contentHits += 1;
    }
    // Category match
    if (categoryLower.includes(token)) {
      score += 2;
    }
  }

  return score;
}

/**
 * Retrieve the top-N most relevant cultural context entries for a query.
 *
 * @param {string}   query    Raw query string (genre + idea + character)
 * @param {string}   language Child's preferred language id (e.g. "hindi")
 * @param {number}   [n=3]    Number of entries to return
 * @returns {Object[]}        Array of matching culturalContext entries
 */
export function retrieveContext(query, language = "hindi", n = 3) {
  const tokens = tokenise(query);
  if (!tokens.length) return [];

  // Language-aware filtering: include entries that support the child's language
  // or "english" (all-purpose). If no language matches, fall back to all entries.
  const langCompatible = culturalData.filter(
    (e) => !e.languages || e.languages.includes(language) || e.languages.includes("english")
  );
  const pool = langCompatible.length > 0 ? langCompatible : culturalData;

  const scored = pool
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  // Deduplicate by category — avoid returning 3 festival entries for a festival query
  const seen = new Set();
  const diverse = [];
  for (const { entry } of scored) {
    if (diverse.length >= n) break;
    // Allow one duplicate category only if we can't fill n with diverse ones
    const catKey = entry.category;
    if (!seen.has(catKey) || diverse.length < n - 1) {
      diverse.push(entry);
      seen.add(catKey);
    }
  }

  return diverse.slice(0, n);
}

/**
 * Format retrieved cultural entries into a concise prompt injection string.
 * Keeps total length minimal to avoid crowding the story prompt's token budget.
 *
 * @param {Object[]} entries  Retrieved entries from retrieveContext()
 * @returns {string}          Formatted string to append to the system prompt
 */
export function formatContextForPrompt(entries) {
  if (!entries || entries.length === 0) return "";

  const lines = entries.map((e) => {
    const moralLine = e.moral ? ` Core moral: "${e.moral}"` : "";
    // Truncate content to ~100 words to keep prompt lean
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
 * Convenience: retrieve and format in one call.
 * @param {string} query
 * @param {string} language
 * @param {number} [n=3]
 * @returns {string}
 */
export function getStoryContext(query, language, n = 3) {
  const entries = retrieveContext(query, language, n);
  return formatContextForPrompt(entries);
}
