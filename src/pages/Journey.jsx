import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { Link } from "react-router-dom";
import Mascot from "../components/Mascot.jsx";
import SpeechBubble from "../components/SpeechBubble.jsx";
import SceneController from "../components/SceneController.jsx";

const sceneLabels = ["Welcome", "Quest setup", "Mini challenge", "Completion"];

const challengeOptions = [
  "Use a rope ladder",
  "Throw a stone",
  "Ask Buddy to fly down",
];

export default function Journey() {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef(null);
  const [scene, setScene] = useState(0);
  const [mascotMood, setMascotMood] = useState("neutral");
  const [preferences, setPreferences] = useState({
    themeChoice: "",
    pauseFrequency: "",
    practiceMode: "",
  });
  const [challengeState, setChallengeState] = useState({
    answered: false,
    correct: false,
  });
  const [isFinePointer, setIsFinePointer] = useState(true);

  const onboarding = useMemo(() => {
    try {
      const stored = localStorage.getItem("bhashabuddy_onboarding");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const focusList = onboarding?.focus?.length
    ? onboarding.focus
    : ["Stories", "Speaking"];

  const themeA = focusList.includes("Festivals")
    ? "Festival stories"
    : focusList.includes("Mythology")
    ? "Mythology tales"
    : "Adventure stories";
  const themeB = focusList.includes("Folk tales")
    ? "Folk tales"
    : focusList.includes("Moral stories")
    ? "Moral stories"
    : "Everyday stories";

  const questions = useMemo(() => {
    const base = [
      {
        id: "themeChoice",
        text: `Do you like ${themeA} or ${themeB}?`,
        options: [themeA, themeB],
      },
      {
        id: "pauseFrequency",
        text: "Should Buddy pause and ask questions often or sometimes?",
        options: ["Often", "Sometimes"],
      },
    ];

    if (focusList.includes("Speaking") || focusList.includes("Pronunciation")) {
      base.push({
        id: "practiceMode",
        text: "Do you want more listening or speaking practice?",
        options: ["Listening", "Speaking"],
      });
    }

    return base;
  }, [focusList, themeA, themeB]);

  const bubbleText = useMemo(() => {
    if (scene === 0) return "Hi! I’m Buddy. Let’s set up your first story.";
    if (scene === 1) return "Pick your favorites. I’ll remember them!";
    if (scene === 2) return "Oh no! Mango fell into a pit!";
    return "Awesome. Your stories are ready.";
  }, [scene]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const layerSlowX = useTransform(mouseX, (value) => value * 0.2);
  const layerSlowY = useTransform(mouseY, (value) => value * 0.2);
  const layerMidX = useTransform(mouseX, (value) => value * 0.45);
  const layerMidY = useTransform(mouseY, (value) => value * 0.45);
  const layerFastX = useTransform(mouseX, (value) => value * 0.75);
  const layerFastY = useTransform(mouseY, (value) => value * 0.75);

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const updatePointer = (event) => setIsFinePointer(event.matches);
    setIsFinePointer(query.matches);
    query.addEventListener?.("change", updatePointer);
    return () => query.removeEventListener?.("change", updatePointer);
  }, []);

  useEffect(() => {
    if (reducedMotion || isFinePointer) return undefined;
    const controlsX = animate(mouseX, [-14, 14, -14], {
      duration: 20,
      repeat: Infinity,
      ease: "easeInOut",
    });
    const controlsY = animate(mouseY, [10, -8, 10], {
      duration: 24,
      repeat: Infinity,
      ease: "easeInOut",
    });
    return () => {
      controlsX.stop();
      controlsY.stop();
    };
  }, [isFinePointer, mouseX, mouseY, reducedMotion]);

  const handleMouseMove = (event) => {
    if (!isFinePointer || reducedMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
    mouseX.set(x * 40);
    mouseY.set(y * 30);
  };

  const handleMouseLeave = () => {
    if (!isFinePointer || reducedMotion) return;
    animate(mouseX, 0, { duration: 0.8, ease: "easeOut" });
    animate(mouseY, 0, { duration: 0.8, ease: "easeOut" });
  };

  const selectPreference = (id, value) => {
    setPreferences((prev) => ({ ...prev, [id]: value }));
  };

  const handleChallenge = (option) => {
    const correct = option === challengeOptions[0];
    setChallengeState({ answered: true, correct });
    setMascotMood(correct ? "happy" : "surprised");
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#e8f6ff] via-[#fdf4ef] to-[#dcf6e8]"
    >
      <motion.div
        className="absolute inset-0"
        style={{ x: layerSlowX, y: layerSlowY }}
      >
        <div className="absolute left-10 top-16 h-20 w-32 rounded-full bg-white/40 blur-2xl" />
        <div className="absolute right-24 top-24 h-24 w-36 rounded-full bg-white/40 blur-2xl" />
        <div className="absolute left-1/2 top-6 h-3 w-3 rounded-full bg-white/70" />
        <div className="absolute left-[65%] top-20 h-2 w-2 rounded-full bg-white/60" />
        <div className="absolute left-[35%] top-28 h-2 w-2 rounded-full bg-white/60" />
      </motion.div>

      <motion.div
        className="absolute inset-0"
        style={{ x: layerMidX, y: layerMidY }}
      >
        <div className="absolute left-14 top-36 h-12 w-24 rounded-full bg-white/70" />
        <div className="absolute left-24 top-32 h-14 w-32 rounded-full bg-white/80" />
        <div className="absolute right-12 top-40 h-12 w-28 rounded-full bg-white/70" />
        <div className="absolute right-28 top-34 h-16 w-36 rounded-full bg-white/80" />
      </motion.div>

      <motion.div
        className="absolute inset-0"
        style={{ x: layerFastX, y: layerFastY }}
      >
        <div className="absolute -bottom-24 left-0 h-72 w-1/2 rounded-[50%] bg-[#c7f0df]" />
        <div className="absolute -bottom-28 right-0 h-80 w-2/3 rounded-[50%] bg-[#cbe9ff]" />
        <div className="absolute -bottom-12 left-1/3 h-64 w-1/2 rounded-[50%] bg-[#bde6d2]" />
      </motion.div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-5xl">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Storybook World
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-buddy-cocoa sm:text-4xl">
                Your Quest Tutorial
              </h1>
            </div>
            <div className="flex gap-2">
              {sceneLabels.map((label, index) => (
                <div
                  key={label}
                  className={`flex h-2 w-10 items-center rounded-full ${
                    scene >= index ? "bg-buddy-grape/70" : "bg-white/60"
                  }`}
                />
              ))}
            </div>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-card sm:p-8">
              <SceneController sceneIndex={scene}>
                <SceneWelcome onNext={() => setScene(1)} />
                <SceneQuest
                  questions={questions}
                  preferences={preferences}
                  onSelect={selectPreference}
                  onNext={() => setScene(2)}
                />
                <SceneChallenge
                  state={challengeState}
                  onSelect={handleChallenge}
                  onNext={() => setScene(3)}
                />
                <SceneComplete />
              </SceneController>
            </div>

            <div className="flex flex-col items-center justify-center gap-6">
              <motion.div
                initial={
                  reducedMotion
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0, x: -120 }
                }
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              >
                <Mascot mood={mascotMood} reducedMotion={reducedMotion} />
              </motion.div>
              <SpeechBubble text={bubbleText} className="text-center" />
              {scene === 1 && onboarding?.role ? (
                <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft">
                  {onboarding.role} mode · Age {onboarding.age}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/"
              className="rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
            >
              Back home
            </Link>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>{sceneLabels[scene]}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SceneWelcome({ onNext }) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
        Welcome
      </h2>
      <p className="text-sm text-slate-600">
        Ready for your very first quest? I&apos;ll guide you step by step.
      </p>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={onNext}
        className="rounded-full bg-buddy-grape px-6 py-3 text-sm font-semibold text-white shadow-soft"
      >
        Start quest
      </motion.button>
    </div>
  );
}

function SceneQuest({ questions, preferences, onSelect, onNext }) {
  const ready = questions.every((question) => preferences[question.id]);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
        Quest setup
      </h2>
      <div className="space-y-5">
        {questions.map((question) => (
          <div key={question.id} className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">{question.text}</p>
            <div className="flex flex-wrap gap-3">
              {question.options.map((option) => {
                const active = preferences[question.id] === option;
                return (
                  <motion.button
                    key={option}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onSelect(question.id, option)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-buddy-coral text-white shadow-soft"
                        : "bg-white/80 text-slate-600"
                    }`}
                  >
                    {option}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={onNext}
        disabled={!ready}
        className={`rounded-full px-6 py-3 text-sm font-semibold shadow-soft transition ${
          ready
            ? "bg-buddy-grape text-white"
            : "cursor-not-allowed bg-slate-200 text-slate-400"
        }`}
      >
        Continue
      </motion.button>
    </div>
  );
}

function SceneChallenge({ state, onSelect, onNext }) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
        Mini challenge
      </h2>
      <div className="rounded-2xl bg-buddy-sky/40 px-4 py-3 text-sm font-semibold text-slate-700">
        Oh no! Mango fell into a pit! What should we do?
      </div>
      <div className="flex flex-wrap gap-3">
        {challengeOptions.map((option) => (
          <motion.button
            key={option}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(option)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              state.answered && option === challengeOptions[0]
                ? "bg-buddy-grape text-white"
                : "bg-white/80 text-slate-600"
            }`}
          >
            {option}
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {state.answered ? (
          <motion.div
            key={state.correct ? "correct" : "wrong"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              state.correct
                ? "bg-buddy-mint/60 text-slate-700"
                : "bg-buddy-peach/60 text-slate-700"
            }`}
          >
            {state.correct
              ? "Nice! Mango is safe."
              : "Almost! Try again or choose the gentle rescue."}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={onNext}
        disabled={!state.answered}
        className={`rounded-full px-6 py-3 text-sm font-semibold shadow-soft transition ${
          state.answered
            ? "bg-buddy-grape text-white"
            : "cursor-not-allowed bg-slate-200 text-slate-400"
        }`}
      >
        Continue
      </motion.button>
    </div>
  );
}

function SceneComplete() {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
        Completion
      </h2>
      <p className="text-sm text-slate-600">
        Awesome. Your stories are ready.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/stories"
          className="rounded-full bg-buddy-grape px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
        >
          Enter Stories Library
        </Link>
        <Link
          to="/voice"
          className="rounded-full bg-white/80 px-6 py-3 text-sm font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
        >
          Try Voice Practice
        </Link>
      </div>
    </div>
  );
}
