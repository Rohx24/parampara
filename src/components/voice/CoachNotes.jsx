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
        <span className="text-[9px] font-semibold text-slate-400">score</span>
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
  progressChips,
  onRetry,
  onAdvance,
}) {
  const hasResult = score !== null && score !== undefined;
  const actionEmoji = {
    ADVANCE: "🚀",
    PRAISE: "🎉",
    RETRY: "🔄",
    SIMPLIFY: "💡",
    SWITCH_TO_ENGLISH_HELP: "🇬🇧",
  };

  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card space-y-4">
      <h3 className="font-display text-xl font-semibold text-buddy-cocoa">Coach Notes</h3>

      {/* Score ring */}
      <div className="flex items-center gap-4">
        <ScoreRing score={hasResult ? score : null} />
        <div className="flex-1 space-y-1">
          {hasResult ? (
            <>
              <p className="text-sm font-bold text-buddy-cocoa">
                {score >= 80 ? "Excellent! 🌟" : score >= 60 ? "Good effort!" : "Keep practicing!"}
              </p>
              {decision && (
                <p className="text-xs font-semibold text-slate-500">
                  {actionEmoji[decision.action] ?? ""} {decision.action?.replace(/_/g, " ")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">Speak to see your score</p>
          )}
        </div>
      </div>

      {/* Feedback panels */}
      <AnimatePresence>
        {feedback?.positives?.length > 0 && (
          <motion.div
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
        {progressChips?.map((chip) => (
          <span
            key={chip.label}
            className="rounded-full bg-buddy-peach/60 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            {chip.label}: <strong>{chip.value}</strong>
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
        >
          🔄 Try again
        </button>
        {mode === "guided" && (
          <button
            type="button"
            onClick={onAdvance}
            className="rounded-full bg-buddy-grape px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
          >
            Next prompt →
          </button>
        )}
      </div>
    </div>
  );
}
