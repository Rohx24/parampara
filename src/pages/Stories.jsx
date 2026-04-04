import React, { useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { searchAndEnrich, formatDuration, formatViewCount } from "../lib/youtubeSearch";
import { rankVideos, buildQuery } from "../lib/lessonRanking";
import { generateLesson } from "../lib/lessonGenerator";
import { chatCompletion } from "../lib/openai";
import { getSpeechRecognition, VOICE_LANGUAGES } from "../lib/voice";

// ─── Constants ───────────────────────────────────────────────────────────────

const LANGUAGES = ["Kannada", "Hindi", "Telugu", "Tamil", "Malayalam", "Bengali", "Marathi"];
const TOPIC_PRESETS = ["Greetings", "Market", "School", "Family", "Travel", "Numbers", "Colors", "Animals", "Food"];
const DIFFICULTIES = [
  { value: "beginner",     label: "Beginner",     desc: "Ages 4–7, simple words" },
  { value: "intermediate", label: "Intermediate", desc: "Ages 7–11, short sentences" },
  { value: "advanced",     label: "Advanced",     desc: "Ages 11–15, stories" },
];

function scoreBadgeClass(score) {
  if (score >= 65) return "bg-emerald-100 text-emerald-700";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Stories() {
  const [lang, setLang]           = useState("Hindi");
  const [topic, setTopic]         = useState("Greetings");
  const [customTopic, setCustomTopic] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");

  const [searchStatus, setSearchStatus] = useState("idle");
  const [videos, setVideos]       = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [totalResults, setTotalResults]   = useState(0);
  const [searchError, setSearchError]     = useState("");

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playerStarted, setPlayerStarted] = useState(false);

  const [lessonStatus, setLessonStatus] = useState("idle");
  const [lesson, setLesson]             = useState(null);
  const [lessonError, setLessonError]   = useState("");

  const [openSections, setOpenSections] = useState(new Set(["summary", "vocab", "mcq"]));
  const [mcqAnswers, setMcqAnswers]     = useState({});
  const [fillAnswers, setFillAnswers]   = useState({});

  const effectiveTopic = customTopic.trim() || topic;

  // ── Search ─────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    setSearchStatus("loading");
    setSearchError("");
    setVideos([]);
    setNextPageToken(null);
    setTotalResults(0);
    setSelectedVideo(null);
    setLesson(null);
    setLessonStatus("idle");
    try {
      const query = buildQuery(lang, effectiveTopic, difficulty);
      const result = await searchAndEnrich(query, { maxResults: 20 });
      const ranked = rankVideos(result.items);
      setVideos(ranked);
      setNextPageToken(result.nextPageToken ?? null);
      setTotalResults(result.totalResults ?? 0);
      setSearchStatus("done");
    } catch (err) {
      setSearchError(err.message ?? "Search failed. Check your YouTube API key.");
      setSearchStatus("error");
    }
  }, [lang, effectiveTopic, difficulty]);

  // ── Load more ──────────────────────────────────────────────────────────────

  const handleLoadMore = useCallback(async () => {
    if (!nextPageToken) return;
    try {
      const query = buildQuery(lang, effectiveTopic, difficulty);
      const result = await searchAndEnrich(query, { maxResults: 20, pageToken: nextPageToken });
      const ranked = rankVideos(result.items);
      setVideos((prev) => {
        const ids = new Set(prev.map((v) => v.id));
        return [...prev, ...ranked.filter((v) => !ids.has(v.id))];
      });
      setNextPageToken(result.nextPageToken ?? null);
    } catch { /* non-fatal */ }
  }, [lang, effectiveTopic, difficulty, nextPageToken]);

  // ── Select video ───────────────────────────────────────────────────────────

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    setPlayerStarted(false);
    setLesson(null);
    setLessonStatus("idle");
    setLessonError("");
    setMcqAnswers({});
    setFillAnswers({});
    setOpenSections(new Set(["summary", "vocab", "mcq"]));
    setTimeout(() => {
      document.getElementById("player-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  // ── Analyze ────────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!selectedVideo) return;
    setLessonStatus("loading");
    setLessonError("");
    try {
      const data = await generateLesson({
        title: selectedVideo.title,
        description: selectedVideo.description,
        channelTitle: selectedVideo.channelTitle,
        transcript: "",
        language: lang,
        difficulty,
      });
      setLesson(data);
      setLessonStatus("done");
      setTimeout(() => {
        document.getElementById("lesson-anchor")?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    } catch (err) {
      setLessonError(err.message ?? "Failed to generate lesson.");
      setLessonStatus("error");
    }
  }, [selectedVideo, lang, difficulty]);

  const toggleSection = (key) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-sparkle px-4 py-10 sm:px-8 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-8 pb-24">

        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              BashaBuddy Learn
            </p>
            <h1 className="mt-1 font-display text-4xl font-extrabold text-buddy-cocoa sm:text-5xl">
              Find Your Lesson 🎬
            </h1>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Search animated YouTube videos by language and topic. Click Analyze to get an
              AI-generated quiz, vocab list, and speaking practice.
            </p>
          </div>
          <Link
            to="/home"
            className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
          >
            Back home
          </Link>
        </header>

        {/* Search Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSearch}
          className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card space-y-5"
        >
          <h2 className="font-display text-lg font-bold text-buddy-cocoa">Find a lesson</h2>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Language */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
                Language
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      lang === l
                        ? "bg-buddy-grape text-white shadow-soft"
                        : "bg-white/80 text-slate-600 hover:bg-buddy-mint"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
                Topic
              </label>
              <div className="flex flex-wrap gap-2">
                {TOPIC_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTopic(t); setCustomTopic(""); }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      topic === t && !customTopic
                        ? "bg-buddy-coral text-white shadow-soft"
                        : "bg-white/80 text-slate-600 hover:bg-buddy-peach"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Or type your own topic…"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-buddy-grape/40"
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
                Difficulty
              </label>
              <div className="space-y-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    className={`w-full rounded-2xl border px-4 py-2.5 text-left transition ${
                      difficulty === d.value
                        ? "border-buddy-grape/60 bg-buddy-grape/10"
                        : "border-white/70 bg-white/80 hover:border-buddy-grape/30"
                    }`}
                  >
                    <p className="text-sm font-bold text-buddy-cocoa">{d.label}</p>
                    <p className="text-xs text-slate-400">{d.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={searchStatus === "loading"}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-buddy-grape py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>🔍</span>
            {searchStatus === "loading"
              ? "Searching…"
              : `Search ${lang} · ${effectiveTopic}`}
          </button>
        </motion.form>

        {/* Error */}
        {searchStatus === "error" && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
            {searchError}
          </div>
        )}

        {/* Skeleton */}
        {searchStatus === "loading" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/60" />
            ))}
          </div>
        )}

        {/* Video Grid */}
        {searchStatus === "done" && videos.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-display text-lg text-slate-500">No suitable videos found.</p>
            <p className="mt-1 text-sm text-slate-400">Try a different topic or language.</p>
          </div>
        )}

        {searchStatus === "done" && videos.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {videos.length} results
              {totalResults > 0 ? ` (of ~${totalResults.toLocaleString()})` : ""} · sorted by
              relevance
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AnimatePresence>
                {videos.map((video, i) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    selected={selectedVideo?.id === video.id}
                    index={i}
                    onSelect={() => handleSelectVideo(video)}
                  />
                ))}
              </AnimatePresence>
            </div>
            {nextPageToken && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-6 py-2.5 text-sm font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
                >
                  ↓ Load more
                </button>
              </div>
            )}
          </div>
        )}

        {/* Player + Lesson Panel */}
        {selectedVideo && (
          <section id="player-anchor" className="scroll-mt-8 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              {/* Video player */}
              <VideoPlayer
                video={selectedVideo}
                started={playerStarted}
                onStart={() => setPlayerStarted(true)}
                onAnalyze={handleAnalyze}
                analyzing={lessonStatus === "loading"}
              />

              {/* Lesson sidebar */}
              <div>
                {lessonStatus === "idle" && (
                  <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-soft text-center space-y-3">
                    <p className="text-4xl">🎓</p>
                    <p className="font-display text-base font-bold text-buddy-cocoa">
                      Ready to learn?
                    </p>
                    <p className="text-sm text-slate-500">
                      Click <strong>Analyze this video</strong> to generate a full lesson
                      with vocab, MCQs, and speaking prompts.
                    </p>
                  </div>
                )}
                {lessonStatus === "loading" && (
                  <div className="rounded-3xl border border-white/70 bg-white/80 p-10 shadow-soft flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-buddy-grape border-t-transparent" />
                    <p className="text-sm font-semibold text-slate-600">
                      Generating lesson with AI…
                    </p>
                    <p className="text-xs text-slate-400 text-center max-w-[200px]">
                      This takes 5–15 seconds.
                    </p>
                  </div>
                )}
                {lessonStatus === "error" && (
                  <div className="rounded-3xl border border-red-100 bg-red-50 p-6 shadow-soft space-y-3">
                    <p className="text-sm font-semibold text-red-600">{lessonError}</p>
                    <button
                      onClick={handleAnalyze}
                      className="rounded-full bg-buddy-grape px-4 py-2 text-xs font-semibold text-white shadow-soft"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Full lesson accordion */}
            {lessonStatus === "done" && lesson && (
              <div id="lesson-anchor" className="scroll-mt-8">
                <QuizPanel
                  lesson={lesson}
                  lang={lang}
                  openSections={openSections}
                  onToggle={toggleSection}
                  mcqAnswers={mcqAnswers}
                  setMcqAnswers={setMcqAnswers}
                  fillAnswers={fillAnswers}
                  setFillAnswers={setFillAnswers}
                  onRegenerate={handleAnalyze}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ video, selected, index, onSelect }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5) }}
      whileHover={{ y: -4 }}
      onClick={onSelect}
      className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition focus:outline-none ${
        selected
          ? "border-buddy-grape bg-buddy-grape/5 shadow-card"
          : "border-white/70 bg-white/80 shadow-soft hover:shadow-card"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-buddy-mint text-4xl">🎬</div>
        )}

        {/* Duration */}
        {video.durationSeconds > 0 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            ⏱ {formatDuration(video.durationSeconds)}
          </span>
        )}

        {/* Play overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition bg-black/0 group-hover:bg-black/15 ${
            selected ? "bg-buddy-grape/10" : ""
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-soft transition opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 ${
              selected ? "bg-buddy-grape text-white !opacity-100 !scale-100" : "bg-white/90"
            }`}
          >
            <span className="ml-0.5 text-sm">▶</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-buddy-cocoa">
          {video.title}
        </h3>
        <p className="text-xs font-semibold text-slate-500">{video.channelTitle}</p>
        {video.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
            {video.description.slice(0, 100)}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {video.viewCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              👁 {formatViewCount(video.viewCount)}
            </span>
          )}
          {video.score != null && (
            <span
              className={`ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${scoreBadgeClass(
                video.score
              )}`}
            >
              ✦ {video.score}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ─── Video Player ─────────────────────────────────────────────────────────────

function VideoPlayer({ video, started, onStart, onAnalyze, analyzing }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-card space-y-4">
      {/* Embed / Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900">
        {started ? (
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="group absolute inset-0 flex items-center justify-center"
            aria-label="Play video"
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="absolute inset-0 h-full w-full object-cover transition group-hover:brightness-75"
            />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-buddy-grape/90 shadow-card transition group-hover:scale-110">
              <span className="ml-1 text-3xl text-white">▶</span>
            </span>
          </button>
        )}
      </div>

      {/* Meta */}
      <div>
        <h2 className="font-display text-base font-bold leading-snug text-buddy-cocoa">
          {video.title}
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
          <span>{video.channelTitle}</span>
          {video.durationSeconds > 0 && <span>⏱ {formatDuration(video.durationSeconds)}</span>}
          {video.viewCount > 0 && <span>👁 {formatViewCount(video.viewCount)}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 rounded-2xl bg-buddy-grape px-5 py-2.5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>⚡</span>
          {analyzing ? "Generating lesson…" : "Analyze this video"}
        </button>
        <a
          href={`https://www.youtube.com/watch?v=${video.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-2xl border border-white/70 bg-white/80 px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
        >
          ↗ Open on YouTube
        </a>
      </div>
    </div>
  );
}

// ─── Quiz Panel (Accordion) ───────────────────────────────────────────────────

function QuizPanel({ lesson, lang, openSections, onToggle, mcqAnswers, setMcqAnswers, fillAnswers, setFillAnswers, onRegenerate }) {
  const [translating, setTranslating] = useState({});

  const mcqCorrect = Object.entries(mcqAnswers).filter(
    ([qi, ans]) => lesson.mcq?.[+qi]?.answer === ans
  ).length;

  const handleTranslate = async (i, englishText) => {
    if (!englishText.trim()) return;
    setTranslating((p) => ({ ...p, [i]: true }));
    try {
      const result = await chatCompletion(
        [
          {
            role: "system",
            content: `Translate the following English word or short phrase into ${lang}. Return ONLY the translated word/phrase in ${lang} script, nothing else.`,
          },
          { role: "user", content: englishText.trim() },
        ],
        { max_tokens: 30, temperature: 0 }
      );
      setFillAnswers((p) => ({ ...p, [i]: result.trim() }));
    } catch { /* silent */ }
    setTranslating((p) => ({ ...p, [i]: false }));
  };

  const speechCode = VOICE_LANGUAGES.find(
    (l) => l.label.toLowerCase() === lang.toLowerCase() || l.id === lang.toLowerCase()
  )?.speechCode ?? "hi-IN";

  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-extrabold text-buddy-cocoa">Your Lesson</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                lesson.confidence === "high"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {lesson.confidence === "high" ? "✓ High confidence" : "⚠ Low confidence"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {lang} lesson
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="flex items-center gap-2 rounded-full bg-buddy-mint px-4 py-2 text-xs font-bold text-slate-700 shadow-soft transition hover:-translate-y-0.5"
        >
          ↺ Regenerate
        </button>
      </div>

      {/* Summary */}
      <Accordion title="📝 Summary" id="summary" open={openSections} onToggle={onToggle}>
        <p className="text-sm leading-relaxed text-slate-700">{lesson.summary}</p>
      </Accordion>

      {/* Vocabulary */}
      <Accordion
        title={`📚 Vocabulary (${lesson.vocabulary?.length ?? 0})`}
        id="vocab"
        open={openSections}
        onToggle={onToggle}
      >
        <div className="space-y-2">
          {lesson.vocabulary?.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/60 px-4 py-3"
            >
              <span className="font-display text-lg font-bold text-buddy-grape shrink-0">
                {item.word}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-600">{item.meaning}</p>
                <p className="text-xs italic text-slate-400 truncate">"{item.example}"</p>
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      {/* MCQ */}
      <Accordion
        title={`🧠 Multiple Choice · ${Object.keys(mcqAnswers).length}/${lesson.mcq?.length ?? 0} answered`}
        id="mcq"
        open={openSections}
        onToggle={onToggle}
      >
        <div className="space-y-5">
          {lesson.mcq?.map((q, qi) => {
            const chosen = mcqAnswers[qi];
            const answered = chosen !== undefined;
            return (
              <div key={qi} className="space-y-2">
                <p className="text-sm font-bold text-buddy-cocoa">
                  Q{qi + 1}. {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const isChosen = chosen === opt;
                    const isCorrect = q.answer === opt;
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={answered}
                        onClick={() => setMcqAnswers((p) => ({ ...p, [qi]: opt }))}
                        className={`w-full rounded-2xl border px-4 py-2.5 text-left text-sm font-semibold transition ${
                          !answered
                            ? "border-white/70 bg-white/80 hover:border-buddy-grape/40 hover:bg-buddy-grape/5"
                            : answered && isCorrect
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : answered && isChosen && !isCorrect
                            ? "border-red-300 bg-red-50 text-red-600"
                            : "border-white/70 bg-white/80 opacity-60"
                        }`}
                      >
                        <span className="mr-2 font-mono text-xs">
                          {String.fromCharCode(65 + oi)}.
                        </span>
                        {opt}
                        {answered && isCorrect && " ✓"}
                        {answered && isChosen && !isCorrect && " ✗"}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {lesson.mcq?.length > 0 &&
            Object.keys(mcqAnswers).length === lesson.mcq.length && (
              <p className="rounded-2xl bg-buddy-mint/40 px-4 py-3 text-sm font-bold text-buddy-cocoa">
                Score: {mcqCorrect} / {lesson.mcq.length} 🎉
              </p>
            )}
        </div>
      </Accordion>

      {/* Fill in the Blanks */}
      <Accordion
        title={`✏️ Fill in the Blanks (${lesson.fill_blanks?.length ?? 0})`}
        id="fill"
        open={openSections}
        onToggle={onToggle}
      >
        <p className="mb-3 text-[11px] text-slate-400 font-semibold">
          💡 Type in English then click <strong>Translate →{lang}</strong> to convert automatically
        </p>
        <div className="space-y-4">
          {lesson.fill_blanks?.map((fb, i) => {
            const val = fillAnswers[i] ?? "";
            const answered = val.trim().length > 0;
            const correct = val.trim().toLowerCase() === fb.answer.trim().toLowerCase();
            const isTranslating = translating[i];
            return (
              <div key={i} className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">{fb.question}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setFillAnswers((p) => ({ ...p, [i]: e.target.value }))}
                    placeholder={`Type in English or ${lang}…`}
                    className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold outline-none transition ${
                      !answered
                        ? "border-white/80 bg-white/90 text-slate-700 focus:border-buddy-grape"
                        : correct
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-red-300 bg-red-50 text-red-600"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleTranslate(i, val)}
                    disabled={!val.trim() || isTranslating}
                    title={`Translate to ${lang}`}
                    className="shrink-0 rounded-xl bg-buddy-grape/10 px-2.5 py-2 text-[11px] font-bold text-buddy-grape transition hover:bg-buddy-grape/20 disabled:opacity-40"
                  >
                    {isTranslating ? "…" : `→${lang}`}
                  </button>
                  {answered && (correct ? <span className="text-emerald-500 text-lg">✓</span> : <span className="text-red-400 text-lg">✗</span>)}
                </div>
                {answered && !correct && (
                  <p className="text-xs font-semibold text-buddy-grape">Answer: {fb.answer}</p>
                )}
              </div>
            );
          })}
        </div>
      </Accordion>

      {/* Speaking Prompts */}
      <Accordion
        title={`🎙️ Speaking Practice (${lesson.speaking_prompts?.length ?? 0})`}
        id="speaking"
        open={openSections}
        onToggle={onToggle}
      >
        <div className="space-y-3">
          {lesson.speaking_prompts?.map((sp, i) => (
            <SpeakingPromptCard key={i} prompt={sp} speechCode={speechCode} lang={lang} />
          ))}
        </div>
      </Accordion>

      {/* Comprehension */}
      <Accordion
        title={`💬 Comprehension (${lesson.comprehension_questions?.length ?? 0})`}
        id="comprehension"
        open={openSections}
        onToggle={onToggle}
      >
        <ol className="space-y-3">
          {lesson.comprehension_questions?.map((q, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-buddy-mint text-xs font-bold text-slate-700">
                {i + 1}
              </span>
              <p className="text-sm text-slate-700">{q}</p>
            </li>
          ))}
        </ol>
      </Accordion>
    </div>
  );
}

// ─── Speaking Prompt Card (with real mic) ────────────────────────────────────

function SpeakingPromptCard({ prompt, speechCode, lang }) {
  const [listening, setListening] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [interim, setInterim] = useState("");
  const [score, setScore] = useState(null);
  const recRef = useRef(null);

  const start = () => {
    const SR = getSpeechRecognition();
    if (!SR) { alert("Speech recognition requires Chrome or Edge."); return; }
    const rec = new SR();
    rec.lang = speechCode;
    rec.interimResults = true;
    rec.continuous = false;
    let final = "";
    rec.onresult = (e) => {
      let interim = "";
      for (const r of e.results) {
        if (r.isFinal) final += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setInterim(interim);
    };
    rec.onerror = () => { setListening(false); setInterim(""); };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const text = final.trim();
      if (text) {
        setSpoken(text);
        // simple word-count based confidence score
        const words = text.split(/\s+/).filter(Boolean).length;
        setScore(Math.min(100, Math.max(30, words * 15)));
      }
    };
    recRef.current = rec;
    setListening(true);
    setSpoken("");
    setScore(null);
    rec.start();
  };

  const stop = () => { recRef.current?.stop(); setListening(false); };

  const hear = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(prompt);
    utt.lang = speechCode;
    utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  };

  return (
    <div className="rounded-2xl border border-buddy-grape/20 bg-buddy-grape/5 p-4 space-y-3">
      {/* Prompt text */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-buddy-cocoa leading-relaxed">{prompt}</p>
        <button
          type="button"
          onClick={hear}
          className="shrink-0 rounded-full bg-buddy-mint px-3 py-1 text-xs font-bold text-slate-700 shadow-soft transition hover:scale-105"
        >
          🔊 Hear
        </button>
      </div>

      {/* Mic controls */}
      <div className="flex flex-wrap items-center gap-2">
        <motion.button
          type="button"
          onClick={listening ? stop : start}
          whileTap={{ scale: 0.92 }}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-soft transition ${
            listening ? "bg-buddy-coral" : "bg-buddy-grape"
          }`}
        >
          {listening ? (
            <>
              <motion.span
                className="relative flex h-2 w-2"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </motion.span>
              Stop
            </>
          ) : (
            <> 🎤 Record answer</>
          )}
        </motion.button>

        {spoken && !listening && (
          <button
            type="button"
            onClick={() => { setSpoken(""); setScore(null); }}
            className="rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
          >
            Try again
          </button>
        )}
      </div>

      {/* Live interim */}
      {listening && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-white/80 px-3 py-2 text-xs italic text-slate-500"
        >
          {interim || "Listening… speak now!"}
        </motion.div>
      )}

      {/* Result */}
      {spoken && !listening && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="rounded-xl bg-white/90 px-3 py-2.5 text-sm font-semibold text-slate-700">
            "{spoken}"
          </div>
          {score !== null && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-buddy-grape"
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs font-bold text-buddy-grape">{score}%</span>
              <span className="text-xs text-slate-500">
                {score >= 70 ? "Great!" : score >= 45 ? "Good try!" : "Keep going!"}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Accordion Section ────────────────────────────────────────────────────────

function Accordion({ title, id, open, onToggle, children }) {
  const isOpen = open.has(id);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white/60">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="font-display text-sm font-bold text-buddy-cocoa">{title}</span>
        <span className="text-slate-400 text-sm">{isOpen ? "▲" : "▼"}</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
