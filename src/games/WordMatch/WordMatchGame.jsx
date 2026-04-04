/**
 * Word Match — click a native word on the left, then its English meaning on the right.
 * Matched pairs light up green and lock. Get all 5 pairs to advance to the next round.
 */
import React, { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { openaiSpeak } from "../../lib/openai.js";

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
  ],
  english: [
    { word: "Hello", meaning: "a greeting", emoji: "👋" },
    { word: "Family", meaning: "related people", emoji: "👨‍👩‍👧" },
    { word: "School", meaning: "place to learn", emoji: "🏫" },
    { word: "Water", meaning: "liquid to drink", emoji: "💧" },
    { word: "Book", meaning: "pages to read", emoji: "📚" },
    { word: "Sun", meaning: "gives us warmth", emoji: "☀️" },
    { word: "Friend", meaning: "someone you like", emoji: "👫" },
    { word: "Food", meaning: "what we eat", emoji: "🍱" },
    { word: "Tree", meaning: "tall plant", emoji: "🌳" },
    { word: "Flower", meaning: "colorful bloom", emoji: "🌸" },
    { word: "Rain", meaning: "water from clouds", emoji: "🌧️" },
    { word: "Moon", meaning: "glows at night", emoji: "🌙" },
    { word: "Apple", meaning: "red round fruit", emoji: "🍎" },
    { word: "Cat", meaning: "furry pet that purrs", emoji: "🐱" },
    { word: "Dog", meaning: "loyal pet that barks", emoji: "🐶" },
  ],
};

const LANG_LABELS = { hindi: "Hindi", tamil: "Tamil", telugu: "Telugu", kannada: "Kannada", english: "English" };
const PAIRS_PER_ROUND = 5;
const TOTAL_ROUNDS = 3; // 3 rounds × 5 pairs = 15 matches

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function WordMatchGame() {
  const [language, setLanguage] = useState("hindi");
  const [phase, setPhase] = useState("setup");
  const [allWords, setAllWords] = useState([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [leftSel, setLeftSel] = useState(null);  // index in leftCol
  const [rightSel, setRightSel] = useState(null); // index in rightCol
  const [matched, setMatched] = useState([]); // array of meaning strings that are matched
  const [wrongPair, setWrongPair] = useState(false);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);

  const start = () => {
    const words = shuffle(VOCAB[language] ?? VOCAB.hindi);
    setAllWords(words);
    setRoundIdx(0);
    setLeftSel(null);
    setRightSel(null);
    setMatched([]);
    setWrongPair(false);
    setScore(0);
    setErrors(0);
    setPhase("playing");
  };

  // Current round's 5 pairs
  const roundWords = useMemo(() => {
    const start = roundIdx * PAIRS_PER_ROUND;
    return allWords.slice(start, start + PAIRS_PER_ROUND);
  }, [allWords, roundIdx]);

  const leftCol = roundWords; // native words, fixed order
  const rightCol = useMemo(() => shuffle(roundWords), [roundWords]); // English meanings, shuffled

  const hearWord = useCallback((text) => {
    openaiSpeak(text, "nova").catch(() => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-US";
      utt.rate = 0.85;
      window.speechSynthesis.speak(utt);
    });
  }, []);

  const handleLeft = useCallback((idx) => {
    if (matched.includes(leftCol[idx]?.meaning)) return;
    setLeftSel(idx);
    // If right already selected, attempt match
    if (rightSel !== null) {
      attemptMatch(idx, rightSel);
    }
  }, [leftSel, rightSel, matched, leftCol]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRight = useCallback((idx) => {
    if (matched.includes(rightCol[idx]?.meaning)) return;
    setRightSel(idx);
    if (leftSel !== null) {
      attemptMatch(leftSel, idx);
    }
  }, [leftSel, rightSel, matched, rightCol]); // eslint-disable-line react-hooks/exhaustive-deps

  const attemptMatch = (lIdx, rIdx) => {
    const lWord = leftCol[lIdx];
    const rWord = rightCol[rIdx];
    if (lWord && rWord && lWord.meaning === rWord.meaning) {
      // Correct!
      hearWord(lWord.meaning);
      const newMatched = [...matched, lWord.meaning];
      setMatched(newMatched);
      setScore((s) => s + 1);
      setLeftSel(null);
      setRightSel(null);
      // Round complete?
      if (newMatched.length === PAIRS_PER_ROUND) {
        setTimeout(() => {
          const nextRound = roundIdx + 1;
          if (nextRound >= TOTAL_ROUNDS) {
            setPhase("done");
          } else {
            setRoundIdx(nextRound);
            setMatched([]);
            setLeftSel(null);
            setRightSel(null);
          }
        }, 700);
      }
    } else {
      // Wrong
      setErrors((e) => e + 1);
      setWrongPair(true);
      setTimeout(() => {
        setWrongPair(false);
        setLeftSel(null);
        setRightSel(null);
      }, 600);
    }
  };

  const totalPairs = TOTAL_ROUNDS * PAIRS_PER_ROUND;

  return (
    <div className="min-h-screen bg-sparkle px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">BashaBuddy Games</p>
            <h1 className="font-display text-3xl font-semibold text-buddy-cocoa">Word Match 🔗</h1>
            <p className="mt-1 text-sm text-slate-600">Tap the word, then its English meaning!</p>
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
            <div className="text-6xl">🔗</div>
            <h2 className="font-display text-2xl font-bold text-buddy-cocoa">Word Match</h2>
            <p className="text-sm text-slate-500">{TOTAL_ROUNDS} rounds · {PAIRS_PER_ROUND} pairs per round · tap to connect matches!</p>
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
        {phase === "playing" && (
          <div className="space-y-4">
            {/* Stats row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
                  <div key={i} className={`h-2 w-8 rounded-full transition ${i < roundIdx ? "bg-buddy-grape" : i === roundIdx ? "bg-buddy-grape/50" : "bg-white/60"}`} />
                ))}
                <span className="text-xs font-bold text-slate-400">Round {roundIdx + 1}/{TOTAL_ROUNDS}</span>
              </div>
              <span className="rounded-full bg-buddy-mint/80 px-3 py-1 text-xs font-bold text-slate-700">⭐ {score}/{totalPairs}</span>
              {errors > 0 && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-500">✗ {errors}</span>}
            </div>

            {/* Match grid */}
            <AnimatePresence mode="wait">
              <motion.div key={roundIdx}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-3"
              >
                {/* Left: native words */}
                <div className="space-y-3">
                  <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">{LANG_LABELS[language]}</p>
                  {leftCol.map((item, i) => {
                    const isMatched = matched.includes(item.meaning);
                    const isSelected = leftSel === i && !isMatched;
                    return (
                      <motion.button
                        key={item.meaning}
                        type="button"
                        onClick={() => handleLeft(i)}
                        whileTap={!isMatched ? { scale: 0.95 } : {}}
                        animate={wrongPair && isSelected ? { x: [-6, 6, -6, 6, 0] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`w-full rounded-2xl border-2 px-3 py-3 text-center text-lg font-bold transition ${
                          isMatched
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 cursor-default"
                            : isSelected
                            ? "border-buddy-grape bg-buddy-grape/10 text-buddy-grape shadow-soft scale-[1.02]"
                            : "border-white/70 bg-white/80 text-slate-700 hover:border-buddy-grape/40 hover:shadow-soft"
                        }`}
                      >
                        {isMatched && <span className="mr-1">{item.emoji}</span>}
                        {item.word}
                        {isMatched && " ✓"}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Right: English meanings */}
                <div className="space-y-3">
                  <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">English</p>
                  {rightCol.map((item, i) => {
                    const isMatched = matched.includes(item.meaning);
                    const isSelected = rightSel === i && !isMatched;
                    return (
                      <motion.button
                        key={item.meaning + "-r"}
                        type="button"
                        onClick={() => handleRight(i)}
                        whileTap={!isMatched ? { scale: 0.95 } : {}}
                        animate={wrongPair && isSelected ? { x: [-6, 6, -6, 6, 0] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`w-full rounded-2xl border-2 px-3 py-3 text-center text-sm font-bold transition ${
                          isMatched
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 cursor-default"
                            : isSelected
                            ? "border-buddy-grape bg-buddy-grape/10 text-buddy-grape shadow-soft scale-[1.02]"
                            : "border-white/70 bg-white/80 text-slate-700 hover:border-buddy-grape/40 hover:shadow-soft"
                        }`}
                      >
                        {item.emoji} {item.meaning}
                        {isMatched && " ✓"}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            <p className="text-center text-xs text-slate-400 font-semibold">
              {matched.length}/{PAIRS_PER_ROUND} matched this round
            </p>
          </div>
        )}

        {/* Done */}
        {phase === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card text-center space-y-5"
          >
            <div className="text-6xl">{errors === 0 ? "🏆" : score >= 12 ? "🌟" : "💪"}</div>
            <h2 className="font-display text-3xl font-bold text-buddy-cocoa">
              {errors === 0 ? "Perfect match!" : score >= 12 ? "Great matching!" : "Keep going!"}
            </h2>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="text-4xl font-extrabold text-buddy-grape">{score}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">matched</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-extrabold text-red-400">{errors}</p>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">mistakes</p>
              </div>
            </div>
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
