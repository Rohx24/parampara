/**
 * Guided onboarding tour — navigates to each page explicitly on Next AND Back.
 * Card sits in the bottom-right corner so it never blocks content.
 * A pulsing beacon + directional callout arrow shows where to look.
 */
import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export const TOUR_KEY = "bbashabuddy_tour_done_v6";

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}

// ── Step definitions ──────────────────────────────────────────────────────────
// beacon: { position, label } – where the pulsing dot appears on screen
// position is a Tailwind-style top/bottom/left/right set

const STEPS_CHILD = [
  {
    id: "welcome",
    path: null,
    emoji: "🦋",
    title: "Hi! I'm Buddy!",
    body: "Welcome to BashaBuddy! I'll show you 5 pages in 30 seconds — I'll take you there automatically. Ready?",
    beacon: null,
    cta: "Let's go! 🚀",
    color: "#7B6CF6",
  },
  {
    id: "lessons",
    path: "/stories",
    emoji: "🎬",
    title: "YouTube Lessons",
    body: "Pick a topic chip at the top — like Greetings or Animals — and I'll find real YouTube videos. Hit Analyze for an AI quiz!",
    beacon: { top: "10%", left: "50%", label: "Topic chips are up here!" },
    color: "#FF7D6B",
  },
  {
    id: "voice",
    path: "/voice",
    emoji: "🎤",
    title: "Talk to Buddy",
    body: "The big card on the left is your prompt. Press the mic button and say the words out loud — I'll score your pronunciation!",
    beacon: { top: "40%", left: "25%", label: "Your prompt card is here!" },
    color: "#7B6CF6",
  },
  {
    id: "makestory",
    path: "/make-story",
    emoji: "✨",
    title: "Make My Story",
    body: "Pick a genre, type a fun idea in the box, and hit Generate Story. AI writes a whole story just for you — with a quiz at the end!",
    beacon: { top: "30%", left: "50%", label: "Type your idea here!" },
    color: "#f59e0b",
  },
  {
    id: "games",
    path: "/games",
    emoji: "🎮",
    title: "Play Games!",
    body: "Five awesome games — Flash Cards, Word Match, Spelling Bee, Word Scramble, and Letter Match. Play a round to earn points!",
    beacon: { top: "55%", left: "30%", label: "Game cards are down here!" },
    color: "#22c55e",
  },
  {
    id: "done",
    path: "/home",
    emoji: "🌟",
    title: "You're all set!",
    body: "Now you know everything! Pick any activity from the home screen and start your learning adventure. Your progress is always saved!",
    beacon: null,
    cta: "Start exploring! 🎉",
    color: "#7B6CF6",
  },
];

const STEPS_PARENT = [
  {
    id: "welcome-p",
    path: null,
    emoji: "👋",
    title: "Welcome, Parent!",
    body: "BashaBuddy helps children learn English using their native Indian language. Let me show you the key areas — I'll navigate to each page!",
    beacon: null,
    cta: "Show me →",
    color: "#6366f1",
  },
  {
    id: "home-p",
    path: "/home",
    emoji: "🏠",
    title: "Activity Hub",
    body: "Your child picks from five activities: YouTube Lessons, Voice Coach, Story Builder, Games, and Journey. All powered by AI.",
    beacon: { top: "55%", left: "30%", label: "Activity cards are here!" },
    color: "#FF7D6B",
  },
  {
    id: "dashboard-p",
    path: "/parent-dashboard",
    emoji: "📊",
    title: "Parent Dashboard",
    body: "The tabs across the top switch between Overview, Skills, Activity chart, AI Report, and the NLP Tech explanation.",
    beacon: { top: "18%", left: "50%", label: "Dashboard tabs are up here!" },
    color: "#7B6CF6",
  },
  {
    id: "chat-p",
    path: "/parent-dashboard",
    emoji: "🤖",
    title: "Ask the AI Coach",
    body: "Click the 'Ask AI Coach' tab in the dashboard. Ask anything about your child's progress, what to practice at home, and how the app works!",
    beacon: { top: "18%", left: "75%", label: "Find 'Ask AI Coach' tab here!" },
    color: "#22c55e",
  },
  {
    id: "done-p",
    path: "/home",
    emoji: "🎓",
    title: "All done!",
    body: "Encourage 10–15 minutes of daily practice. Check the Parent Dashboard weekly for AI-generated reports with specific tips for your child.",
    beacon: null,
    cta: "Got it! 👍",
    color: "#6366f1",
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingTour() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) setVisible(true);
  }, []);

  const steps = mode === "child" ? STEPS_CHILD : mode === "parent" ? STEPS_PARENT : [];
  const step = steps[stepIdx] ?? null;

  // Navigate to a step explicitly — used by next and back
  const goTo = useCallback((idx, stepsArr) => {
    const s = stepsArr[idx];
    if (s?.path) navigate(s.path);
  }, [navigate]);

  const dismiss = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "1");
    setVisible(false);
    setMode(null);
    setStepIdx(0);
  }, []);

  const next = useCallback(() => {
    if (stepIdx >= steps.length - 1) { dismiss(); return; }
    const nextIdx = stepIdx + 1;
    setStepIdx(nextIdx);
    goTo(nextIdx, steps);
  }, [stepIdx, steps, dismiss, goTo]);

  const back = useCallback(() => {
    if (stepIdx <= 0) return;
    const prevIdx = stepIdx - 1;
    setStepIdx(prevIdx);
    goTo(prevIdx, steps);
  }, [stepIdx, steps, goTo]);

  const selectMode = useCallback((m) => {
    const stepsArr = m === "child" ? STEPS_CHILD : STEPS_PARENT;
    setMode(m);
    setStepIdx(0);
    // Welcome step has path=null, so no navigation on first step
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence mode="wait">
      {!mode ? (
        <ModeSelect key="mode" onSelect={selectMode} onDismiss={dismiss} />
      ) : step ? (
        <StepOverlay
          key={step.id}
          step={step}
          stepIdx={stepIdx}
          total={steps.length}
          onNext={next}
          onBack={back}
          onDismiss={dismiss}
        />
      ) : null}
    </AnimatePresence>
  );
}

// ── Mode selection ────────────────────────────────────────────────────────────

function ModeSelect({ onSelect, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.88, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          animate={{ scale: [1, 1.12, 1], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="mb-4 text-6xl"
        >
          🦋
        </motion.div>
        <h2 className="font-display text-2xl font-extrabold text-buddy-cocoa">Welcome to BashaBuddy!</h2>
        <p className="mt-2 mb-7 text-sm text-slate-500">Take a quick guided tour — I'll navigate to each page for you.</p>
        <div className="space-y-3">
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            onClick={() => onSelect("child")}
            className="w-full rounded-2xl bg-buddy-grape py-4 text-base font-bold text-white shadow-soft"
          >
            👦 I'm a child / student
          </motion.button>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            onClick={() => onSelect("parent")}
            className="w-full rounded-2xl border-2 border-buddy-grape/30 bg-buddy-grape/5 py-4 text-base font-bold text-buddy-grape"
          >
            👩 I'm a parent / teacher
          </motion.button>
        </div>
        <button onClick={onDismiss} className="mt-5 text-xs text-slate-400 hover:text-slate-600 underline">
          Skip and explore on my own
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Tour overlay ──────────────────────────────────────────────────────────────

function StepOverlay({ step, stepIdx, total, onNext, onBack, onDismiss }) {
  const isLast = stepIdx === total - 1;
  const isFirst = stepIdx === 0;
  const accent = step.color || "#7B6CF6";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] pointer-events-none"
    >
      {/* Dim overlay — doesn't block clicks so user can explore */}
      <div className="absolute inset-0 bg-slate-900/40" style={{ pointerEvents: "none" }} />

      {/* Pulsing beacon pointing to the UI element */}
      <AnimatePresence>
        {step.beacon && (
          <motion.div
            key={step.id + "-beacon"}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute pointer-events-none"
            style={{ top: step.beacon.top, left: step.beacon.left, transform: "translate(-50%, -50%)" }}
          >
            {/* Ripple rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: accent }}
                animate={{ scale: [1, 2.8], opacity: [0.6, 0] }}
                transition={{ duration: 1.6, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
            {/* Center dot */}
            <div className="relative w-5 h-5 rounded-full shadow-lg" style={{ backgroundColor: accent }} />
            {/* Label bubble */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-lg"
              style={{ backgroundColor: accent }}
            >
              {step.beacon.label}
              {/* Arrow up pointing to beacon */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: `6px solid ${accent}` }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step card — bottom-right corner, never blocks main content */}
      <motion.div
        key={step.id}
        initial={{ x: 60, opacity: 0, scale: 0.95 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 40, opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="absolute bottom-6 right-6 w-80 pointer-events-auto"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-3xl bg-white shadow-2xl overflow-hidden border border-white/60">
          {/* Colored header with progress */}
          <div className="px-5 py-3 text-white" style={{ backgroundColor: accent }}>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 items-center">
                {Array.from({ length: total }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full bg-white"
                    animate={{ width: i === stepIdx ? 18 : 6, opacity: i <= stepIdx ? 1 : 0.35 }}
                    style={{ height: 6 }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
                <span className="ml-1.5 text-xs font-bold text-white/80">{stepIdx + 1}/{total}</span>
              </div>
              <button onClick={onDismiss} className="text-white/70 hover:text-white text-xs font-semibold">
                Skip ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <div className="flex items-start gap-3">
              <motion.div
                key={step.id + "-emoji"}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                className="text-3xl shrink-0"
              >
                {step.emoji}
              </motion.div>
              <div>
                <h3 className="font-display text-base font-extrabold text-buddy-cocoa leading-tight">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </div>

            {/* Nav buttons */}
            <div className="mt-4 flex gap-2">
              {!isFirst && (
                <button
                  onClick={onBack}
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 transition shrink-0"
                >
                  ← Back
                </button>
              )}
              <motion.button
                whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                onClick={onNext}
                className="flex-1 rounded-full py-2.5 text-xs font-extrabold text-white shadow-soft transition"
                style={{ backgroundColor: accent }}
              >
                {step.cta ?? (isLast ? "Done 🎉" : "Next →")}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
