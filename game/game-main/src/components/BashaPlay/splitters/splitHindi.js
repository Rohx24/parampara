import { splitGraphemes } from './splitGraphemes';

const MATRA_REGEX = /[\u093E-\u094C\u093F\u0940\u0941\u0942\u0943\u0944\u0962\u0963\u0947\u0948\u094B\u094C\u0956\u0957]/;

function splitMatras(cluster) {
  let base = '';
  const matras = [];
  for (const char of Array.from(cluster)) {
    if (MATRA_REGEX.test(char)) {
      matras.push(char);
    } else {
      base += char;
    }
  }
  if (!base) return matras.length ? matras : [cluster];
  return matras.length ? [base, ...matras] : [base];
}

export function splitHindi(word, mode = 'easy') {
  const graphemes = splitGraphemes(word);

  if (mode === 'medium') {
    return graphemes.flatMap((cluster) => splitMatras(cluster));
  }

  return graphemes;
}
