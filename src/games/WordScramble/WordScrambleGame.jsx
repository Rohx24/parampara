import React, { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// ─── Word Bank (scramble the ENGLISH word, show native as hint) ───────────────

const WORDS = {
  hindi: [
    { native: "पानी", english: "WATER", emoji: "💧", hint: "We drink this" },
    { native: "घर", english: "HOME", emoji: "🏠", hint: "Where we live" },
    { native: "आम", english: "MANGO", emoji: "🥭", hint: "A sweet tropical fruit" },
    { native: "सूरज", english: "SUN", emoji: "☀️", hint: "Shines in the sky" },
    { native: "चाँद", english: "MOON", emoji: "🌙", hint: "Glows at night" },
    { native: "बिल्ली", english: "CAT", emoji: "🐱", hint: "Says meow" },
    { native: "मछली", english: "FISH", emoji: "🐟", hint: "Lives in water" },
    { native: "फूल", english: "FLOWER", emoji: "🌸", hint: "Smells beautiful" },
    { native: "पेड़", english: "TREE", emoji: "🌳", hint: "Has leaves and roots" },
    { native: "बारिश", english: "RAIN", emoji: "🌧️", hint: "Falls from clouds" },
  ],
  tamil: [
    { native: "தண்ணீர்", english: "WATER", emoji: "💧", hint: "We drink this" },
    { native: "வீடு", english: "HOME", emoji: "🏠", hint: "Where we live" },
    { native: "மாம்பழம்", english: "MANGO", emoji: "🥭", hint: "A sweet tropical fruit" },
    { native: "சூரியன்", english: "SUN", emoji: "☀️", hint: "Shines in the sky" },
    { native: "நிலவு", english: "MOON", emoji: "🌙", hint: "Glows at night" },
    { native: "பூனை", english: "CAT", emoji: "🐱", hint: "Says meow" },
    { native: "மீன்", english: "FISH", emoji: "🐟", hint: "Lives in water" },
    { native: "பூ", english: "FLOWER", emoji: "🌸", hint: "Smells beautiful" },
    { native: "மரம்", english: "TREE", emoji: "🌳", hint: "Has leaves and roots" },
    { native: "மழை", english: "RAIN", emoji: "🌧️", hint: "Falls from clouds" },
  ],
  telugu: [
    { native: "నీళ్ళు", english: "WATER", emoji: "💧", hint: "We drink this" },
    { native: "ఇల్లు", english: "HOME", emoji: "🏠", hint: "Where we live" },
    { native: "మామిడి", english: "MANGO", emoji: "🥭", hint: "A sweet tropical fruit" },
    { native: "సూర్యుడు", english: "SUN", emoji: "☀️", hint: "Shines in the sky" },
    { native: "చంద్రుడు", english: "MOON", emoji: "🌙", hint: "Glows at night" },
    { native: "పిల్లి", english: "CAT", emoji: "🐱", hint: "Says meow" },
    { native: "చేప", english: "FISH", emoji: "🐟", hint: "Lives in water" },
    { native: "పువ్వు", english: "FLOWER", emoji: "🌸", hint: "Smells beautiful" },
    { native: "చెట్టు", english: "TREE", emoji: "🌳", hint: "Has leaves and roots" },
    { native: "వర్షం", english: "RAIN", emoji: "🌧️", hint: "Falls from clouds" },
  ],
  kannada: [
    { native: "ನೀರು", english: "WATER", emoji: "💧", hint: "We drink this" },
    { native: "ಮನೆ", english: "HOME", emoji: "🏠", hint: "Where we live" },
    { native: "ಮಾವಿನಹಣ್ಣು", english: "MANGO", emoji: "🥭", hint: "A sweet tropical fruit" },
    { native: "ಸೂರ್ಯ", english: "SUN", emoji: "☀️", hint: "Shines in the sky" },
    { native: "ಚಂದ್ರ", english: "MOON", emoji: "🌙", hint: "Glows at night" },
    { native: "ಬೆಕ್ಕು", english: "CAT", emoji: "🐱", hint: "Says meow" },
    { native: "ಮೀನು", english: "FISH", emoji: "🐟", hint: "Lives in water" },
    { native: "ಹೂವು", english: "FLOWER", emoji: "🌸", hint: "Smells beautiful" },
    { native: "ಮರ", english: "TREE", emoji: "🌳", hint: "Has leaves and roots" },
    { native: "ಮಳೆ", english: "RAIN", emoji: "🌧️", hint: "Falls from clouds" },
  ],
};

const LANG_LABELS = { hindi: "Hindi", tamil: "Tamil", telugu: "Telugu", kannada: "Kannada" };
const ROUNDS = 8;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scramble(word) {
  const letters = word.split("");
  let scrambled;
  do { scrambled = shuffle(letters); }
  while (scrambled.join("") === word && word.length > 1);
  return scrambled.map((l, i) => ({ id: i, letter: l, used: false }));
}

export default function WordScrambleGame() {
  const [language, setLanguage]   = useState("hindi");
  const [phase, setPhase]         = useState("setup");
  const [deck, setDeck]           = useState([]);
  const [qi, setQi]               = useState(0);
  const [tiles, setTiles]         = useState([]);
  const [answer, setAnswer]       = useState([]);
  const [result, setResult]       = useState(null); // null | "correct" | "wrong"
  const [score, setScore]         = useState(0);
  const [hintUsed, setHintUsed]   = useState(false);
  const [showHint, setShowHint]   = useState(false);

  const start = () => {
    const words = shuffle(WORDS[language] ?? WORDS.hindi).slice(0, ROUNDS);
    setDeck(words);
    setQi(0);
    setScore(0);
    setPhase("playing");
    loadWord(words[0]);
  };

  const loadWord = (word) => {
    if (!word) return;
    setTiles(scramble(word.english));
    setAnswer([]);
    setResult(null);
    setHintUsed(false);
    setShowHint(false);
  };

  const current = deck[qi];

  // Pick tile → add to answer
  const pickTile = useCallback((tile) => {
    if (result || tile.used) return;
    setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, used: true } : t));
    setAnswer((prev) => [...prev, tile]);
  }, [result]);

  // Remove from answer → return to tiles
  const removeLetter = useCallback((idx) => {
    if (result) return;
    const tile = answer[idx];
    setAnswer((prev) => prev.filter((_, i) => i !== idx));
    setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, used: false } : t));
  }, [answer, result]);

  // Check answer
  const check = useCallback(() => {
    if (!current) return;
    const attempt = answer.map((t) => t.letter).join("");
    if (attempt === current.english) {
      setResult("correct");
      setScore((s) => s + (hintUsed ? 1 : 2));
      setTimeout(nextWord, 1000);
    } else {
      setResult("wrong");
      setTimeout(() => {
        // put letters back
        setAnswer([]);
        setTiles(scramble(current.english));
        setResult(null);
      }, 800);
    }
  }, [answer, current, hintUsed]);

  const nextWord = useCallback(() => {
    const next = qi + 1;
    if (next >= deck.length) {
      setPhase("done");
    } else {
      setQi(next);
      loadWord(deck[next]);
    }
  }, [qi, deck]);

  const useHint = () => {
    if (!current) return;
    setHintUsed(true);
    setShowHint(true);
  };

  return (
    <div className="min-h-screen bg-sparkle px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">BashaBuddy Games</p>
            <h1 className="font-display text-3xl font-semibold text-buddy-cocoa">Word Scramble 🔀</h1>
            <p className="mt-1 text-sm text-slate-600">Unscramble the English word from its {LANG_LABELS[language]} hint!</p>
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
            <div className="text-6xl">🔀</div>
            <h2 className="font-display text-2xl font-bold text-buddy-cocoa">Word Scramble</h2>
            <p className="text-sm text-slate-500">{ROUNDS} words · click letters to unscramble · 2 pts without hint · 1 pt with hint</p>
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
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-white/60 overflow-hidden">
                <motion.div className="h-full rounded-full bg-buddy-grape"
                  animate={{ width: `${(qi / deck.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500">{qi}/{deck.length}</span>
              <span className="rounded-full bg-buddy-mint/80 px-3 py-1 text-xs font-bold text-slate-700">⭐ {score}</span>
            </div>

            {/* Card */}
            <AnimatePresence mode="wait">
              <motion.div key={qi} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card text-center space-y-2"
              >
                <div className="text-5xl">{current.emoji}</div>
                <p className="font-display text-3xl font-extrabold text-buddy-grape">{current.native}</p>
                <p className="text-sm text-slate-500 italic">({LANG_LABELS[language]} word)</p>
                {showHint && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="rounded-xl bg-buddy-peach/50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                  >💡 Hint: {current.hint}</motion.p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Answer slots */}
            <div className="flex justify-center gap-2 min-h-[52px]">
              {answer.length === 0 ? (
                <p className="self-center text-sm text-slate-400 italic">Click letters below to fill here…</p>
              ) : (
                answer.map((tile, i) => (
                  <motion.button key={`a-${tile.id}`} type="button" onClick={() => removeLetter(i)}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg font-extrabold shadow-soft transition ${
                      result === "correct"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : result === "wrong"
                        ? "border-red-300 bg-red-50 text-red-600"
                        : "border-buddy-grape bg-buddy-grape/10 text-buddy-grape hover:bg-buddy-grape/20"
                    }`}
                  >{tile.letter}</motion.button>
                ))
              )}
            </div>

            {/* Scrambled tiles */}
            <div className="flex flex-wrap justify-center gap-2">
              {tiles.map((tile) => (
                <motion.button key={tile.id} type="button"
                  onClick={() => pickTile(tile)}
                  disabled={tile.used || !!result}
                  whileTap={{ scale: 0.88 }}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-extrabold shadow-soft transition ${
                    tile.used
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                      : "bg-white/90 text-buddy-cocoa border border-white/70 hover:-translate-y-1 hover:shadow-card"
                  }`}
                >{tile.letter}</motion.button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex gap-2 justify-center flex-wrap">
              <button type="button" onClick={check}
                disabled={answer.length !== current.english.length || !!result}
                className="rounded-full bg-buddy-grape px-6 py-2.5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 disabled:opacity-50"
              >Check ✓</button>
              <button type="button" onClick={() => loadWord(current)}
                disabled={!!result}
                className="rounded-full border border-white/70 bg-white/80 px-5 py-2.5 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
              >🔄 Reshuffle</button>
              {!hintUsed && (
                <button type="button" onClick={useHint}
                  className="rounded-full border border-buddy-peach bg-buddy-peach/40 px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-soft transition hover:-translate-y-0.5"
                >💡 Hint (−1pt)</button>
              )}
              <button type="button" onClick={nextWord}
                className="rounded-full border border-slate-200 bg-white/80 px-5 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
              >Skip →</button>
            </div>

            {/* Feedback flash */}
            <AnimatePresence>
              {result && (
                <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`text-center text-lg font-extrabold ${result === "correct" ? "text-emerald-500" : "text-red-400"}`}
                >
                  {result === "correct" ? "🎉 Correct!" : "❌ Try again!"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Done */}
        {phase === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card text-center space-y-5"
          >
            <div className="text-6xl">{score >= 12 ? "🏆" : score >= 8 ? "🌟" : "💪"}</div>
            <h2 className="font-display text-3xl font-bold text-buddy-cocoa">
              {score >= 12 ? "Word Master!" : score >= 8 ? "Great job!" : "Keep practicing!"}
            </h2>
            <div className="text-center">
              <p className="text-5xl font-extrabold text-buddy-grape">{score}</p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">points out of {deck.length * 2}</p>
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
