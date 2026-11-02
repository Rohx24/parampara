const hasSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined';
const segmenter = hasSegmenter ? new Intl.Segmenter('und', { granularity: 'grapheme' }) : null;

// Without Intl.Segmenter, keep vowel signs, virama and joiners on the letter before them.
const FALLBACK_CLUSTER = /[^\p{M}‌‍][\p{M}‌‍]*|[\p{M}‌‍]+/gu;

const MALAYALAM_VIRAMA = '്';
const MALAYALAM_CONSONANT = /^[ക-ഺ]/;

// Older ICU versions and the fallback break a conjunct after the virama, so the
// same word would give different tiles on different phones. Rejoin them here.
function joinMalayalamConjuncts(clusters) {
  const joined = [];
  for (const cluster of clusters) {
    const last = joined[joined.length - 1];
    if (last?.endsWith(MALAYALAM_VIRAMA) && MALAYALAM_CONSONANT.test(cluster)) {
      joined[joined.length - 1] = last + cluster;
    } else {
      joined.push(cluster);
    }
  }
  return joined;
}

export function splitGraphemes(text) {
  if (!text) return [];
  const clusters = segmenter
    ? Array.from(segmenter.segment(text), (segment) => segment.segment)
    : text.match(FALLBACK_CLUSTER) ?? [];
  return joinMalayalamConjuncts(clusters);
}
