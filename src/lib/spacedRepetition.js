/**
 * SM-2 Spaced Repetition algorithm for BashaBuddy vocabulary review.
 *
 * Implements the SuperMemo SM-2 algorithm — the same core used by Anki and
 * Duolingo — to schedule vocabulary items for optimal review timing.
 *
 * How SM-2 works:
 *   Each vocabulary card has:
 *     - interval     : days until next review (starts at 1)
 *     - easeFactor   : how easy this card is (starts at 2.5, min 1.3)
 *     - repetitions  : consecutive successful reviews
 *     - nextReview   : Date (ISO string) of next scheduled review
 *
 *   After each quiz answer, call reviewCard(childId, word, domain, quality):
 *     quality 5 = perfect recall
 *     quality 4 = correct with hesitation
 *     quality 3 = correct with difficulty
 *     quality 2 = incorrect, but remembered after seeing answer
 *     quality 1 = incorrect
 *     quality 0 = complete blackout
 *
 *   SM-2 update rules:
 *     if quality < 3 → reset repetitions to 0, interval to 1
 *     else:
 *       if repetitions == 0 → interval = 1
 *       if repetitions == 1 → interval = 6
 *       else                → interval = round(prev_interval × easeFactor)
 *       easeFactor += 0.1 - (5 - quality) × (0.08 + (5 - quality) × 0.02)
 *       easeFactor  = max(1.3, easeFactor)
 *       repetitions += 1
 *
 * Reference: Wozniak, P.A. (1990). Optimization of Learning.
 */

const LS_KEY = (childId) => `bhashabuddy_sr_${childId}`;

// ─── Card shape ────────────────────────────────────────────────────────────────
// {
//   word       : string   — the vocabulary item (e.g. "नमस्ते", "tiger")
//   domain     : string   — 'speech' | 'vocabulary' | 'grammar'
//   interval   : number   — days until next review
//   easeFactor : number   — current ease factor (≥1.3)
//   repetitions: number   — consecutive successful reviews
//   nextReview : string   — ISO date string
//   addedAt    : string   — ISO date when card was created
// }

const DEFAULT_EF = 2.5;
const MIN_EF     = 1.3;

// ─── localStorage helpers ──────────────────────────────────────────────────────

function loadCards(childId) {
  if (!childId || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_KEY(childId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveCards(childId, cards) {
  if (!childId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY(childId), JSON.stringify(cards));
  } catch {
    // non-fatal: localStorage might be full
  }
}

// ─── SM-2 core update ─────────────────────────────────────────────────────────

/**
 * Apply SM-2 update to a single card and return the updated card.
 * @param {Object} card     Existing card (or freshly initialised)
 * @param {number} quality  0–5 quality rating
 * @returns {Object}        Updated card
 */
function applySM2(card, quality) {
  let { interval, easeFactor, repetitions } = card;

  if (quality < 3) {
    // Failed — reset to beginning, review again soon
    repetitions = 0;
    interval    = 1;
  } else {
    // Passed — advance the schedule
    if (repetitions === 0)      interval = 1;
    else if (repetitions === 1) interval = 6;
    else                        interval = Math.round(interval * easeFactor);

    easeFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    easeFactor  = Math.max(MIN_EF, easeFactor);
    repetitions += 1;
  }

  // Schedule next review
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  return {
    ...card,
    interval,
    easeFactor,
    repetitions,
    nextReview: nextDate.toISOString(),
    lastReview: new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add a new vocabulary card to the child's SR deck.
 * No-op if the card already exists.
 *
 * @param {string} childId
 * @param {string} word
 * @param {string} domain  'speech' | 'vocabulary' | 'grammar'
 */
export function addCard(childId, word, domain = 'vocabulary') {
  if (!childId || !word) return;
  const cards = loadCards(childId);
  const key   = `${domain}::${word}`;
  if (cards[key]) return; // already exists

  cards[key] = {
    word,
    domain,
    interval:    1,
    easeFactor:  DEFAULT_EF,
    repetitions: 0,
    nextReview:  new Date().toISOString(), // due immediately (new card)
    addedAt:     new Date().toISOString(),
    lastReview:  null,
  };
  saveCards(childId, cards);
}

/**
 * Record a quiz/practice result for a word and advance its SM-2 schedule.
 * Creates the card if it does not yet exist.
 *
 * @param {string} childId
 * @param {string} word
 * @param {string} domain
 * @param {number} quality  0–5
 */
export function reviewCard(childId, word, domain = 'vocabulary', quality = 3) {
  if (!childId || !word) return;
  const cards = loadCards(childId);
  const key   = `${domain}::${word}`;

  const existing = cards[key] || {
    word,
    domain,
    interval:    1,
    easeFactor:  DEFAULT_EF,
    repetitions: 0,
    nextReview:  new Date().toISOString(),
    addedAt:     new Date().toISOString(),
    lastReview:  null,
  };

  cards[key] = applySM2(existing, quality);
  saveCards(childId, cards);
}

/**
 * Return cards that are due for review today (nextReview ≤ now).
 * Sorted by most overdue first (earliest nextReview).
 *
 * @param {string} childId
 * @param {number} [limit=10]
 * @returns {Object[]}  Array of card objects
 */
export function getDueCards(childId, limit = 10) {
  if (!childId) return [];
  const cards = loadCards(childId);
  const now   = new Date();
  return Object.values(cards)
    .filter((c) => new Date(c.nextReview) <= now)
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))
    .slice(0, limit);
}

/**
 * Return all cards for a child, enriched with a `isDue` boolean.
 *
 * @param {string} childId
 * @returns {Object[]}
 */
export function getAllCards(childId) {
  if (!childId) return [];
  const cards = loadCards(childId);
  const now   = new Date();
  return Object.values(cards).map((c) => ({
    ...c,
    isDue: new Date(c.nextReview) <= now,
  }));
}

/**
 * Return summary stats for the child's SR deck.
 *
 * @param {string} childId
 * @returns {{ total: number, due: number, mastered: number, new: number }}
 */
export function getDeckStats(childId) {
  const cards   = getAllCards(childId);
  const now     = new Date();
  const due     = cards.filter((c) => c.isDue).length;
  const mastered = cards.filter((c) => c.repetitions >= 5 && c.easeFactor >= 2.0).length;
  const newCards = cards.filter((c) => c.repetitions === 0).length;
  return { total: cards.length, due, mastered, new: newCards };
}

/**
 * Convert a mistake-count priority score to a SM-2 quality rating.
 * Used when importing existing mistake data into the SR system.
 *
 * @param {number} count  How many times the word was missed
 * @returns {number}      Quality rating 0–3
 */
export function mistakeCountToQuality(count) {
  if (count >= 5) return 0;
  if (count >= 3) return 1;
  if (count >= 2) return 2;
  return 3;
}
