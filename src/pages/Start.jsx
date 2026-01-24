import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSession } from "../context/SessionContext.jsx";

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function Start() {
  const navigate = useNavigate();
  const { childProfile, session, switchChild } = useSession();
  const progress = childProfile?.progress_summary || {};

  const resumePath = childProfile?.onboarding
    ? progress?.lastStoryId
      ? `/stories/${progress.lastStoryId}`
      : "/stories"
    : "/signup";

  const handleSwitch = () => {
    switchChild();
    navigate("/start", { replace: true });
  };

  return (
    <div className="min-h-screen bg-sparkle px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Welcome to Parampara
          </p>
          <h1 className="font-display text-3xl font-semibold text-buddy-cocoa sm:text-4xl">
            Choose how you want to start
          </h1>
          <p className="text-sm text-slate-600">
            Parents set up family access. Kids jump back in with a kid code.
          </p>
        </header>

        {session && childProfile ? (
          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
                  Resume where you left off
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {childProfile.nickname} · {childProfile.preferred_language || "Language"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(resumePath)}
                  className="rounded-full bg-buddy-grape px-5 py-2 text-sm font-semibold text-white shadow-soft"
                >
                  Continue learning
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSwitch}
                  className="rounded-full bg-white/90 px-5 py-2 text-sm font-semibold text-slate-600 shadow-soft"
                >
                  Switch child
                </motion.button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-buddy-mint/60 px-4 py-3 text-sm font-semibold text-slate-700">
                Total minutes: {progress.totalMinutes ?? 0}
              </div>
              <div className="rounded-2xl bg-buddy-peach/60 px-4 py-3 text-sm font-semibold text-slate-700">
                Streak days: {progress.streakDays ?? 0}
              </div>
              <div className="rounded-2xl bg-buddy-sky/60 px-4 py-3 text-sm font-semibold text-slate-700">
                Last story: {progress.lastStoryId || "Not yet"}
              </div>
              <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700">
                Level: {childProfile.level || "starter"}
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-card"
          >
            <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
              I&apos;m a Parent
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Set a PIN, add your child, and get a kid code to share.
            </p>
            <Link
              to="/parent-setup"
              className="mt-5 inline-flex rounded-full bg-buddy-grape px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
            >
              Set up family
            </Link>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
            className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-card"
          >
            <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
              I&apos;m a Kid
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter your kid code and parent PIN to jump in.
            </p>
            <Link
              to="/kid-join"
              className="mt-5 inline-flex rounded-full bg-buddy-coral px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
            >
              I have a code
            </Link>
            <div className="mt-3 text-xs font-semibold text-slate-500">
              No code yet?{" "}
              <Link
                to="/signup"
                className="text-buddy-grape transition hover:text-buddy-coral"
              >
                Start with a parent setup
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
