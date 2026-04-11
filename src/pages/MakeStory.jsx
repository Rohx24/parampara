import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { streamCompletion, chatCompletion } from "../lib/openai";
import { useSession } from "../context/SessionContext.jsx";
import { getSpeechRecognition, VOICE_LANGUAGES } from "../lib/voice";
import { getStoryContext } from "../lib/rag";
import {
  fetchWeakItems,
  buildAdaptivePromptContext,
  buildAdaptiveQuizContext,
  recordQuizMistake,
} from "../lib/adaptiveDifficulty";
import { logEvent, insertSessionResult } from "../lib/db";

const LANG_LABELS = {
  tamil: "Tamil",
  telugu: "Telugu",
  hindi: "Hindi",
  kannada: "Kannada",
  english: "English",
};

const GENRES = [
  { id: "adventure", label: "🗺️ Adventure", style: "action-packed, full of exciting journeys and brave deeds" },
  { id: "funny",     label: "😄 Funny",     style: "humorous, with silly situations and funny characters" },
  { id: "moral",     label: "🌟 Moral",     style: "heartwarming, with a clear life lesson at the end" },
  { id: "mystery",   label: "🔍 Mystery",   style: "suspenseful, with clues and a surprising reveal" },
  { id: "festival",  label: "🪔 Festival",  style: "joyful, celebrating Indian culture and festivals" },
];

/**
 * Build the story generation system prompt.
 * Accepts optional ragContext (cultural context injection) and
 * adaptiveContext (weak-word reinforcement) appended at the end.
 */
function buildStoryPrompt(language, ageGroup, genre, character, ragContext = "", adaptiveContext = "") {
  const langLabel = LANG_LABELS[language] || language;
  const genreMeta = GENRES.find((g) => g.id === genre) || GENRES[0];
  const charLine = character?.trim()
    ? `The main character is named "${character.trim()}".`
    : "";
  return `You are a creative storyteller for Indian children aged ${ageGroup}.
Write a rich, ${genreMeta.style} story (12–15 sentences) based on the child's idea, organized into 3–4 short paragraphs separated by blank lines.
${charLine}
Write entirely in ${langLabel} script${language === "english" ? "" : " (no Roman letters or English words)"}.
Use vivid descriptions, emotions, and dialogue to make it come alive.
Use simple vocabulary appropriate for children aged ${ageGroup}.
Make it ${genreMeta.style}.
Add a gentle moral at the very end as a final sentence starting with "Moral: ".
Do NOT include any headings, titles, or numbering — just the story paragraphs.${ragContext}${adaptiveContext}`;
}

/**
 * Build the quiz question generation prompt.
 * Accepts optional adaptiveQuizContext to focus questions on weak words.
 */
function buildQuestionPrompt(language, ageGroup, adaptiveQuizContext = "") {
  const langLabel = LANG_LABELS[language] || language;
  return `You are a comprehension quiz teacher for Indian children aged ${ageGroup}.
Given the story below, generate exactly 3 comprehension questions about it.
Write the questions in ${langLabel} script${language === "english" ? "" : " (no Roman letters or English words)"}.
Return ONLY the 3 questions, one per line, numbered 1. 2. 3.
Make questions simple and age-appropriate — ask about characters, events, and the moral.${adaptiveQuizContext}`;
}

// ─── localStorage session result writer ───────────────────────────────────────

const SESSION_RESULTS_KEY = (id) => `bbashabuddy_session_results_${id}`;

/**
 * Persist a completed session result to localStorage so OutcomeDashboard
 * can display it. Also fires a Supabase logEvent (best-effort).
 */
function saveSessionResult(childId, result) {
  if (!childId) return;

  // ── 1. localStorage (offline / instant) ───────────────────────────────────
  if (typeof localStorage !== "undefined") {
    try {
      const key      = SESSION_RESULTS_KEY(childId);
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const next     = Array.isArray(existing) ? [...existing, result] : [result];
      localStorage.setItem(key, JSON.stringify(next.slice(-200)));
    } catch { /* non-fatal */ }
  }

  // ── 2. Supabase session_results table (authoritative) ─────────────────────
  insertSessionResult(childId, result).catch(() => {});

  // ── 3. Supabase events log (for per-day activity minutes) ─────────────────
  logEvent(childId, "quiz_complete", {
    language:       result.language,
    genre:          result.genre,
    wordsInStory:   result.wordsInStory,
    questionsTotal: result.questionsTotal,
    correctCount:   result.correctCount,
    accuracyPct:    result.accuracyPct,
  }).catch(() => {});
}

function buildEvalPrompt(language, ageGroup, question, story) {
  const langLabel = LANG_LABELS[language] || language;
  return `You are a warm and encouraging language teacher for Indian children aged ${ageGroup}.
The child just read a story in ${langLabel} and answered a comprehension question verbally.

Story: ${story}
Question asked: ${question}

Evaluate the child's spoken answer:
1. Was the answer correct or partially correct based on the story?
2. Gently note any language or grammar mistakes if present
3. Give warm encouragement

Keep your response to 2–3 sentences in English. Start with praise if they got it right.`;
}

// phase: "compose" | "story" | "quizLoading" | "quiz" | "evaluating" | "complete"

export default function MakeStory() {
  const { childProfile, session } = useSession();
  const childId    = session?.childId || childProfile?.id || null;
  const defaultLang = (childProfile?.preferred_language || "hindi").toLowerCase();
  const ageGroup = childProfile?.age
    ? childProfile.age <= 7 ? "5–7" : childProfile.age <= 11 ? "8–11" : "12–15"
    : "8–11";

  const [language, setLanguage] = useState(defaultLang);
  const [genre, setGenre]       = useState("adventure");
  const [character, setCharacter] = useState("");
  const [idea, setIdea] = useState("");
  const [storyText, setStoryText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState("compose");
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [childAnswer, setChildAnswer] = useState("");
  const [interimAnswer, setInterimAnswer] = useState("");
  const [answerListening, setAnswerListening] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [results, setResults] = useState([]);

  // ── Adaptive difficulty & RAG state ─────────────────────────────────────────
  // weakItems: loaded once on mount; null = still loading; [] = no weak items
  const [weakItems,        setWeakItems]        = useState(null);
  // adaptiveContext: built from weakItems once loaded
  const adaptiveContextRef = useRef("");
  // adaptiveQuizContext: focused on weak words for quiz questions
  const adaptiveQuizRef    = useRef("");

  const ideaRecRef    = useRef(null);
  const answerRecRef  = useRef(null);
  // Track correct count within current session for result logging
  const correctCountRef = useRef(0);

  // ── Load weak items on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    fetchWeakItems(childId, 8)
      .then((items) => {
        if (!alive) return;
        setWeakItems(items);
        adaptiveContextRef.current  = buildAdaptivePromptContext(items);
        adaptiveQuizRef.current     = buildAdaptiveQuizContext(items);
      })
      .catch(() => {
        if (alive) setWeakItems([]);
      });
    return () => { alive = false; };
  }, [childId]);

  const generate = async () => {
    const trimmed = idea.trim();
    if (!trimmed) return;
    setLoading(true);
    setStoryText("");
    setError("");
    setPhase("story");
    setQuestions([]);
    setResults([]);
    setCurrentQ(0);
    setFeedback("");
    correctCountRef.current = 0;

    // ── RAG: retrieve culturally relevant context for the query ───────────────
    // Build query from genre + character + idea for best retrieval signal
    const ragQuery   = `${genre} ${character} ${trimmed}`;
    const ragContext = getStoryContext(ragQuery, language, 2);

    // ── Adaptive: use pre-loaded weak items context ───────────────────────────
    const adaptiveCtx = adaptiveContextRef.current;

    try {
      await streamCompletion(
        [
          {
            role: "system",
            content: buildStoryPrompt(language, ageGroup, genre, character, ragContext, adaptiveCtx),
          },
          { role: "user", content: `Story idea: ${trimmed}` },
        ],
        (chunk) => setStoryText((prev) => prev + chunk),
        { max_tokens: 900, temperature: 0.9 }
      );
    } catch {
      setError("Could not generate story. Check your OpenAI API key in .env");
      setPhase("compose");
    } finally {
      setLoading(false);
    }
  };

  const listenIdea = () => {
    const SR = getSpeechRecognition();
    if (!SR) { setError("Speech recognition not supported. Try Chrome."); return; }
    const langMeta = VOICE_LANGUAGES.find((l) => l.id === language) || VOICE_LANGUAGES[0];
    const rec = new SR();
    rec.lang = langMeta.speechCode;
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0]?.transcript).join(" ").trim();
      if (text) setIdea(text);
    };
    rec.onerror = () => setError("Couldn't hear clearly. Try again.");
    rec.onend = () => setListening(false);
    ideaRecRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stopListenIdea = () => { ideaRecRef.current?.stop(); setListening(false); };

  const readAloud = () => {
    if (!storyText || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const langMeta = VOICE_LANGUAGES.find((l) => l.id === language) || VOICE_LANGUAGES[0];
    const utt = new SpeechSynthesisUtterance(storyText);
    utt.lang = langMeta.speechCode;
    utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  };

  const startQuiz = async () => {
    setPhase("quizLoading");
    setError("");
    try {
      const raw = await chatCompletion(
        [
          {
            role: "system",
            content: buildQuestionPrompt(language, ageGroup, adaptiveQuizRef.current),
          },
          { role: "user", content: storyText },
        ],
        { max_tokens: 300, temperature: 0.5 }
      );
      const qs = raw
        .split("\n")
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((l) => l.length > 5);
      if (qs.length === 0) throw new Error("No questions parsed");
      setQuestions(qs);
      setCurrentQ(0);
      setChildAnswer("");
      setFeedback("");
      setPhase("quiz");
    } catch {
      setError("Could not generate questions. Try again.");
      setPhase("story");
    }
  };

  const startAnswerListening = () => {
    const SR = getSpeechRecognition();
    if (!SR) { setError("Speech recognition not supported. Try Chrome."); return; }
    const langMeta = VOICE_LANGUAGES.find((l) => l.id === language) || VOICE_LANGUAGES[0];
    const rec = new SR();
    rec.lang = langMeta.speechCode;
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (const result of e.results) {
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setChildAnswer(finalText.trim());
      setInterimAnswer(interim);
    };
    rec.onerror = () => { setAnswerListening(false); setInterimAnswer(""); };
    rec.onend = () => { setAnswerListening(false); setInterimAnswer(""); };
    answerRecRef.current = rec;
    setAnswerListening(true);
    setChildAnswer("");
    setInterimAnswer("");
    rec.start();
  };

  const stopAnswerListening = () => {
    answerRecRef.current?.stop();
    setAnswerListening(false);
    setInterimAnswer("");
  };

  const evaluateAnswer = async () => {
    const answer = childAnswer.trim();
    if (!answer) return;
    setPhase("evaluating");
    setError("");
    try {
      const fb = await chatCompletion(
        [
          { role: "system", content: buildEvalPrompt(language, ageGroup, questions[currentQ], storyText) },
          { role: "user", content: `Child's spoken answer: "${answer}"` },
        ],
        { max_tokens: 150, temperature: 0.6 }
      );

      // ── Correctness detection ────────────────────────────────────────────────
      // Positive evaluations start with praise words (matches production eval prompt)
      const isCorrect = /^(great|excellent|perfect|well done|correct|right|wonderful|amazing|good job|that's right|yes|bravo|brilliant|super)/i
        .test(fb.trim());

      if (isCorrect) {
        correctCountRef.current += 1;
      } else {
        // Record the question's key term as a vocabulary miss for adaptive learning
        // Extract first 3 meaningful words from the question as a proxy vocabulary item
        const questionKey = questions[currentQ]
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 2)
          .join(" ")
          .toLowerCase();
        if (questionKey && childId) {
          recordQuizMistake(childId, questionKey);
        }
      }

      setFeedback(fb);
      setResults((prev) => [...prev, { question: questions[currentQ], answer, feedback: fb, correct: isCorrect }]);
      setPhase("quiz");
    } catch {
      setError("Could not evaluate answer. Try again.");
      setPhase("quiz");
    }
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      // ── Save session result ─────────────────────────────────────────────────
      const wordsInStory  = storyText.split(/\s+/).filter(Boolean).length;
      const correctCount  = correctCountRef.current;
      const totalAnswered = questions.length;
      const accuracyPct   = totalAnswered > 0
        ? Math.round((correctCount / totalAnswered) * 100)
        : 0;

      saveSessionResult(childId, {
        sessionId:         crypto.randomUUID(),
        ts:                new Date().toISOString(),
        language,
        genre,
        wordsInStory,
        questionsTotal:    totalAnswered,
        questionsAnswered: totalAnswered,
        correctCount,
        accuracyPct,
        weakWordsUsed:     (weakItems || []).slice(0, 5).map((w) => w.item),
        ragEnabled:        adaptiveContextRef.current.length > 0 || true,
      });

      setPhase("complete");
    } else {
      setCurrentQ((i) => i + 1);
      setChildAnswer("");
      setFeedback("");
    }
  };

  const copyStory = () => {
    navigator.clipboard?.writeText(storyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const reset = () => {
    setPhase("compose");
    setStoryText("");
    setIdea("");
    setCharacter("");
    setQuestions([]);
    setResults([]);
    setCurrentQ(0);
    setChildAnswer("");
    setFeedback("");
    setError("");
    setCopied(false);
    correctCountRef.current = 0;
    window.speechSynthesis?.cancel();
  };

  return (
    <div className="min-h-screen bg-sparkle px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              AI Story Creator
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-buddy-cocoa sm:text-4xl">
              Make My Story ✨
            </h1>
          </div>
          <Link
            to="/home"
            className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
          >
            Back home
          </Link>
        </header>

        {/* Compose panel */}
        <AnimatePresence>
          {phase === "compose" && (
            <motion.div
              key="compose"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card space-y-5"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                  Story language
                </p>
                <div className="flex flex-wrap gap-2">
                  {VOICE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setLanguage(lang.id)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        language === lang.id
                          ? "bg-buddy-grape text-white shadow-soft"
                          : "bg-white/80 text-slate-600"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                  Story genre
                </p>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <button key={g.id} type="button" onClick={() => setGenre(g.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        genre === g.id ? "bg-buddy-coral text-white shadow-soft" : "bg-white/80 text-slate-600"
                      }`}
                    >{g.label}</button>
                  ))}
                </div>
              </div>

              {/* Character name */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                  Main character name <span className="normal-case font-normal text-slate-400">(optional)</span>
                </p>
                <input
                  type="text"
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  placeholder="e.g. Arjun, Priya, Meera…"
                  className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-buddy-grape"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                  Your story idea
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && generate()}
                    placeholder="e.g. A monkey who learns Hindi, a brave girl and a tiger…"
                    className="flex-1 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-buddy-grape"
                  />
                  <motion.button
                    type="button"
                    onClick={listening ? stopListenIdea : listenIdea}
                    whileTap={{ scale: 0.92 }}
                    className={`rounded-2xl px-4 py-3 text-xs font-semibold transition ${
                      listening
                        ? "bg-buddy-coral text-white"
                        : "bg-white/80 text-slate-600 border border-white/70"
                    }`}
                  >
                    {listening ? "Stop" : "🎙️"}
                  </motion.button>
                </div>
              </div>

              {/* Adaptive difficulty & RAG status badges */}
              <div className="flex flex-wrap gap-2">
                {weakItems !== null && weakItems.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-buddy-grape/10 px-3 py-1 text-[11px] font-semibold text-buddy-grape">
                    <span className="h-1.5 w-1.5 rounded-full bg-buddy-grape" />
                    Adaptive: reinforcing {weakItems.length} weak word{weakItems.length !== 1 ? "s" : ""}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-buddy-mint/40 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-buddy-mint" />
                  RAG: cultural context active
                </span>
              </div>

              <motion.button
                type="button"
                onClick={generate}
                disabled={!idea.trim()}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-2xl bg-buddy-grape py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-40 transition"
              >
                Generate Story ✨
              </motion.button>

              {error && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                  {error}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story panel */}
        <AnimatePresence>
          {phase !== "compose" && (storyText || loading) && (
            <motion.div
              key="story-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-6 rounded-3xl border border-buddy-grape/20 bg-white/90 p-6 shadow-card"
            >
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Your {GENRES.find((g) => g.id === genre)?.label ?? "story"} in {LANG_LABELS[language]}
                  </p>
                  {storyText && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {storyText.split(/\s+/).filter(Boolean).length} words
                    </p>
                  )}
                </div>
                {storyText && !loading && (
                  <div className="flex gap-2">
                    <motion.button type="button" onClick={readAloud} whileTap={{ scale: 0.93 }}
                      className="rounded-full bg-buddy-mint px-3 py-2 text-xs font-semibold text-slate-700 shadow-soft"
                    >🔊 Listen</motion.button>
                    <motion.button type="button" onClick={copyStory} whileTap={{ scale: 0.93 }}
                      className="rounded-full bg-white/80 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 shadow-soft transition"
                    >{copied ? "✓ Copied!" : "📋 Copy"}</motion.button>
                  </div>
                )}
              </div>

              <div className="text-base leading-relaxed text-slate-700 font-semibold whitespace-pre-wrap">
                {storyText}
                {loading && (
                  <span className="inline-block ml-1 animate-pulse text-buddy-grape">▍</span>
                )}
              </div>

              {phase === "story" && !loading && storyText && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <motion.button
                    type="button"
                    onClick={startQuiz}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-full bg-buddy-grape px-5 py-2 text-sm font-semibold text-white shadow-soft"
                  >
                    Answer questions about the story →
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={reset}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft"
                  >
                    Make another story
                  </motion.button>
                </div>
              )}

              {phase === "quizLoading" && (
                <p className="mt-6 text-sm font-semibold text-slate-400 animate-pulse">
                  Preparing questions…
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz panel */}
        <AnimatePresence mode="wait">
          {(phase === "quiz" || phase === "evaluating") && questions.length > 0 && (
            <motion.div
              key={`quiz-q${currentQ}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 rounded-3xl border border-buddy-grape/30 bg-white/90 p-6 shadow-card space-y-5"
            >
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <p className="shrink-0 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Question {currentQ + 1} of {questions.length}
                </p>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-buddy-grape"
                    animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="rounded-2xl bg-buddy-mint/30 px-5 py-4 text-base font-semibold text-slate-700 leading-relaxed">
                {questions[currentQ]}
              </div>

              {/* Answer area — shown before feedback */}
              {!feedback && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <motion.button
                      type="button"
                      onClick={answerListening ? stopAnswerListening : startAnswerListening}
                      whileTap={{ scale: 0.92 }}
                      className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                        answerListening
                          ? "bg-buddy-coral text-white"
                          : "bg-buddy-grape text-white"
                      }`}
                    >
                      {answerListening ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                          </span>
                          Stop listening
                        </>
                      ) : (
                        <>🎙️ Speak your answer</>
                      )}
                    </motion.button>

                    {childAnswer && phase !== "evaluating" && (
                      <motion.button
                        type="button"
                        onClick={evaluateAnswer}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-2xl bg-buddy-mint px-5 py-3 text-sm font-semibold text-slate-700 shadow-soft"
                      >
                        Submit ✓
                      </motion.button>
                    )}
                    {phase === "evaluating" && (
                      <span className="text-sm text-slate-400 font-semibold animate-pulse">Checking…</span>
                    )}
                  </div>

                  {/* Live transcript */}
                  <AnimatePresence>
                    {(childAnswer || interimAnswer) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl bg-white/80 border border-white/70 px-4 py-3 text-sm min-h-[48px]"
                      >
                        <span className="font-semibold text-slate-700">{childAnswer}</span>
                        {interimAnswer && (
                          <span className="italic text-slate-400"> {interimAnswer}</span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!childAnswer && !interimAnswer && !answerListening && (
                    <p className="text-xs text-slate-400 font-medium">
                      Tap the button and speak your answer clearly.
                    </p>
                  )}
                </div>
              )}

              {/* Feedback */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3"
                  >
                    <div className="rounded-2xl bg-white/80 border border-white/70 px-4 py-3 text-sm text-slate-600">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                        Your answer
                      </p>
                      <p className="font-semibold">{childAnswer}</p>
                    </div>
                    <div className="rounded-2xl bg-buddy-mint/40 border border-buddy-mint px-5 py-4 text-sm font-semibold text-slate-700 leading-relaxed">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                        Buddy says
                      </p>
                      {feedback}
                    </div>
                    <motion.button
                      type="button"
                      onClick={nextQuestion}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full rounded-2xl bg-buddy-grape py-3 text-sm font-semibold text-white shadow-soft"
                    >
                      {currentQ + 1 >= questions.length ? "See my results →" : "Next question →"}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results panel */}
        <AnimatePresence>
          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-3xl border border-buddy-grape/20 bg-white/90 p-6 shadow-card space-y-5"
            >
              {/* Hero */}
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="text-5xl"
                >🎉</motion.div>
                <h2 className="font-display text-2xl font-bold text-buddy-cocoa">
                  Story complete!
                </h2>
                <p className="text-sm text-slate-500">
                  You read and answered {results.length} question{results.length !== 1 ? "s" : ""} — amazing work!
                </p>
                {/* Stars */}
                <div className="flex justify-center gap-1 text-2xl">
                  {Array.from({ length: Math.min(results.length, 3) }).map((_, i) => (
                    <motion.span key={i} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.15 }}
                    >⭐</motion.span>
                  ))}
                </div>
              </div>

              {/* Q&A recap */}
              <div className="space-y-3">
                {results.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-2xl border border-white/70 bg-white/80 p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-buddy-grape text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <p className="text-sm font-bold text-slate-700">{r.question}</p>
                    </div>
                    <div className="rounded-xl bg-buddy-peach/40 px-3 py-2 text-xs font-semibold text-slate-700">
                      You said: "{r.answer}"
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">{r.feedback}</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <motion.button type="button" onClick={reset}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  className="rounded-full bg-buddy-grape px-6 py-2.5 text-sm font-semibold text-white shadow-soft"
                >✨ Make another story</motion.button>
                <motion.button type="button" onClick={copyStory}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-full border border-white/70 bg-white/80 px-5 py-2.5 text-xs font-semibold text-slate-600 shadow-soft"
                >{copied ? "✓ Copied!" : "📋 Copy story"}</motion.button>
                <Link to="/home"
                  className="rounded-full border border-white/70 bg-white/80 px-5 py-2.5 text-xs font-semibold text-slate-600 shadow-soft"
                >Back home</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global error (outside compose) */}
        <AnimatePresence>
          {error && phase !== "compose" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
