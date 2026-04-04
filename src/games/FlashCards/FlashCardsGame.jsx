import React, { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { openaiSpeak } from "../../lib/openai.js";

// ─── Vocab Bank ───────────────────────────────────────────────────────────────

const VOCAB = {
  hindi: [
    { word: "पानी", meaning: "water", emoji: "💧" },
    { word: "खाना", meaning: "food", emoji: "🍱" },
    { word: "माँ", meaning: "mother", emoji: "👩" },
    { word: "घर", meaning: "home", emoji: "🏠" },
    { word: "आम", meaning: "mango", emoji: "🥭" },
    { word: "किताब", meaning: "book", emoji: "📚" },
    { word: "सूरज", meaning: "sun", emoji: "☀️" },
    { word: "चाँद", meaning: "moon", emoji: "🌙" },
    { word: "दोस्त", meaning: "friend", emoji: "👫" },
    { word: "स्कूल", meaning: "school", emoji: "🏫" },
    { word: "फूल", meaning: "flower", emoji: "🌸" },
    { word: "पेड़", meaning: "tree", emoji: "🌳" },
    { word: "बिल्ली", meaning: "cat", emoji: "🐱" },
    { word: "कुत्ता", meaning: "dog", emoji: "🐶" },
    { word: "मछली", meaning: "fish", emoji: "🐟" },
    { word: "हाथी", meaning: "elephant", emoji: "🐘" },
    { word: "सेब", meaning: "apple", emoji: "🍎" },
    { word: "केला", meaning: "banana", emoji: "🍌" },
    { word: "आकाश", meaning: "sky", emoji: "🌤️" },
    { word: "बारिश", meaning: "rain", emoji: "🌧️" },
  ],
  tamil: [
    { word: "தண்ணீர்", meaning: "water", emoji: "💧" },
    { word: "உணவு", meaning: "food", emoji: "🍱" },
    { word: "அம்மா", meaning: "mother", emoji: "👩" },
    { word: "வீடு", meaning: "home", emoji: "🏠" },
    { word: "மாம்பழம்", meaning: "mango", emoji: "🥭" },
    { word: "புத்தகம்", meaning: "book", emoji: "📚" },
    { word: "சூரியன்", meaning: "sun", emoji: "☀️" },
    { word: "நிலவு", meaning: "moon", emoji: "🌙" },
    { word: "நண்பன்", meaning: "friend", emoji: "👫" },
    { word: "பள்ளி", meaning: "school", emoji: "🏫" },
    { word: "பூ", meaning: "flower", emoji: "🌸" },
    { word: "மரம்", meaning: "tree", emoji: "🌳" },
    { word: "பூனை", meaning: "cat", emoji: "🐱" },
    { word: "நாய்", meaning: "dog", emoji: "🐶" },
    { word: "மீன்", meaning: "fish", emoji: "🐟" },
    { word: "யானை", meaning: "elephant", emoji: "🐘" },
    { word: "ஆப்பிள்", meaning: "apple", emoji: "🍎" },
    { word: "வாழைப்பழம்", meaning: "banana", emoji: "🍌" },
    { word: "வானம்", meaning: "sky", emoji: "🌤️" },
    { word: "மழை", meaning: "rain", emoji: "🌧️" },
  ],
  telugu: [
    { word: "నీళ్ళు", meaning: "water", emoji: "💧" },
    { word: "భోజనం", meaning: "food", emoji: "🍱" },
    { word: "అమ్మ", meaning: "mother", emoji: "👩" },
    { word: "ఇల్లు", meaning: "home", emoji: "🏠" },
    { word: "మామిడి", meaning: "mango", emoji: "🥭" },
    { word: "పుస్తకం", meaning: "book", emoji: "📚" },
    { word: "సూర్యుడు", meaning: "sun", emoji: "☀️" },
    { word: "చంద్రుడు", meaning: "moon", emoji: "🌙" },
    { word: "స్నేహితుడు", meaning: "friend", emoji: "👫" },
    { word: "పాఠశాల", meaning: "school", emoji: "🏫" },
    { word: "పువ్వు", meaning: "flower", emoji: "🌸" },
    { word: "చెట్టు", meaning: "tree", emoji: "🌳" },
    { word: "పిల్లి", meaning: "cat", emoji: "🐱" },
    { word: "కుక్క", meaning: "dog", emoji: "🐶" },
    { word: "చేప", meaning: "fish", emoji: "🐟" },
    { word: "ఏనుగు", meaning: "elephant", emoji: "🐘" },
    { word: "ఆపిల్", meaning: "apple", emoji: "🍎" },
    { word: "అరటి", meaning: "banana", emoji: "🍌" },
    { word: "ఆకాశం", meaning: "sky", emoji: "🌤️" },
    { word: "వర్షం", meaning: "rain", emoji: "🌧️" },
  ],
  kannada: [
    { word: "ನೀರು", meaning: "water", emoji: "💧" },
    { word: "ಊಟ", meaning: "food", emoji: "🍱" },
    { word: "ಅಮ್ಮ", meaning: "mother", emoji: "👩" },
    { word: "ಮನೆ", meaning: "home", emoji: "🏠" },
    { word: "ಮಾವಿನಹಣ್ಣು", meaning: "mango", emoji: "🥭" },
    { word: "ಪುಸ್ತಕ", meaning: "book", emoji: "📚" },
    { word: "ಸೂರ್ಯ", meaning: "sun", emoji: "☀️" },
    { word: "ಚಂದ್ರ", meaning: "moon", emoji: "🌙" },
    { word: "ಗೆಳೆಯ", meaning: "friend", emoji: "👫" },
    { word: "ಶಾಲೆ", meaning: "school", emoji: "🏫" },
    { word: "ಹೂವು", meaning: "flower", emoji: "🌸" },
    { word: "ಮರ", meaning: "tree", emoji: "🌳" },
    { word: "ಬೆಕ್ಕು", meaning: "cat", emoji: "🐱" },
    { word: "ನಾಯಿ", meaning: "dog", emoji: "🐶" },
    { word: "ಮೀನು", meaning: "fish", emoji: "🐟" },
    { word: "ಆನೆ", meaning: "elephant", emoji: "🐘" },
    { word: "ಸೇಬು", meaning: "apple", emoji: "🍎" },
    { word: "ಬಾಳೆಹಣ್ಣು", meaning: "banana", emoji: "🍌" },
    { word: "ಆಕಾಶ", meaning: "sky", emoji: "🌤️" },
    { word: "ಮಳೆ", meaning: "rain", emoji: "🌧️" },
  ],
  english: [
    { word: "Hello", meaning: "a greeting", emoji: "👋" },
    { word: "Family", meaning: "related people", emoji: "👨‍👩‍👧" },
    { word: "School", meaning: "place to learn", emoji: "🏫" },
    { word: "Water", meaning: "liquid to drink", emoji: "💧" },
    { word: "Book", meaning: "written pages to read", emoji: "📚" },
    { word: "Sun", meaning: "gives us light and warmth", emoji: "☀️" },
    { word: "Friend", meaning: "someone you like being with", emoji: "👫" },
    { word: "Food", meaning: "what we eat to live", emoji: "🍱" },
    { word: "Tree", meaning: "tall plant with branches", emoji: "🌳" },
    { word: "Flower", meaning: "colorful bloom on a plant", emoji: "🌸" },
    { word: "Rain", meaning: "water falling from clouds", emoji: "🌧️" },
    { word: "Moon", meaning: "glows at night in the sky", emoji: "🌙" },
  ],
};

const LANG_LABELS = { hindi: "Hindi", tamil: "Tamil", telugu: "Telugu", kannada: "Kannada", english: "English" };
const ROUNDS = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOptions(correct, allWords) {
  const distractors = shuffle(allWords.filter((w) => w.meaning !== correct.meaning)).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

// ─── Game ─────────────────────────────────────────────────────────────────────

export default function FlashCardsGame() {
  const [language, setLanguage] = useState("hindi");
  const [phase, setPhase]       = useState("setup"); // setup | playing | done
  const [deck, setDeck]         = useState([]);
  const [qi, setQi]             = useState(0);
  const [chosen, setChosen]     = useState(null);
  const [score, setScore]       = useState(0);
  const [streak, setStreak]     = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [results, setResults]   = useState([]);
  const [flipped, setFlipped]   = useState(false);

  const start = () => {
    const words = shuffle(VOCAB[language] ?? VOCAB.hindi).slice(0, ROUNDS);
    setDeck(words);
    setQi(0);
    setChosen(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setResults([]);
    setFlipped(false);
    setPhase("playing");
  };

  const current = deck[qi];
  const options = useMemo(
    () => (current ? getOptions(current, VOCAB[language] ?? []) : []),
    [current, language]
  );

  const handleAnswer = useCallback((opt) => {
    if (chosen) return;
    setChosen(opt);
    const correct = opt.meaning === current.meaning;
    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        return ns;
      });
    } else {
      setStreak(0);
    }
    setResults((r) => [...r, { word: current.word, correct }]);
    setTimeout(() => {
      if (qi + 1 >= deck.length) {
        setPhase("done");
      } else {
        setQi((q) => q + 1);
        setChosen(null);
        setFlipped(false);
      }
    }, 900);
  }, [chosen, current, qi, deck]);

  const hear = (text) => {
    openaiSpeak(text, "nova").catch(() => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      const codes = { hindi: "hi-IN", tamil: "ta-IN", telugu: "te-IN", kannada: "kn-IN", english: "en-IN" };
      utt.lang = codes[language] ?? "hi-IN";
      utt.rate = 0.85;
      window.speechSynthesis.speak(utt);
    });
  };

  return (
    <div className="min-h-screen bg-sparkle px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">BashaBuddy Games</p>
            <h1 className="font-display text-3xl font-semibold text-buddy-cocoa">Flash Cards ⚡</h1>
            <p className="mt-1 text-sm text-slate-600">See the word — pick the right meaning!</p>
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
            <div className="text-6xl">⚡</div>
            <h2 className="font-display text-2xl font-bold text-buddy-cocoa">Flash Cards</h2>
            <p className="text-sm text-slate-500">{ROUNDS} words · pick the English meaning · beat your streak!</p>
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
          <div className="space-y-5">
            {/* Progress + streak */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 h-2 rounded-full bg-white/60 overflow-hidden">
                <motion.div className="h-full rounded-full bg-buddy-grape"
                  animate={{ width: `${((qi) / deck.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500">{qi}/{deck.length}</span>
              {streak >= 2 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="rounded-full bg-buddy-coral/20 px-3 py-1 text-xs font-bold text-buddy-coral"
                >🔥 {streak} streak</motion.span>
              )}
              <span className="rounded-full bg-buddy-mint/80 px-3 py-1 text-xs font-bold text-slate-700">
                ⭐ {score}
              </span>
            </div>

            {/* Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={qi}
                initial={{ opacity: 0, rotateY: -30, scale: 0.95 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card text-center space-y-3"
              >
                <div className="text-6xl">{current.emoji}</div>
                <p className="font-display text-4xl font-extrabold text-buddy-cocoa leading-none">
                  {current.word}
                </p>
                <button type="button" onClick={() => hear(current.word)}
                  className="rounded-full bg-buddy-mint px-4 py-1.5 text-xs font-bold text-slate-700 shadow-soft transition hover:scale-105"
                >🔊 Hear it</button>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-2">
                  What does this mean in English?
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              {options.map((opt, i) => {
                const isChosen = chosen?.meaning === opt.meaning;
                const isCorrect = opt.meaning === current.meaning;
                let cls = "rounded-2xl border px-4 py-4 text-sm font-bold text-left transition ";
                if (!chosen) {
                  cls += "border-white/70 bg-white/80 shadow-soft hover:-translate-y-1 hover:border-buddy-grape/40 hover:shadow-card";
                } else if (isCorrect) {
                  cls += "border-emerald-400 bg-emerald-50 text-emerald-700";
                } else if (isChosen) {
                  cls += "border-red-300 bg-red-50 text-red-600";
                } else {
                  cls += "border-white/70 bg-white/60 opacity-50";
                }
                return (
                  <motion.button key={i} type="button" onClick={() => handleAnswer(opt)}
                    whileTap={{ scale: 0.95 }} className={cls}
                  >
                    <span className="mr-2 text-lg">{opt.emoji}</span>
                    {opt.meaning}
                    {chosen && isCorrect && " ✓"}
                    {chosen && isChosen && !isCorrect && " ✗"}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Done */}
        {phase === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card text-center space-y-5"
          >
            <div className="text-6xl">{score >= 8 ? "🏆" : score >= 5 ? "🌟" : "💪"}</div>
            <h2 className="font-display text-3xl font-bold text-buddy-cocoa">
              {score >= 8 ? "Amazing!" : score >= 5 ? "Great job!" : "Keep practicing!"}
            </h2>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <p className="text-4xl font-extrabold text-buddy-grape">{score}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">correct</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-extrabold text-buddy-coral">{bestStreak}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">best streak</p>
              </div>
            </div>
            {/* Missed words */}
            {results.some((r) => !r.correct) && (
              <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-left">
                <p className="text-xs font-bold text-amber-600 mb-2">Review these:</p>
                <div className="flex flex-wrap gap-2">
                  {results.filter((r) => !r.correct).map((r, i) => (
                    <span key={i} className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700 shadow-soft">{r.word}</span>
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
