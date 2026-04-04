import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSession } from "../context/SessionContext.jsx";
import { fetchFamilyById, hashPin } from "../lib/db";

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function Start() {
  const navigate = useNavigate();
  const { childProfile, session, loginChild, switchChild } = useSession();
  const progress = childProfile?.progress_summary || {};
  const [copied, setCopied] = useState(false);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const handleSwitch = () => {
    switchChild();
    navigate("/start", { replace: true });
  };

  const handleOpenPin = () => {
    if (!childProfile?.id) return;
    setPinValue("");
    setPinError("");
    setPinPromptOpen(true);
  };

  const handleClosePin = () => {
    if (pinLoading) return;
    setPinPromptOpen(false);
  };

  const handlePinSubmit = async (event) => {
    event.preventDefault();
    setPinError("");
    const trimmed = pinValue.trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      setPinError("Enter your 4-6 digit PIN.");
      return;
    }
    const familyId = childProfile?.family_id || session?.familyId;
    if (!familyId) {
      setPinError("We couldn't find your family. Please log in again.");
      return;
    }
    setPinLoading(true);
    try {
      const family = await fetchFamilyById(familyId);
      if (!family) {
        setPinError("Family not found. Please ask your parent to re-check setup.");
        return;
      }
      const pinHash = await hashPin(trimmed);
      if (pinHash !== family.parent_pin_hash) {
        setPinError("Parent PIN doesn't match. Try again.");
        return;
      }
      loginChild({ familyId: family.id, childId: childProfile.id }, childProfile);
      setPinPromptOpen(false);
      navigate("/home", { replace: true });
    } catch (error) {
      setPinError(error?.message || "Something went wrong. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!childProfile?.kid_code) return;
    try {
      await navigator.clipboard.writeText(childProfile.kid_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopied(false);
    }
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

        {childProfile ? (
          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
                  {session ? "Resume where you left off" : "Last time you were here"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {childProfile.nickname} · {childProfile.preferred_language || "Language"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={handleOpenPin}
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
            {childProfile.kid_code ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700">
                <span>Kid code: {childProfile.kid_code}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="rounded-full bg-buddy-coral px-4 py-1 text-xs font-semibold text-white shadow-soft"
                >
                  {copied ? "Copied" : "Copy code"}
                </button>
              </div>
            ) : null}
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
                to="/parent-setup"
                className="text-buddy-grape transition hover:text-buddy-coral"
              >
                Start with a parent setup
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      <PinPrompt
        open={pinPromptOpen}
        pinValue={pinValue}
        onPinChange={setPinValue}
        onClose={handleClosePin}
        onSubmit={handlePinSubmit}
        error={pinError}
        loading={pinLoading}
      />
    </div>
  );
}

function PinPrompt({ open, pinValue, onPinChange, onClose, onSubmit, error, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/90 p-6 shadow-card">
        <h3 className="font-display text-xl font-semibold text-buddy-cocoa">
          Enter parent PIN
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Ask a parent to enter the family PIN to continue.
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="space-y-2 text-sm font-semibold text-slate-600">
            Parent PIN
            <input
              type="password"
              inputMode="numeric"
              value={pinValue}
              onChange={(event) => onPinChange(event.target.value.trim())}
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-base font-semibold text-slate-700 shadow-soft"
              placeholder="4-6 digits"
            />
          </label>
          {error ? (
            <div className="rounded-2xl bg-buddy-peach/60 px-4 py-3 text-xs font-semibold text-slate-700">
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`rounded-full px-5 py-2 text-xs font-semibold shadow-soft ${
                loading
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : "bg-buddy-grape text-white"
              }`}
            >
              {loading ? "Checking..." : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
