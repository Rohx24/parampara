import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Mascot3D from "../components/Mascot3D.jsx";
import SpeechBubble from "../components/SpeechBubble.jsx";
import MicButton from "../components/voice/MicButton.jsx";
import Waveform from "../components/voice/Waveform.jsx";
import CoachNotes from "../components/voice/CoachNotes.jsx";
import PromptCard from "../components/voice/PromptCard.jsx";
import { useSession } from "../context/SessionContext.jsx";
import { logEvent, upsertMistake } from "../lib/db";
import {
  VOICE_LANGUAGES,
  buildFreeTalkNotes,
  buildGuidedNotes,
  evaluateTranscript,
  getAgeGroup,
  getBuddyReply,
  getGuidedPrompts,
  getSimplifiedPrompt,
  getSpeechRecognition,
  normalizeLanguageId,
  decideNextStep,
  speakText,
  checkVoiceFor,
} from "../lib/voice";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const defaultChips = [
  { label: "Key words", value: "—" },
  { label: "Sentence match", value: "—" },
];

export default function VoiceCoach() {
  const { childProfile } = useSession();
  const recognitionRef  = useRef(null);
  const transcriptRef   = useRef("");
  const firstResultRef  = useRef(null);
  const startTimeRef    = useRef(null);
  const chatEndRef      = useRef(null);

  const initialLanguage = normalizeLanguageId(childProfile?.preferred_language || "tamil");
  const [language, setLanguage]   = useState(initialLanguage);
  const [mode, setMode]           = useState("guided");
  const [style, setStyle]         = useState("gentle");
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus]       = useState("Ready to talk!");
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback]   = useState(null);
  const [score, setScore]         = useState(null);
  const [decision, setDecision]   = useState(null);
  const [chips, setChips]         = useState(defaultChips);
  const [manualText, setManualText] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [attempts, setAttempts]   = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [overridePrompt, setOverridePrompt] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [interimText, setInterimText]   = useState("");
  const [liveWordCount, setLiveWordCount] = useState(0);
  // Session-level tracking for Supabase event logging
  const sessionStartRef  = useRef(Date.now());
  const sessionScoresRef = useRef([]); // accumulate per-transcript scores
  const sessionPromptsRef = useRef(0); // count of voice_advance events this session
  const replyRequestRef  = useRef(0);  // ignores a Buddy reply that arrives after a reset

  // Mistakes — initialise empty; populated from localStorage in useEffect
  // so we have access to childProfile.id
  const [mistakeCounts, setMistakeCounts] = useState({});

  const ageGroup     = getAgeGroup(childProfile?.age);
  const languageMeta = VOICE_LANGUAGES.find((l) => l.id === language) || VOICE_LANGUAGES[0];
  const prompts      = useMemo(() => getGuidedPrompts(language, ageGroup), [language, ageGroup]);
  const activePrompt = overridePrompt || prompts[promptIndex % prompts.length];
  const supportsSpeech = useMemo(() => Boolean(getSpeechRecognition()), []);
  const [hasVoice, setHasVoice] = useState(true);

  // Without a device voice for this language, "Hear it" stays silent
  useEffect(() => {
    let alive = true;
    checkVoiceFor(languageMeta.speechCode).then((ok) => { if (alive) setHasVoice(ok); });
    return () => { alive = false; };
  }, [languageMeta.speechCode]);

  // Sync language from profile
  useEffect(() => { setLanguage(initialLanguage); }, [initialLanguage]);

  // ── Load child-specific mistakes from localStorage ─────────────────────────
  // VoiceCoach previously only wrote to the generic key, causing ParentDashboard
  // to read nothing. We now read from (and write to) the child-specific key.
  useEffect(() => {
    if (!childProfile?.id) return;
    try {
      const childKey = localStorage.getItem(`bhashabuddy_voice_mistakes_${childProfile.id}`);
      // Merge generic fallback in case of prior sessions
      const generic  = localStorage.getItem("bhashabuddy_voice_mistakes");
      const parsed   = childKey ? JSON.parse(childKey)
        : generic    ? JSON.parse(generic)
        : {};
      if (typeof parsed === "object" && !Array.isArray(parsed)) {
        setMistakeCounts(parsed);
      }
    } catch { /* non-fatal */ }
  }, [childProfile?.id]);

  // ── Log voice_session event on unmount ────────────────────────────────────
  // This gives ParentDashboard real per-day minute data.
  useEffect(() => {
    sessionStartRef.current = Date.now();
    return () => {
      const durationMs = Date.now() - sessionStartRef.current;
      // Only log if the user actually did something (> 10 seconds)
      if (durationMs < 10_000 || !childProfile?.id) return;
      const durationSeconds = Math.round(durationMs / 1000);
      const scores          = sessionScoresRef.current;
      const avgScore        = scores.length
        ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
        : null;
      logEvent(childProfile.id, "voice_session", {
        durationSeconds,
        language,
        promptsCompleted: sessionPromptsRef.current,
        avgScore,
        mode,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount/unmount

  // Reset chat on mode / language change
  useEffect(() => {
    setChatMessages([
      {
        role: "assistant",
        text: mode === "guided"
          ? "Hi! Let's practice together. 🎯"
          : "Tell me anything you want — I'm all ears! 👂",
      },
    ]);
    setTranscript("");
    setFeedback(null);
    setDecision(null);
    setScore(null);
    setSupportMessage("");
    setAttempts(0);
    setOverridePrompt(null);
    setChips(defaultChips);
    replyRequestRef.current += 1;
  }, [mode, language, ageGroup]);

  // Each language has its own list, so start it from the top
  useEffect(() => { setPromptIndex(0); }, [language, ageGroup]);

  // Push new guided prompt into chat
  useEffect(() => {
    if (mode !== "guided" || !activePrompt) return;
    setChatMessages((prev) => [...prev, { role: "assistant", text: activePrompt.nativeText }]);
  }, [activePrompt?.id, mode]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-speak new prompt when it changes — only if mic is not active
  useEffect(() => {
    if (mode !== "guided" || !activePrompt?.nativeText) return;
    const t = setTimeout(() => {
      if (!recognitionRef.current) {
        speakText(activePrompt.nativeText, languageMeta.speechCode, style);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [activePrompt?.id]);

  const updateMistakeLocal = (word) => {
    setMistakeCounts((prev) => {
      const next = { ...prev, [word]: (prev[word] || 0) + 1 };
      // Write to BOTH keys so ParentDashboard (child-specific) and legacy code both work
      localStorage.setItem("bhashabuddy_voice_mistakes", JSON.stringify(next));
      if (childProfile?.id) {
        localStorage.setItem(`bhashabuddy_voice_mistakes_${childProfile.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  // ── Handle transcript evaluation ──────────────────────────────────────────

  const handleTranscript = (text, meta = {}) => {
    if (!text) return;
    setTranscript(text);
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    logEvent(childProfile?.id, "voice_transcript", { mode, lang: language, text, ...meta });

    if (mode === "free") {
      const notes = buildFreeTalkNotes({ transcript: text, language });
      setFeedback({ ...notes, retryPrompt: "" });
      setChips(notes.chips);
      setDecision(null);
      setScore(null);
      setSupportMessage("");
      logEvent(childProfile?.id, "voice_feedback", { mode, lang: language });
      replyAsBuddy(text);
      return;
    }

    const evaluation = evaluateTranscript(
      activePrompt?.nativeText || "",
      text,
      activePrompt?.keywords || [],
      language
    );
    const hesitationMs  = meta.hesitationMs ?? 0;
    const mistakesCount = Object.values(mistakeCounts).reduce((s, v) => s + v, 0);
    const nextDecision  = decideNextStep({
      mode,
      score: evaluation.score,
      similarity: evaluation.similarity,
      hesitationMs,
      attempts,
      mistakesCount,
    });

    setScore(evaluation.score);
    // Accumulate score for session-level average (logged on unmount)
    sessionScoresRef.current = [...sessionScoresRef.current, evaluation.score];

    const notes = buildGuidedNotes({
      prompt: activePrompt,
      evaluation,
      transcript: text,
      language,
      startedAfterMs: hesitationMs,
    });
    const staysOnSentence = nextDecision.action !== "ADVANCE";
    setFeedback({ ...notes, retryPrompt: staysOnSentence ? activePrompt?.nativeText : "" });
    setChips(notes.chips);
    setDecision(nextDecision);

    if (evaluation.score < 70 && evaluation.missingKeywords?.length) {
      const word = evaluation.missingKeywords[0];
      updateMistakeLocal(word);
      upsertMistake(childProfile?.id, { domain: "speech", item: word, count: 1 });
    }

    let reply = nextDecision.message || "Nice try!";
    if (nextDecision.action === "ADVANCE") {
      setPromptIndex((p) => p + 1);
      setAttempts(0);
      setOverridePrompt(null);
      setSupportMessage("");
      sessionPromptsRef.current += 1;
      logEvent(childProfile?.id, "voice_advance", {
        mode, lang: language, score: evaluation.score, promptId: activePrompt?.id,
      });
    } else if (nextDecision.action === "SIMPLIFY") {
      const shorter = getSimplifiedPrompt(activePrompt);
      const isShorter = shorter.nativeText !== activePrompt?.nativeText;
      if (!isShorter) reply = "Let's listen once more, then try again.";
      setOverridePrompt(shorter);
      setFeedback((prev) => ({ ...prev, retryPrompt: shorter.nativeText }));
      setAttempts((p) => p + 1);
      setSupportMessage(isShorter ? "Let's try a shorter version first." : "Press \"Hear it\", then say it slowly.");
    } else if (nextDecision.action === "SWITCH_TO_ENGLISH_HELP") {
      setSupportMessage(
        activePrompt?.englishMeaning
          ? `It means: "${activePrompt.englishMeaning}". Say it slowly, word by word.`
          : "Say it slowly, word by word."
      );
      setAttempts((p) => p + 1);
    } else {
      setAttempts((p) => p + 1);
    }

    setChatMessages((prev) => [
      ...prev,
      { role: "assistant", text: reply },
    ]);
    logEvent(childProfile?.id, "voice_feedback", {
      mode, lang: language, score: evaluation.score, promptId: activePrompt?.id,
    });
  };

  const replyAsBuddy = async (text) => {
    const requestId = ++replyRequestRef.current;
    setStatus("Buddy is thinking…");
    const reply = await getBuddyReply({
      language,
      ageGroup,
      nickname: childProfile?.nickname,
      history: chatMessages,
      text,
    });
    if (requestId !== replyRequestRef.current) return;
    setChatMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    setStatus("Your turn!");
    if (!recognitionRef.current) speakText(reply, languageMeta.speechCode, style);
  };

  // ── Speech Recognition ────────────────────────────────────────────────────

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const startListening = () => {
    if (!supportsSpeech) {
      setStatus("Your browser doesn't support speech recognition. Try Chrome.");
      return;
    }
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.lang           = languageMeta.speechCode;
    rec.interimResults = true;
    rec.continuous     = false;

    transcriptRef.current  = "";
    firstResultRef.current = null;
    startTimeRef.current   = Date.now();
    setInterimText("");
    setLiveWordCount(0);
    setFeedback(null);
    setScore(null);
    setDecision(null);
    setChips(defaultChips);
    setSupportMessage("");

    rec.onresult = (event) => {
      let finalText = "";
      let interimChunk = "";
      for (const result of event.results) {
        if (result.isFinal) finalText += result[0]?.transcript ?? "";
        else interimChunk += result[0]?.transcript ?? "";
      }
      const combined = (finalText + " " + interimChunk).trim();
      transcriptRef.current = finalText.trim() || combined;
      setInterimText(combined);
      setLiveWordCount(combined.split(/\s+/).filter(Boolean).length);
      if (!firstResultRef.current && combined) firstResultRef.current = Date.now();
    };

    rec.onerror = (e) => {
      if (e.error === "no-speech") {
        setStatus("No speech detected. Try speaking louder.");
      } else {
        setStatus("Couldn't hear clearly — try again.");
      }
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimText("");
      setLiveWordCount(0);
      const finalText = transcriptRef.current;
      if (!finalText) {
        setStatus("No speech detected. Try speaking a bit longer.");
        return;
      }
      const hesitationMs =
        firstResultRef.current && startTimeRef.current
          ? firstResultRef.current - startTimeRef.current
          : 0;
      setStatus("Captured! ✓");
      handleTranscript(finalText, { hesitationMs });
    };

    recognitionRef.current = rec;
    setIsListening(true);
    setStatus("Listening… speak now!");
    rec.start();
    logEvent(childProfile?.id, "voice_start", { mode, lang: language, promptId: activePrompt?.id });
  };

  const stopListening = () => {
    stopRecognition();
    setIsListening(false);
    setStatus("Stopped.");
  };

  const handleManualSubmit = () => {
    if (!manualText.trim()) return;
    handleTranscript(manualText.trim(), { manual: true, hesitationMs: 0 });
    setManualText("");
  };

  const handleSpeakPrompt = () => {
    if (!activePrompt?.nativeText) return;
    speakText(activePrompt.nativeText, languageMeta.speechCode, style);
  };

  const handleRetry = () => {
    setTranscript("");
    setStatus("Try again whenever you're ready.");
    setDecision(null);
    setFeedback(null);
    setScore(null);
    setChips(defaultChips);
  };

  const handleAdvance = () => {
    setPromptIndex((p) => p + 1);
    setOverridePrompt(null);
    setSupportMessage("");
    setTranscript("");
    setDecision(null);
    setFeedback(null);
    setScore(null);
    setChips(defaultChips);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-sparkle px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-6xl"
      >
        {/* Header */}
        <motion.header
          variants={item}
          className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6 sm:gap-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Talk to a Friend
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-buddy-cocoa sm:text-3xl">
              Practice speaking with Buddy
            </h1>
          </div>
          <Link
            to="/home"
            className="inline-flex min-h-11 items-center rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5 sm:min-h-0"
          >
            ← Back home
          </Link>
          <div className="flex w-full items-start gap-3 sm:w-auto sm:items-center">
            {/* Language pills in header */}
            <div className="flex flex-1 flex-wrap gap-1.5 sm:flex-none">
              {VOICE_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  className={`min-h-11 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:min-h-0 ${
                    language === lang.id
                      ? "bg-buddy-coral text-white shadow-soft"
                      : "bg-white/80 text-slate-600 hover:bg-buddy-peach/40"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <span className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-soft">
              {childProfile?.nickname || "Buddy"}
            </span>
          </div>
        </motion.header>

        {/* Main grid: mascot | chat+mic | coach */}
        <motion.section
          variants={item}
          className="grid grid-cols-1 gap-5 lg:grid-cols-[0.85fr_1.3fr_0.85fr]"
        >
          {/* ── Left: Mascot + settings (below the practice area on phones) ── */}
          <div className="order-last space-y-4 lg:order-none">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card text-center">
              <SpeechBubble
                text={
                  isListening
                    ? "I'm listening! 👂"
                    : mode === "guided"
                    ? "Let's try this together!"
                    : "Tell me anything you like."
                }
              />
              <div className="mt-4 flex justify-center">
                <Mascot3D />
              </div>
            </div>

            {/* Mode + voice style */}
            <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-card space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                  Mode
                </p>
                <div className="flex gap-2">
                  {["free", "guided"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`min-h-11 flex-1 rounded-full py-2 text-xs font-semibold transition sm:min-h-0 ${
                        mode === m
                          ? "bg-buddy-coral text-white shadow-soft"
                          : "bg-white/80 text-slate-600"
                      }`}
                    >
                      {m === "free" ? "🗣 Free Talk" : "🎯 Guided"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                  Voice style
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "gentle", label: "😊 Gentle" },
                    { id: "funny", label: "😄 Funny" },
                    { id: "adventurous", label: "🚀 Bold" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setStyle(id)}
                      className={`min-h-11 rounded-full px-3 py-1 text-xs font-semibold transition sm:min-h-0 ${
                        style === id
                          ? "bg-buddy-grape text-white shadow-soft"
                          : "bg-white/80 text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Middle: Prompt + chat + mic ── */}
          <div className="space-y-4">
            {!supportsSpeech && (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                ⚠️ This browser can't listen to speech, so the mic is off. Type your answer below instead, or open this page in Chrome.
              </p>
            )}
            {!hasVoice && mode === "guided" && (
              <p className="rounded-2xl bg-buddy-sky/40 px-4 py-3 text-sm font-semibold text-slate-600">
                🔇 This device has no {languageMeta.label} voice, so Buddy can't read aloud. Read the sentence on screen instead.
              </p>
            )}
            {/* Prompt card (guided mode) */}
            {mode === "guided" ? (
              <PromptCard
                prompt={activePrompt}
                onSpeak={handleSpeakPrompt}
                supportMessage={supportMessage}
                attempts={attempts}
                maxAttempts={3}
              />
            ) : (
              <div className="rounded-2xl border border-white/70 bg-white/85 p-4 text-sm text-slate-600 shadow-soft">
                🎙️ Say anything in {languageMeta.label}. Buddy will answer and ask you something back.
              </div>
            )}

            {/* Chat bubbles */}
            <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-card">
              <div className="max-h-[260px] space-y-2.5 overflow-y-auto pr-1">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm font-semibold ${
                      msg.role === "assistant"
                        ? "bg-buddy-mint/70 text-slate-700"
                        : "ml-auto bg-buddy-peach/70 text-slate-700"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Manual input fallback */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  placeholder="Type your answer…"
                  className="min-h-11 min-w-0 flex-1 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-base font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-buddy-grape/30 sm:min-h-0 sm:text-xs"
                />
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  className="min-h-11 rounded-full bg-buddy-grape px-4 py-2 text-xs font-semibold text-white shadow-soft sm:min-h-0"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Coach notes ── */}
          <CoachNotes
            mode={mode}
            score={score}
            decision={decision}
            feedback={feedback}
            chips={mode === "free" && chips === defaultChips ? [] : chips}
            onRetry={handleRetry}
            onAdvance={handleAdvance}
          />
        </motion.section>

        {/* ── Bottom bar: mic + live meter ── */}
        <motion.section
          variants={item}
          className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 mt-5 rounded-3xl border border-white/70 bg-white/95 px-4 py-3 shadow-card backdrop-blur sm:bottom-5 sm:px-6 sm:py-4"
        >
          {/* Live confidence meter */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 overflow-hidden"
              >
                <div className="rounded-2xl bg-buddy-grape/8 border border-buddy-grape/20 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Live — speaking
                    </p>
                    <span className="text-xs font-bold text-buddy-grape">
                      {liveWordCount} word{liveWordCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Word confidence bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-buddy-coral to-buddy-grape"
                      animate={{ width: `${Math.min(100, liveWordCount * 10)}%` }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    />
                  </div>
                  {/* Live text preview */}
                  <p className="text-xs italic text-slate-600 leading-relaxed min-h-[1.2rem]">
                    {interimText || <span className="text-slate-400">Waiting for speech…</span>}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3 sm:flex-wrap sm:gap-4">
            {/* Mic + status */}
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <MicButton
                isListening={isListening}
                disabled={!supportsSpeech}
                onStart={startListening}
                onStop={stopListening}
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Status
                </p>
                <p className="text-sm font-semibold text-slate-600">{status}</p>
              </div>
            </div>

            {/* Waveform (the mic's own rings show this on phones) */}
            <div className="hidden sm:block">
              <Waveform isActive={isListening} />
            </div>

            {/* Language + current lang indicator */}
            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="hidden sm:inline">Mic language:</span>
              <span className="rounded-full bg-buddy-coral/20 px-2 py-1 text-buddy-coral font-bold">
                {languageMeta.label}
              </span>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
