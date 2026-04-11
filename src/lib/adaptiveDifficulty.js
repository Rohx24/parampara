/**
 * Adaptive Difficulty engine for BashaBuddy.
 *
 * Implements personalised curriculum generation by:
 *   1. Fetching the child's mistake history from Supabase (mistakes table)
 *      with localStorage fallback for offline / no-Supabase environments.
 *   2. Ranking weak items by frequency (count) and recency (last_seen_at).
 *   3. Building a compact prompt injection that instructs GPT to deliberately
 *      weave those weak words into the generated story and quiz questions,
 *      reinforcing the child's learning gaps without making it obvious.
 *
 * This implements the "Personalised Curriculum Generation" technique described
 * in research on computer-assisted language learning (CALL) systems.
 */

import { supabase } from "./supabase";

// ─── localStorage key helpers ────────────────────────────────────────────────

/** Read voice-practice mistakes stored by VoiceCoach (word → count map). */
function readLocalVoiceMistakes(childId) {
  if (!childId || typeof localStorage === "undefined") return {};
  try {
    const raw =
      localStorage.getItem(`bhashabuddy_voice_mistakes_${childId}`) ||
      localStorage.getItem("bhashabuddy_voice_mistakes");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Read story-session quiz mistakes stored by MakeStory (word → count map). */
function readLocalQuizMistakes(childId) {
  if (!childId || typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(`bhashabuddy_quiz_mistakes_${childId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// ─── Composite recency-weighted score ────────────────────────────────────────

/**
 * Compute a priority score for a mistake item.
 * Higher count + more recent = higher score.
 * @param {Object} item  { count, last_seen_at? }
 * @returns {number}
 */
function priorityScore(item) {
  const count = item.count || 1;
  const msAgo = item.last_seen_at
    ? Date.now() - new Date(item.last_seen_at).getTime()
    : Infinity;
  // Decay factor: full weight within 7 days, halved per extra week
  const daysFactor = msAgo === Infinity ? 0.5 : Math.max(0.1, 1 - msAgo / (7 * 86_400_000));
  return count * daysFactor;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the child's top weak items from all available sources.
 * Merges Supabase (authoritative) + localStorage (offline/fallback).
 *
 * @param {string|null} childId  The child's UUID
 * @param {number}      [limit=8]  Max items to return
 * @returns {Promise<Array<{domain: string, item: string, count: number, last_seen_at?: string}>>}
 */
export async function fetchWeakItems(childId, limit = 8) {
  const merged = new Map(); // key: `${domain}::${item}` → merged object

  const merge = (domain, item, count, last_seen_at) => {
    const key = `${domain}::${item}`;
    if (merged.has(key)) {
      const existing = merged.get(key);
      merged.set(key, {
        ...existing,
        count: existing.count + count,
        last_seen_at: last_seen_at ?? existing.last_seen_at,
      });
    } else {
      merged.set(key, { domain, item, count, last_seen_at });
    }
  };

  // ── 1. Supabase (primary source) ────────────────────────────────────────────
  if (supabase && childId) {
    try {
      const { data, error } = await supabase
        .from("mistakes")
        .select("domain, item, count, last_seen_at")
        .eq("child_id", childId)
        .order("count", { ascending: false })
        .limit(20);

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          merge(row.domain, row.item, row.count ?? 1, row.last_seen_at);
        }
      }
    } catch {
      // Network failure — continue with localStorage fallback
    }
  }

  // ── 2. localStorage voice mistakes ─────────────────────────────────────────
  const voiceMistakes = readLocalVoiceMistakes(childId);
  for (const [word, count] of Object.entries(voiceMistakes)) {
    if (word && typeof count === "number" && count > 0) {
      merge("speech", word, count, undefined);
    }
  }

  // ── 3. localStorage quiz mistakes ─────────────────────────────────────────
  const quizMistakes = readLocalQuizMistakes(childId);
  for (const [word, count] of Object.entries(quizMistakes)) {
    if (word && typeof count === "number" && count > 0) {
      merge("vocabulary", word, count, undefined);
    }
  }

  // ── Sort by composite priority score and return top items ─────────────────
  return Array.from(merged.values())
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, limit);
}

/**
 * Record a missed word from a quiz session into localStorage.
 * Increments existing counts. This feeds back into fetchWeakItems next session.
 *
 * @param {string} childId
 * @param {string} word
 */
export function recordQuizMistake(childId, word) {
  if (!childId || !word || typeof localStorage === "undefined") return;
  try {
    const key = `bhashabuddy_quiz_mistakes_${childId}`;
    const existing = JSON.parse(localStorage.getItem(key) || "{}");
    existing[word] = (existing[word] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // localStorage write failure is non-fatal
  }
}

/**
 * Build a compact prompt injection string from fetched weak items.
 * Instructs GPT to weave weak words naturally into the story and quiz questions
 * so that the child encounters and practises them again without feeling drilled.
 *
 * @param {Array<{domain: string, item: string, count: number}>} weakItems
 * @returns {string}  Prompt fragment to append to the story system prompt.
 *                    Returns "" if there are no weak items.
 */
export function buildAdaptivePromptContext(weakItems) {
  if (!weakItems || weakItems.length === 0) return "";

  const speechItems = weakItems
    .filter((i) => i.domain === "speech")
    .map((i) => i.item)
    .slice(0, 4);

  const vocabItems = weakItems
    .filter((i) => i.domain === "vocabulary")
    .map((i) => i.item)
    .slice(0, 4);

  const parts = [];

  if (speechItems.length > 0) {
    parts.push(
      `Words the child has struggled to pronounce (include them naturally in character dialogue): ${speechItems.join(", ")}.`
    );
  }
  if (vocabItems.length > 0) {
    parts.push(
      `Vocabulary the child has missed in previous quizzes (reinforce by using them in the narrative): ${vocabItems.join(", ")}.`
    );
  }

  if (parts.length === 0) return "";

  return (
    "\n\nPersonalised Learning Targets — embed these naturally into the story " +
    "(DO NOT list, explain, or highlight them explicitly):\n" +
    parts.join("\n")
  );
}

/**
 * Build an adaptive quiz prompt fragment that focuses comprehension questions
 * on the child's known weak areas.
 *
 * @param {Array<{domain: string, item: string}>} weakItems
 * @returns {string}
 */
export function buildAdaptiveQuizContext(weakItems) {
  if (!weakItems || weakItems.length === 0) return "";

  const targets = weakItems
    .filter((i) => i.domain === "vocabulary" || i.domain === "speech")
    .map((i) => i.item)
    .slice(0, 3);

  if (targets.length === 0) return "";

  return (
    `\nFocus at least one question on the meaning or usage of: ${targets.join(", ")}.`
  );
}
