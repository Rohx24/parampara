import React, { useEffect, useMemo, useRef, useState, Component } from "react";
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Signup from "./pages/Signup.jsx";
import Journey from "./pages/Journey.jsx";
import Stories from "./pages/Stories.jsx";
import StoryPlayer from "./pages/StoryPlayer.jsx";
import Parents from "./pages/Parents.jsx";
import HomeLoggedIn from "./pages/HomeLoggedIn.jsx";
import Games from "./pages/Games.jsx";
import LetterMatchGame from "./games/LetterMatch/LetterMatchGame.jsx";
import FlashCardsGame from "./games/FlashCards/FlashCardsGame.jsx";
import WordScrambleGame from "./games/WordScramble/WordScrambleGame.jsx";
import SpellingBeeGame from "./games/SpellingBee/SpellingBeeGame.jsx";
import WordMatchGame from "./games/WordMatch/WordMatchGame.jsx";
import VoiceCoach from "./pages/VoiceCoach.jsx";
import MakeStory from "./pages/MakeStory.jsx";
import ParentDashboard from "./pages/ParentDashboard.jsx";
import OutcomeDashboard from "./pages/OutcomeDashboard.jsx";
import DatasetEval from "./pages/DatasetEval.jsx";
import Start from "./pages/Start.jsx";
import ParentSetup from "./pages/ParentSetup.jsx";
import KidJoin from "./pages/KidJoin.jsx";
import Mascot3D from "./components/Mascot3D.jsx";
import OnboardingTour from "./components/OnboardingTour.jsx";
import { useSession } from "./context/SessionContext.jsx";
import { getActiveCue, useVttCues } from "./hooks/useVttCues.js";
import { speakText } from "./lib/voice.js";

const languages = [
  {
    id: "tamil",
    label: "Tamil",
    subtitle: "Vaanga, oru kathai ketpom",
    messages: [
      "Vanakkam!",
      "Kadhai kelunga!",
      "Hello!",
      "Come listen to a story!",
    ],
  },
  {
    id: "telugu",
    label: "Telugu",
    subtitle: "Randi, oka kadha vinadam",
    messages: [
      "Namaskaram!",
      "Katha vineddama?",
      "Hello!",
      "Come listen to a story!",
    ],
  },
  {
    id: "hindi",
    label: "Hindi",
    subtitle: "Aao, kahani sunte hain",
    messages: [
      "Namaste!",
      "Kahani sunoge?",
      "Hello!",
      "Come listen to a story!",
    ],
  },
  {
    id: "kannada",
    label: "Kannada",
    subtitle: "Banni, ondu kathe kelona",
    messages: [
      "Namaskara!",
      "Kathe kelona!",
      "Hello!",
      "Come listen to a story!",
    ],
  },
];

const previewSubtitleTracks = {
  tamil: [
    {
      start: 0,
      end: 8,
      text: "அமைதியான குளிர்கால காலை ஒன்றில், ஒரு சிறிய பறவை வழி தவறியது. ஒரு குழந்தை அதை கவனித்து ஆர்வமாக இருந்தது.",
    },
    { start: 8, end: 12, text: "அந்தச் சிறிய பறவை பயந்தது." },
    {
      start: 12,
      end: 24,
      text: "பாட்டி மெதுவாக குழந்தைக்கு கவனமாக இருக்கச் சொன்னாள். சிறிய உயிர்களுக்கு கருணையும் இடமும் தேவை.",
    },
    { start: 24, end: 32, text: "அக்குழந்தை அமைதியாகவும் மெல்லவும் இருக்க கற்றுக்கொண்டது." },
    {
      start: 32,
      end: 40,
      text: "அவர்கள் அந்தப் பறவைக்கு வீடு தேடும் வழியை கண்டுபிடிக்க உதவினர்.",
    },
    {
      start: 40,
      end: 52,
      text: "அந்தச் சிறிய பறவை மீண்டும் பாதுகாப்பாக இருந்தது; உதவியது குழந்தையை பெருமையும் மகிழ்ச்சியும் உணரச் செய்தது.",
    },
    {
      start: 52,
      end: 60,
      text: "விலங்குகளை பாதுகாப்பது அனைத்து உயிர்களுக்குமான கருணையை காட்டுகிறது.",
    },
  ],
  telugu: [
    {
      start: 0,
      end: 8,
      text: "నిశ్శబ్దమైన చలికాల ఉదయాన ఒక చిన్న పక్షి దారి తప్పింది. ఒక చిన్నారి దాన్ని గమనించి ఆసక్తిగా అనిపించింది.",
    },
    { start: 8, end: 12, text: "ఆ చిన్న పక్షి భయపడింది." },
    {
      start: 12,
      end: 24,
      text: "బామ్మ మెల్లగా పిల్లవాడిని జాగ్రత్తగా ఉండమని గుర్తు చేసింది. చిన్న జంతువులకు దయా భావం, కొంచెం స్థలం అవసరం.",
    },
    {
      start: 24,
      end: 32,
      text: "ఆ పిల్లాడు శాంతంగా, నిశ్శబ్దంగా ఉండడం నేర్చుకున్నాడు.",
    },
    {
      start: 32,
      end: 40,
      text: "వారు ఆ పక్షికి ఇంటికి దారి కనుగొనడానికి సహాయపడ్డారు.",
    },
    {
      start: 40,
      end: 52,
      text: "ఆ చిన్న పక్షి మళ్లీ సురక్షితంగా ఉండింది; సహాయం చేయడం వల్ల పిల్లవాడికి గర్వం, ఆనందం కలిగింది.",
    },
    {
      start: 52,
      end: 60,
      text: "జంతువులను కాపాడటం అన్ని జీవుల పట్ల కరుణను చూపిస్తుంది.",
    },
  ],
  hindi: [
    {
      start: 0,
      end: 8,
      text: "शांत सर्द सुबह में एक छोटी चिड़िया रास्ता भटक गई। एक बच्चे ने उसे देखा और जिज्ञासा हुई।",
    },
    { start: 8, end: 12, text: "वह छोटी चिड़िया डर गई थी।" },
    {
      start: 12,
      end: 24,
      text: "दादी ने धीरे से बच्चे को सावधान रहने को कहा। छोटे जानवरों को दया और जगह चाहिए।",
    },
    { start: 24, end: 32, text: "बच्चे ने शांत और चुप रहना सीख लिया।" },
    {
      start: 32,
      end: 40,
      text: "उन्होंने चिड़िया को घर का रास्ता ढूँढने में मदद की।",
    },
    {
      start: 40,
      end: 52,
      text: "छोटी चिड़िया फिर सुरक्षित थी; मदद करने से बच्चे को गर्व और खुशी हुई।",
    },
    {
      start: 52,
      end: 60,
      text: "जानवरों की रक्षा करना सभी जीवन के प्रति देखभाल दिखाता है।",
    },
  ],
  kannada: [
    {
      start: 0,
      end: 8,
      text: "ನಿಶ್ಶಬ್ದ ಚಳಿಗಾಲದ ಬೆಳಿಗ್ಗೆ ಒಂದು ಸಣ್ಣ ಹಕ್ಕಿ ದಾರಿ ತಪ್ಪಿತು. ಒಂದು ಮಗು ಅದನ್ನು ನೋಡಿ ಕುತೂಹಲದಿಂದಿತ್ತು.",
    },
    { start: 8, end: 12, text: "ಆ ಸಣ್ಣ ಹಕ್ಕಿ ಭಯಪಟ್ಟಿತು." },
    {
      start: 12,
      end: 24,
      text: "ಅಜ್ಜಿ ಮೃದುವಾಗಿ ಮಗುವಿಗೆ ಜಾಗರೂಕವಾಗಿರಲು ಹೇಳಿದಳು. ಸಣ್ಣ ಪ್ರಾಣಿಗಳಿಗೆ ದಯೆಯೂ ಸ್ಥಳವೂ ಬೇಕು.",
    },
    { start: 24, end: 32, text: "ಮಗು ಶಾಂತವಾಗಿ, ನಿಶ್ಶಬ್ದವಾಗಿ ಇರುವುದನ್ನು ಕಲಿತಿತು." },
    {
      start: 32,
      end: 40,
      text: "ಅವರು ಹಕ್ಕಿಗೆ ಮನೆ ದಾರಿ ಕಂಡುಕೊಳ್ಳಲು ಸಹಾಯ ಮಾಡಿದರು.",
    },
    {
      start: 40,
      end: 52,
      text: "ಸಣ್ಣ ಹಕ್ಕಿ ಮತ್ತೆ ಸುರಕ್ಷಿತವಾಗಿತ್ತು; ಸಹಾಯ ಮಾಡಿದ್ದು ಮಗುವಿಗೆ ಹೆಮ್ಮೆ ಮತ್ತು ಸಂತೋಷ ನೀಡಿತು.",
    },
    {
      start: 52,
      end: 60,
      text: "ಪ್ರಾಣಿಗಳನ್ನು ಕಾಪಾಡುವುದು ಎಲ್ಲಾ ಜೀವಗಳ ಮೇಲಿನ ಕಾಳಜಿಯನ್ನು ತೋರಿಸುತ್ತದೆ.",
    },
  ],
};

const heroContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const MotionLink = motion(Link);

function App() {
  const location = useLocation();
  const { session, sessionReady } = useSession();
  const publicRoutes = ["/", "/parents", "/start", "/parent-setup", "/kid-join", "/signup"];
  const isPublicRoute = publicRoutes.some((path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)
  );

  if (!sessionReady) {
    return <div className="min-h-screen bg-sparkle" />;
  }

  if (!session && !isPublicRoute) {
    return <Navigate to="/start" replace />;
  }

  return (
    <div className="min-h-screen bg-sparkle overflow-x-hidden">
      <OnboardingTour />
      <Routes>
        <Route path="/start" element={<Start />} />
        <Route path="/parent-setup" element={<ParentSetup />} />
        <Route path="/kid-join" element={<KidJoin />} />
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/home"
          element={session ? <HomeLoggedIn /> : <Navigate to="/start" replace />}
        />
        <Route path="/parents" element={<Parents />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/journey" element={<Journey />} />
        <Route path="/stories" element={<Stories />} />
        <Route path="/stories/:id" element={<StoryPlayer />} />
        <Route path="/voice" element={<VoiceCoach />} />
        <Route path="/make-story" element={<MakeStory />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/letter-match" element={<LetterMatchGame />} />
        <Route path="/games/flash-cards" element={<FlashCardsGame />} />
        <Route path="/games/word-scramble" element={<WordScrambleGame />} />
        <Route path="/games/spelling-bee" element={<SpellingBeeGame />} />
        <Route path="/games/word-match" element={<WordMatchGame />} />
        <Route path="/parent-dashboard" element={<ParentDashboard />} />
        <Route path="/outcome-dashboard" element={<OutcomeDashboard />} />
        <Route path="/dataset-eval" element={<DatasetEval />} />
      </Routes>
    </div>
  );
}

function LandingPage() {
  const { childProfile } = useSession();
  const [selected, setSelected] = useState(languages[0]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const defaultBuddyMessage = "Hi, I'm Buddy!";
  const [buddyMessage, setBuddyMessage] = useState(defaultBuddyMessage);

  const resetBuddyMessage = () => setBuddyMessage(defaultBuddyMessage);
  const showBuddyMessage = (message) => () => setBuddyMessage(message);

  const subtitle = selected.subtitle;
  const speechText = selected.messages[0];

  return (
    <div className="relative overflow-hidden">
      <FloatingCloud
        className="left-6 top-20 lg:top-102"
        duration={40}
        size="lg"
        src="/cloud%202.png"
      />
      <FloatingCloud
        className="right-6 top-48 lg:top-36"
        duration={46}
        size="md"
        src="/cloud%202.png"
      />
      <BouncingStar className="left-1/2 top-36 lg:top-28" />

      <Navbar />

      <main className="relative z-10 px-6 pb-20 pt-14 sm:px-10 lg:px-16">
        <section className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            variants={heroContainer}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <motion.div variants={heroItem} className="pt-4 sm:pt-6">
              <SpeechBubble text={speechText} />
            </motion.div>
            <motion.h1
              variants={heroItem}
              className="font-display text-4xl font-semibold tracking-tight text-buddy-cocoa sm:text-5xl lg:text-6xl"
            >
              Language feels like a friend.
            </motion.h1>
            <motion.p
              variants={heroItem}
              className="max-w-xl text-lg text-slate-700 sm:text-xl"
            >
              Kids learn Indian languages through stories, voice, and play — no pressure.
            </motion.p>
            <motion.div variants={heroItem} className="flex flex-wrap gap-4">
              <MotionLink
                to="/signup"
                aria-label="Create free account"
                onMouseEnter={showBuddyMessage("Create a free account")}
                onMouseLeave={resetBuddyMessage}
                onFocus={showBuddyMessage("Create a free account")}
                onBlur={resetBuddyMessage}
                className="rounded-full bg-buddy-grape px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                Create free account
              </MotionLink>
              <motion.button
                type="button"
                aria-label="Watch a 20-second preview"
                onMouseEnter={showBuddyMessage("Watch a 20-sec preview")}
                onMouseLeave={resetBuddyMessage}
                onFocus={showBuddyMessage("Watch a 20-sec preview")}
                onBlur={resetBuddyMessage}
                onClick={() => setPreviewOpen(true)}
                whileTap={{ scale: 0.96 }}
                className="rounded-full border border-white/60 bg-white/70 px-6 py-3 text-base font-semibold text-buddy-cocoa shadow-soft backdrop-blur transition hover:-translate-y-0.5"
              >
                Watch a 20-sec preview
              </motion.button>
            </motion.div>
            {childProfile ? (
              <motion.div
                variants={heroItem}
                className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-600 shadow-soft"
              >
                Resume for {childProfile.nickname} ·{" "}
                {childProfile.preferred_language || "Language"} · Level{" "}
                {childProfile.level || "starter"}
              </motion.div>
            ) : null}
            <motion.div variants={heroItem} className="flex flex-wrap gap-3">
              {languages.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  aria-label={`Select ${language.label}`}
                  onClick={() => setSelected(language)}
                  onMouseEnter={showBuddyMessage(`Watch in ${language.label}`)}
                  onMouseLeave={resetBuddyMessage}
                  onFocus={showBuddyMessage(`Watch in ${language.label}`)}
                  onBlur={resetBuddyMessage}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selected.id === language.id
                      ? "bg-buddy-coral text-white shadow-soft"
                      : "bg-white/70 text-buddy-cocoa"
                  }`}
                >
                  {language.label}
                </button>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            variants={heroItem}
            initial="hidden"
            animate="show"
            className="relative flex flex-col items-center justify-center gap-6 lg:flex-row"
          >
            <div className="order-2 hidden lg:flex lg:order-none lg:mr-10 lg:-translate-x-2 lg:flex-col lg:items-center lg:gap-3">
              <SpeechBubble text={buddyMessage} className="text-center" />
              <Mascot3D />
            </div>
            <TabletMock
              subtitle={subtitle}
              className="lg:scale-[1.03]"
              subtitleTracks={previewSubtitleTracks}
              subtitleLangId={selected.id}
            />
          </motion.div>
        </section>

        {/* ── Stats banner ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { value: "5", label: "Indian languages", icon: "🌏" },
            { value: "AI", label: "Powered quizzes", icon: "🧠" },
            { value: "100%", label: "Kid-safe design", icon: "🔒" },
            { value: "Free", label: "To get started", icon: "🎁" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/60 bg-white/75 p-4 text-center shadow-soft">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="font-display text-2xl font-extrabold text-buddy-cocoa">{s.value}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.section>

        {/* ── Feature cards ── */}
        <section id="stories" className="mt-16 scroll-mt-24">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 text-center">
            <h2 className="font-display text-3xl font-extrabold text-buddy-cocoa sm:text-4xl">Everything a child needs to learn</h2>
            <p className="mt-2 text-slate-600">Four fun activities — powered by real AI, built for Indian families.</p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "🎬",
                bg: "bg-red-50",
                iconBg: "bg-red-100",
                title: "YouTube Lessons",
                desc: "Search any topic — animals, space, food. AI generates vocab cards, MCQ quizzes, and speaking exercises from real videos.",
                badge: "AI Quiz",
                badgeColor: "bg-red-100 text-red-600",
                to: "/stories",
              },
              {
                icon: "🎤",
                bg: "bg-purple-50",
                iconBg: "bg-purple-100",
                title: "Voice Coach",
                desc: "Buddy listens as your child speaks. Real-time pronunciation scoring, confidence meter, and friendly tips.",
                badge: "Speech AI",
                badgeColor: "bg-purple-100 text-purple-600",
                to: "/voice",
              },
              {
                icon: "✨",
                bg: "bg-amber-50",
                iconBg: "bg-amber-100",
                title: "Story Builder",
                desc: "Type any idea and AI writes a personalised story in 5 languages with a comprehension quiz at the end.",
                badge: "GPT-4o",
                badgeColor: "bg-amber-100 text-amber-600",
                to: "/make-story",
              },
              {
                icon: "🎮",
                bg: "bg-emerald-50",
                iconBg: "bg-emerald-100",
                title: "Word Games",
                desc: "Flash Cards, Word Scramble, and Letter Match — three games that build vocabulary while having fun.",
                badge: "3 Games",
                badgeColor: "bg-emerald-100 text-emerald-600",
                to: "/games",
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className={`rounded-3xl border border-white/60 ${card.bg} p-6 shadow-card flex flex-col gap-4`}
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconBg} text-2xl`}>
                  {card.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-display text-base font-extrabold text-buddy-cocoa">{card.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${card.badgeColor}`}>{card.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{card.desc}</p>
                </div>
                <MotionLink
                  to={card.to}
                  className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-buddy-grape hover:gap-2 transition-all"
                  whileHover={{ x: 2 }}
                >
                  Try it free →
                </MotionLink>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="mt-20">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 text-center">
            <h2 className="font-display text-3xl font-extrabold text-buddy-cocoa sm:text-4xl">How it works</h2>
            <p className="mt-2 text-slate-600">Three steps — no setup, no pressure.</p>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { step: "1", icon: "👤", title: "Create a profile", desc: "Tell Buddy your child's name, age, and preferred language. Takes 30 seconds.", color: "border-buddy-grape/30 bg-buddy-grape/5" },
              { step: "2", icon: "🎯", title: "Pick an activity", desc: "Watch a YouTube lesson, speak with Buddy, write a story, or play a word game.", color: "border-buddy-coral/30 bg-buddy-coral/5" },
              { step: "3", icon: "📊", title: "Track progress", desc: "The Parent Dashboard shows daily minutes, skill scores, and an AI-written weekly report.", color: "border-emerald-300/60 bg-emerald-50/60" },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className={`rounded-3xl border-2 ${s.color} p-6 shadow-soft relative overflow-hidden`}
              >
                <div className="absolute -right-3 -top-3 text-7xl font-extrabold text-slate-100/80 select-none">{s.step}</div>
                <div className="text-4xl mb-3">{s.icon}</div>
                <h3 className="font-display text-lg font-extrabold text-buddy-cocoa">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Language showcase ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-20 rounded-3xl border border-white/60 bg-white/70 p-8 shadow-card text-center"
        >
          <h2 className="font-display text-2xl font-extrabold text-buddy-cocoa">Supports the languages your family speaks</h2>
          <p className="mt-2 text-slate-600 text-sm">Your child learns in their mother tongue — English comes naturally.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {[
              { lang: "Hindi", native: "हिन्दी", color: "bg-orange-50 border-orange-200" },
              { lang: "Tamil", native: "தமிழ்", color: "bg-red-50 border-red-200" },
              { lang: "Telugu", native: "తెలుగు", color: "bg-purple-50 border-purple-200" },
              { lang: "Kannada", native: "ಕನ್ನಡ", color: "bg-blue-50 border-blue-200" },
              { lang: "English", native: "English", color: "bg-emerald-50 border-emerald-200" },
            ].map((l) => (
              <div key={l.lang} className={`rounded-2xl border-2 ${l.color} px-5 py-3 text-center shadow-soft`}>
                <p className="font-display text-xl font-extrabold text-buddy-cocoa">{l.native}</p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{l.lang}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── For parents ── */}
        <section id="parents" className="mt-20 scroll-mt-24">
          <div className="grid gap-6 lg:grid-cols-2 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-xs font-bold uppercase tracking-widest text-buddy-grape mb-2">For Parents</p>
              <h2 className="font-display text-3xl font-extrabold text-buddy-cocoa">See progress, not just screen time</h2>
              <p className="mt-3 text-slate-600 leading-relaxed">
                The Parent Dashboard shows exactly what your child practiced, how their pronunciation improved, and what to work on next — with a weekly AI-written report in plain English.
              </p>
              <div className="mt-5 space-y-3">
                {[
                  { icon: "📈", text: "Skill scores: pronunciation, vocabulary, fluency, comprehension, reading" },
                  { icon: "📅", text: "Daily practice chart — see which days they practiced and for how long" },
                  { icon: "🤖", text: "AI Coach chat — ask any question about your child's learning journey" },
                  { icon: "🔒", text: "Kid-safe by design — no ads, no social features, no data sold" },
                ].map((f) => (
                  <div key={f.text} className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{f.icon}</span>
                    <p className="text-sm text-slate-600">{f.text}</p>
                  </div>
                ))}
              </div>
              <MotionLink
                to="/parent-dashboard"
                whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                className="mt-6 inline-block rounded-full bg-buddy-grape px-6 py-3 text-sm font-bold text-white shadow-soft transition"
              >
                View Parent Dashboard →
              </MotionLink>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { label: "Minutes this week", value: "103", icon: "⏱️", color: "bg-buddy-grape/10" },
                { label: "Day streak", value: "4 🔥", icon: "📅", color: "bg-amber-50" },
                { label: "Pronunciation", value: "72%", icon: "🎤", color: "bg-purple-50" },
                { label: "Comprehension", value: "80%", icon: "🧠", color: "bg-emerald-50" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl ${s.color} border border-white/60 p-4 shadow-soft text-center`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="font-display text-2xl font-extrabold text-buddy-cocoa">{s.value}</p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-20 rounded-3xl bg-gradient-to-br from-buddy-grape via-violet-500 to-buddy-coral p-10 text-center text-white shadow-2xl"
        >
          <div className="text-5xl mb-4">🦋</div>
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Ready to start learning?</h2>
          <p className="mt-3 text-white/80 text-lg">Free to try · No credit card · 5 languages · AI-powered</p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <MotionLink
              to="/signup"
              whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="rounded-full bg-white px-8 py-4 text-base font-extrabold text-buddy-grape shadow-xl"
            >
              Create free account →
            </MotionLink>
            <MotionLink
              to="/start"
              whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
              className="rounded-full border-2 border-white/50 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur"
            >
              Sign in
            </MotionLink>
          </div>
        </motion.section>
      </main>

      <footer className="mt-16 border-t border-white/40 px-6 pb-10 pt-8 sm:px-10 lg:px-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            <span className="font-display text-lg font-bold text-buddy-cocoa">BhashaBuddy</span>
          </div>
          <div className="flex flex-wrap gap-5 text-xs font-semibold text-slate-500">
            <MotionLink to="/parents" whileHover={{ y: -1 }} className="hover:text-buddy-grape transition">For Parents</MotionLink>
            <MotionLink to="/start" whileHover={{ y: -1 }} className="hover:text-buddy-grape transition">Sign In</MotionLink>
            <MotionLink to="/parent-dashboard" whileHover={{ y: -1 }} className="hover:text-buddy-grape transition">Dashboard</MotionLink>
          </div>
          <p className="text-xs text-slate-400">Made with warm stories and gentle voices · © 2026 BhashaBuddy</p>
        </div>
      </footer>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        language={selected}
        onLanguageChange={setSelected}
      />
    </div>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const { childProfile, switchChild } = useSession();
  const homeTarget = childProfile ? "/home" : "/";

  const handleSwitch = () => {
    switchChild();
    navigate("/start");
  };

  return (
    <header className="relative z-20 flex items-center justify-between px-6 pt-8 sm:px-10 lg:px-16">
      <MotionLink
        to={homeTarget}
        aria-label="BhashaBuddy home"
        className="flex items-center gap-3"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="rounded-2xl bg-white/70 p-2 shadow-soft">
          <BellIcon className="h-6 w-6" />
        </div>
        <span className="font-display text-2xl font-semibold text-buddy-cocoa">
          BhashaBuddy
        </span>
      </MotionLink>
      {!childProfile ? (
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
          <motion.a
            href="#stories"
            aria-label="Stories"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="transition hover:text-buddy-coral"
          >
            Stories
          </motion.a>
          <MotionLink
            to="/parents"
            aria-label="Parents"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="transition hover:text-buddy-coral"
          >
            Parents
          </MotionLink>
          <MotionLink
            to="/start"
            aria-label="Sign in"
            className="rounded-full bg-white/70 px-4 py-2 text-buddy-cocoa shadow-soft transition hover:-translate-y-0.5"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
          >
            Sign in
          </MotionLink>
        </nav>
      ) : null}
      {childProfile ? (
        <div className="flex flex-wrap items-center gap-2">
          <MotionLink
            to="/home"
            aria-label="Home"
            className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
          >
            Home
          </MotionLink>
          <span className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-soft">
            {childProfile.nickname} ·{" "}
            {childProfile.preferred_language || "Language"}
          </span>
          <button
            type="button"
            onClick={handleSwitch}
            className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
          >
            Switch
          </button>
        </div>
      ) : null}
      {!childProfile ? (
        <MotionLink
          to="/start"
          aria-label="Sign in"
          className="rounded-full bg-buddy-grape px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 md:hidden"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          Sign in
        </MotionLink>
      ) : null}
    </header>
  );
}

function FeatureCard({ title, description, icon }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="rounded-2xl border border-white/60 bg-white/75 p-6 shadow-card"
    >
      <div className="mb-4 inline-flex rounded-2xl bg-buddy-mint p-3">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-buddy-cocoa">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </motion.div>
  );
}

function TabletMock({
  subtitle,
  className = "",
  isPlaying,
  onTogglePlay,
  size = "sm",
  subtitleTracks,
  subtitleLangId,
}) {
  const videoRef = useRef(null);
  const [autoSubtitle, setAutoSubtitle] = useState(subtitle);
  const videoHeight =
    size === "lg" ? "h-56 sm:h-64" : "h-44";

  useEffect(() => {
    if (!onTogglePlay) return;
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [isPlaying, onTogglePlay]);

  useEffect(() => {
    if (!subtitleTracks || !subtitleLangId) {
      setAutoSubtitle(subtitle);
      return;
    }
    const cues = subtitleTracks[subtitleLangId] || [];
    const video = videoRef.current;
    if (!video || !cues.length) {
      setAutoSubtitle(subtitle);
      return;
    }

    const updateCue = () => {
      const time = video.currentTime;
      const cue =
        cues.find((item) => time >= item.start && time < item.end) ||
        cues[cues.length - 1];
      if (cue?.text) setAutoSubtitle(cue.text);
    };

    updateCue();
    video.addEventListener("timeupdate", updateCue);
    video.addEventListener("loadeddata", updateCue);
    return () => {
      video.removeEventListener("timeupdate", updateCue);
      video.removeEventListener("loadeddata", updateCue);
    };
  }, [subtitle, subtitleLangId, subtitleTracks]);

  return (
    <div className={`relative ${className}`}>
      <div className="rounded-[2.5rem] bg-white/80 p-3 shadow-card">
        <div className="rounded-[2rem] border-2 border-white/80 bg-gradient-to-br from-white via-[#fef7f0] to-[#e9f6ff] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-buddy-coral" />
              Story Player
            </div>
            {onTogglePlay ? (
              <button
                type="button"
                aria-label="Toggle play"
                onClick={onTogglePlay}
                className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4 shadow-soft">
            <div
              className={`video-shimmer animate-shimmer relative ${videoHeight} overflow-hidden rounded-xl shadow-soft`}
            >
              <video
                ref={videoRef}
                muted
                loop
                playsInline
                autoPlay
                preload="auto"
                className="h-full w-full object-cover"
              >
                <source src="/trial-1.mp4" type="video/mp4" />
                <source src="/trial%201.mov" type="video/quicktime" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <div className="absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600">
                Little Mango Adventure
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 w-2.5 rounded-full ${
                      index < 3 ? "bg-buddy-grape" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <motion.button
                type="button"
                aria-label="Microphone"
                whileTap={{ scale: 0.92 }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-buddy-coral text-white shadow-soft"
              >
                <MicIcon className="h-6 w-6" />
              </motion.button>
            </div>

            <div className="mt-4 rounded-full bg-buddy-mint/70 px-4 py-2 text-center text-sm font-semibold text-slate-600">
              {subtitleTracks ? autoSubtitle : subtitle}
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-6 -top-6 hidden h-16 w-16 rounded-full bg-buddy-peach/70 blur-xl lg:block" />
    </div>
  );
}

function SpeechBubble({ text }) {
  return (
    <div className="relative ml-1 inline-flex max-w-[240px] rounded-2xl bg-white/80 px-5 py-3 text-sm font-semibold text-buddy-cocoa shadow-soft sm:ml-2 sm:max-w-[320px]">
      <AnimatePresence mode="wait">
        <motion.span
          key={text}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
      <span className="absolute -bottom-3 left-7 h-0 w-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-white/80 sm:left-9" />
    </div>
  );
}

function FloatingCloud({ className, duration = 36, size = "md", src }) {
  const width = size === "lg" ? "w-56" : "w-44";
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute z-0 ${className}`}
      animate={{ x: ["-6vw", "6vw", "-6vw"] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      <img
        src={src}
        alt=""
        className={`${width} h-auto drop-shadow-lg`}
        draggable="false"
      />
    </motion.div>
  );
}

function BouncingStar({ className }) {
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute z-0 ${className}`}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg className="h-10 w-10" viewBox="0 0 64 64" fill="none">
        <path
          d="M32 6l7.5 15.5L57 24l-12.5 12 3 17.5L32 45l-15.5 8.5 3-17.5L7 24l17.5-2.5L32 6z"
          fill="#FFD36D"
          stroke="#F7A94D"
          strokeWidth="2"
        />
      </svg>
    </motion.div>
  );
}

function PreviewModal({ open, onClose, language, onLanguageChange }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const lastCueRef = useRef("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [activeCue, setActiveCue] = useState("");

  const languageAssets = useMemo(
    () => ({
      tamil: { vtt: "/subtitles/ta.vtt", audio: "/audio/ta.mp3", speech: "ta-IN" },
      telugu: { vtt: "/subtitles/te.vtt", audio: "/audio/te.mp3", speech: "te-IN" },
      hindi: { vtt: "/subtitles/hi.vtt", audio: "/audio/hi.mp3", speech: "hi-IN" },
      kannada: { vtt: "/subtitles/kn.vtt", audio: "/audio/kn.mp3", speech: "kn-IN" },
    }),
    []
  );

  const activeLangId = language?.id || "tamil";
  const assets = languageAssets[activeLangId] || languageAssets.tamil;
  const { cues, loading, error } = useVttCues(open ? assets.vtt : null);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const focusableNodes = dialog
      ? Array.from(
          dialog.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        )
      : [];
    const first = focusableNodes[0];
    const last = focusableNodes[focusableNodes.length - 1];

    if (first) first.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab" && focusableNodes.length) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.focus) previouslyFocused.focus();
    };
  }, [open, onClose]);

  // Stop TTS when modal closes or muted
  useEffect(() => {
    if (!open || audioMuted) {
      window.speechSynthesis?.cancel();
    }
    if (!open) setIsPlaying(false);
  }, [open, audioMuted]);

  // Reset on language / open change
  useEffect(() => {
    lastCueRef.current = "";
    setActiveCue("");
    window.speechSynthesis?.cancel();
  }, [assets.vtt, open]);

  // Track active subtitle cue from video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateCue = () => {
      const cue = getActiveCue(cues, video.currentTime);
      setActiveCue(cue?.text || "");
    };
    updateCue();
    video.addEventListener("timeupdate", updateCue);
    video.addEventListener("loadeddata", updateCue);
    return () => {
      video.removeEventListener("timeupdate", updateCue);
      video.removeEventListener("loadeddata", updateCue);
    };
  }, [cues]);

  // Speak each new cue using the same speakText used in Voice Coach
  useEffect(() => {
    if (!activeCue || audioMuted || !isPlaying) return;
    if (activeCue === lastCueRef.current) return;
    lastCueRef.current = activeCue;
    speakText(activeCue, assets.speech, "gentle");
  }, [activeCue, audioMuted, isPlaying, assets.speech]);

  const startPlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    lastCueRef.current = "";
    setIsPlaying(true);
    try {
      await video.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const pausePlayback = () => {
    videoRef.current?.pause();
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  };

  useEffect(() => {
    if (open) {
      startPlayback();
    } else {
      pausePlayback();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtitleText = loading
    ? "Loading subtitles..."
    : error || !cues.length
    ? "Narration will play when story starts"
    : activeCue || "…";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Preview modal"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white/95 p-6 shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-xl font-semibold text-buddy-cocoa">
                Preview: Story player
              </h3>
              <button
                type="button"
                aria-label="Close preview"
                onClick={onClose}
                className="rounded-full bg-buddy-peach/60 px-3 py-2 text-xs font-semibold text-buddy-cocoa"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  aria-label={`Preview in ${lang.label}`}
                  onClick={() => onLanguageChange(lang)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    activeLangId === lang.id
                      ? "bg-buddy-coral text-white shadow-soft"
                      : "bg-white/80 text-buddy-cocoa"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <div className="relative overflow-hidden rounded-xl bg-slate-100">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-[320px] w-full object-cover sm:h-[360px]"
                  >
                    <source src="/trial-1.mp4" type="video/mp4" />
                    <source src="/trial%201.mov" type="video/quicktime" />
                  </video>
                  <div className="absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    Little Mango Adventure
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={isPlaying ? pausePlayback : startPlayback}
                    className="rounded-full bg-buddy-grape px-4 py-2 text-xs font-semibold text-white shadow-soft"
                  >
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioMuted((prev) => !prev)}
                    className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft"
                  >
                    {audioMuted ? "🔇 Unmute" : "🔊 Mute narration"}
                  </button>
                </div>

                <div className="mt-4 rounded-full bg-buddy-mint/70 px-4 py-2 text-center text-sm font-semibold text-slate-600">
                  {subtitleText}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-white/70 bg-white/85 p-4 text-sm text-slate-600 shadow-soft">
                  <p className="font-bold text-buddy-cocoa mb-1">🎧 Tip</p>
                  Use headphones for the best experience. Pause the story and ask your child to repeat the highlighted words aloud!
                </div>
                <div className="rounded-2xl bg-buddy-mint/40 border border-buddy-mint/60 p-4 text-sm text-slate-600">
                  <p className="font-bold text-buddy-cocoa mb-1">✨ What happens next?</p>
                  After the story, Buddy asks comprehension questions and gives pronunciation feedback — all in your child's native language.
                </div>
                <div className="rounded-2xl bg-buddy-peach/30 border border-buddy-peach/50 p-4 text-sm text-slate-600">
                  <p className="font-bold text-buddy-cocoa mb-1">🌐 5 languages supported</p>
                  Hindi · Tamil · Telugu · Kannada · English — switch anytime.
                </div>
              </div>
            </div>

          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function BookIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none">
      <path
        d="M10 16c0-4 3-6 7-6h21c4 0 7 3 7 7v31c0 4-3 7-7 7H17c-4 0-7-3-7-7V16Z"
        fill="#FFFFFF"
        stroke="#FF7D6B"
        strokeWidth="2"
      />
      <path
        d="M45 16c0-4 3-6 7-6h7c4 0 7 3 7 7v31c0 4-3 7-7 7h-7"
        stroke="#7B6CF6"
        strokeWidth="2"
      />
      <path d="M18 24h18" stroke="#FF7D6B" strokeWidth="2" />
      <path d="M18 32h18" stroke="#FF7D6B" strokeWidth="2" />
      <path d="M18 40h18" stroke="#FF7D6B" strokeWidth="2" />
    </svg>
  );
}

function BellIcon({ className = "h-7 w-7" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path
        d="M32 8c9 0 16 7 16 16v8c0 6 3 11 8 14v4H8v-4c5-3 8-8 8-14v-8c0-9 7-16 16-16Z"
        fill="#FFD36D"
        stroke="#F7A94D"
        strokeWidth="2"
      />
      <path
        d="M24 52c2 4 6 6 8 6s6-2 8-6"
        stroke="#F7A94D"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <rect x="22" y="10" width="20" height="30" rx="10" fill="#FFFFFF" />
      <path
        d="M16 30c0 9 7 16 16 16s16-7 16-16"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M32 46v8" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 56h16" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none">
      <rect
        x="18"
        y="8"
        width="28"
        height="48"
        rx="10"
        fill="#CBE9FF"
        stroke="#7B6CF6"
        strokeWidth="2"
      />
      <rect x="24" y="16" width="16" height="24" rx="4" fill="#FFFFFF" />
      <circle cx="32" cy="46" r="3" fill="#7B6CF6" />
    </svg>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error("App error boundary caught:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-buddy-sky gap-4 p-8 text-center">
          <div className="text-6xl">🦋</div>
          <h2 className="font-display text-2xl font-extrabold text-buddy-cocoa">Oops, something went wrong!</h2>
          <p className="text-slate-500 max-w-xs">Don't worry — just tap the button below to go back to the home screen.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = "/home"; }}
            className="rounded-full bg-buddy-grape px-8 py-3 font-bold text-white shadow-soft"
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithBoundary;
