import { splitEnglish } from './splitters/splitEnglish';
import { splitHindi } from './splitters/splitHindi';
import { splitGraphemes } from './splitters/splitGraphemes';

const COLORS = [
  '#ff7a7a',
  '#ffd166',
  '#7bdff2',
  '#8be28b',
  '#c4a1ff',
  '#ffb703',
  '#ff8fab',
  '#6cdbeb',
  '#a0e7e5',
  '#bde0fe',
  '#ffd6a5',
  '#fdffb6',
];

export function shuffleArray(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandomWord(words, lastWordText) {
  if (!words.length) return null;
  let next = words[Math.floor(Math.random() * words.length)];
  if (words.length > 1) {
    while (next.word === lastWordText) {
      next = words[Math.floor(Math.random() * words.length)];
    }
  }
  return next;
}

export function createRound(currentWord, language, hindiMode) {
  if (!currentWord) {
    return { currentWord: null, units: [], boxes: [], tiles: [] };
  }
  const wordText = currentWord.word;
  const units =
    language === 'hi'
      ? splitHindi(wordText, hindiMode)
      : language === 'ta' || language === 'te'
        ? splitGraphemes(wordText)
        : splitEnglish(wordText);
  const boxes = units.map((text, index) => ({
    id: index,
    text,
    color: COLORS[index % COLORS.length],
  }));

  const tiles = shuffleArray(
    boxes.map((box) => ({
      id: box.id,
      text: box.text,
      color: box.color,
      locked: false,
    }))
  );

  return { currentWord, units, boxes, tiles };
}
