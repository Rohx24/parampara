import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const offset = circ * (1 - pct / 100);
  const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center">
      <svg width={72} height={72} className="-rotate-90">
        <circle cx={36} cy={36} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6} />
        <motion.circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-extrabold text-buddy-cocoa leading-none">{pct}</span>
        <span className="text-[9px] font-semibold text-slate-400">match</span>
      </div>
    </div>
  );
}

// ─── Coach Notes ──────────────────────────────────────────────────────────────

export default function CoachNotes({
  mode,
  score,
  decision,
  feedback,
  chips,
  onRetry,
  onAdvance,
}) {
  const hasResult = score !== null && score !== undefined;
  const nextStep = {
    ADVANCE: "🚀 Moving to the next sentence",
    RETRY_SAME: "🔄 Try this one once more",
    SIMPLIFY: "💡 Practising a shorter version",
    SWITCH_TO_ENGLISH_HELP: "💡 Here's a hint",
  };
  const stayedOnSentence = decision?.action !== "ADVANCE";

  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-card space-y-4 sm:p-5">
      <h3 className="font-display text-xl font-semibold text-buddy-cocoa">Coach Notes</h3>

      {/* Score ring */}
      {mode === "guided" ? (
        <div className="flex items-center gap-4">
          <ScoreRing score={hasResult ? score : null} />
          <div className="flex-1 space-y-1">
            {hasResult ? (
              <>
                <p className="text-sm font-bold text-buddy-cocoa">
                  {score >= 80 ? "Very close match 🌟" : score >= 60 ? "Good match" : "Keep practising"}
                </p>
                {decision && (
                  <p className="text-xs font-semibold text-slate-500">{nextStep[decision.action]}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400">Say the sentence to see your match</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Free talk has no score. Buddy answers what you said.</p>
      )}

      {/* Feedback panels */}
      <AnimatePresence>
        {feedback?.heard && (
          <motion.div
            key="heard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
              Buddy heard
            </p>
            <p className="text-xs font-semibold text-slate-700">{feedback.heard}</p>
          </motion.div>
        )}

        {feedback?.positives?.length > 0 && (
          <motion.div
            key="positives"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-1.5">
              What went well ✓
            </p>
            <ul className="space-y-1">
              {feedback.positives.map((item, i) => (
                <li key={i} className="text-xs text-emerald-700 flex gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {feedback?.improvement && (
          <motion.div
            key="improvement"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">
              One thing to try
            </p>
            <p className="text-xs text-amber-700">{feedback.improvement}</p>
          </motion.div>
        )}

        {feedback?.retryPrompt && (
          <motion.div
            key="retry"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-buddy-sky/40 px-4 py-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
              Try saying
            </p>
            <p className="text-xs font-semibold text-slate-700">{feedback.retryPrompt}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress chips */}
      <div className="flex flex-wrap gap-2">
        {chips?.map((chip) => (
          <span
            key={chip.label}
            className="rounded-full bg-buddy-peach/60 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            {chip.label}: <strong>{chip.value}</strong>
          </span>
        ))}
      </div>

      {mode === "guided" && (
        <p className="text-[10px] leading-snug text-slate-400">
          The match compares the words Buddy heard with the sentence. It can't judge how the sounds were made.
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        {stayedOnSentence && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5 sm:min-h-0"
          >
            🔄 Try again
          </button>
        )}
        {mode === "guided" && (
          <button
            type="button"
            onClick={onAdvance}
            className="min-h-11 rounded-full bg-buddy-grape px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:-translate-y-0.5 sm:min-h-0"
          >
            Next prompt →
          </button>
        )}
      </div>
    </div>
  );
}
