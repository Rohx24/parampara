import React from "react";
import { motion } from "framer-motion";

export default function PromptCard({ prompt, onSpeak, supportMessage, attempts = 0, maxAttempts = 3 }) {
  if (!prompt) return null;

  return (
    <motion.div
      key={prompt.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-card space-y-3"
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Buddy says
          </p>
          {/* Attempt dots */}
          <div className="flex gap-1">
            {Array.from({ length: maxAttempts }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  i < attempts ? "bg-buddy-coral" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          {attempts > 0 && (
            <span className="text-[10px] font-semibold text-slate-400">
              try {attempts + 1}/{maxAttempts}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onSpeak}
          title="Hear the prompt"
          className="flex items-center gap-1.5 rounded-full bg-buddy-mint px-3 py-1.5 text-xs font-bold text-slate-700 shadow-soft transition hover:scale-105 active:scale-95"
        >
          🔊 Hear it
        </button>
      </div>

      {/* Native text — big and readable */}
      <p className="font-display text-2xl font-bold leading-snug text-buddy-cocoa">
        {prompt.nativeText}
      </p>

      {/* English meaning */}
      {prompt.englishMeaning && (
        <p className="text-sm text-slate-500 italic">"{prompt.englishMeaning}"</p>
      )}

      {/* Keywords */}
      {prompt.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-[10px] font-semibold uppercase text-slate-400 self-center">
            Key words:
          </span>
          {prompt.keywords.map((word) => (
            <span
              key={word}
              className="rounded-full bg-buddy-grape/10 px-3 py-1 text-xs font-semibold text-buddy-grape"
            >
              {word}
            </span>
          ))}
        </div>
      )}

      {/* Support message */}
      {supportMessage && (
        <div className="rounded-xl bg-buddy-peach/60 px-3 py-2 text-xs font-semibold text-slate-700">
          💡 {supportMessage}
        </div>
      )}
    </motion.div>
  );
}
