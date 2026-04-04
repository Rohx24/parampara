import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Mascot3D from "../components/Mascot3D.jsx";
import { useSession } from "../context/SessionContext.jsx";

const games = [
  {
    id: "letter-match",
    title: "Letter Match",
    description: "Flash a word, then rebuild it letter by letter with the right tiles.",
    to: "/games/letter-match",
    status: "Ready",
    emoji: "🔤",
    color: "bg-buddy-mint",
  },
  {
    id: "flash-cards",
    title: "Flash Cards",
    description: "See a word in your language — quickly pick the right English meaning from 4 choices!",
    to: "/games/flash-cards",
    status: "Ready",
    emoji: "⚡",
    color: "bg-buddy-peach",
  },
  {
    id: "word-scramble",
    title: "Word Scramble",
    description: "Unscramble jumbled English letters using the native language word as your clue.",
    to: "/games/word-scramble",
    status: "Ready",
    emoji: "🔀",
    color: "bg-buddy-sky",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Games() {
  const { childProfile } = useSession();
  const nickname = childProfile?.nickname || "Buddy";

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-16 top-16 h-40 w-40 rounded-full bg-buddy-peach/60 blur-3xl" />
      <div className="pointer-events-none absolute right-6 top-20 h-32 w-32 rounded-full bg-buddy-mint/60 blur-3xl" />

      <main className="relative z-10 px-6 pb-20 pt-12 sm:px-10 lg:px-16">
        {/* Back home */}
        <div className="mb-6 flex justify-end">
          <Link
            to="/home"
            className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
          >
            ← Back home
          </Link>
        </div>

        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <motion.div variants={item} className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Games
            </p>
            <h1 className="font-display text-4xl font-semibold text-buddy-cocoa">
              Play, learn, and smile.
            </h1>
            <p className="max-w-xl text-base text-slate-600">
              Hi {nickname}! Pick a quick game to warm up your language skills.
            </p>
          </motion.div>
          <motion.div
            variants={item}
            className="flex flex-col items-center gap-3"
          >
            <Mascot3D />
            <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft">
              Buddy says: try one round to start!
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-10 grid gap-6 md:grid-cols-2"
        >
          {games.map((game) => (
            <motion.div
              key={game.id}
              variants={item}
              whileHover={{ y: -6 }}
              className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-2xl ${game.color ?? "bg-buddy-mint"} p-3 text-2xl`}>
                  {game.emoji ?? <GamepadIcon />}
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {game.status}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-buddy-cocoa">
                {game.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{game.description}</p>
              <Link
                to={game.to}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-buddy-grape px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
              >
                Play now →
              </Link>
            </motion.div>
          ))}
        </motion.section>
      </main>
    </div>
  );
}

function GamepadIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none">
      <rect
        x="10"
        y="18"
        width="44"
        height="28"
        rx="10"
        fill="#CBE9FF"
        stroke="#7B6CF6"
        strokeWidth="2"
      />
      <path d="M24 32h-6" stroke="#7B6CF6" strokeWidth="3" strokeLinecap="round" />
      <path d="M21 29v6" stroke="#7B6CF6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="30" r="2.5" fill="#FF7D6B" />
      <circle cx="46" cy="34" r="2.5" fill="#FFB4A3" />
    </svg>
  );
}
