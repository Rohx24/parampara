import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Mascot3D from "../components/Mascot3D.jsx";
import SpeechBubble from "../components/SpeechBubble.jsx";

const heroMessages = [
  "Stories feel cozy, not chaotic.",
  "Your child learns in their heritage language.",
  "Progress updates keep you in the loop.",
];

const activityCards = [
  {
    title: "Visual Stories",
    detail: "Stories pause to ask gentle questions and keep kids talking.",
  },
  {
    title: "Talk to a Friend",
    detail: "Buddy prompts voice practice with playful call-and-response.",
  },
  {
    title: "Notebook Writing",
    detail: "OCR feedback helps kids shape letters with confidence.",
  },
];

const ageResponses = {
  "5–7": "Warm prompts and tiny wins keep early learners smiling.",
  "8–11": "Story challenges spark curiosity with friendly check-ins.",
  "12–15": "Independent quests encourage deeper language confidence.",
};

const sectionFade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export default function Parents() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [lockedCard, setLockedCard] = useState(0);
  const [ageGroup, setAgeGroup] = useState(null);

  const message = useMemo(() => heroMessages[messageIndex], [messageIndex]);
  const activeCard = hoveredCard ?? lockedCard;

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % heroMessages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleScrollToTrust = () => {
    document.getElementById("parents-trust")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-screen bg-sparkle px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            variants={sectionFade}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              For parents
            </p>
            <h1 className="font-display text-4xl font-semibold text-buddy-cocoa sm:text-5xl">
              Screen time that feels like home.
            </h1>
            <p className="max-w-xl text-base text-slate-600 sm:text-lg">
              Built for NRI families who want heritage language practice without the
              pressure. Short stories, gentle prompts, and family-friendly pacing.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/parent-setup"
                aria-label="Set up my child"
                className="inline-flex rounded-full bg-buddy-grape px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
              >
                Set up my child
              </Link>
              <motion.button
                type="button"
                aria-label="See how it works"
                whileTap={{ scale: 0.96 }}
                onClick={handleScrollToTrust}
                className="rounded-full border border-white/70 bg-white/80 px-6 py-3 text-sm font-semibold text-buddy-cocoa shadow-soft"
              >
                See how it works
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            variants={sectionFade}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-4"
          >
            <SpeechBubble text={message} className="text-center" />
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Mascot3D />
            </motion.div>
          </motion.div>
        </section>

        <section className="space-y-6">
          <motion.h2
            variants={sectionFade}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="font-display text-3xl font-semibold text-buddy-cocoa"
          >
            What your child actually does
          </motion.h2>
          <div className="grid gap-5 md:grid-cols-3">
            {activityCards.map((card, index) => {
              const isActive = activeCard === index;
              return (
                <motion.button
                  key={card.title}
                  type="button"
                  aria-expanded={isActive}
                  onClick={() =>
                    setLockedCard((prev) => (prev === index ? null : index))
                  }
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  whileHover={{ y: -4 }}
                  className={`flex h-full flex-col rounded-3xl border bg-white/85 p-5 text-left shadow-soft transition ${
                    isActive ? "border-buddy-grape/50" : "border-white/70"
                  }`}
                >
                  <span className="font-display text-xl font-semibold text-buddy-cocoa">
                    {card.title}
                  </span>
                  <AnimatePresence mode="wait">
                    {isActive ? (
                      <motion.p
                        key="expanded"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="mt-3 text-sm text-slate-600"
                      >
                        {card.detail}
                      </motion.p>
                    ) : (
                      <motion.p
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-3 text-sm text-slate-500"
                      >
                        Tap to preview.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section id="parents-trust" className="space-y-6">
          <motion.h2
            variants={sectionFade}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="font-display text-3xl font-semibold text-buddy-cocoa"
          >
            Why parents trust Parampara
          </motion.h2>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-6 py-4 text-center text-sm font-semibold text-slate-600 shadow-soft">
            Stylized avatars. No identity cloning. Kid-safe by design.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/70 bg-white/85 p-5 text-sm text-slate-600 shadow-soft">
              English support layer keeps parents confident without interrupting
              the heritage language journey.
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/85 p-5 text-sm text-slate-600 shadow-soft">
              Weekly summaries highlight progress, favorite stories, and new words.
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <motion.h2
            variants={sectionFade}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="font-display text-3xl font-semibold text-buddy-cocoa"
          >
            Try it
          </motion.h2>
          <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card">
            <div className="flex flex-wrap items-center gap-4">
              <SpeechBubble text="Pick your child’s age group" />
              <div className="flex flex-wrap gap-3">
                {Object.keys(ageResponses).map((group) => (
                  <motion.button
                    key={group}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setAgeGroup(group)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold shadow-soft transition ${
                      ageGroup === group
                        ? "bg-buddy-coral text-white"
                        : "bg-white/90 text-slate-600"
                    }`}
                  >
                    {group}
                  </motion.button>
                ))}
              </div>
            </div>
            <AnimatePresence mode="wait">
              {ageGroup ? (
                <motion.div
                  key={ageGroup}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-4 rounded-2xl bg-buddy-mint/60 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {ageResponses[ageGroup]}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-card">
          <h2 className="font-display text-3xl font-semibold text-buddy-cocoa">
            Ready to start?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Takes 30 seconds. No email required.
          </p>
          <Link
            to="/parent-setup"
            aria-label="Create Parent PIN & Kid Code"
            className="mt-6 inline-flex rounded-full bg-buddy-grape px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
          >
            Create Parent PIN & Kid Code
          </Link>
        </section>
      </div>
    </div>
  );
}
