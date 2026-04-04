/**
 * Guided onboarding tour — navigates to each page and shows a clear floating card.
 * No CSS spotlight trickery (unreliable cross-browser). Instead each step shows:
 *  - A full dark overlay
 *  - A central card with emoji, heading, body, and an arrow callout showing WHERE to look
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export const TOUR_KEY = "bbashabuddy_tour_done_v5";

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}

// ── Step definitions ──────────────────────────────────────────────────────────
// callout: optional text shown in a pointing arrow banner ("Look at the __ above")

const STEPS_CHILD = [
  {
    id: "welcome",
    path: null,
    emoji: "🦋",
    title: "Hi! I'm Buddy!",
    body: "Welcome to BashaBuddy! I'll show you everything in 5 quick steps — and take you to each page automatically. Ready?",
    callout: null,
    cta: "Let's go! 🚀",
    color: "#7B6CF6",
  },
  {
    id: "lessons",
    path: "/stories",
    emoji: "🎬",
    title: "YouTube Lessons",
    body: "See the topic chips at the top? Pick one — like Greetings or Animals — and I'll find real YouTube videos. Then hit Analyze for an AI quiz!",
    callout: "👆 Look up there — pick a topic chip and press Search!",
    color: "#FF7D6B",
  },
  {
    id: "voice",
    path: "/voice",
    emoji: "🎤",
    title: "Talk to Buddy",
    body: "See the big card on the left? That's your prompt. Press the mic button and say the words out loud. I'll score your pronunciation!",
    callout: "👈 Look left — that's the prompt card. Press the mic!",
    color: "#7B6CF6",
  },
  {
    id: "makestory",
    path: "/make-story",
    emoji: "✨",
    title: "Make My Story",
    body: "Pick a genre, type a fun idea in the box, and hit Generate Story. AI writes a whole story just for you — with a quiz at the end!",
    callout: "👆 Choose a genre above and type your idea!",
    color: "#f59e0b",
  },
  {
    id: "games",
    path: "/games",
    emoji: "🎮",
    title: "Play Games!",
    body: "Three awesome games are waiting — Flash Cards, Word Scramble, and Letter Match. Play a round to earn points and learn new words!",
    callout: "👇 Scroll down to see all the game cards below!",
    color: "#22c55e",
  },
  {
    id: "done",
    path: "/home",
    emoji: "🌟",
    title: "You're all set!",
    body: "Now you know everything! Pick any activity from the home screen and start your learning adventure. Your progress is always saved!",
    callout: null,
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
    body: "BashaBuddy helps children learn English using their native Indian language. Let me show you the key features — I'll take you to each page!",
    callout: null,
    cta: "Show me →",
    color: "#6366f1",
  },
  {
    id: "home-p",
    path: "/home",
    emoji: "🏠",
    title: "Activity Hub",
    body: "Your child picks from four activities: YouTube Lessons, Voice Coach, Story Builder, and Games. All powered by GPT-4o-mini AI.",
    callout: "👇 The four cards below are the main learning activities.",
    color: "#FF7D6B",
  },
  {
    id: "dashboard-p",
    path: "/parent-dashboard",
    emoji: "📊",
    title: "Parent Dashboard",
    body: "The tabs across the top switch between Overview (stats), Skills (scores), Activity (bar chart), AI Report, and the NLP Tech explanation.",
    callout: "👆 Click those tabs above to explore each section!",
    color: "#7B6CF6",
  },
  {
    id: "chat-p",
    path: "/parent-dashboard",
    emoji: "🤖",
    title: "Ask the AI Coach",
    body: "Click the 'Ask AI Coach' tab in the dashboard. You can ask anything about your child's progress, what to practice at home, and how the app works!",
    callout: "👆 Find the 'Ask AI Coach' tab above — try asking a question!",
    color: "#22c55e",
  },
  {
    id: "done-p",
    path: "/home",
    emoji: "🎓",
    title: "All done!",
    body: "Encourage 10-15 minutes of daily practice. Check the Parent Dashboard weekly for AI-generated reports with specific tips for your child.",
    callout: null,
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
  const navTimer = useRef(null);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) setVisible(true);
  }, []);

  const steps = mode === "child" ? STEPS_CHILD : mode === "parent" ? STEPS_PARENT : [];
  const step = steps[stepIdx] ?? null;

  // Navigate to page when step changes
  useEffect(() => {
    if (!visible || !step?.path) return;
    clearTimeout(navTimer.current);
    navigate(step.path);
  }, [stepIdx, visible, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "1");
    setVisible(false);
    setMode(null);
    setStepIdx(0);
    clearTimeout(navTimer.current);
  }, []);

  const next = useCallback(() => {
    if (stepIdx >= steps.length - 1) { dismiss(); return; }
    setStepIdx((i) => i + 1);
  }, [stepIdx, steps.length, dismiss]);

  const back = useCallback(() => setStepIdx((i) => Math.max(0, i - 1)), []);

  if (!visible) return null;

  return (
    <AnimatePresence mode="wait">
      {!mode ? (
        <ModeSelect key="mode" onSelect={(m) => { setMode(m); setStepIdx(0); }} onDismiss={dismiss} />
      ) : step ? (
        <StepCard
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4"
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

// ── Tour step card ────────────────────────────────────────────────────────────

function StepCard({ step, stepIdx, total, onNext, onBack, onDismiss }) {
  const isLast = stepIdx === total - 1;
  const isFirst = stepIdx === 0;
  const accent = step.color || "#7B6CF6";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] pointer-events-none"
    >
      {/* Semi-transparent edge vignette (lets page show through but draws focus to card) */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" style={{ pointerEvents: "none" }} />

      {/* Card — centered, bottom-half of screen */}
      <motion.div
        key={step.id}
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="absolute left-1/2 bottom-8 -translate-x-1/2 w-full max-w-md pointer-events-auto"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Callout banner — appears above card */}
        {step.callout && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-2 mx-4 rounded-2xl px-4 py-2.5 text-sm font-bold text-white text-center shadow-lg"
            style={{ backgroundColor: accent }}
          >
            {step.callout}
          </motion.div>
        )}

        <div className="mx-4 rounded-3xl bg-white shadow-2xl overflow-hidden">
          {/* Coloured header */}
          <div className="px-6 py-4 text-white" style={{ backgroundColor: accent }}>
            <div className="flex items-center justify-between">
              {/* Progress dots */}
              <div className="flex gap-1.5 items-center">
                {Array.from({ length: total }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full bg-white"
                    animate={{ width: i === stepIdx ? 20 : 7, opacity: i <= stepIdx ? 1 : 0.4 }}
                    style={{ height: 7 }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
                <span className="ml-2 text-xs font-bold text-white/80">{stepIdx + 1}/{total}</span>
              </div>
              <button onClick={onDismiss} className="text-white/70 hover:text-white text-xs font-semibold">
                Skip ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <motion.div
                key={step.id + "-emoji"}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                className="text-4xl shrink-0 mt-0.5"
              >
                {step.emoji}
              </motion.div>
              <div>
                <h3 className="font-display text-lg font-extrabold text-buddy-cocoa">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </div>

            {/* Nav buttons */}
            <div className="mt-5 flex gap-2">
              {!isFirst && (
                <button
                  onClick={onBack}
                  className="rounded-full bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-200 transition shrink-0"
                >
                  ← Back
                </button>
              )}
              <motion.button
                whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={onNext}
                className="flex-1 rounded-full py-3 text-sm font-extrabold text-white shadow-soft transition"
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
