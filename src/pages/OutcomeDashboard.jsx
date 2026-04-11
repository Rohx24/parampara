/**
 * OutcomeDashboard — Learning Outcome Dashboard with Charts
 *
 * Displays measurable learning results for a child using three chart types
 * built entirely with SVG (no external charting library):
 *
 *   1. Line Chart  — Quiz accuracy % over time (per story session)
 *   2. Bar Chart   — Words encountered per session
 *   3. Donut Chart — Language usage distribution
 *
 * Also shows:
 *   - Summary stat cards (total sessions, avg accuracy, total words)
 *   - Top weak words table (from adaptive difficulty data)
 *   - Recent sessions table
 *
 * Data is read from localStorage key: bbashabuddy_session_results_${childId}
 * Written by MakeStory.jsx when a quiz session completes.
 */

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "../context/SessionContext.jsx";
import { fetchWeakItems } from "../lib/adaptiveDifficulty";
import { fetchSessionResults } from "../lib/db";

// ─── Language colour palette ──────────────────────────────────────────────────
const LANG_COLOURS = {
  hindi:   "#7B6CF6",
  tamil:   "#FF7D6B",
  telugu:  "#22c55e",
  kannada: "#f59e0b",
  english: "#06b6d4",
};
const LANG_LABEL = {
  hindi: "Hindi", tamil: "Tamil", telugu: "Telugu",
  kannada: "Kannada", english: "English",
};

// ─── localStorage helpers ─────────────────────────────────────────────────────
const SESSION_KEY = (id) => `bbashabuddy_session_results_${id}`;

/** Read session results for a child from localStorage. */
function readSessionResults(childId) {
  if (!childId || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSION_KEY(childId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


// ─── Pure-SVG chart components ────────────────────────────────────────────────

/**
 * LineChart — Quiz accuracy % over time.
 * viewBox 560×180, padding L=44 R=16 T=12 B=36
 */
function LineChart({ sessions }) {
  const W = 560, H = 180;
  const PAD = { l: 44, r: 16, t: 12, b: 36 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  if (sessions.length < 2) {
    return (
      <div className="flex items-center justify-center h-44 text-slate-400 text-sm font-semibold">
        Complete at least 2 story sessions to see your accuracy chart.
      </div>
    );
  }

  // X: evenly spaced by index; Y: accuracyPct mapped to [chartH, 0]
  const pts = sessions.map((s, i) => ({
    x: PAD.l + (i / (sessions.length - 1)) * chartW,
    y: PAD.t + chartH - (s.accuracyPct / 100) * chartH,
    s,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");

  // Y-axis grid lines at 0 / 25 / 50 / 75 / 100
  const yTicks = [0, 25, 50, 75, 100];

  // Format x-axis date labels (day/month)
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  // Show at most 6 x-axis labels to avoid crowding
  const xLabelInterval = Math.max(1, Math.floor(sessions.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Quiz accuracy over time">
      {/* Y-axis grid & labels */}
      {yTicks.map((tick) => {
        const y = PAD.t + chartH - (tick / 100) * chartH;
        return (
          <g key={tick}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end"
              fontSize="10" fill="#94a3b8" fontFamily="system-ui">
              {tick}%
            </text>
          </g>
        );
      })}

      {/* Area fill under the line */}
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7B6CF6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7B6CF6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={[
          `${pts[0].x},${PAD.t + chartH}`,
          ...pts.map((p) => `${p.x},${p.y}`),
          `${pts[pts.length - 1].x},${PAD.t + chartH}`,
        ].join(" ")}
        fill="url(#lineGrad)"
      />

      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#7B6CF6" strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Data point dots */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#7B6CF6" />
          <circle cx={p.x} cy={p.y} r="2" fill="white" />
        </g>
      ))}

      {/* X-axis date labels */}
      {pts.map((p, i) => {
        if (i % xLabelInterval !== 0 && i !== pts.length - 1) return null;
        return (
          <text key={i} x={p.x} y={H - 4} textAnchor="middle"
            fontSize="9" fill="#94a3b8" fontFamily="system-ui">
            {fmtDate(p.s.ts)}
          </text>
        );
      })}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + chartH}
        stroke="#e2e8f0" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t + chartH} x2={W - PAD.r} y2={PAD.t + chartH}
        stroke="#e2e8f0" strokeWidth="1" />
    </svg>
  );
}

/**
 * BarChart — Words encountered per session (last 10 sessions).
 * viewBox 560×160, padding L=44 R=16 T=12 B=36
 */
function BarChart({ sessions }) {
  const W = 560, H = 160;
  const PAD = { l: 44, r: 16, t: 12, b: 36 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  // Limit to last 10 sessions
  const data = sessions.slice(-10);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-semibold">
        No story sessions yet.
      </div>
    );
  }

  const maxWords = Math.max(...data.map((s) => s.wordsInStory), 50);
  const barW     = Math.min(40, (chartW / data.length) - 6);
  const gap      = (chartW - barW * data.length) / (data.length + 1);

  const yTicks = [0, Math.round(maxWords / 2), maxWords];

  const fmtDate = (iso) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Words per session">
      {/* Y-axis grid */}
      {yTicks.map((tick) => {
        const y = PAD.t + chartH - (tick / maxWords) * chartH;
        return (
          <g key={tick}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end"
              fontSize="10" fill="#94a3b8" fontFamily="system-ui">
              {tick}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((s, i) => {
        const barH = (s.wordsInStory / maxWords) * chartH;
        const x = PAD.l + gap + i * (barW + gap);
        const y = PAD.t + chartH - barH;
        const colour = LANG_COLOURS[s.language] || "#7B6CF6";
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH}
              rx="4" fill={colour} opacity="0.85" />
            {/* Word count label on tall bars */}
            {barH > 24 && (
              <text x={x + barW / 2} y={y + 14} textAnchor="middle"
                fontSize="9" fill="white" fontWeight="700" fontFamily="system-ui">
                {s.wordsInStory}
              </text>
            )}
            {/* Date label */}
            <text x={x + barW / 2} y={H - 4} textAnchor="middle"
              fontSize="9" fill="#94a3b8" fontFamily="system-ui">
              {fmtDate(s.ts)}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + chartH}
        stroke="#e2e8f0" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t + chartH} x2={W - PAD.r} y2={PAD.t + chartH}
        stroke="#e2e8f0" strokeWidth="1" />
    </svg>
  );
}

/**
 * DonutChart — Language distribution.
 * Centred SVG circle with stroke-dasharray arcs, legend below.
 */
function DonutChart({ sessions }) {
  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-semibold">
        No data yet.
      </div>
    );
  }

  // Count sessions per language
  const counts = {};
  for (const s of sessions) {
    counts[s.language] = (counts[s.language] || 0) + 1;
  }
  const total  = sessions.length;
  const langs  = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  // SVG donut parameters
  const CX = 90, CY = 90, R = 65, STROKE = 26;
  const CIRC = 2 * Math.PI * R;

  let offset = 0; // stroke-dashoffset accumulates as we draw each arc

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 180 180" className="w-40 h-40" aria-label="Language distribution">
        {/* Background ring */}
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke="#f1f5f9" strokeWidth={STROKE} />

        {langs.map(([lang, count]) => {
          const pct   = count / total;
          const dash  = CIRC * pct;
          const gap   = CIRC * (1 - pct);
          const colour = LANG_COLOURS[lang] || "#94a3b8";
          // Rotate so each arc starts where the previous ended
          // SVG strokes start at 3-o'clock; rotate -90° to start at 12-o'clock
          const rotation = (offset / CIRC) * 360 - 90;
          const arc = (
            <circle key={lang} cx={CX} cy={CY} r={R} fill="none"
              stroke={colour} strokeWidth={STROKE}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={0}
              transform={`rotate(${rotation} ${CX} ${CY})`}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          );
          offset += dash;
          return arc;
        })}

        {/* Centre label */}
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize="20"
          fontWeight="700" fill="#1e293b" fontFamily="system-ui">
          {total}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="10"
          fill="#94a3b8" fontFamily="system-ui">
          sessions
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {langs.map(([lang, count]) => (
          <div key={lang} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full shrink-0"
              style={{ background: LANG_COLOURS[lang] || "#94a3b8" }} />
            <span className="text-xs font-semibold text-slate-600">
              {LANG_LABEL[lang] || lang} ({Math.round((count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, colour = "#7B6CF6" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-soft"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold" style={{ color: colour }}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Accuracy", "Words", "Languages", "Weak Areas"];

export default function OutcomeDashboard() {
  const { childProfile, session } = useSession();
  const childId  = session?.childId || childProfile?.id || null;
  const nickname = childProfile?.nickname || "Learner";
  const language = (childProfile?.preferred_language || "hindi").toLowerCase();

  const [activeTab,    setActiveTab]    = useState("Overview");
  const [weakItems,    setWeakItems]    = useState([]);
  const [loadingWeak,  setLoadingWeak]  = useState(true);
  const [isDemoData,   setIsDemoData]   = useState(false);
  const [sessions,     setSessions]     = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // ── Load session results: Supabase → localStorage → empty state ────────────
  // NO demo data is ever shown for a logged-in child. If they have no sessions,
  // the dashboard shows a proper empty state encouraging them to do a story session.
  useEffect(() => {
    let alive = true;
    setLoadingSessions(true);

    fetchSessionResults(childId)
      .then((results) => {
        if (!alive) return;
        if (results.length > 0) {
          // Got real data from Supabase or localStorage fallback
          setSessions([...results].sort((a, b) => new Date(a.ts) - new Date(b.ts)));
          setIsDemoData(false);
        } else {
          // Truly no data — check localStorage one more time
          const local = readSessionResults(childId);
          if (local.length > 0) {
            setSessions([...local].sort((a, b) => new Date(a.ts) - new Date(b.ts)));
            setIsDemoData(false);
          } else {
            setSessions([]);
            setIsDemoData(false);
          }
        }
      })
      .catch(() => {
        if (!alive) return;
        // Network error — use localStorage
        const local = readSessionResults(childId);
        setSessions([...local].sort((a, b) => new Date(a.ts) - new Date(b.ts)));
        setIsDemoData(false);
      })
      .finally(() => { if (alive) setLoadingSessions(false); });

    return () => { alive = false; };
  }, [childId]);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!sessions.length) return null;
    const totalSessions  = sessions.length;
    const avgAccuracy    = Math.round(sessions.reduce((s, r) => s + r.accuracyPct, 0) / totalSessions);
    const totalWords     = sessions.reduce((s, r) => s + (r.wordsInStory || 0), 0);
    const bestStreak     = (() => {
      let best = 1, cur = 1;
      for (let i = 1; i < sessions.length; i++) {
        const gap = (new Date(sessions[i].ts) - new Date(sessions[i - 1].ts)) / 86_400_000;
        if (gap <= 1.5) { cur += 1; best = Math.max(best, cur); } else { cur = 1; }
      }
      return best;
    })();
    const topGenre = (() => {
      const c = {};
      sessions.forEach((s) => { c[s.genre] = (c[s.genre] || 0) + 1; });
      return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    })();
    return { totalSessions, avgAccuracy, totalWords, bestStreak, topGenre };
  }, [sessions]);

  // ── Load weak items ─────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoadingWeak(true);
    fetchWeakItems(childId, 10)
      .then((items) => { if (alive) setWeakItems(items); })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingWeak(false); });
    return () => { alive = false; };
  }, [childId]);

  // ── Recent sessions (last 5) ────────────────────────────────────────────────
  const recentSessions = useMemo(() => [...sessions].reverse().slice(0, 5), [sessions]);

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const genreEmoji = { adventure: "🗺️", funny: "😄", moral: "🌟", mystery: "🔍", festival: "🪔" };

  return (
    <div className="min-h-screen bg-sparkle px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Learning Results
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-buddy-cocoa sm:text-4xl">
              {nickname}'s Outcome Dashboard 📊
            </h1>
            {isDemoData && (
              <p className="mt-1 text-xs text-amber-600 font-semibold">
                Showing demo data — complete story sessions to see your real results.
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/make-story"
              className="rounded-full bg-buddy-grape px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:-translate-y-0.5">
              Make a Story ✨
            </Link>
            <Link to="/home"
              className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5">
              Back home
            </Link>
          </div>
        </header>

        {/* Loading state */}
        {loadingSessions && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-5 py-3 shadow-soft mb-6">
            <div className="h-2 w-2 animate-bounce rounded-full bg-buddy-grape" />
            <p className="text-xs font-semibold text-slate-500 animate-pulse">
              Loading your real session data from database…
            </p>
          </div>
        )}

        {/* Empty state — no fake data, just encouragement */}
        {!loadingSessions && sessions.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border-2 border-dashed border-buddy-grape/30 bg-buddy-grape/5 p-10 text-center mb-8">
            <div className="text-5xl mb-3">📊</div>
            <h2 className="font-display text-xl font-bold text-buddy-cocoa">No sessions recorded yet</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              Complete at least one story + quiz session in <strong>Make My Story</strong> to see
              your real accuracy, words read, and language breakdown here.
            </p>
            <Link to="/make-story"
              className="mt-5 inline-block rounded-full bg-buddy-grape px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5">
              Make My First Story ✨
            </Link>
          </motion.div>
        )}

        {/* Stat cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-8">
            <StatCard label="Sessions"      value={stats.totalSessions}     colour="#7B6CF6" />
            <StatCard label="Avg Accuracy"  value={`${stats.avgAccuracy}%`} colour="#FF7D6B"
              sub="quiz comprehension" />
            <StatCard label="Words Read"    value={stats.totalWords.toLocaleString("en-IN")}
              colour="#22c55e" sub="across all sessions" />
            <StatCard label="Best Streak"   value={`${stats.bestStreak}d`}  colour="#f59e0b"
              sub="consecutive days" />
            <StatCard label="Top Genre"     value={genreEmoji[stats.topGenre] || "📖"}
              colour="#06b6d4" sub={stats.topGenre} />
          </div>
        )}

        {/* Tab bar — only when there is real data */}
        {sessions.length > 0 && (
          <div className="flex overflow-x-auto gap-1 mb-6 pb-1">
            {TABS.map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tab
                    ? "bg-buddy-grape text-white shadow-soft"
                    : "bg-white/80 text-slate-600 hover:bg-white"
                }`}>
                {tab}
              </button>
            ))}
          </div>
        )}

        {sessions.length > 0 && <AnimatePresence mode="wait">
          {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
          {activeTab === "Overview" && (
            <motion.div key="overview"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-6">

              {/* Mini line chart preview */}
              <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                  Quiz Accuracy Over Time
                </p>
                <LineChart sessions={sessions} />
              </div>

              {/* Recent sessions table */}
              <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                  Recent Sessions
                </p>
                {recentSessions.length === 0 ? (
                  <p className="text-sm text-slate-400">No sessions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3 pr-4">Language</th>
                          <th className="pb-3 pr-4">Genre</th>
                          <th className="pb-3 pr-4">Words</th>
                          <th className="pb-3">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentSessions.map((s, i) => (
                          <tr key={i} className="text-slate-700">
                            <td className="py-2.5 pr-4 font-semibold text-xs">{fmtDate(s.ts)}</td>
                            <td className="py-2.5 pr-4">
                              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                                style={{ background: LANG_COLOURS[s.language] || "#94a3b8" }}>
                                {LANG_LABEL[s.language] || s.language}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-xs">
                              {genreEmoji[s.genre] || "📖"} {s.genre}
                            </td>
                            <td className="py-2.5 pr-4 font-semibold">{s.wordsInStory}</td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-20 rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full rounded-full"
                                    style={{
                                      width: `${s.accuracyPct}%`,
                                      background: s.accuracyPct >= 70 ? "#22c55e"
                                        : s.accuracyPct >= 40 ? "#f59e0b" : "#FF7D6B",
                                    }} />
                                </div>
                                <span className="text-xs font-bold">{s.accuracyPct}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ACCURACY TAB ──────────────────────────────────────────────────── */}
          {activeTab === "Accuracy" && (
            <motion.div key="accuracy"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card space-y-6">

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                  Quiz Accuracy % — All Sessions
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Each point is one completed story + quiz session. The trend shows how comprehension improves over time.
                </p>
                <LineChart sessions={sessions} />
              </div>

              {/* Accuracy histogram */}
              {sessions.length >= 3 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                    Accuracy Distribution
                  </p>
                  <div className="flex gap-3">
                    {[
                      { label: "0–33%",   range: [0,  33],  colour: "#FF7D6B" },
                      { label: "34–66%",  range: [34, 66],  colour: "#f59e0b" },
                      { label: "67–100%", range: [67, 100], colour: "#22c55e" },
                    ].map(({ label, range, colour }) => {
                      const count = sessions.filter(
                        (s) => s.accuracyPct >= range[0] && s.accuracyPct <= range[1]
                      ).length;
                      const pct = Math.round((count / sessions.length) * 100);
                      return (
                        <div key={label} className="flex-1 rounded-2xl p-4 text-center"
                          style={{ background: colour + "22" }}>
                          <p className="text-2xl font-bold" style={{ color: colour }}>{count}</p>
                          <p className="text-xs font-semibold text-slate-500">{label}</p>
                          <p className="text-xs text-slate-400">{pct}% of sessions</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── WORDS TAB ─────────────────────────────────────────────────────── */}
          {activeTab === "Words" && (
            <motion.div key="words"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card space-y-6">

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                  Story Word Count — Last 10 Sessions
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Colour indicates the language. Longer stories = more vocabulary exposure.
                </p>
                <BarChart sessions={sessions} />
              </div>

              {/* Language colour legend for bar chart */}
              <div className="flex flex-wrap gap-3">
                {Object.entries(LANG_COLOURS).map(([lang, colour]) => {
                  const used = sessions.some((s) => s.language === lang);
                  if (!used) return null;
                  return (
                    <div key={lang} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full" style={{ background: colour }} />
                      <span className="text-xs font-semibold text-slate-600">{LANG_LABEL[lang]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Running total */}
              <div className="rounded-2xl bg-buddy-mint/30 px-5 py-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Cumulative words encountered
                </p>
                <p className="text-3xl font-bold text-buddy-cocoa mt-1">
                  {stats?.totalWords.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Across {stats?.totalSessions} story sessions
                </p>
              </div>
            </motion.div>
          )}

          {/* ── LANGUAGES TAB ─────────────────────────────────────────────────── */}
          {activeTab === "Languages" && (
            <motion.div key="languages"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card">

              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
                Language Usage Breakdown
              </p>
              <DonutChart sessions={sessions} />

              {/* Per-language accuracy comparison */}
              {sessions.length >= 3 && (
                <div className="mt-8 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Avg Accuracy by Language
                  </p>
                  {Object.keys(LANG_COLOURS).map((lang) => {
                    const langSessions = sessions.filter((s) => s.language === lang);
                    if (!langSessions.length) return null;
                    const avg = Math.round(
                      langSessions.reduce((s, r) => s + r.accuracyPct, 0) / langSessions.length
                    );
                    return (
                      <div key={lang} className="flex items-center gap-3">
                        <span className="w-16 text-xs font-semibold text-slate-600 shrink-0">
                          {LANG_LABEL[lang]}
                        </span>
                        <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                          <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${avg}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            style={{ background: LANG_COLOURS[lang] }} />
                        </div>
                        <span className="w-10 text-xs font-bold text-slate-700 text-right shrink-0">
                          {avg}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── WEAK AREAS TAB ─────────────────────────────────────────────────── */}
          {activeTab === "Weak Areas" && (
            <motion.div key="weak"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-6">

              <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                  Words Needing Practice
                </p>
                <p className="text-xs text-slate-500 mb-5">
                  Tracked from voice coaching and quiz sessions. BashaBuddy automatically
                  weaves these into your next generated story for reinforcement.
                </p>

                {loadingWeak ? (
                  <p className="text-sm text-slate-400 animate-pulse">Loading…</p>
                ) : weakItems.length === 0 ? (
                  <div className="rounded-2xl bg-buddy-mint/20 px-5 py-6 text-center">
                    <p className="text-2xl mb-2">🎉</p>
                    <p className="text-sm font-semibold text-slate-600">
                      No weak areas recorded yet!
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Practice voice coaching or complete story quizzes to track your progress.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 pr-4">#</th>
                          <th className="pb-3 pr-4">Word / Item</th>
                          <th className="pb-3 pr-4">Domain</th>
                          <th className="pb-3 pr-4">Mistakes</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {weakItems.map((item, i) => (
                          <tr key={i} className="text-slate-700">
                            <td className="py-2.5 pr-4 text-slate-400 font-semibold text-xs">{i + 1}</td>
                            <td className="py-2.5 pr-4 font-bold text-buddy-cocoa">{item.item}</td>
                            <td className="py-2.5 pr-4">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                item.domain === "speech"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {item.domain}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-1.5">
                                {Array.from({ length: Math.min(item.count, 5) }).map((_, j) => (
                                  <span key={j} className="h-2 w-2 rounded-full bg-buddy-coral" />
                                ))}
                                {item.count > 5 && (
                                  <span className="text-xs text-slate-400">+{item.count - 5}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 text-xs font-semibold text-buddy-grape">
                              Being reinforced ✓
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Adaptive difficulty explanation */}
              <div className="rounded-3xl border border-buddy-grape/20 bg-white/85 p-6 shadow-card">
                <h3 className="font-display text-lg font-semibold text-buddy-cocoa mb-3">
                  How Adaptive Learning Works
                </h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex gap-3">
                    <span className="text-xl shrink-0">📊</span>
                    <p><strong>Track:</strong> Every quiz answer and voice coaching session is
                    recorded. Words the child misses are added to their personal weak-word list.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl shrink-0">🧠</span>
                    <p><strong>Analyse:</strong> Items are ranked by frequency × recency — the
                    most recent, most-repeated mistakes get the highest priority.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl shrink-0">✨</span>
                    <p><strong>Reinforce:</strong> When GPT generates the next story, the top
                    weak words are injected into the prompt so they appear naturally in dialogue
                    and narrative — giving the child repeated, contextual exposure.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>}
      </div>
    </div>
  );
}
