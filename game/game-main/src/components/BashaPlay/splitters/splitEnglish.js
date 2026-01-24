export function splitEnglish(word) {
  return Array.from(word).filter((char) => char.trim().length > 0);
}
