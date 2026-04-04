import React from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import Mascot3D from "../components/Mascot3D.jsx";
import SpeechBubble from "../components/SpeechBubble.jsx";
import MascotChat from "../components/MascotChat.jsx";
import { useSession } from "../context/SessionContext.jsx";
import { resetTour } from "../components/OnboardingTour.jsx";

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

const gamesEnabled = true;

const actionCards = [
  {
    id: "stories",
    title: "YouTube Lessons",
    description: "Search real videos, build vocabulary, and take AI-generated quizzes.",
    to: "/stories",
    enabled: true,
    icon: <BookIcon />,
  },
  {
    id: "voice",
    title: "Talk to Buddy",
    description: "Speak in your language — Buddy listens and gives friendly feedback.",
    to: "/voice",
    enabled: true,
    icon: <MicIcon />,
  },
  {
    id: "make-story",
    title: "Make My Story",
    description: "Type an idea and AI writes a full story with a quiz at the end.",
    to: "/make-story",
    enabled: true,
    icon: <SparkleIcon />,
  },
  {
    id: "games",
    title: "Games",
    description: "Quick language games for daily practice.",
    to: "/games",
    enabled: gamesEnabled,
    icon: <GameIcon />,
  },
];

const progressChips = [
  { label: "Minutes this week", value: "20+" },
  { label: "Words improving", value: "12" },
  { label: "Streak", value: "3 days" },
];

export default function HomeLoggedIn() {
  const navigate = useNavigate();
  const { childProfile, logout } = useSession();
  const nickname = childProfile?.nickname || "Buddy";
  const language = childProfile?.preferred_language || "Language";
  const level = childProfile?.level || "starter";
  const handleLogout = () => {
    logout();
    navigate("/start", { replace: true });
  };

  const handleRetakeTour = () => {
    resetTour();
    window.location.reload();
  };

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-10 top-24 h-28 w-28 rounded-full bg-buddy-mint/50 blur-3xl" />
      <div className="pointer-events-none absolute right-6 top-16 h-24 w-24 rounded-full bg-buddy-peach/60 blur-3xl" />

      <main className="relative z-10 px-6 pb-12 pt-10 sm:px-10 lg:px-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft">
            Resume for {nickname} · {language} · Level {level}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRetakeTour}
              className="rounded-full bg-buddy-mint/60 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
            >
              🗺️ Tour
            </button>
            <Link
              to="/parent-dashboard"
              className="rounded-full bg-buddy-grape/10 px-4 py-2 text-xs font-semibold text-buddy-grape shadow-soft transition hover:-translate-y-0.5"
            >
              Parent Dashboard 📊
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
            >
              Log out
            </button>
          </div>
        </div>
        <motion.section
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="space-y-6">
            <motion.h1
              variants={heroItem}
              className="font-display text-4xl font-semibold tracking-tight text-buddy-cocoa sm:text-5xl"
            >
              Welcome back, {nickname}.
            </motion.h1>
            <motion.p
              variants={heroItem}
              className="max-w-xl text-lg text-slate-700"
            >
              Pick up where you left off or try something new today.
            </motion.p>
            <motion.div variants={heroItem} className="flex flex-wrap gap-3">
              {progressChips.map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft"
                >
                  {chip.label}: {chip.value}
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            variants={heroItem}
            className="relative flex flex-col items-center gap-4"
          >
            <SpeechBubble text={`What will we learn today, ${nickname}?`} />
            <Mascot3D className="lg:scale-[1.03]" />
            <MascotChat nickname={nickname} language={language} />
          </motion.div>
        </motion.section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-6 sm:grid-cols-2">
            {actionCards.map((card) => (
              <ActionCard key={card.id} {...card} />
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex h-full flex-col justify-between gap-6"
          >
            <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-soft">
              <h3 className="font-display text-xl font-semibold text-buddy-cocoa">
                Recommended for today
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Search a YouTube lesson in {language} and take the AI quiz.
              </p>
              <MotionLink
                to="/stories"
                className="mt-4 inline-flex rounded-full bg-buddy-grape px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                Start a lesson 🎬
              </MotionLink>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-6 text-sm font-semibold text-slate-600 shadow-soft">
              Keep your streak by practicing for 5 minutes today.
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

function ActionCard({ title, description, to, enabled, icon }) {
  const content = (
    <>
      <div className="mb-4 inline-flex rounded-2xl bg-buddy-mint p-3">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-buddy-cocoa">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span>{enabled ? "Open" : "Coming soon"}</span>
      </div>
    </>
  );

  const baseClass = `rounded-2xl border border-white/60 p-6 shadow-card transition ${
    enabled ? "bg-white/85" : "bg-white/60 opacity-70"
  }`;

  if (!enabled) {
    return (
      <motion.div
        className={baseClass}
        aria-disabled="true"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <MotionLink
      to={to}
      className={baseClass}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
    >
      {content}
    </MotionLink>
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

function MicIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none">
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

function PencilIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none">
      <path
        d="M16 48l6 6 28-28-6-6-28 28Z"
        fill="#FFFFFF"
        stroke="#7B6CF6"
        strokeWidth="2"
      />
      <path d="M40 14l6 6" stroke="#7B6CF6" strokeWidth="2" />
      <path d="M14 50l10-2-8-8-2 10Z" fill="#FFB4A3" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none">
      <path d="M32 8 L36 28 L56 32 L36 36 L32 56 L28 36 L8 32 L28 28 Z" fill="#FFD700" stroke="#FF9900" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M52 12 L54 20 L62 22 L54 24 L52 32 L50 24 L42 22 L50 20 Z" fill="#FFE566" opacity="0.7"/>
      <path d="M14 44 L15.5 49 L20 50.5 L15.5 52 L14 57 L12.5 52 L8 50.5 L12.5 49 Z" fill="#FFE566" opacity="0.6"/>
    </svg>
  );
}

function GameIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none">
      <rect
        x="10"
        y="18"
        width="44"
        height="28"
        rx="10"
        fill="#CBE9FF"
        stroke="#7B6CF6"
        strokeWidth="2"
      />
      <path d="M24 32h-6" stroke="#7B6CF6" strokeWidth="3" strokeLinecap="round" />
      <path d="M21 29v6" stroke="#7B6CF6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="30" r="2.5" fill="#FF7D6B" />
      <circle cx="46" cy="34" r="2.5" fill="#FFB4A3" />
    </svg>
  );
}
