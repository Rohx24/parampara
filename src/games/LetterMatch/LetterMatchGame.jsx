import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import BashaPlay from "./BashaPlay/BashaPlay.jsx";

const shellVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function LetterMatchGame() {
  return (
    <div className="min-h-screen bg-sparkle px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <motion.div
        variants={shellVariants}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              BhashaBuddy Games
            </p>
            <h1 className="font-display text-3xl font-semibold text-buddy-cocoa">
              Letter Match
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Watch the flash word, then rebuild it with the right letters.
            </p>
          </div>
          <Link
            to="/games"
            className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
          >
            Back to games
          </Link>
        </div>

        <div className="flex w-full justify-center">
          <BashaPlay />
        </div>
      </motion.div>
    </div>
  );
}
