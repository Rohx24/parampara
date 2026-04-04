import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import Mascot3D from "../components/Mascot3D.jsx";
import { useSession } from "../context/SessionContext.jsx";
import { logEvent } from "../lib/db";

// ── Confetti particle system ──────────────────────────────────────────────────
const CONFETTI = ["🎉","⭐","🌟","✨","🎊","💫","🦋","🌈","🎈","🏆"];
function Confetti({ count = 20 }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute select-none"
          style={{
            fontSize: `${14 + (i % 4) * 6}px`,
            left: `${(i * 37 + 5) % 92}%`,
            top: -30,
          }}
          animate={{
            y: ["0vh", "110vh"],
            rotate: [0, (i % 2 === 0 ? 360 : -360)],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 2.5 + (i % 4) * 0.5,
            delay: (i * 0.12) % 2,
            ease: "easeIn",
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          {CONFETTI[i % CONFETTI.length]}
        </motion.span>
      ))}
    </div>
  );
}

// ── Floating background stars ─────────────────────────────────────────────────
function Stars() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/60"
          style={{
            width: 4 + (i % 3) * 3,
            height: 4 + (i % 3) * 3,
            top: `${(i * 17 + 3) % 85}%`,
            left: `${(i * 23 + 7) % 90}%`,
          }}
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.4, 1] }}
          transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ── Scene theme config ────────────────────────────────────────────────────────
const THEMES = [
  { bg: "from-violet-200 via-purple-100 to-fuchsia-100", accent: "#7B6CF6", label: "Welcome" },
  { bg: "from-amber-100 via-orange-50 to-yellow-100",    accent: "#f59e0b", label: "Your Style" },
  { bg: "from-sky-100 via-cyan-50 to-blue-100",         accent: "#0ea5e9", label: "Challenge" },
  { bg: "from-emerald-100 via-green-50 to-teal-100",    accent: "#22c55e", label: "All Done!" },
];

// ── Buddy speech bubbles per scene ────────────────────────────────────────────
const BUDDY_LINES = [
  ["Hiiiii! 👋", "I'm SO excited to meet you!", "Let me show you around! 🌟"],
  ["Ooh, great choices!", "I'll remember these 💜", "Almost done..."],
  ["Uh oh!! 😱", "Mango needs your help!", "You can do it!! 🦸"],
  ["WOOHOO!! 🎉", "You're amazing!!", "Let's go learn stuff! 🚀"],
];

// Mood-specific ring colors for the glow behind the 3D model
const MOOD_GLOW = {
  neutral:   "from-buddy-grape/20 via-buddy-mint/10 to-transparent",
  happy:     "from-emerald-300/40 via-buddy-mint/20 to-transparent",
  surprised: "from-buddy-coral/30 via-buddy-peach/20 to-transparent",
};

// Mood-specific emoji that floats up when mood changes
const MOOD_EMOJI = { happy: "🌟", surprised: "😱", neutral: null };

function BuddyWithBubble({ scene, mood, lineIndex }) {
  const lines = BUDDY_LINES[scene] ?? BUDDY_LINES[0];
  const line = lines[lineIndex % lines.length];
  const glow = MOOD_GLOW[mood] ?? MOOD_GLOW.neutral;
  const emoji = MOOD_EMOJI[mood];

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={line}
          initial={{ opacity: 0, scale: 0.6, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.75, y: -10 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="relative z-10 max-w-[210px] rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-buddy-cocoa shadow-xl"
        >
          {line}
          {/* Bubble tail */}
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" style={{ borderTopWidth: 10, borderBottomWidth: 0 }} />
        </motion.div>
      </AnimatePresence>

      {/* 3D Buddy wrapper with glow ring + mood float-emoji */}
      <div className="relative flex items-center justify-center">
        {/* Animated glow disc behind Buddy */}
        <motion.div
          key={mood}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`absolute h-40 w-40 rounded-full bg-gradient-radial ${glow} blur-2xl`}
          style={{ background: `radial-gradient(circle, ${mood === "happy" ? "rgba(134,239,172,0.5)" : mood === "surprised" ? "rgba(255,125,107,0.4)" : "rgba(123,108,246,0.3)"} 0%, transparent 70%)` }}
        />

        {/* Mood emoji burst */}
        <AnimatePresence>
          {emoji && (
            <motion.span
              key={mood + lineIndex}
              initial={{ opacity: 1, scale: 0.5, y: 0, x: 30 }}
              animate={{ opacity: 0, scale: 1.8, y: -60, x: 50 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="pointer-events-none absolute z-20 text-3xl"
            >
              {emoji}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Bounce animation wrapper */}
        <motion.div
          animate={{
            y: mood === "happy" ? [0, -14, 0, -8, 0] : mood === "surprised" ? [0, -4, 4, -4, 0] : [0, -6, 0],
            rotate: mood === "happy" ? [0, 4, -4, 2, 0] : [0, 0],
          }}
          transition={{
            duration: mood === "happy" ? 0.7 : 3.5,
            repeat: mood === "happy" ? 0 : Infinity,
            ease: "easeInOut",
          }}
          className="relative z-10"
        >
          <Mascot3D />
        </motion.div>
      </div>
    </div>
  );
}

// ── Challenge options ─────────────────────────────────────────────────────────
const CHALLENGE_OPTS = [
  { label: "🪜 Use a rope ladder", correct: true,  feedback: "🎊 Perfect! The rope ladder is the gentlest way — Mango is safe!" },
  { label: "🪨 Throw a stone",    correct: false, feedback: "😅 Oh no, that might hurt Mango! The rope ladder is kinder." },
  { label: "🦋 Ask Buddy to fly", correct: false, feedback: "😂 Ha! Buddy is too small to carry Mango! Try the rope ladder." },
];

export default function Journey() {
  const { childProfile } = useSession();
  const [scene, setScene] = useState(0);
  const [direction, setDirection] = useState(1);
  const [mascotMood, setMascotMood] = useState("neutral");
  const [buddyLineIdx, setBuddyLineIdx] = useState(0);
  const [prefs, setPrefs] = useState({ themeChoice: "", pauseFrequency: "", practiceMode: "" });
  const [challenge, setChallenge] = useState({ answered: false, correct: false, feedback: "" });

  const onboarding = useMemo(() => {
    if (childProfile?.onboarding) return childProfile.onboarding;
    try { return JSON.parse(localStorage.getItem("bhashabuddy_onboarding") || "null"); }
    catch { return null; }
  }, [childProfile]);

  const nickname = childProfile?.nickname || onboarding?.nickname || "Explorer";
  const focusList = onboarding?.focus?.length ? onboarding.focus : ["Stories", "Speaking"];

  const themeA = focusList.includes("Festivals") ? "Festival stories"
    : focusList.includes("Mythology") ? "Mythology tales" : "Adventure stories";
  const themeB = focusList.includes("Folk tales") ? "Folk tales"
    : focusList.includes("Moral stories") ? "Moral stories" : "Everyday stories";

  const questions = useMemo(() => {
    const q = [
      { id: "themeChoice", text: "Which type of story sounds more fun?", options: [themeA, themeB], emojis: ["⚔️", "🌸"] },
      { id: "pauseFrequency", text: "How often should Buddy ask you questions?", options: ["Often ❓", "Sometimes 🤫"], emojis: ["💬", "🤫"] },
    ];
    if (focusList.includes("Speaking") || focusList.includes("Pronunciation")) {
      q.push({ id: "practiceMode", text: "Would you rather listen or speak more?", options: ["Listening 👂", "Speaking 🎤"], emojis: ["👂", "🎤"] });
    }
    return q;
  }, [focusList, themeA, themeB]);

  const goTo = (next) => {
    setDirection(next > scene ? 1 : -1);
    setScene(next);
    setBuddyLineIdx(0);
    if (next === 3) setMascotMood("happy");
    else setMascotMood("neutral");
  };

  const handlePick = (id, val) => {
    setPrefs((p) => ({ ...p, [id]: val }));
    setMascotMood("happy");
    setBuddyLineIdx((i) => i + 1);
    setTimeout(() => setMascotMood("neutral"), 1200);
  };

  const handleChallenge = (opt) => {
    setChallenge({ answered: true, correct: opt.correct, feedback: opt.feedback });
    setMascotMood(opt.correct ? "happy" : "surprised");
    setBuddyLineIdx((i) => i + 1);
    if (childProfile?.id) logEvent(childProfile.id, "game_play", { challenge: "mini_challenge", option: opt.label, correct: opt.correct });
  };

  const theme = THEMES[scene];

  return (
    <div className={`relative min-h-screen overflow-hidden bg-gradient-to-br ${theme.bg} transition-colors duration-700`}>
      <Stars />
      {scene === 3 && <Confetti count={18} />}

      {/* Floating ambient blobs */}
      <motion.div animate={{ x: [0, 18, 0], y: [0, -12, 0] }} transition={{ duration: 7, repeat: Infinity }}
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/30 blur-3xl" />
      <motion.div animate={{ x: [0, -14, 0], y: [0, 18, 0] }} transition={{ duration: 9, repeat: Infinity }}
        className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-white/25 blur-3xl" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-3xl">

          {/* Chapter pills */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-center gap-2 flex-wrap">
            {THEMES.map((t, i) => (
              <motion.div
                key={t.label}
                className="rounded-full px-3 py-1 text-[11px] font-bold transition-all"
                animate={{
                  backgroundColor: i === scene ? theme.accent : "rgba(255,255,255,0.5)",
                  color: i === scene ? "#fff" : "#94a3b8",
                  scale: i === scene ? 1.08 : 1,
                }}
                transition={{ duration: 0.35 }}
              >
                {i < scene ? "✓ " : ""}{t.label}
              </motion.div>
            ))}
          </motion.div>

          {/* Main layout: scene card + Buddy side by side */}
          <div className="grid gap-8 lg:grid-cols-[1fr_220px] items-center">

            {/* Scene card */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={scene}
                custom={direction}
                variants={{
                  enter: (d) => ({ x: d > 0 ? 60 : -60, opacity: 0, scale: 0.97 }),
                  center: { x: 0, opacity: 1, scale: 1 },
                  exit: (d) => ({ x: d > 0 ? -60 : 60, opacity: 0, scale: 0.97 }),
                }}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.38, ease: "easeInOut" }}
                className="rounded-3xl border border-white/70 bg-white/80 shadow-2xl backdrop-blur-sm"
              >
                {scene === 0 && <SceneWelcome nickname={nickname} onNext={() => goTo(1)} accent={theme.accent} />}
                {scene === 1 && <SceneQuest questions={questions} prefs={prefs} onPick={handlePick} onNext={() => goTo(2)} accent={theme.accent} />}
                {scene === 2 && <SceneChallenge state={challenge} onSelect={handleChallenge} onNext={() => goTo(3)} accent={theme.accent} />}
                {scene === 3 && <SceneComplete nickname={nickname} prefs={prefs} accent={theme.accent} />}
              </motion.div>
            </AnimatePresence>

            {/* Buddy column */}
            <div className="flex justify-center lg:justify-end">
              <BuddyWithBubble scene={scene} mood={mascotMood} lineIndex={buddyLineIdx} />
            </div>
          </div>

          {/* Footer nav */}
          <div className="mt-6 flex items-center justify-between">
            <Link to="/home" className="rounded-full bg-white/70 px-5 py-2.5 text-xs font-semibold text-slate-500 shadow-soft backdrop-blur-sm transition hover:-translate-y-0.5">
              ← Back home
            </Link>
            {scene > 0 && scene < 3 && (
              <button onClick={() => goTo(scene - 1)} className="rounded-full bg-white/70 px-5 py-2.5 text-xs font-semibold text-slate-500 shadow-soft backdrop-blur-sm transition hover:-translate-y-0.5">
                ← Previous scene
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Scene 0: Welcome ──────────────────────────────────────────────────────────

function SceneWelcome({ nickname, onNext, accent }) {
  return (
    <div className="p-7 sm:p-10">
      <div className="flex flex-col items-center gap-5 text-center">
        <motion.div
          animate={{ scale: [1, 1.12, 1], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="text-7xl"
        >
          🗺️
        </motion.div>
        <div>
          <h2 className="font-display text-3xl font-extrabold text-buddy-cocoa">
            Adventure awaits, {nickname}! ✨
          </h2>
          <p className="mt-2 text-slate-600 text-sm leading-relaxed max-w-xs mx-auto">
            Let me set up your personal learning quest — it only takes a minute!
          </p>
        </div>

        {/* Feature tiles */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {[
            { icon: "🎬", label: "Real YouTube Videos", bg: "bg-red-50" },
            { icon: "🎤", label: "Voice + Score",       bg: "bg-purple-50" },
            { icon: "✨", label: "AI Story Builder",    bg: "bg-amber-50" },
            { icon: "🎮", label: "Word Games",          bg: "bg-green-50" },
          ].map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              whileHover={{ y: -3, scale: 1.04 }}
              className={`flex items-center gap-2 rounded-2xl ${f.bg} px-3 py-3`}
            >
              <span className="text-2xl">{f.icon}</span>
              <span className="text-xs font-bold text-slate-700">{f.label}</span>
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}
          onClick={onNext}
          className="rounded-full px-10 py-4 text-base font-extrabold text-white shadow-xl"
          style={{ backgroundColor: accent }}
        >
          Start my quest! 🚀
        </motion.button>
      </div>
    </div>
  );
}

// ── Scene 1: Preferences ──────────────────────────────────────────────────────

function SceneQuest({ questions, prefs, onPick, onNext, accent }) {
  const ready = questions.every((q) => prefs[q.id]);
  const doneCount = Object.values(prefs).filter(Boolean).length;

  return (
    <div className="p-7 sm:p-10">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🎯</div>
        <h2 className="font-display text-2xl font-extrabold text-buddy-cocoa">Your Learning Style</h2>
        <p className="text-sm text-slate-500 mt-1">No wrong answers — just pick your favourites!</p>
      </div>

      <div className="space-y-5">
        {questions.map((q) => (
          <div key={q.id} className="space-y-2.5">
            <p className="text-sm font-bold text-slate-700">{q.text}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt, i) => {
                const active = prefs[q.id] === opt;
                return (
                  <motion.button
                    key={opt}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
                    onClick={() => onPick(q.id, opt)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                      active ? "text-white shadow-lg scale-105" : "bg-white/80 text-slate-600 shadow-soft"
                    }`}
                    style={active ? { backgroundColor: accent } : {}}
                  >
                    <span>{q.emojis?.[i]}</span>
                    {opt}
                    {active && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-1">✓</motion.span>}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-5 space-y-1.5">
        <div className="flex justify-between text-[11px] font-semibold text-slate-400">
          <span>{doneCount} of {questions.length} answered</span>
          {ready && <span style={{ color: accent }}>All done! ✓</span>}
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: accent }}
            animate={{ width: `${(doneCount / questions.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <motion.button
          whileHover={ready ? { y: -2 } : {}} whileTap={ready ? { scale: 0.97 } : {}}
          onClick={onNext} disabled={!ready}
          className={`rounded-full px-8 py-3 text-sm font-extrabold transition ${
            ready ? "text-white shadow-lg" : "cursor-not-allowed bg-slate-200 text-slate-400"
          }`}
          style={ready ? { backgroundColor: accent } : {}}
        >
          {ready ? "Continue →" : `${questions.length - doneCount} more to go…`}
        </motion.button>
      </div>
    </div>
  );
}

// ── Scene 2: Mini challenge ───────────────────────────────────────────────────

function SceneChallenge({ state, onSelect, onNext, accent }) {
  return (
    <div className="p-7 sm:p-10">
      <div className="text-center mb-5">
        <AnimatePresence mode="wait">
          <motion.div key={state.answered ? "done" : "start"}
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 260 }}
            className="text-5xl mb-2"
          >
            {state.answered ? (state.correct ? "🎊" : "😅") : "🐒"}
          </motion.div>
        </AnimatePresence>
        <h2 className="font-display text-2xl font-extrabold text-buddy-cocoa">Quick Challenge!</h2>
      </div>

      {/* Story panel */}
      <motion.div
        animate={{ borderColor: state.answered ? (state.correct ? "#86efac" : "#fca5a5") : "#93c5fd" }}
        className="mb-5 rounded-2xl border-2 bg-sky-50/70 p-4"
      >
        <p className="text-xs font-bold text-sky-600 mb-1">📖 Scene from the jungle:</p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Little Mango the monkey slipped and fell into a deep pit! 😨 He's crying and can't climb out.
          Buddy needs your help. <strong>What's the kindest way to rescue him?</strong>
        </p>
      </motion.div>

      {/* Options */}
      <div className="space-y-2.5">
        {CHALLENGE_OPTS.map((opt) => {
          const isRight = state.answered && opt.correct;
          const isWrong = state.answered && !opt.correct;
          return (
            <motion.button
              key={opt.label}
              whileHover={!state.answered ? { x: 5 } : {}}
              whileTap={!state.answered ? { scale: 0.97 } : {}}
              onClick={() => !state.answered && onSelect(opt)}
              animate={isRight ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={`flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-left text-sm font-semibold transition-all ${
                isRight  ? "text-white shadow-lg"
                : isWrong ? "border-2 border-red-200 bg-red-50/60 text-red-400"
                : state.answered ? "bg-white/40 text-slate-400"
                : "bg-white/80 text-slate-700 shadow-soft hover:shadow-md cursor-pointer"
              }`}
              style={isRight ? { backgroundColor: accent } : {}}
            >
              <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                isRight ? "border-white/60 text-white" : "border-slate-300"
              }`}>
                {isRight ? "✓" : ""}
              </span>
              {opt.label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {state.answered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`mt-4 rounded-2xl p-4 text-sm font-semibold ${
              state.correct ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-amber-50 border border-amber-200 text-amber-800"
            }`}
          >
            {state.feedback}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 flex justify-end">
        <motion.button
          whileHover={state.answered ? { y: -2 } : {}} whileTap={state.answered ? { scale: 0.97 } : {}}
          onClick={onNext} disabled={!state.answered}
          className={`rounded-full px-8 py-3 text-sm font-extrabold transition ${
            state.answered ? "text-white shadow-lg" : "cursor-not-allowed bg-slate-200 text-slate-400"
          }`}
          style={state.answered ? { backgroundColor: accent } : {}}
        >
          Continue →
        </motion.button>
      </div>
    </div>
  );
}

// ── Scene 3: Completion ───────────────────────────────────────────────────────

function SceneComplete({ nickname, prefs, accent }) {
  return (
    <div className="p-7 sm:p-10">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.18, 1], rotate: [0, 12, -12, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="text-7xl"
          >
            🏆
          </motion.div>
          {["⭐","🎉","✨","🌟"].map((e, i) => (
            <motion.span key={i}
              className="absolute text-xl"
              style={{ top: `${20 + (i % 2) * 50}%`, [i < 2 ? "left" : "right"]: -36 }}
              animate={{ y: [-6, 6, -6], rotate: [-15, 15, -15] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.35 }}
            >{e}</motion.span>
          ))}
        </div>

        <div>
          <h2 className="font-display text-2xl font-extrabold text-buddy-cocoa">
            You're all set, {nickname}! 🎊
          </h2>
          <p className="text-slate-600 text-sm mt-1">Your adventure is configured. Where do you want to start?</p>
        </div>

        {/* Preference summary */}
        {Object.values(prefs).some(Boolean) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs rounded-2xl bg-white/60 p-4 text-left"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Your picks</p>
            {Object.entries(prefs).filter(([,v]) => v).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 py-0.5 text-xs font-semibold text-slate-600">
                <span className="text-base">✅</span> {v}
              </div>
            ))}
          </motion.div>
        )}

        {/* Launch buttons */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {[
            { to: "/stories",   icon: "🎬", label: "Watch a Lesson" },
            { to: "/voice",     icon: "🎤", label: "Talk to Buddy" },
            { to: "/make-story",icon: "✨", label: "Make a Story" },
            { to: "/games",     icon: "🎮", label: "Play Games" },
          ].map((a) => (
            <motion.div key={a.to} whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to={a.to} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/80 p-4 shadow-soft transition text-center">
                <span className="text-3xl">{a.icon}</span>
                <span className="text-xs font-bold text-slate-700">{a.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          <Link
            to="/home"
            className="inline-block rounded-full px-8 py-3.5 text-sm font-extrabold text-white shadow-lg"
            style={{ backgroundColor: accent }}
          >
            Go to Home 🏠
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
