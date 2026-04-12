/**
 * Bayesian Knowledge Tracing (BKT) for BashaBuddy.
 *
 * BKT models a child's knowledge state for each language concept as a
 * hidden Markov model with two states: "known" and "unknown". After each
 * quiz answer, the probability that the child has mastered the concept is
 * updated using Bayes' theorem.
 *
 * Standard BKT parameters (Anderson et al., 1995 / Corbett & Anderson, 1994):
 *   P(L₀) = 0.10   Prior probability of knowing the concept
 *   P(T)  = 0.20   Probability of learning (transitioning unknown→known) per trial
 *   P(G)  = 0.25   Probability of guessing correctly despite not knowing
 *   P(S)  = 0.15   Probability of slipping (error despite knowing)
 *
 * Update equations:
 *   P(L_n | correct) = P(L_{n-1}) × (1-P(S)) / [P(L_{n-1})×(1-P(S)) + (1-P(L_{n-1}))×P(G)]
 *   P(L_n | incorrect) = P(L_{n-1}) × P(S) / [P(L_{n-1})×P(S) + (1-P(L_{n-1}))×(1-P(G))]
 *   P(L_{n+1}) = P(L_n) + (1 - P(L_n)) × P(T)   (after each trial, learn transition)
 *
 * Mastery threshold: P(L) ≥ 0.95 (standard in ITS literature)
 *
 * Reference: Corbett, A.T. & Anderson, J.R. (1994). Knowledge tracing:
 *   Modeling the acquisition of procedural knowledge.
 *   User Modeling and User-Adapted Interaction, 4(4), 253–278.
 */

const LS_KEY = (childId) => `bhashabuddy_bkt_${childId}`;

// ─── BKT parameters ────────────────────────────────────────────────────────────
const P_L0 = 0.10; // Prior: prob of already knowing
const P_T  = 0.20; // Transition: prob of learning each trial
const P_G  = 0.25; // Guess: prob correct despite not knowing
const P_S  = 0.15; // Slip: prob incorrect despite knowing
const MASTERY_THRESHOLD = 0.95;

// ─── Concept taxonomy ──────────────────────────────────────────────────────────
// These are the language concepts BKT tracks. Each maps to related story
// genres, quiz keywords, and voice prompt themes.

export const CONCEPTS = [
  { id: 'greetings',  label: 'Greetings',   emoji: '👋', genres: [],              keywords: ['hello', 'namaste', 'vanakkam', 'namaskar', 'नमस्ते', 'வணக்கம்'] },
  { id: 'family',     label: 'Family',      emoji: '👨‍👩‍👧', genres: ['moral'],        keywords: ['mother', 'father', 'grandma', 'grandpa', 'माँ', 'पापा', 'दादी', 'अम்மா'] },
  { id: 'animals',    label: 'Animals',     emoji: '🐯', genres: ['adventure'],   keywords: ['tiger', 'bird', 'elephant', 'animal', 'जानवर', 'पक्षी', 'बाघ', 'விலங்கு'] },
  { id: 'food',       label: 'Food',        emoji: '🍛', genres: ['festival'],    keywords: ['food', 'eat', 'cook', 'mango', 'खाना', 'आम', 'சாப்பாடு', 'மாம்பழம்'] },
  { id: 'festivals',  label: 'Festivals',   emoji: '🪔', genres: ['festival'],   keywords: ['diwali', 'holi', 'pongal', 'festival', 'दिवाली', 'होली', 'पोंगल', 'திருவிழா'] },
  { id: 'school',     label: 'School',      emoji: '📚', genres: [],              keywords: ['school', 'study', 'book', 'teacher', 'स्कूल', 'किताब', 'पाठशाला', 'பள்ளி'] },
  { id: 'nature',     label: 'Nature',      emoji: '🌿', genres: ['adventure'],  keywords: ['river', 'mountain', 'tree', 'sky', 'नदी', 'पर्वत', 'पेड़', 'ஆறு', 'மரம்'] },
  { id: 'emotions',   label: 'Emotions',    emoji: '😊', genres: ['moral','funny'], keywords: ['happy', 'sad', 'brave', 'afraid', 'खुश', 'डर', 'बहादुर', 'மகிழ்ச்சி'] },
  { id: 'numbers',    label: 'Numbers',     emoji: '🔢', genres: [],              keywords: ['one', 'two', 'three', 'first', 'एक', 'दो', 'तीन', 'ஒன்று', 'இரண்டு'] },
  { id: 'moral',      label: 'Moral values',emoji: '🌟', genres: ['moral'],       keywords: ['honest', 'kind', 'help', 'share', 'ईमानदार', 'दयालु', 'मदद', 'உதவி'] },
];

// Concept lookup by id
const CONCEPT_MAP = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

// ─── localStorage helpers ──────────────────────────────────────────────────────

function loadState(childId) {
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

function saveState(childId, state) {
  if (!childId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY(childId), JSON.stringify(state));
  } catch {
    // non-fatal
  }
}

// ─── BKT update math ──────────────────────────────────────────────────────────

/** Bayesian update of P(known) given a correct answer. */
function updateCorrect(pKnown) {
  const numerator   = pKnown * (1 - P_S);
  const denominator = numerator + (1 - pKnown) * P_G;
  const pKnownGiven = denominator > 0 ? numerator / denominator : pKnown;
  // Apply learn transition: might have learned this trial
  return pKnownGiven + (1 - pKnownGiven) * P_T;
}

/** Bayesian update of P(known) given an incorrect answer. */
function updateIncorrect(pKnown) {
  const numerator   = pKnown * P_S;
  const denominator = numerator + (1 - pKnown) * (1 - P_G);
  const pKnownGiven = denominator > 0 ? numerator / denominator : pKnown;
  return pKnownGiven + (1 - pKnownGiven) * P_T;
}

// ─── Concept detection ────────────────────────────────────────────────────────

/**
 * Detect which BKT concepts are touched by a story session or quiz event.
 * Matches the session's genre and any word-level keyword overlap.
 *
 * @param {Object} opts
 * @param {string}   [opts.genre]     Story genre
 * @param {string}   [opts.text]      Story text or question text (optional)
 * @param {string[]} [opts.weakWords] Weak words targeted in this session
 * @returns {string[]}  Array of concept ids
 */
export function detectConcepts({ genre = '', text = '', weakWords = [] } = {}) {
  const matched = new Set();
  const lowerText = (text + ' ' + weakWords.join(' ')).toLowerCase();

  for (const concept of CONCEPTS) {
    // Genre match
    if (concept.genres.includes(genre)) matched.add(concept.id);
    // Keyword match in text
    if (concept.keywords.some((kw) => lowerText.includes(kw.toLowerCase()))) {
      matched.add(concept.id);
    }
  }

  return [...matched];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Update BKT knowledge state for a set of concepts after a quiz answer.
 *
 * @param {string}   childId
 * @param {string[]} conceptIds  Concepts touched by this quiz event
 * @param {boolean}  wasCorrect  Whether the child answered correctly
 */
export function updateConcepts(childId, conceptIds, wasCorrect) {
  if (!childId || !conceptIds?.length) return;
  const state = loadState(childId);

  for (const conceptId of conceptIds) {
    if (!CONCEPT_MAP[conceptId]) continue;
    const current = state[conceptId]?.pKnown ?? P_L0;
    const updated = wasCorrect ? updateCorrect(current) : updateIncorrect(current);
    state[conceptId] = {
      pKnown:    Math.min(1, Math.max(0, updated)),
      trials:    (state[conceptId]?.trials || 0) + 1,
      lastUpdate: new Date().toISOString(),
    };
  }

  saveState(childId, state);
}

/**
 * Get the full knowledge state for all concepts, sorted by P(known).
 *
 * @param {string} childId
 * @returns {Array<{ id, label, emoji, pKnown, mastered, trials, lastUpdate }>}
 */
export function getConceptMastery(childId) {
  const state = loadState(childId);
  return CONCEPTS.map((concept) => {
    const entry   = state[concept.id] || {};
    const pKnown  = entry.pKnown ?? P_L0;
    return {
      id:         concept.id,
      label:      concept.label,
      emoji:      concept.emoji,
      pKnown,
      mastered:   pKnown >= MASTERY_THRESHOLD,
      trials:     entry.trials || 0,
      lastUpdate: entry.lastUpdate || null,
    };
  }).sort((a, b) => b.pKnown - a.pKnown);
}

/**
 * Return concepts that need the most practice (lowest P(known), not yet mastered).
 * Used by adaptive difficulty to recommend what to study next.
 *
 * @param {string} childId
 * @param {number} [limit=3]
 * @returns {string[]}  Concept ids
 */
export function getWeakConcepts(childId, limit = 3) {
  return getConceptMastery(childId)
    .filter((c) => !c.mastered)
    .slice(-limit) // lowest pKnown = last after descending sort
    .map((c) => c.id);
}

/**
 * Build a prompt fragment describing the child's knowledge gaps for GPT.
 * Injected into story/quiz prompts to guide concept coverage.
 *
 * @param {string} childId
 * @returns {string}
 */
export function buildBKTPromptContext(childId) {
  const weakConcepts = getWeakConcepts(childId, 3);
  if (!weakConcepts.length) return '';

  const labels = weakConcepts.map((id) => CONCEPT_MAP[id]?.label).filter(Boolean);
  if (!labels.length) return '';

  return `\n\nKnowledge tracing indicates this child needs practice with: ${labels.join(', ')}. ` +
    `Naturally weave vocabulary and situations related to these themes into the story.`;
}

/**
 * Return a summary: how many concepts mastered vs total.
 * @param {string} childId
 * @returns {{ mastered: number, total: number, pct: number }}
 */
export function getMasterySummary(childId) {
  const mastery   = getConceptMastery(childId);
  const mastered  = mastery.filter((c) => c.mastered).length;
  const total     = mastery.length;
  return { mastered, total, pct: total ? Math.round((mastered / total) * 100) : 0 };
}
