import { openaiSpeak } from "./openai.js";

const CLEAN_PUNCT = /[.,!?;:”’’””()\-]/g;

export const VOICE_LANGUAGES = [
  { id: "tamil", label: "Tamil", speechCode: "ta-IN" },
  { id: "telugu", label: "Telugu", speechCode: "te-IN" },
  { id: "hindi", label: "Hindi", speechCode: "hi-IN" },
  { id: "kannada", label: "Kannada", speechCode: "kn-IN" },
  { id: "english", label: "English", speechCode: "en-IN" },
];

const GUIDED_PROMPTS = [
  { id: "ta-5-1", language: "tamil", ageGroup: "5-7", nativeText: "வணக்கம் பாட்டி!", englishMeaning: "Hello grandma!", keywords: ["வணக்கம்", "பாட்டி"] },
  { id: "ta-5-2", language: "tamil", ageGroup: "5-7", nativeText: "எனக்கு பால் வேண்டும்.", englishMeaning: "I want milk.", keywords: ["எனக்கு", "பால்", "வேண்டும்"] },
  { id: "ta-5-3", language: "tamil", ageGroup: "5-7", nativeText: "என் பெயர் பட்டி.", englishMeaning: "My name is Buddy.", keywords: ["பெயர்"] },
  { id: "ta-5-4", language: "tamil", ageGroup: "5-7", nativeText: "எனக்கு சாப்பிட வேண்டும்.", englishMeaning: "I want to eat.", keywords: ["சாப்பிட", "வேண்டும்"] },
  { id: "ta-8-1", language: "tamil", ageGroup: "8-11", nativeText: "நான் பள்ளிக்குச் செல்கிறேன்.", englishMeaning: "I am going to school.", keywords: ["நான்", "பள்ளிக்குச்", "செல்கிறேன்"] },
  { id: "ta-8-2", language: "tamil", ageGroup: "8-11", nativeText: "அப்பா எனக்கு கதை சொன்னார்.", englishMeaning: "Dad told me a story.", keywords: ["அப்பா", "கதை", "சொன்னார்"] },
  { id: "ta-8-3", language: "tamil", ageGroup: "8-11", nativeText: "எனக்கு மாம்பழம் மிகவும் பிடிக்கும்.", englishMeaning: "I like mangoes very much.", keywords: ["மாம்பழம்", "பிடிக்கும்"] },
  { id: "ta-8-4", language: "tamil", ageGroup: "8-11", nativeText: "இன்று வானிலை நன்றாக இருக்கிறது.", englishMeaning: "The weather is good today.", keywords: ["வானிலை", "நன்றாக"] },
  { id: "ta-8-5", language: "tamil", ageGroup: "8-11", nativeText: "அம்மா சமையல் செய்கிறார்.", englishMeaning: "Mom is cooking.", keywords: ["அம்மா", "சமையல்"] },
  { id: "ta-12-1", language: "tamil", ageGroup: "12-15", nativeText: "பண்டிகைக்கு நாங்கள் சிறப்பு உணவு செய்தோம்.", englishMeaning: "We cooked special food for the festival.", keywords: ["பண்டிகைக்கு", "சிறப்பு", "உணவு"] },
  { id: "ta-12-2", language: "tamil", ageGroup: "12-15", nativeText: "புத்தகம் படித்த பிறகு கேள்விகளுக்கு பதிலளித்தேன்.", englishMeaning: "After reading, I answered questions.", keywords: ["புத்தகம்", "கேள்விகளுக்கு", "பதிலளித்தேன்"] },
  { id: "ta-12-3", language: "tamil", ageGroup: "12-15", nativeText: "நாம் சுற்றுச்சூழலை பாதுகாக்க வேண்டும்.", englishMeaning: "We must protect the environment.", keywords: ["சுற்றுச்சூழலை", "பாதுகாக்க"] },

  { id: "te-5-1", language: "telugu", ageGroup: "5-7", nativeText: "నమస్కారం అమ్మమ్మ!", englishMeaning: "Hello grandma!", keywords: ["నమస్కారం", "అమ్మమ్మ"] },
  { id: "te-5-2", language: "telugu", ageGroup: "5-7", nativeText: "నాకు పాలు కావాలి.", englishMeaning: "I want milk.", keywords: ["నాకు", "పాలు", "కావాలి"] },
  { id: "te-8-1", language: "telugu", ageGroup: "8-11", nativeText: "నేను పాఠశాలకు వెళ్తున్నాను.", englishMeaning: "I am going to school.", keywords: ["నేను", "పాఠశాలకు", "వెళ్తున్నాను"] },
  { id: "te-8-2", language: "telugu", ageGroup: "8-11", nativeText: "నాన్న నాకు కథ చదివారు.", englishMeaning: "Dad read me a story.", keywords: ["నాన్న", "కథ", "చదివారు"] },
  { id: "te-12-1", language: "telugu", ageGroup: "12-15", nativeText: "పండుగ రోజు మా ఇంట్లో ప్రత్యేక వంటలు చేశాం.", englishMeaning: "We made special dishes for the festival.", keywords: ["పండుగ", "ప్రత్యేక", "వంటలు"] },
  { id: "te-12-2", language: "telugu", ageGroup: "12-15", nativeText: "పుస్తకం చదివిన తర్వాత ప్రశ్నలకు సమాధానం ఇచ్చాను.", englishMeaning: "After reading, I answered questions.", keywords: ["పుస్తకం", "ప్రశ్నలకు", "సమాధానం"] },

  { id: "hi-5-1", language: "hindi", ageGroup: "5-7", nativeText: "नमस्ते दादी!", englishMeaning: "Hello grandma!", keywords: ["नमस्ते", "दादी"] },
  { id: "hi-5-2", language: "hindi", ageGroup: "5-7", nativeText: "मुझे दूध चाहिए।", englishMeaning: "I want milk.", keywords: ["मुझे", "दूध", "चाहिए"] },
  { id: "hi-5-3", language: "hindi", ageGroup: "5-7", nativeText: "मेरा नाम बडी है।", englishMeaning: "My name is Buddy.", keywords: ["मेरा", "नाम"] },
  { id: "hi-5-4", language: "hindi", ageGroup: "5-7", nativeText: "मुझे खाना खाना है।", englishMeaning: "I want to eat food.", keywords: ["खाना", "खाना"] },
  { id: "hi-8-1", language: "hindi", ageGroup: "8-11", nativeText: "मैं स्कूल जा रहा हूँ।", englishMeaning: "I am going to school.", keywords: ["मैं", "स्कूल", "जा"] },
  { id: "hi-8-2", language: "hindi", ageGroup: "8-11", nativeText: "पापा ने मुझे कहानी सुनाई।", englishMeaning: "Dad told me a story.", keywords: ["पापा", "कहानी", "सुनाई"] },
  { id: "hi-8-3", language: "hindi", ageGroup: "8-11", nativeText: "मुझे आम बहुत पसंद है।", englishMeaning: "I really like mangoes.", keywords: ["आम", "पसंद"] },
  { id: "hi-8-4", language: "hindi", ageGroup: "8-11", nativeText: "आज मौसम बहुत अच्छा है।", englishMeaning: "The weather is very nice today.", keywords: ["मौसम", "अच्छा"] },
  { id: "hi-8-5", language: "hindi", ageGroup: "8-11", nativeText: "माँ खाना बना रही हैं।", englishMeaning: "Mom is cooking food.", keywords: ["माँ", "खाना"] },
  { id: "hi-8-6", language: "hindi", ageGroup: "8-11", nativeText: "मेरा दोस्त बहुत मज़ेदार है।", englishMeaning: "My friend is very funny.", keywords: ["दोस्त", "मज़ेदार"] },
  { id: "hi-12-1", language: "hindi", ageGroup: "12-15", nativeText: "त्योहार पर हमने विशेष भोजन बनाया।", englishMeaning: "We cooked special food for the festival.", keywords: ["त्योहार", "विशेष", "भोजन"] },
  { id: "hi-12-2", language: "hindi", ageGroup: "12-15", nativeText: "किताब पढ़ने के बाद मैंने सवालों के जवाब दिए।", englishMeaning: "After reading, I answered questions.", keywords: ["किताब", "सवालों", "जवाब"] },
  { id: "hi-12-3", language: "hindi", ageGroup: "12-15", nativeText: "परीक्षा में मेहनत करना ज़रूरी है।", englishMeaning: "Working hard in exams is important.", keywords: ["परीक्षा", "मेहनत"] },
  { id: "hi-12-4", language: "hindi", ageGroup: "12-15", nativeText: "हमें पर्यावरण की रक्षा करनी चाहिए।", englishMeaning: "We should protect the environment.", keywords: ["पर्यावरण", "रक्षा"] },

  { id: "kn-5-1", language: "kannada", ageGroup: "5-7", nativeText: "ನಮಸ್ಕಾರ ಅಜ್ಜಿ!", englishMeaning: "Hello grandma!", keywords: ["ನಮಸ್ಕಾರ", "ಅಜ್ಜಿ"] },
  { id: "kn-5-2", language: "kannada", ageGroup: "5-7", nativeText: "ನನಗೆ ಹಾಲು ಬೇಕು.", englishMeaning: "I want milk.", keywords: ["ನನಗೆ", "ಹಾಲು", "ಬೇಕು"] },
  { id: "kn-8-1", language: "kannada", ageGroup: "8-11", nativeText: "ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತಿದ್ದೇನೆ.", englishMeaning: "I am going to school.", keywords: ["ನಾನು", "ಶಾಲೆಗೆ", "ಹೋಗುತ್ತಿದ್ದೇನೆ"] },
  { id: "kn-8-2", language: "kannada", ageGroup: "8-11", nativeText: "ಅಪ್ಪ ನನಗೆ ಕಥೆ ಹೇಳಿದನು.", englishMeaning: "Dad told me a story.", keywords: ["ಅಪ್ಪ", "ಕಥೆ", "ಹೇಳಿದನು"] },
  { id: "kn-12-1", language: "kannada", ageGroup: "12-15", nativeText: "ಹಬ್ಬದ ದಿನ ನಾವು ವಿಶೇಷ ಊಟ ಮಾಡಿದ್ದೇವೆ.", englishMeaning: "We made special food for the festival.", keywords: ["ಹಬ್ಬದ", "ವಿಶೇಷ", "ಊಟ"] },
  { id: "kn-12-2", language: "kannada", ageGroup: "12-15", nativeText: "ಪುಸ್ತಕ ಓದಿದ ನಂತರ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರ ನೀಡಿದೆ.", englishMeaning: "After reading, I answered questions.", keywords: ["ಪುಸ್ತಕ", "ಪ್ರಶ್ನೆಗಳಿಗೆ", "ಉತ್ತರ"] },

  { id: "en-5-1", language: "english", ageGroup: "5-7", nativeText: "Hello! My name is Buddy.", englishMeaning: "", keywords: ["hello", "buddy"] },
  { id: "en-8-1", language: "english", ageGroup: "8-11", nativeText: "I like to read stories with my family.", englishMeaning: "", keywords: ["read", "stories", "family"] },
  { id: "en-12-1", language: "english", ageGroup: "12-15", nativeText: "I can tell a short story about my day.", englishMeaning: "", keywords: ["short", "story", "day"] },
];

export function normalizeText(text) {
  return text
    ? text
        .trim()
        .toLowerCase()
        .replace(CLEAN_PUNCT, " ")
        .replace(/\s+/g, " ")
        .normalize("NFKC")
    : "";
}

export function tokenize(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function similarityScore(a, b) {
  const aNorm = normalizeText(a);
  const bNorm = normalizeText(b);
  if (!aNorm && !bNorm) return 1;
  const distance = levenshtein(aNorm, bNorm);
  const maxLen = Math.max(aNorm.length, bNorm.length) || 1;
  return 1 - distance / maxLen;
}

export function evaluateTranscript(expectedRaw, userRaw, keywords = []) {
  const expectedTokens = tokenize(expectedRaw);
  const userTokens = tokenize(userRaw);
  const expectedSet = new Set(expectedTokens);
  const missingKeywords = keywords.filter((k) => !userRaw.includes(k));
  const extraWords = userTokens.filter((token) => !expectedSet.has(token));
  const keywordCoverage = keywords.length === 0 ? 1 : (keywords.length - missingKeywords.length) / keywords.length;
  const similarity = similarityScore(expectedRaw, userRaw);
  const score = Math.round(100 * (0.7 * keywordCoverage + 0.3 * similarity));
  return { score, similarity, missingKeywords, extraWords };
}

export function getAgeGroup(age) {
  if (!age || Number.isNaN(age)) return "8-11";
  if (age <= 7) return "5-7";
  if (age <= 11) return "8-11";
  return "12-15";
}

export function getGuidedPrompts(language, ageGroup) {
  const prompts = GUIDED_PROMPTS.filter(
    (item) => item.language === language && item.ageGroup === ageGroup
  );
  if (prompts.length) return prompts;
  return GUIDED_PROMPTS.filter((item) => item.language === "english" && item.ageGroup === ageGroup);
}

export function getSimplifiedPrompt(prompt) {
  if (!prompt?.nativeText) return prompt;
  const parts = prompt.nativeText.split(" ");
  const shortText = parts.slice(0, Math.max(2, Math.floor(parts.length / 2))).join(" ");
  return {
    ...prompt,
    nativeText: shortText,
    englishMeaning: prompt.englishMeaning || "Short version",
  };
}

export function decideNextStep(context) {
  const { mode, score, hesitationMs, attempts } = context;

  if (mode === "free") {
    return { action: "PRAISE", message: "Nice sharing! Want to try another thought?", nextPrompt: null };
  }

  // After 2 attempts on the same prompt, always move on — never keep a child stuck
  if (attempts >= 2) {
    return { action: "ADVANCE", message: "Well tried! Let’s move to the next one. 🚀", nextPrompt: "next" };
  }

  // Good enough score on any attempt → advance
  if (score >= 60) {
    return { action: "ADVANCE", message: "Great job! Let’s try the next one. 🌟", nextPrompt: "next" };
  }

  // First try, decent score → one more chance
  if (attempts === 0 && score >= 35) {
    return { action: "RETRY_SAME", message: "So close! Give it one more go.", nextPrompt: null };
  }

  // Took too long to start speaking → English tip
  if (hesitationMs > 5000) {
    return { action: "SWITCH_TO_ENGLISH_HELP", message: "Let’s try with a quick English hint.", nextPrompt: null };
  }

  // First attempt, low score → simplify
  if (attempts === 0) {
    return { action: "SIMPLIFY", message: "Let’s try a shorter version first.", nextPrompt: "simplify" };
  }

  // Second attempt still low → advance anyway
  return { action: "ADVANCE", message: "Great effort! Moving to the next one. 🚀", nextPrompt: "next" };
}

export function pickVoice(langCode) {
  const voices = window.speechSynthesis.getVoices();
  const exact = voices.find((v) => v.lang === langCode);
  if (exact) return exact;
  const prefix = langCode.split("-")[0];
  return voices.find((v) => v.lang.startsWith(prefix)) ?? null;
}

export function speakText(text, langCode, style = "gentle") {
  if (!text) return;
  // Use OpenAI TTS for a natural human voice; fall back to browser TTS if unavailable.
  openaiSpeak(text, "nova").catch(() => _browserSpeak(text, langCode, style));
}

function _browserSpeak(text, langCode, style) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  utter.rate = style === "funny" ? 1.1 : style === "adventurous" ? 1.05 : 0.95;
  utter.pitch = style === "funny" ? 1.2 : style === "adventurous" ? 1.05 : 1;
  const voice = pickVoice(langCode);
  if (voice) utter.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function normalizeLanguageId(label) {
  const lower = String(label || "").toLowerCase();
  if (lower.includes("tamil")) return "tamil";
  if (lower.includes("telugu")) return "telugu";
  if (lower.includes("hindi")) return "hindi";
  if (lower.includes("kannada")) return "kannada";
  if (lower.includes("english")) return "english";
  return "tamil";
}
