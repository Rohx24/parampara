import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { openaiSpeak } from "../../lib/openai.js";

// ── Shared vocab (same words as FlashCards so kids reinforce learning) ─────────
const VOCAB = {
  hindi: [
    { word: "पानी", answer: "water", emoji: "💧" },
    { word: "खाना", answer: "food", emoji: "🍱" },
    { word: "माँ", answer: "mother", emoji: "👩" },
    { word: "घर", answer: "home", emoji: "🏠" },
    { word: "आम", answer: "mango", emoji: "🥭" },
    { word: "किताब", answer: "book", emoji: "📚" },
    { word: "सूरज", answer: "sun", emoji: "☀️" },
    { word: "चाँद", answer: "moon", emoji: "🌙" },
    { word: "दोस्त", answer: "friend", emoji: "👫" },
    { word: "स्कूल", answer: "school", emoji: "🏫" },
    { word: "फूल", answer: "flower", emoji: "🌸" },
    { word: "पेड़", answer: "tree", emoji: "🌳" },
    { word: "बिल्ली", answer: "cat", emoji: "🐱" },
    { word: "कुत्ता", answer: "dog", emoji: "🐶" },
    { word: "मछली", answer: "fish", emoji: "🐟" },
    { word: "हाथी", answer: "elephant", emoji: "🐘" },
    { word: "सेब", answer: "apple", emoji: "🍎" },
    { word: "केला", answer: "banana", emoji: "🍌" },
    { word: "आकाश", answer: "sky", emoji: "🌤️" },
    { word: "बारिश", answer: "rain", emoji: "🌧️" },
  ],
  tamil: [
    { word: "தண்ணீர்", answer: "water", emoji: "💧" },
    { word: "உணவு", answer: "food", emoji: "🍱" },
    { word: "அம்மா", answer: "mother", emoji: "👩" },
    { word: "வீடு", answer: "home", emoji: "🏠" },
    { word: "மாம்பழம்", answer: "mango", emoji: "🥭" },
    { word: "புத்தகம்", answer: "book", emoji: "📚" },
    { word: "சூரியன்", answer: "sun", emoji: "☀️" },
    { word: "நிலவு", answer: "moon", emoji: "🌙" },
    { word: "நண்பன்", answer: "friend", emoji: "👫" },
    { word: "பள்ளி", answer: "school", emoji: "🏫" },
    { word: "பூ", answer: "flower", emoji: "🌸" },
    { word: "மரம்", answer: "tree", emoji: "🌳" },
    { word: "பூனை", answer: "cat", emoji: "🐱" },
    { word: "நாய்", answer: "dog", emoji: "🐶" },
    { word: "மீன்", answer: "fish", emoji: "🐟" },
    { word: "யானை", answer: "elephant", emoji: "🐘" },
    { word: "ஆப்பிள்", answer: "apple", emoji: "🍎" },
    { word: "வாழைப்பழம்", answer: "banana", emoji: "🍌" },
    { word: "வானம்", answer: "sky", emoji: "🌤️" },
    { word: "மழை", answer: "rain", emoji: "🌧️" },
  ],
  telugu: [
    { word: "నీళ్ళు", answer: "water", emoji: "💧" },
    { word: "భోజనం", answer: "food", emoji: "🍱" },
    { word: "అమ్మ", answer: "mother", emoji: "👩" },
    { word: "ఇల్లు", answer: "home", emoji: "🏠" },
    { word: "మామిడి", answer: "mango", emoji: "🥭" },
    { word: "పుస్తకం", answer: "book", emoji: "📚" },
    { word: "సూర్యుడు", answer: "sun", emoji: "☀️" },
    { word: "చంద్రుడు", answer: "moon", emoji: "🌙" },
    { word: "స్నేహితుడు", answer: "friend", emoji: "👫" },
    { word: "పాఠశాల", answer: "school", emoji: "🏫" },
    { word: "పువ్వు", answer: "flower", emoji: "🌸" },
    { word: "చెట్టు", answer: "tree", emoji: "🌳" },
    { word: "పిల్లి", answer: "cat", emoji: "🐱" },
    { word: "కుక్క", answer: "dog", emoji: "🐶" },
    { word: "చేప", answer: "fish", emoji: "🐟" },
    { word: "ఏనుగు", answer: "elephant", emoji: "🐘" },
    { word: "ఆపిల్", answer: "apple", emoji: "🍎" },
    { word: "అరటి", answer: "banana", emoji: "🍌" },
    { word: "ఆకాశం", answer: "sky", emoji: "🌤️" },
    { word: "వర్షం", answer: "rain", emoji: "🌧️" },
  ],
  kannada: [
    { word: "ನೀರು", answer: "water", emoji: "💧" },
    { word: "ಊಟ", answer: "food", emoji: "🍱" },
    { word: "ಅಮ್ಮ", answer: "mother", emoji: "👩" },
    { word: "ಮನೆ", answer: "home", emoji: "🏠" },
    { word: "ಮಾವಿನಹಣ್ಣು", answer: "mango", emoji: "🥭" },
    { word: "ಪುಸ್ತಕ", answer: "book", emoji: "📚" },
    { word: "ಸೂರ್ಯ", answer: "sun", emoji: "☀️" },
    { word: "ಚಂದ್ರ", answer: "moon", emoji: "🌙" },
    { word: "ಗೆಳೆಯ", answer: "friend", emoji: "👫" },
    { word: "ಶಾಲೆ", answer: "school", emoji: "🏫" },
    { word: "ಹೂವು", answer: "flower", emoji: "🌸" },
    { word: "ಮರ", answer: "tree", emoji: "🌳" },
    { word: "ಬೆಕ್ಕು", answer: "cat", emoji: "🐱" },
    { word: "ನಾಯಿ", answer: "dog", emoji: "🐶" },
    { word: "ಮೀನು", answer: "fish", emoji: "🐟" },
    { word: "ಆನೆ", answer: "elephant", emoji: "🐘" },
    { word: "ಸೇಬು", answer: "apple", emoji: "🍎" },
    { word: "ಬಾಳೆಹಣ್ಣು", answer: "banana", emoji: "🍌" },
    { word: "ಆಕಾಶ", answer: "sky", emoji: "🌤️" },
    { word: "ಮಳೆ", answer: "rain", emoji: "🌧️" },
  ],
  english: [
    { word: "Hello", answer: "hello", emoji: "👋" },
    { word: "Family", answer: "family", emoji: "👨‍👩‍👧" },
    { word: "School", answer: "school", emoji: "🏫" },
    { word: "Water", answer: "water", emoji: "💧" },
    { word: "Book", answer: "book", emoji: "📚" },
    { word: "Friend", answer: "friend", emoji: "👫" },
    { word: "Flower", answer: "flower", emoji: "🌸" },
    { word: "Rain", answer: "rain", emoji: "🌧️" },
    { word: "Moon", answer: "moon", emoji: "🌙" },
    { word: "Apple", answer: "apple", emoji: "🍎" },
  ],
};

const LANG_LABELS = { hindi: "Hindi", tamil: "Tamil", telugu: "Telugu", kannada: "Kannada", english: "English" };
const ROUNDS = 10;
const TIME_PER_ROUND = 15; // seconds

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Show blanks like "_ _ _ _ _" for the answer length
function makeBlanks(answer, revealed) {
  return answer.split("").map((ch, i) =>
    revealed.includes(i) ? ch : "_"
  ).join(" ");
}

export default function SpellingBeeGame() {
  const [language, setLanguage] = useState("hindi");
  const [phase, setPhase] = useState("setup"); // setup | playing | done
  const [deck, setDeck] = useState([]);
  const [qi, setQi] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null); // null | "correct" | "wrong"
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [missedWords, setMissedWords] = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [speaking, setSpeaking] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const current = deck[qi];

  const start = () => {
    const words = shuffle(VOCAB[language] ?? VOCAB.hindi).slice(0, ROUNDS);
    setDeck(words);
    setQi(0);
    setInput("");
    setResult(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setMissedWords([]);
    setTimeLeft(TIME_PER_ROUND);
    setHintUsed(false);
    setPhase("playing");
  };

  // Timer
  useEffect(() => {
    if (phase !== "playing" || result !== null) {
      clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(TIME_PER_ROUND);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qi, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === "playing") inputRef.current?.focus();
  }, [qi, phase]);

  const handleTimeout = useCallback(() => {
    if (!current) return;
    setResult("wrong");
    setStreak(0);
    setMissedWords((m) => [...m, current]);
    setTimeout(advance, 1200);
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = () => {
    setQi((q) => {
      const next = q + 1;
      if (next >= ROUNDS) { setPhase("done"); return q; }
      return next;
    });
    setInput("");
    setResult(null);
    setHintUsed(false);
  };

  const submit = useCallback(() => {
    if (!current || result !== null) return;
    const clean = input.trim().toLowerCase();
    const correct = clean === current.answer.toLowerCase();
    setResult(correct ? "correct" : "wrong");
    clearInterval(timerRef.current);
    if (correct) {
      const bonus = hintUsed ? 0 : timeLeft > 10 ? 2 : 1;
      setScore((s) => s + 1 + bonus);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        return ns;
      });
    } else {
      setStreak(0);
      setMissedWords((m) => [...m, current]);
    }
    setTimeout(advance, 1100);
  }, [current, input, result, hintUsed, timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const hearWord = useCallback(() => {
    if (!current) return;
    setSpeaking(true);
    openaiSpeak(current.answer, "nova")
      .catch(() => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(current.answer);
        utt.lang = "en-US";
        utt.rate = 0.8;
        window.speechSynthesis.speak(utt);
      })
      .finally(() => setSpeaking(false));
  }, [current]);

  const hint = useMemo(() => {
    if (!current) return "";
    return current.answer[0].toUpperCase() + " _ ".repeat(current.answer.length - 1);
  }, [current]);

  const timerPct = (timeLeft / TIME_PER_ROUND) * 100;
  const timerColor = timeLeft > 8 ? "#22c55e" : timeLeft > 4 ? "#f59e0b" : "#ef4444";

  return (
    <div className="min-h-screen bg-sparkle px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">BashaBuddy Games</p>
            <h1 className="font-display text-3xl font-semibold text-buddy-cocoa">Spelling Bee 🐝</h1>
            <p className="mt-1 text-sm text-slate-600">See the word — type the English spelling!</p>
          </div>
          <Link to="/games" className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5">
            ← Back
          </Link>
        </div>

        {/* Setup */}
        {phase === "setup" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/70 bg-white/85 p-8 shadow-card space-y-6 text-center"
          >
            <div className="text-6xl">🐝</div>
            <h2 className="font-display text-2xl font-bold text-buddy-cocoa">Spelling Bee</h2>
            <p className="text-sm text-slate-500">{ROUNDS} words · type the English spelling · {TIME_PER_ROUND}s timer · bonus points for speed!</p>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Choose language</p>
              <div className="flex flex-wrap justify-center gap-2">
                {Object.keys(LANG_LABELS).map((l) => (
                  <button key={l} type="button" onClick={() => setLanguage(l)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${language === l ? "bg-buddy-grape text-white shadow-soft" : "bg-white/80 text-slate-600"}`}
                  >{LANG_LABELS[l]}</button>
                ))}
              </div>
            </div>
            <button type="button" onClick={start}
              className="w-full rounded-2xl bg-buddy-grape py-3 text-sm font-bold text-white shadow-card transition hover:-translate-y-0.5"
            >Start Game 🚀</button>
          </motion.div>
        )}

        {/* Playing */}
        {phase === "playing" && current && (
          <div className="space-y-4">
            {/* Progress row */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-white/60 overflow-hidden">
                <motion.div className="h-full rounded-full bg-buddy-grape"
                  animate={{ width: `${(qi / ROUNDS) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500">{qi + 1}/{ROUNDS}</span>
              {streak >= 2 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="rounded-full bg-buddy-coral/20 px-3 py-1 text-xs font-bold text-buddy-coral"
                >🔥 {streak}</motion.span>
              )}
              <span className="rounded-full bg-buddy-mint/80 px-3 py-1 text-xs font-bold text-slate-700">⭐ {score}</span>
            </div>

            {/* Timer bar */}
            <div className="h-2 rounded-full bg-white/60 overflow-hidden">
              <motion.div
                className="h-full rounded-full transition-colors"
                animate={{ width: `${timerPct}%`, backgroundColor: timerColor }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Word card */}
            <AnimatePresence mode="wait">
              <motion.div key={qi}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card text-center space-y-4"
              >
                <div className="text-7xl">{current.emoji}</div>
                <div className="text-4xl font-extrabold text-buddy-cocoa font-display leading-none">
                  {current.word}
                </div>
                <div className="flex justify-center gap-3">
                  <button type="button" onClick={hearWord}
                    className={`rounded-full px-4 py-2 text-xs font-bold shadow-soft transition hover:scale-105 ${speaking ? "bg-buddy-grape text-white" : "bg-buddy-mint text-slate-700"}`}
                  >{speaking ? "🔊 Speaking…" : "🔊 Hear English"}</button>
                  {!hintUsed && (
                    <button type="button" onClick={() => setHintUsed(true)}
                      className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-700 shadow-soft transition hover:scale-105"
                    >💡 Hint</button>
                  )}
                </div>
                {hintUsed && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-sm font-mono tracking-widest text-slate-400"
                  >{hint}</motion.p>
                )}

                {/* Input */}
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="Type the English word…"
                    disabled={result !== null}
                    className={`w-full rounded-2xl border-2 px-4 py-3 text-center text-lg font-bold text-slate-700 outline-none transition ${
                      result === "correct" ? "border-emerald-400 bg-emerald-50" :
                      result === "wrong" ? "border-red-300 bg-red-50" :
                      "border-slate-200 bg-white focus:border-buddy-grape"
                    }`}
                  />
                  <AnimatePresence>
                    {result && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}
                        className="absolute -right-3 -top-3 text-2xl"
                      >{result === "correct" ? "✅" : "❌"}</motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {result === "wrong" && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-sm font-semibold text-red-500"
                  >Answer: <span className="font-extrabold">{current.answer}</span></motion.p>
                )}

                <motion.button type="button" onClick={submit}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
                  disabled={result !== null || !input.trim()}
                  className="w-full rounded-2xl bg-buddy-grape py-3 text-sm font-bold text-white shadow-soft transition disabled:opacity-40"
                >Check ✓</motion.button>

                <div className="flex justify-center">
                  <span className={`text-2xl font-extrabold tabular-nums ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
                    {timeLeft}s
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Done */}
        {phase === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card text-center space-y-5"
          >
            <div className="text-6xl">{score >= 12 ? "🏆" : score >= 7 ? "🌟" : "💪"}</div>
            <h2 className="font-display text-3xl font-bold text-buddy-cocoa">
              {score >= 12 ? "Spelling Champion!" : score >= 7 ? "Great spelling!" : "Keep practicing!"}
            </h2>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="text-4xl font-extrabold text-buddy-grape">{score}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">points</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-extrabold text-buddy-coral">{bestStreak}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">best streak</p>
              </div>
            </div>
            {missedWords.length > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-left">
                <p className="text-xs font-bold text-amber-600 mb-2">Practice these:</p>
                <div className="flex flex-wrap gap-2">
                  {missedWords.map((w, i) => (
                    <span key={i} className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700 shadow-soft">
                      {w.emoji} {w.word} = {w.answer}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={start}
                className="rounded-full bg-buddy-grape px-6 py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5"
              >Play again 🔄</button>
              <Link to="/games" className="rounded-full border border-white/70 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-600 shadow-soft">
                All games
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
