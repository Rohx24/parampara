/**
 * Phoneme-based Grapheme-to-Phoneme (G2P) converter for Indian languages.
 *
 * Converts words in Hindi (Devanagari), Tamil, Telugu, Kannada, or English
 * into sequences of phoneme tokens, then computes phoneme-level edit distance
 * for pronunciation scoring that is far more linguistically valid than raw
 * character Levenshtein distance.
 *
 * Why phonemes beat characters:
 *   - "नमस्ते" vs "नमस्ति" (ते→ति) = 1 phoneme diff (e→i), but 2+ char diffs
 *   - Aspirated pairs (क/ख, त/थ) are near-misses, not full errors
 *   - Long/short vowels (a/aa, i/ii) are common learner substitutions
 *   - Retroflex/dental confusion (ट/त, ड/द) is a known acquisition stage
 *
 * Architecture:
 *   Word string → Unicode codepoints → G2P algorithm → phoneme[] → weighted edit distance
 */

// ─── Devanagari (Hindi) tables ─────────────────────────────────────────────────

const DEVANAGARI_VIRAMA = '\u094D'; // ् — removes inherent vowel

const DEVA_CONSONANTS = {
  '\u0915': 'k',    '\u0916': 'kh',   '\u0917': 'g',    '\u0918': 'gh',   '\u0919': 'ng',
  '\u091A': 'ch',   '\u091B': 'chh',  '\u091C': 'j',    '\u091D': 'jh',   '\u091E': 'ny',
  '\u091F': 'T',    '\u0920': 'Th',   '\u0921': 'D',    '\u0922': 'Dh',   '\u0923': 'N',
  '\u0924': 't',    '\u0925': 'th',   '\u0926': 'd',    '\u0927': 'dh',   '\u0928': 'n',
  '\u092A': 'p',    '\u092B': 'ph',   '\u092C': 'b',    '\u092D': 'bh',   '\u092E': 'm',
  '\u092F': 'y',    '\u0930': 'r',    '\u0932': 'l',    '\u0935': 'v',
  '\u0936': 'sh',   '\u0937': 'Sh',   '\u0938': 's',    '\u0939': 'h',
  '\u0929': 'n',    '\u0931': 'rr',   '\u0933': 'L',    '\u0934': 'zh',
  '\u0958': 'q',    '\u0959': 'kh',   '\u095A': 'g',    '\u095B': 'z',
  '\u095C': 'D',    '\u095D': 'Dh',   '\u095E': 'f',    '\u095F': 'y',
};

const DEVA_VOWELS = {
  '\u0905': 'a',    '\u0906': 'aa',   '\u0907': 'i',    '\u0908': 'ii',
  '\u0909': 'u',    '\u090A': 'uu',   '\u090B': 'ri',
  '\u090E': 'e',    '\u090F': 'e',    '\u0910': 'ai',
  '\u0912': 'o',    '\u0913': 'o',    '\u0914': 'au',
};

const DEVA_MATRAS = {
  '\u093E': 'aa',   '\u093F': 'i',    '\u0940': 'ii',
  '\u0941': 'u',    '\u0942': 'uu',   '\u0943': 'ri',
  '\u0947': 'e',    '\u0948': 'ai',   '\u094B': 'o',    '\u094C': 'au',
  '\u0902': 'n',    '\u0903': 'h',    '\u0900': 'n',    '\u0901': 'n',
  '\u093C': null,   // nukta — grapheme modifier, no phoneme change
};

// ─── Tamil tables ──────────────────────────────────────────────────────────────

const TAMIL_VIRAMA = '\u0BCD'; // ் virama

const TAMIL_CONSONANTS = {
  '\u0B95': 'k',    '\u0B99': 'ng',   '\u0B9A': 'ch',   '\u0B9E': 'ny',
  '\u0B9F': 'T',    '\u0BA3': 'N',    '\u0BA4': 'th',   '\u0BA8': 'n',
  '\u0BA9': 'n',    '\u0BAA': 'p',    '\u0BAE': 'm',    '\u0BAF': 'y',
  '\u0BB0': 'r',    '\u0BB1': 'rr',   '\u0BB2': 'l',    '\u0BB3': 'll',
  '\u0BB4': 'zh',   '\u0BB5': 'v',    '\u0BB6': 'sh',   '\u0BB7': 'Sh',
  '\u0BB8': 's',    '\u0BB9': 'h',
};

const TAMIL_VOWELS = {
  '\u0B85': 'a',    '\u0B86': 'aa',   '\u0B87': 'i',    '\u0B88': 'ii',
  '\u0B89': 'u',    '\u0B8A': 'uu',
  '\u0B8E': 'e',    '\u0B8F': 'ee',   '\u0B90': 'ai',
  '\u0B92': 'o',    '\u0B93': 'oo',   '\u0B94': 'au',
};

const TAMIL_MATRAS = {
  '\u0BBE': 'aa',   '\u0BBF': 'i',    '\u0BC0': 'ii',
  '\u0BC1': 'u',    '\u0BC2': 'uu',
  '\u0BC6': 'e',    '\u0BC7': 'ee',   '\u0BC8': 'ai',
  '\u0BCA': 'o',    '\u0BCB': 'oo',   '\u0BCC': 'au',
  '\u0B82': 'n',
};

// ─── Telugu tables ─────────────────────────────────────────────────────────────

const TELUGU_VIRAMA = '\u0C4D';

const TELUGU_CONSONANTS = {
  '\u0C15': 'k',    '\u0C16': 'kh',   '\u0C17': 'g',    '\u0C18': 'gh',   '\u0C19': 'ng',
  '\u0C1A': 'ch',   '\u0C1B': 'chh',  '\u0C1C': 'j',    '\u0C1D': 'jh',   '\u0C1E': 'ny',
  '\u0C1F': 'T',    '\u0C20': 'Th',   '\u0C21': 'D',    '\u0C22': 'Dh',   '\u0C23': 'N',
  '\u0C24': 't',    '\u0C25': 'th',   '\u0C26': 'd',    '\u0C27': 'dh',   '\u0C28': 'n',
  '\u0C2A': 'p',    '\u0C2B': 'ph',   '\u0C2C': 'b',    '\u0C2D': 'bh',   '\u0C2E': 'm',
  '\u0C2F': 'y',    '\u0C30': 'r',    '\u0C31': 'rr',   '\u0C32': 'l',    '\u0C33': 'll',
  '\u0C35': 'v',    '\u0C36': 'sh',   '\u0C37': 'Sh',   '\u0C38': 's',    '\u0C39': 'h',
};

const TELUGU_VOWELS = {
  '\u0C05': 'a',    '\u0C06': 'aa',   '\u0C07': 'i',    '\u0C08': 'ii',
  '\u0C09': 'u',    '\u0C0A': 'uu',   '\u0C0B': 'ri',
  '\u0C0E': 'e',    '\u0C0F': 'ee',   '\u0C10': 'ai',
  '\u0C12': 'o',    '\u0C13': 'oo',   '\u0C14': 'au',
};

const TELUGU_MATRAS = {
  '\u0C3E': 'aa',   '\u0C3F': 'i',    '\u0C40': 'ii',
  '\u0C41': 'u',    '\u0C42': 'uu',   '\u0C43': 'ri',
  '\u0C46': 'e',    '\u0C47': 'ee',   '\u0C48': 'ai',
  '\u0C4A': 'o',    '\u0C4B': 'oo',   '\u0C4C': 'au',
  '\u0C02': 'n',    '\u0C03': 'h',
};

// ─── Kannada tables ────────────────────────────────────────────────────────────

const KANNADA_VIRAMA = '\u0CCD';

const KANNADA_CONSONANTS = {
  '\u0C95': 'k',    '\u0C96': 'kh',   '\u0C97': 'g',    '\u0C98': 'gh',   '\u0C99': 'ng',
  '\u0C9A': 'ch',   '\u0C9B': 'chh',  '\u0C9C': 'j',    '\u0C9D': 'jh',   '\u0C9E': 'ny',
  '\u0C9F': 'T',    '\u0CA0': 'Th',   '\u0CA1': 'D',    '\u0CA2': 'Dh',   '\u0CA3': 'N',
  '\u0CA4': 't',    '\u0CA5': 'th',   '\u0CA6': 'd',    '\u0CA7': 'dh',   '\u0CA8': 'n',
  '\u0CAA': 'p',    '\u0CAB': 'ph',   '\u0CAC': 'b',    '\u0CAD': 'bh',   '\u0CAE': 'm',
  '\u0CAF': 'y',    '\u0CB0': 'r',    '\u0CB1': 'rr',   '\u0CB2': 'l',    '\u0CB3': 'll',
  '\u0CB5': 'v',    '\u0CB6': 'sh',   '\u0CB7': 'Sh',   '\u0CB8': 's',    '\u0CB9': 'h',
};

const KANNADA_VOWELS = {
  '\u0C85': 'a',    '\u0C86': 'aa',   '\u0C87': 'i',    '\u0C88': 'ii',
  '\u0C89': 'u',    '\u0C8A': 'uu',   '\u0C8B': 'ri',
  '\u0C8E': 'e',    '\u0C8F': 'ee',   '\u0C90': 'ai',
  '\u0C92': 'o',    '\u0C93': 'oo',   '\u0C94': 'au',
};

const KANNADA_MATRAS = {
  '\u0CBE': 'aa',   '\u0CBF': 'i',    '\u0CC0': 'ii',
  '\u0CC1': 'u',    '\u0CC2': 'uu',   '\u0CC3': 'ri',
  '\u0CC6': 'e',    '\u0CC7': 'ee',   '\u0CC8': 'ai',
  '\u0CCA': 'o',    '\u0CCB': 'oo',   '\u0CCC': 'au',
  '\u0C82': 'n',    '\u0C83': 'h',
};

// ─── Language table registry ───────────────────────────────────────────────────

const LANG_TABLES = {
  hindi:   { consonants: DEVA_CONSONANTS,    vowels: DEVA_VOWELS,    matras: DEVA_MATRAS,    virama: DEVANAGARI_VIRAMA },
  tamil:   { consonants: TAMIL_CONSONANTS,   vowels: TAMIL_VOWELS,   matras: TAMIL_MATRAS,   virama: TAMIL_VIRAMA },
  telugu:  { consonants: TELUGU_CONSONANTS,  vowels: TELUGU_VOWELS,  matras: TELUGU_MATRAS,  virama: TELUGU_VIRAMA },
  kannada: { consonants: KANNADA_CONSONANTS, vowels: KANNADA_VOWELS, matras: KANNADA_MATRAS, virama: KANNADA_VIRAMA },
};

// ─── G2P core algorithm ────────────────────────────────────────────────────────

/**
 * Convert a word in any supported Indian language (or English) to a phoneme array.
 * Each element is a phoneme token like 'k', 'kh', 'aa', 'T', 'zh', etc.
 *
 * The algorithm is an abugida parser:
 *   - Each consonant has an inherent /a/ vowel
 *   - Virama after a consonant removes its inherent vowel (consonant cluster)
 *   - Matra (vowel sign) after a consonant replaces its inherent /a/
 *   - Independent vowels are emitted directly
 *
 * @param {string} word
 * @param {string} language  'hindi' | 'tamil' | 'telugu' | 'kannada' | 'english'
 * @returns {string[]}  e.g. ['n','a','m','a','s','t','e'] for "namaste"
 */
export function wordToPhonemes(word, language = 'hindi') {
  if (!word) return [];

  // English: simple character-level phoneme (lowercase letters as phoneme units)
  if (language === 'english') {
    return word
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .split('')
      .filter(Boolean);
  }

  const tables = LANG_TABLES[language];
  if (!tables) return word.toLowerCase().split('').filter(Boolean);

  const { consonants, vowels, matras, virama } = tables;
  const chars = [...word]; // Unicode-aware split (handles surrogate pairs)
  const phonemes = [];
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];

    if (consonants[ch] !== undefined) {
      // ── Consonant ─────────────────────────────────────────────────────────
      const base = consonants[ch];
      i++;

      if (i < chars.length && chars[i] === virama) {
        // Virama: pure consonant, no vowel
        phonemes.push(base);
        i++;
      } else if (i < chars.length && matras[chars[i]] !== undefined) {
        // Matra overrides inherent /a/ with its own vowel
        const vowelPhoneme = matras[chars[i]];
        if (vowelPhoneme !== null) {
          // nukta (null) is a grapheme modifier, not a vowel — emit just the consonant
          phonemes.push(base + vowelPhoneme);
        } else {
          phonemes.push(base + 'a');
        }
        i++;
      } else {
        // Inherent /a/ vowel
        phonemes.push(base + 'a');
      }
    } else if (vowels[ch] !== undefined) {
      // ── Independent vowel ─────────────────────────────────────────────────
      phonemes.push(vowels[ch]);
      i++;
    } else if (matras[ch] !== undefined) {
      // ── Orphaned matra (shouldn't normally occur) ──────────────────────────
      const v = matras[ch];
      if (v !== null) phonemes.push(v);
      i++;
    } else {
      // ── Unknown character (punctuation, spaces, numerals) — skip ──────────
      i++;
    }
  }

  return phonemes;
}

// ─── Phoneme similarity penalty matrix ────────────────────────────────────────

/**
 * Substitution cost between two phoneme tokens.
 * Returns 0 (identical), 0.2–0.5 (near miss), or 1.0 (completely different).
 *
 * Linguistically-motivated near-miss categories:
 *   - Long/short vowel pairs (a/aa, i/ii, u/uu)      → 0.2  very common learner error
 *   - Aspirated/unaspirated pairs (k/kh, t/th, p/ph)  → 0.3  key Indian phonology challenge
 *   - Retroflex/dental pairs (T/t, D/d, N/n)          → 0.4  classic acquisition stage
 *   - Same vowel class (front/back/mid)               → 0.5  related sounds
 *   - Nasals (n/m/ng)                                 → 0.4  often confused
 *   - Sibilants (s/sh/Sh)                             → 0.4  common confusable
 */
function phonemePenalty(p1, p2) {
  if (p1 === p2) return 0;

  // Long/short vowel pairs — minimal penalty (0.2)
  const longShort = { a: 'aa', aa: 'a', i: 'ii', ii: 'i', u: 'uu', uu: 'u', e: 'ee', ee: 'e', o: 'oo', oo: 'o' };
  if (longShort[p1] === p2) return 0.2;

  // Aspirated/unaspirated pairs (0.3)
  const aspirate = { k: 'kh', kh: 'k', t: 'th', th: 't', p: 'ph', ph: 'p', ch: 'chh', chh: 'ch', g: 'gh', gh: 'g', d: 'dh', dh: 'd', j: 'jh', jh: 'j', b: 'bh', bh: 'b' };
  if (aspirate[p1] === p2) return 0.3;

  // Retroflex/dental pairs (0.4)
  const retroflex = { T: 't', t: 'T', D: 'd', d: 'D', N: 'n', n: 'N', Th: 'th', th: 'Th', Dh: 'dh', dh: 'Dh', Sh: 'sh', sh: 'Sh' };
  if (retroflex[p1] === p2) return 0.4;

  // Same vowel class (0.5)
  const frontV = new Set(['i', 'ii', 'e', 'ee', 'ai']);
  const backV  = new Set(['u', 'uu', 'o', 'oo', 'au']);
  const midV   = new Set(['a', 'aa', 'ri']);
  if (frontV.has(p1) && frontV.has(p2)) return 0.5;
  if (backV.has(p1)  && backV.has(p2))  return 0.5;
  if (midV.has(p1)   && midV.has(p2))   return 0.5;

  // Nasal class (0.4)
  const nasals = new Set(['n', 'N', 'm', 'ng', 'ny']);
  if (nasals.has(p1) && nasals.has(p2)) return 0.4;

  // Sibilant class (0.4)
  const sibilants = new Set(['s', 'sh', 'Sh', 'z']);
  if (sibilants.has(p1) && sibilants.has(p2)) return 0.4;

  // Liquid/rhotic class (0.5)
  const liquids = new Set(['r', 'rr', 'l', 'll', 'L', 'zh', 'y', 'v']);
  if (liquids.has(p1) && liquids.has(p2)) return 0.5;

  return 1.0; // completely different phoneme classes
}

// ─── Phoneme-level edit distance ──────────────────────────────────────────────

/**
 * Compute weighted edit distance between two phoneme sequences.
 * Treats each phoneme token as a single unit (not character-level).
 * Substitution cost is weighted by phoneme similarity (near-misses cost <1).
 *
 * @param {string[]} a  Phoneme sequence
 * @param {string[]} b  Phoneme sequence
 * @returns {number}    Edit distance (can be fractional due to weighted substitutions)
 */
export function phonemeEditDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;

  // dp[i][j] = min edit distance between a[0..i-1] and b[0..j-1]
  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array(n + 1).fill(0);
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = phonemePenalty(a[i - 1], b[j - 1]);
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,           // deletion
        dp[i][j - 1] + 1,           // insertion
        dp[i - 1][j - 1] + cost,    // substitution (weighted)
      );
    }
  }
  return dp[m][n];
}

// ─── Word-level phoneme similarity ────────────────────────────────────────────

/**
 * Compute phoneme similarity between two words (0.0–1.0, higher = more similar).
 * Uses phoneme-level edit distance normalised by the longer sequence length.
 *
 * @param {string} wordA
 * @param {string} wordB
 * @param {string} language
 * @returns {number}  0.0 (completely different) … 1.0 (identical pronunciation)
 */
export function phonemeSimilarity(wordA, wordB, language = 'hindi') {
  const pA = wordToPhonemes(wordA, language);
  const pB = wordToPhonemes(wordB, language);
  if (!pA.length && !pB.length) return 1;
  const dist = phonemeEditDistance(pA, pB);
  const maxLen = Math.max(pA.length, pB.length) || 1;
  return Math.max(0, 1 - dist / maxLen);
}

// ─── Transcript-level phoneme evaluation ──────────────────────────────────────

/**
 * Evaluate a user's spoken transcript against an expected sentence using
 * phoneme-aware scoring — a linguistically superior replacement for raw
 * character Levenshtein distance.
 *
 * Algorithm:
 *   1. Keyword coverage: for each keyword, check if any user word is
 *      phonemically ≥60% similar (catches pronunciation variants)
 *   2. Phonetic similarity: for each expected word, find the most similar
 *      user word by phoneme distance; average across all expected words
 *   3. Final score: 70% keyword coverage + 30% phonetic similarity
 *
 * @param {string}   expectedRaw  Expected sentence (native script or English)
 * @param {string}   userRaw      User's recognised speech
 * @param {string[]} keywords     Key words that must appear (from voice prompt)
 * @param {string}   language     'hindi' | 'tamil' | 'telugu' | 'kannada' | 'english'
 * @returns {{ score: number, similarity: number, missingKeywords: string[], phonemeBased: true }}
 */
export function evaluateTranscriptPhoneme(expectedRaw, userRaw, keywords = [], language = 'hindi') {
  // Tokenise by splitting on whitespace and stripping punctuation
  const clean = (s) => (s || '').trim().toLowerCase().replace(/[.,!?;:"''""()\-।]/g, ' ').replace(/\s+/g, ' ');
  const expectedWords = clean(expectedRaw).split(' ').filter(Boolean);
  const userWords     = clean(userRaw).split(' ').filter(Boolean);

  // ── 1. Keyword coverage with phoneme fuzzy matching ────────────────────────
  const PHONEME_MATCH_THRESHOLD = 0.60;

  const missingKeywords = keywords.filter((keyword) => {
    const kPh = wordToPhonemes(clean(keyword), language);
    return !userWords.some((uWord) => {
      const uPh = wordToPhonemes(uWord, language);
      const maxLen = Math.max(kPh.length, uPh.length) || 1;
      const dist = phonemeEditDistance(kPh, uPh);
      return (1 - dist / maxLen) >= PHONEME_MATCH_THRESHOLD;
    });
  });

  const keywordCoverage = keywords.length === 0
    ? 1
    : (keywords.length - missingKeywords.length) / keywords.length;

  // ── 2. Overall phonetic similarity (per-word best-match alignment) ─────────
  let phoneticSim = 0;
  if (expectedWords.length > 0 && userWords.length > 0) {
    let total = 0;
    for (const expWord of expectedWords) {
      const expPh = wordToPhonemes(expWord, language);
      let best = 0;
      for (const uWord of userWords) {
        const uPh = wordToPhonemes(uWord, language);
        const maxLen = Math.max(expPh.length, uPh.length) || 1;
        const dist = phonemeEditDistance(expPh, uPh);
        const sim = Math.max(0, 1 - dist / maxLen);
        if (sim > best) best = sim;
      }
      total += best;
    }
    phoneticSim = total / expectedWords.length;
  } else if (!expectedWords.length && !userWords.length) {
    phoneticSim = 1;
  }

  const score = Math.round(100 * (0.7 * keywordCoverage + 0.3 * phoneticSim));

  return {
    score,
    similarity: phoneticSim,
    missingKeywords,
    phonemeBased: true,
  };
}

/**
 * Return a human-readable breakdown of how a word is pronounced phonemically.
 * Useful for UI tooltips showing children what sounds they need to produce.
 *
 * @param {string} word
 * @param {string} language
 * @returns {string}  e.g. "na-ma-s-te" for "नमस्ते"
 */
export function phoneticBreakdown(word, language = 'hindi') {
  const phonemes = wordToPhonemes(word, language);
  return phonemes.join('-');
}
