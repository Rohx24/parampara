const hasSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined';
const segmenter = hasSegmenter ? new Intl.Segmenter('und', { granularity: 'grapheme' }) : null;

export function splitGraphemes(text) {
  if (!text) return [];
  if (segmenter) {
    return Array.from(segmenter.segment(text), (segment) => segment.segment);
  }
  return Array.from(text);
}
