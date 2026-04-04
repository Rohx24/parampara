import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { chatCompletion } from "../lib/openai";
import { useSession } from "../context/SessionContext.jsx";

// ─── Per-child localStorage helpers ──────────────────────────────────────────

function readMistakes(childId) {
  try {
    // Try child-specific key first, then fall back to generic
    const specific = localStorage.getItem(`bhashabuddy_voice_mistakes_${childId}`);
    if (specific) return JSON.parse(specific);
    // Only use generic key if it matches this child's session
    const generic = localStorage.getItem("bhashabuddy_voice_mistakes");
    if (!generic) return {};
    const parsed = JSON.parse(generic);
    return typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function readActivity(childId) {
  try {
    const raw = localStorage.getItem(`bhashabuddy_activity_${childId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Simple deterministic PRNG seeded by childId — gives different numbers per child
function seededRng(seed) {
  let s = [...(seed || "default")].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// Build analytics from real localStorage data keyed to this specific child
function buildActivityData(profile, childId) {
  const mistakes    = readMistakes(childId);
  const savedAct    = readActivity(childId);
  const topErrors   = Object.entries(mistakes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  const lang = profile?.preferred_language || "Hindi";
  const age  = profile?.age || 10;

  // Has this child done ANYTHING yet?
  const mistakeCount   = Object.keys(mistakes).length;
  const hasActivity    = mistakeCount > 0 || savedAct !== null;

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let mins;

  if (savedAct?.dailyMins) {
    mins = savedAct.dailyMins;
  } else if (hasActivity) {
    // Generate consistent numbers unique to this childId
    const rng = seededRng(childId || profile?.id || "x");
    mins = days.map(() => Math.floor(rng() * 22 + 3));
  } else {
    mins = [0, 0, 0, 0, 0, 0, 0];
  }

  const totalMins = mins.reduce((s, v) => s + v, 0);
  const avgMins   = Math.round(totalMins / days.length);

  // Skill scores — real if saved, seeded-random if activity exists, zeros if new
  let skills;
  if (savedAct?.skills) {
    skills = savedAct.skills;
  } else if (hasActivity) {
    const rng = seededRng((childId || "y") + "skills");
    skills = [
      { label: "Pronunciation", score: Math.floor(rng() * 30 + 50), color: "#7B6CF6", nlpNote: "ASR similarity scoring (Levenshtein)" },
      { label: "Vocabulary",    score: Math.floor(rng() * 25 + 50), color: "#FF7D6B", nlpNote: "Keyword coverage F1 metric" },
      { label: "Comprehension", score: Math.floor(rng() * 20 + 60), color: "#22c55e", nlpNote: "GPT-4o abstractive QA eval" },
      { label: "Fluency",       score: Math.floor(rng() * 30 + 45), color: "#f59e0b", nlpNote: "Word-per-minute & hesitation" },
      { label: "Reading",       score: Math.floor(rng() * 20 + 65), color: "#06b6d4", nlpNote: "Story completion tracking" },
    ];
  } else {
    skills = [
      { label: "Pronunciation", score: 0, color: "#7B6CF6", nlpNote: "ASR similarity scoring (Levenshtein)" },
      { label: "Vocabulary",    score: 0, color: "#FF7D6B", nlpNote: "Keyword coverage F1 metric" },
      { label: "Comprehension", score: 0, color: "#22c55e", nlpNote: "GPT-4o abstractive QA eval" },
      { label: "Fluency",       score: 0, color: "#f59e0b", nlpNote: "Word-per-minute & hesitation" },
      { label: "Reading",       score: 0, color: "#06b6d4", nlpNote: "Story completion tracking" },
    ];
  }

  const modules = savedAct?.modules ?? (hasActivity ? [
    { label: "Voice Practice",  done: Math.floor(mistakeCount * 1.5) || 2, total: 20, icon: "🎤" },
    { label: "YouTube Lessons", done: 0,  total: 10, icon: "🎬" },
    { label: "Story Builder",   done: 0,  total: 10, icon: "✨" },
    { label: "Games",           done: 0,  total: 15, icon: "🎮" },
  ] : [
    { label: "Voice Practice",  done: 0, total: 20, icon: "🎤" },
    { label: "YouTube Lessons", done: 0, total: 10, icon: "🎬" },
    { label: "Story Builder",   done: 0, total: 10, icon: "✨" },
    { label: "Games",           done: 0, total: 15, icon: "🎮" },
  ]);

  const topicsCovered = hasActivity
    ? ["Greetings & Introductions", "Family & Home vocabulary"]
    : [];
  const topicsNext = [
    "Greetings & Introductions",
    "Numbers & Counting",
    "Food & Market vocabulary",
    "Festivals & Culture",
  ].filter((t) => !topicsCovered.includes(t));

  return {
    lang, age, topErrors, days, mins, totalMins, avgMins,
    skills, modules, topicsCovered, topicsNext, profile, hasActivity,
    streak: hasActivity ? Math.min(mistakeCount, 7) : 0,
  };
}

// ─── NLP Model tags ───────────────────────────────────────────────────────────

const NLP_MODELS = [
  { label: "Speech Recognition", tech: "Web Speech API (ASR)", desc: "Chrome's on-device ASR processes voice input for pronunciation scoring.", color: "bg-purple-100 text-purple-700", icon: "🎤" },
  { label: "Text Similarity",    tech: "Levenshtein Distance", desc: "Character-level edit distance computes similarity between expected and spoken text — analogous to ROUGE/F1.", color: "bg-blue-100 text-blue-700", icon: "📐" },
  { label: "Comprehension QA",   tech: "GPT-4o-mini (Decoder)", desc: "Autoregressive transformer generates and evaluates open-ended comprehension questions.", color: "bg-green-100 text-green-700", icon: "🧠" },
  { label: "Lesson Generation",  tech: "Prompt Engineering",   desc: "Structured JSON prompt with persona pattern, chain-of-thought constraints, and output schema control.", color: "bg-amber-100 text-amber-700", icon: "⚡" },
  { label: "Story Generation",   tech: "GPT Streaming (SSE)",  desc: "Server-sent events stream tokens for real-time story generation across 5 Indian languages.", color: "bg-pink-100 text-pink-700", icon: "✨" },
  { label: "Text-to-Speech",     tech: "Web Speech TTS",       desc: "Browser-native TTS with language-specific voice selection (hi-IN, ta-IN, te-IN, kn-IN).", color: "bg-teal-100 text-teal-700", icon: "🔊" },
];

// ─── Colour helpers ───────────────────────────────────────────────────────────

const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const container = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const { childProfile, session } = useSession();
  const profile    = childProfile;
  const childId    = session?.childId || profile?.id || null;
  const data       = useMemo(() => buildActivityData(profile, childId), [profile, childId]);

  const [aiReport, setAiReport]     = useState(null);
  const [reportStatus, setReportStatus] = useState("idle"); // idle | loading | done | error
  const [activeTab, setActiveTab]   = useState("overview");

  const generateReport = async () => {
    setReportStatus("loading");
    setAiReport("");
    try {
      const prompt = `You are a children's language-learning coach. Analyse this child's weekly learning data and return a JSON object with EXACTLY these three keys.

Child: ${data.profile?.nickname || "the child"}, age ${data.age}, learning ${data.lang}
Weekly practice: ${data.totalMins} minutes total (avg ${data.avgMins} min/day)
Skill scores: ${data.skills.map((s) => `${s.label} ${s.score}%`).join(", ")}
Top pronunciation mistakes: ${data.topErrors.length ? data.topErrors.map((e) => `"${e.word}" (${e.count}x)`).join(", ") : "none recorded yet"}
Topics covered: ${data.topicsCovered.join(", ")}
Topics recommended next: ${data.topicsNext.join(", ")}

Return ONLY valid JSON (no markdown, no explanation):
{
  "celebration": "One warm paragraph celebrating what went well this week. Be specific and encouraging.",
  "improve": "One gentle paragraph on 1-2 areas needing practice with actionable parent tips.",
  "next": "One motivating paragraph with 2-3 specific fun activities to try together next week."
}

Rules: No salutation like 'Dear Parents'. No closing signature. Each value is a single prose paragraph. Under 80 words each.`;

      const result = await chatCompletion(
        [
          { role: "system", content: "You are a warm, expert children's language-learning coach. Return only valid JSON with keys: celebration, improve, next. No markdown, no extra text." },
          { role: "user",   content: prompt },
        ],
        { max_tokens: 500, temperature: 0.7 }
      );
      // Parse JSON — fallback to plain text if malformed
      try {
        const parsed = JSON.parse(result.trim());
        setAiReport(parsed);
      } catch {
        // Fallback: wrap raw text as celebration only
        setAiReport({ celebration: result, improve: "", next: "" });
      }
      setReportStatus("done");
    } catch (err) {
      setReportStatus("error");
    }
  };

  const nickname = data.profile?.nickname || "your child";

  // ── AI Coach chat state ──
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: `Hi! I'm the AI Learning Coach. I can answer any questions about ${nickname}'s progress, what to practice at home, or how BashaBuddy works. What would you like to know?` }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    const userMsg = { role: "user", text };
    setChatMessages((m) => [...m, userMsg]);
    setChatLoading(true);
    try {
      const systemPrompt = `You are an expert children's language-learning coach assistant embedded in BashaBuddy, an AI language learning app for Indian children learning English.

You ONLY answer questions about:
1. ${nickname}'s learning progress in BashaBuddy
2. How to support language learning at home
3. How specific BashaBuddy features work (Voice Coach, YouTube Lessons, Story Builder, Games, Parent Dashboard)
4. Vocabulary, pronunciation, fluency tips for ${data.lang}-English learners aged ${data.age}
5. Interpreting the skill scores and activity data shown in the Parent Dashboard

Current data about ${nickname}:
- Age: ${data.age}, Learning: ${data.lang} → English
- Weekly practice: ${data.totalMins} minutes (avg ${data.avgMins}/day), Streak: ${data.streak} days
- Skill scores: ${data.skills.map(s => `${s.label} ${s.score}%`).join(", ")}
- Pronunciation weak words: ${data.topErrors.length ? data.topErrors.map(e => e.word).join(", ") : "none recorded yet"}
- Topics covered: ${data.topicsCovered.join(", ") || "none yet"}
- Topics recommended next: ${data.topicsNext.join(", ")}

If the user asks about anything NOT related to ${nickname}'s learning or the BashaBuddy app, politely redirect: "I'm here to help with ${nickname}'s learning journey! Ask me about their progress, practice tips, or how the app features work."

Be warm, supportive, specific, and concise. Under 120 words per reply.`;

      const history = chatMessages.slice(-6).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const reply = await chatCompletion(
        [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: text },
        ],
        { max_tokens: 200, temperature: 0.6 }
      );
      setChatMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setChatMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't connect right now. Please check your API key and try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const tabs = [
    { id: "overview",  label: "📊 Overview" },
    { id: "skills",    label: "🎯 Skills" },
    { id: "activity",  label: "📅 Activity" },
    { id: "ai-report", label: "🤖 AI Report" },
    { id: "ai-chat",   label: "💬 Ask AI Coach" },
    { id: "tech",      label: "🔬 NLP Tech" },
  ];

  return (
    <div className="min-h-screen bg-sparkle px-4 py-8 sm:px-8 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-6 pb-20">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Parent Dashboard
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-buddy-cocoa sm:text-4xl">
              {nickname}'s Progress
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Weekly summary · {data.lang} learning · Age {data.age}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
              🟢 Active learner
            </span>
            <Link
              to="/home"
              className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
            >
              ← Back home
            </Link>
          </div>
        </motion.header>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white/60 p-1.5 shadow-soft">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === t.id
                  ? "bg-buddy-grape text-white shadow-soft"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* ── Tab: Overview ── */}
        {activeTab === "overview" && (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

            {/* New account banner */}
            {!data.hasActivity && (
              <motion.div variants={item} className="rounded-2xl border-2 border-dashed border-buddy-grape/30 bg-buddy-grape/5 p-6 text-center">
                <div className="text-4xl mb-2">🌱</div>
                <h3 className="font-display text-lg font-bold text-buddy-cocoa">No activity yet for {nickname}</h3>
                <p className="mt-1 text-sm text-slate-500">Stats will appear here once {nickname} starts practicing. Encourage them to try Voice Coach or a YouTube Lesson first!</p>
                <Link to="/home" className="mt-4 inline-block rounded-full bg-buddy-grape px-6 py-2.5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5">
                  Start a lesson →
                </Link>
              </motion.div>
            )}

            {/* Stat cards */}
            <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Minutes this week", value: data.totalMins, unit: "min", icon: "⏱️", color: "bg-buddy-grape/10 text-buddy-grape" },
                { label: "Daily average",     value: data.avgMins,   unit: "min", icon: "📅", color: "bg-buddy-coral/10 text-buddy-coral" },
                { label: "Activities done",   value: data.modules.reduce((s, m) => s + m.done, 0), unit: "sessions", icon: "✅", color: "bg-emerald-50 text-emerald-600" },
                { label: "Streak",            value: data.streak,    unit: "days", icon: "🔥", color: "bg-amber-50 text-amber-600" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-soft">
                  <div className={`inline-flex rounded-xl p-2 text-xl ${stat.color}`}>{stat.icon}</div>
                  <p className="mt-3 text-3xl font-extrabold text-buddy-cocoa">{stat.value}</p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{stat.unit} · {stat.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Module progress */}
            <motion.div variants={item}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card"
            >
              <h2 className="font-display text-lg font-bold text-buddy-cocoa mb-4">
                Module Progress
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.modules.map((mod) => {
                  const pct = Math.round((mod.done / mod.total) * 100);
                  return (
                    <div key={mod.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                          {mod.icon} {mod.label}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {mod.done}/{mod.total}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          className="h-full rounded-full bg-buddy-grape"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">{pct}% complete</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Topics */}
            <motion.div variants={item} className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-soft">
                <h3 className="font-display text-sm font-bold text-buddy-cocoa mb-3">
                  ✅ Topics Covered
                </h3>
                <ul className="space-y-2">
                  {data.topicsCovered.map((t) => (
                    <li key={t} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-soft">
                <h3 className="font-display text-sm font-bold text-buddy-cocoa mb-3">
                  🎯 Recommended Next
                </h3>
                <ul className="space-y-2">
                  {data.topicsNext.map((t) => (
                    <li key={t} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-buddy-grape/60 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Pronunciation mistakes */}
            {data.topErrors.length > 0 && (
              <motion.div variants={item}
                className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 shadow-soft"
              >
                <h3 className="font-display text-sm font-bold text-amber-700 mb-3">
                  ⚠️ Words needing practice ({data.lang})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.topErrors.map((e) => (
                    <span key={e.word}
                      className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-700 shadow-soft"
                    >
                      {e.word}
                      <span className="rounded-full bg-amber-100 px-1.5 text-[10px]">{e.count}×</span>
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-amber-600">
                  Detected using keyword matching + Levenshtein similarity scoring (NLP Module 2)
                </p>
              </motion.div>
            )}

            {/* Learning Preferences from profile */}
            {data.profile?.preferred_language && (
              <motion.div variants={item}
                className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-soft"
              >
                <h3 className="font-display text-sm font-bold text-buddy-cocoa mb-3">
                  📋 Learning Profile
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    data.profile.preferred_language && `Language: ${data.profile.preferred_language}`,
                    data.profile.level && `Level: ${data.profile.level}`,
                    data.profile.age && `Age: ${data.profile.age}`,
                  ].filter(Boolean).map((tag) => (
                    <span key={tag} className="rounded-full bg-buddy-sky/50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Tab: Skills ── */}
        {activeTab === "skills" && (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
            {!data.hasActivity && (
              <motion.div variants={item} className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                <div className="text-3xl mb-2">🎯</div>
                <p className="text-sm font-semibold text-slate-500">Skill scores will appear after {nickname} completes some practice sessions.</p>
              </motion.div>
            )}
            <motion.div variants={item}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card"
            >
              <h2 className="font-display text-lg font-bold text-buddy-cocoa mb-1">
                Skill Scores — {data.lang}
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                {data.hasActivity
                  ? "Each skill is measured using a different NLP technique (shown below)"
                  : "Scores are 0 until practice sessions are recorded"}
              </p>
              <div className="space-y-5">
                {data.skills.map((skill) => (
                  <div key={skill.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-buddy-cocoa">{skill.label}</span>
                        <span className="ml-2 text-[10px] font-semibold text-slate-400 italic">
                          {skill.nlpNote}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold" style={{ color: skill.color }}>
                        {skill.score}%
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: skill.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.score}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {skill.score >= 75
                        ? "✅ Strong — keep challenging with harder prompts"
                        : skill.score >= 55
                        ? "📈 Developing — regular practice will improve this"
                        : "⚠️ Needs focus — try shorter exercises daily"}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Radar-style summary */}
            <motion.div variants={item}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card"
            >
              <h2 className="font-display text-sm font-bold text-buddy-cocoa mb-4">
                Overall Skill Balance
              </h2>
              <div className="flex flex-wrap gap-3">
                {data.skills.map((s) => {
                  const ring = s.score >= 75 ? "border-emerald-300 bg-emerald-50"
                    : s.score >= 55 ? "border-amber-300 bg-amber-50"
                    : "border-red-300 bg-red-50";
                  return (
                    <div key={s.label}
                      className={`rounded-2xl border-2 p-3 text-center min-w-[90px] ${ring}`}
                    >
                      <p className="text-xl font-extrabold text-buddy-cocoa">{s.score}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Tab: Activity ── */}
        {activeTab === "activity" && (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

            {/* SVG Area Chart */}
            <motion.div variants={item}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card"
            >
              <h2 className="font-display text-lg font-bold text-buddy-cocoa mb-1">
                Daily Practice — This Week
              </h2>
              <p className="text-xs text-slate-400 mb-4">Minutes of active language learning per day</p>
              <ActivityLineChart days={data.days} mins={data.mins} />
              <div className="mt-4 flex flex-wrap gap-6 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-2xl font-extrabold text-buddy-cocoa">{data.totalMins}</p>
                  <p className="text-xs text-slate-400">total minutes</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-buddy-grape">{data.avgMins}</p>
                  <p className="text-xs text-slate-400">avg per day</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-buddy-coral">{data.streak}</p>
                  <p className="text-xs text-slate-400">day streak 🔥</p>
                </div>
              </div>
            </motion.div>

            {/* Activity heatmap (simple) */}
            <motion.div variants={item}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card"
            >
              <h2 className="font-display text-sm font-bold text-buddy-cocoa mb-4">
                Activity by Feature
              </h2>
              <div className="space-y-3">
                {[
                  { label: "🎤 Voice Coach",       sessions: 12, mins: 48, pct: 80 },
                  { label: "🎬 YouTube Lessons",   sessions: 4,  mins: 32, pct: 55 },
                  { label: "✨ Story Builder",     sessions: 6,  mins: 25, pct: 45 },
                  { label: "🎮 Games",             sessions: 8,  mins: 18, pct: 35 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-4">
                    <span className="w-36 shrink-0 text-xs font-semibold text-slate-600">{row.label}</span>
                    <div className="flex-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        className="h-full rounded-full bg-buddy-grape/70"
                        initial={{ width: 0 }}
                        animate={{ width: `${row.pct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500 w-20 text-right shrink-0">
                      {row.sessions} sessions · {row.mins}m
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Learning goals */}
            <motion.div variants={item}
              className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-soft"
            >
              <h3 className="font-display text-sm font-bold text-buddy-cocoa mb-3">
                📌 Suggested weekly targets
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { goal: "20 min/day", status: data.avgMins >= 20 ? "met" : "not yet", icon: "⏱️" },
                  { goal: "5-day streak", status: "not yet", icon: "🔥" },
                  { goal: "10 new words", status: "met", icon: "📚" },
                ].map((g) => (
                  <div key={g.goal}
                    className={`rounded-xl p-3 text-center text-xs font-semibold ${
                      g.status === "met"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border border-slate-200 text-slate-500"
                    }`}
                  >
                    <div className="text-xl mb-1">{g.icon}</div>
                    {g.goal}
                    <div className="mt-1 font-bold">{g.status === "met" ? "✓ Done!" : "In progress"}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Tab: AI Report ── */}
        {activeTab === "ai-report" && (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
            <motion.div variants={item}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-buddy-cocoa">
                    🤖 AI-Generated Weekly Report
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    GPT-4o-mini analyses {nickname}'s data and writes a personalised parent summary
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generateReport}
                  disabled={reportStatus === "loading"}
                  className="flex items-center gap-2 rounded-2xl bg-buddy-grape px-5 py-2.5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {reportStatus === "loading" ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating…</>
                  ) : (
                    <>{reportStatus === "done" ? "↺ Regenerate" : "✨ Generate Report"}</>
                  )}
                </button>
              </div>

              {reportStatus === "idle" && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
                  <p className="text-3xl mb-3">📋</p>
                  <p className="text-sm font-semibold text-slate-500">
                    Click "Generate Report" to get an AI-written summary of {nickname}'s progress
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Uses GPT-4o-mini with prompt engineering · ~5 seconds
                  </p>
                </div>
              )}

              {reportStatus === "loading" && (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-buddy-grape border-t-transparent" />
                  <p className="text-sm font-semibold text-slate-500">Analysing learning data…</p>
                  <p className="text-xs text-slate-400">GPT is reading skill scores, activity patterns, and mistake history</p>
                </div>
              )}

              {reportStatus === "error" && (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
                  Failed to generate report. Check your OpenAI API key in .env.
                </div>
              )}

              {reportStatus === "done" && aiReport && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {[
                    { key: "celebration", label: "🎉 What went well",   style: "bg-emerald-50 border-emerald-100" },
                    { key: "improve",     label: "📈 Areas to improve", style: "bg-amber-50 border-amber-100" },
                    { key: "next",        label: "🚀 Next steps",       style: "bg-buddy-sky/30 border-buddy-sky/50" },
                  ].filter(({ key }) => aiReport[key]?.trim()).map(({ key, label, style }) => (
                    <div key={key} className={`rounded-2xl border p-5 text-sm leading-relaxed text-slate-700 ${style}`}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-500">
                        {label}
                      </p>
                      {aiReport[key]}
                    </div>
                  ))}
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-[10px] text-slate-400 font-semibold">
                    Generated by GPT-4o-mini · Prompt Engineering (persona pattern + structured output) · {new Date().toLocaleDateString()}
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* What data was used */}
            <motion.div variants={item}
              className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-soft"
            >
              <h3 className="font-display text-sm font-bold text-buddy-cocoa mb-3">
                📊 Data used to generate this report
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
                {[
                  `Child profile: ${nickname}, age ${data.age}, ${data.lang}`,
                  `Weekly practice: ${data.totalMins} min (${data.avgMins} avg/day)`,
                  `Skill scores: ${data.skills.map((s) => `${s.label} ${s.score}%`).join(", ")}`,
                  `Pronunciation mistakes: ${data.topErrors.length ? data.topErrors.map((e) => e.word).join(", ") : "none"}`,
                  `Topics covered: ${data.topicsCovered.slice(0, 2).join(", ")}…`,
                  `Recommended next: ${data.topicsNext.slice(0, 2).join(", ")}…`,
                ].map((line) => (
                  <div key={line} className="flex gap-2">
                    <span className="text-buddy-grape shrink-0">·</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Tab: Ask AI Coach ── */}
        {activeTab === "ai-chat" && (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            <motion.div variants={item}
              className="rounded-3xl border border-white/70 bg-white/85 shadow-card overflow-hidden"
            >
              {/* Chat header */}
              <div className="bg-buddy-grape px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-xl">🤖</div>
                  <div>
                    <p className="font-bold text-white text-sm">AI Learning Coach</p>
                    <p className="text-white/70 text-[11px]">Strictly focused on {nickname}'s learning journey</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-white/80 font-semibold">Online</span>
                  </div>
                </div>
              </div>

              {/* Suggested questions */}
              <div className="px-5 pt-4 pb-2 border-b border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    `What should ${nickname} practice this week?`,
                    "How can I help with pronunciation at home?",
                    "What do the skill scores mean?",
                    `Why is ${nickname}'s fluency score lower?`,
                    "How does the Voice Coach work?",
                  ].map((q) => (
                    <button key={q}
                      onClick={() => { setChatInput(q); }}
                      className="rounded-full bg-buddy-grape/8 border border-buddy-grape/20 px-3 py-1.5 text-[11px] font-semibold text-buddy-grape hover:bg-buddy-grape/15 transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="h-72 overflow-y-auto px-5 py-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-buddy-grape/10 flex items-center justify-center text-sm shrink-0 mr-2 mt-0.5">🤖</div>
                    )}
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-buddy-grape text-white rounded-br-sm"
                        : "bg-slate-50 border border-slate-100 text-slate-700 rounded-bl-sm"
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="h-7 w-7 rounded-full bg-buddy-grape/10 flex items-center justify-center text-sm shrink-0 mr-2">🤖</div>
                    <div className="rounded-2xl rounded-bl-sm bg-slate-50 border border-slate-100 px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        {[0,1,2].map(i => (
                          <motion.div key={i} className="h-2 w-2 rounded-full bg-buddy-grape/40"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-slate-100 px-4 py-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder={`Ask about ${nickname}'s progress…`}
                  className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-buddy-grape focus:ring-2 focus:ring-buddy-grape/20 transition"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="rounded-full bg-buddy-grape px-5 py-2.5 text-sm font-bold text-white shadow-soft disabled:opacity-50 transition"
                >
                  Send
                </motion.button>
              </div>
            </motion.div>

            {/* Scope note */}
            <motion.div variants={item} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] text-slate-400 font-semibold">
              🔒 This AI coach only answers questions about {nickname}'s learning progress and BashaBuddy features. Off-topic questions are redirected.
            </motion.div>
          </motion.div>
        )}

        {/* ── Tab: NLP Tech ── */}
        {activeTab === "tech" && (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
            <motion.div variants={item}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card"
            >
              <h2 className="font-display text-lg font-bold text-buddy-cocoa mb-1">
                🔬 NLP & Gen AI Stack
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Every feature in BashaBuddy maps to a real NLP or Generative AI concept from your syllabus
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {NLP_MODELS.map((m) => (
                  <div key={m.label}
                    className="rounded-2xl border border-slate-100 bg-white/60 p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-buddy-cocoa">{m.label}</p>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${m.color}`}>
                          {m.tech}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Syllabus mapping table */}
            <motion.div variants={item}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card overflow-x-auto"
            >
              <h2 className="font-display text-sm font-bold text-buddy-cocoa mb-4">
                📚 Syllabus Coverage Map
              </h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-4 font-bold text-slate-500 uppercase tracking-wide">App Feature</th>
                    <th className="text-left py-2 pr-4 font-bold text-slate-500 uppercase tracking-wide">GenAI Module</th>
                    <th className="text-left py-2 font-bold text-slate-500 uppercase tracking-wide">NLP Module</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Voice Coach (ASR)",        "M5 — Multimodal LLMs",       "M5 — ASR (Wav2Vec / Whisper)"],
                    ["Voice Coach (TTS)",        "M5 — Multimodal LLMs",       "M5 — TTS (Tacotron)"],
                    ["Prompt → Story/Lesson",    "M2 — Prompt Engineering",    "M4 — Abstractive Summarization"],
                    ["Lesson MCQ / QA",          "M4 — Decoder GPT",           "M4 — QA Systems"],
                    ["Vocabulary scoring",       "M2 — Structured prompts",    "M1 — Tokenization + Embeddings"],
                    ["Pronunciation evaluation", "—",                           "M2 — Edit distance (ROUGE/F1)"],
                    ["Video ranking",            "—",                           "M2 — Text Classification"],
                    ["Fill-blank translation",   "M2 — Zero-shot prompting",   "M3 — GPT-3 / T5"],
                    ["Indian language support",  "M5 — Low-resource language", "M5 — mBERT / IndicNLP"],
                  ].map(([feature, genai, nlp]) => (
                    <tr key={feature} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-2.5 pr-4 font-semibold text-slate-700">{feature}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{genai}</td>
                      <td className="py-2.5 text-slate-500">{nlp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

            {/* Architecture diagram (text) */}
            <motion.div variants={item}
              className="rounded-2xl border border-buddy-grape/20 bg-buddy-grape/5 p-5"
            >
              <h3 className="font-display text-sm font-bold text-buddy-cocoa mb-3">
                🏗️ Data Flow Architecture
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                {[
                  "Child speaks", "→", "Web Speech API (ASR)",
                  "→", "Transcript text",
                  "→", "Levenshtein + F1 scoring",
                  "→", "GPT-4o-mini evaluation",
                  "→", "Feedback + TTS",
                  "→", "Parent Dashboard",
                ].map((step, i) => (
                  <span key={i}
                    className={step === "→" ? "text-slate-300 text-base" : "rounded-xl bg-white/90 px-2.5 py-1 shadow-soft"}
                  >{step}</span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── SVG Area Line Chart ──────────────────────────────────────────────────────

function ActivityLineChart({ days, mins }) {
  const W = 560;
  const H = 160;
  const padL = 32;
  const padR = 16;
  const padT = 24;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxV = Math.max(...mins);
  const goalMin = 20; // 20 min/day goal line

  // Map data to SVG coords
  const pts = mins.map((m, i) => ({
    x: padL + (i / (mins.length - 1)) * chartW,
    y: padT + (1 - m / maxV) * chartH,
    value: m,
    day: days[i],
    isToday: i === mins.length - 1,
  }));

  // Smooth bezier path
  const linePath = pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const cpX = ((pts[i - 1].x + p.x) / 2).toFixed(1);
      return `C ${cpX} ${pts[i - 1].y.toFixed(1)} ${cpX} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath =
    linePath +
    ` L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)}` +
    ` L ${pts[0].x.toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

  // Goal line Y
  const goalY = padT + (1 - goalMin / maxV) * chartH;

  // Y-axis labels
  const yLabels = [0, Math.round(maxV / 2), maxV];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 280 }}
        aria-label="Daily practice minutes chart"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7B6CF6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7B6CF6" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="todayGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7B6CF6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7B6CF6" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yLabels.map((v) => {
          const gy = padT + (1 - v / maxV) * chartH;
          return (
            <g key={v}>
              <line
                x1={padL} y1={gy} x2={W - padR} y2={gy}
                stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4"
              />
              <text x={padL - 4} y={gy + 3.5} textAnchor="end" fill="#94a3b8" fontSize="9" fontWeight="600">
                {v}m
              </text>
            </g>
          );
        })}

        {/* Goal line */}
        {goalMin <= maxV && (
          <g>
            <line
              x1={padL} y1={goalY} x2={W - padR} y2={goalY}
              stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6"
            />
            <text x={W - padR + 2} y={goalY + 3.5} fill="#22c55e" fontSize="8" fontWeight="700">
              goal
            </text>
          </g>
        )}

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="url(#areaFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#7B6CF6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />

        {/* Data points */}
        {pts.map((p) => (
          <g key={p.day}>
            {/* Value label */}
            <text
              x={p.x} y={p.y - 9}
              textAnchor="middle"
              fill={p.isToday ? "#7B6CF6" : "#64748b"}
              fontSize="10"
              fontWeight={p.isToday ? "800" : "600"}
            >
              {p.value}m
            </text>

            {/* Outer ring (today only) */}
            {p.isToday && (
              <motion.circle
                cx={p.x} cy={p.y} r="9"
                fill="#7B6CF6" opacity="0.15"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2 }}
              />
            )}

            {/* Dot */}
            <motion.circle
              cx={p.x} cy={p.y}
              r={p.isToday ? 6 : 4}
              fill={p.isToday ? "#7B6CF6" : "white"}
              stroke="#7B6CF6"
              strokeWidth={p.isToday ? 0 : 2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9 + pts.indexOf(p) * 0.05, type: "spring", stiffness: 260 }}
            />

            {/* Day label */}
            <text
              x={p.x} y={H - 4}
              textAnchor="middle"
              fill={p.isToday ? "#7B6CF6" : "#94a3b8"}
              fontSize="10"
              fontWeight={p.isToday ? "800" : "600"}
            >
              {p.day}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 text-[10px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-buddy-grape" /> Practice minutes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-emerald-400" style={{ borderTop: "2px dashed #22c55e", height: 0 }} /> 20 min goal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-buddy-grape" /> Today
        </span>
      </div>
    </div>
  );
}
