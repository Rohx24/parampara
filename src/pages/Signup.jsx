import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { createFamilyWithChild, generateKidCode, hashPin, updateChildOnboarding } from "../lib/db";
import { useSession } from "../context/SessionContext.jsx";

const focusOptions = [
  "Stories",
  "Speaking",
  "Pronunciation",
  "Festivals",
  "Mythology",
  "Folk tales",
  "Moral stories",
  "Daily conversation",
];

const vibes = [
  {
    id: "gentle",
    title: "Gentle",
    description: "Slow, cozy pacing with extra encouragement.",
  },
  {
    id: "funny",
    title: "Funny",
    description: "Playful surprises and giggles along the way.",
  },
  {
    id: "adventurous",
    title: "Adventurous",
    description: "Bold quests and curious discoveries.",
  },
];

const stepVariants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function Signup() {
  const navigate = useNavigate();
  const { childProfile, setChildProfile, loginChild } = useSession();
  const [step, setStep] = useState(1);
  const [onboarding, setOnboarding] = useState({
    age: 8,
    role: "Parent",
    focus: [],
    vibe: "gentle",
  });

  const progress = useMemo(() => (step / 3) * 100, [step]);

  const toggleFocus = (label) => {
    setOnboarding((prev) => {
      const exists = prev.focus.includes(label);
      const nextFocus = exists
        ? prev.focus.filter((item) => item !== label)
        : [...prev.focus, label];
      return { ...prev, focus: nextFocus };
    });
  };

  const handleFinish = async () => {
    if (onboarding.role === "Parent") {
      navigate("/parent-setup", { replace: true });
      return;
    }
    localStorage.setItem("bhashabuddy_onboarding", JSON.stringify(onboarding));
    if (childProfile?.id) {
      try {
        const updated = await updateChildOnboarding(childProfile.id, onboarding);
        if (updated) setChildProfile(updated);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Failed to persist onboarding", error);
      }
    } else {
      try {
        const tempPin = String(Math.floor(100000 + Math.random() * 900000));
        const parentPinHash = await hashPin(tempPin);
        const kidCode = await generateKidCode();
        const { family, child } = await createFamilyWithChild({
          parentPinHash,
          child: {
            kidCode,
            nickname: "Buddy",
            age: onboarding.age,
            preferredLanguage: "English",
            onboarding,
          },
        });
        loginChild({ familyId: family.id, childId: child.id }, child);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Failed to create child profile", error);
      }
    }
    navigate("/journey", { replace: true });
  };

  return (
    <div className="min-h-screen bg-sparkle px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-card">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-buddy-cocoa">
              Welcome to BhashaBuddy
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              A few quick steps so stories feel just right.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
          >
            Back home
          </Link>
        </header>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Step {step} of 3</span>
            <span>{Math.round(progress)}% done</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/70">
            <motion.div
              className="h-2 rounded-full bg-buddy-grape"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((index) => (
              <span
                key={index}
                className={`h-2 w-2 rounded-full ${
                  step >= index ? "bg-buddy-coral" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section
              key="step-1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
                  Who&apos;s learning?
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Tell us the age range and who&apos;s in charge of story time.
                </p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-soft">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
                  <span>Age</span>
                  <span className="rounded-full bg-buddy-mint/70 px-3 py-1 text-xs text-slate-700">
                    {onboarding.age} years
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="15"
                  value={onboarding.age}
                  onChange={(event) =>
                    setOnboarding((prev) => ({
                      ...prev,
                      age: Number(event.target.value),
                    }))
                  }
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-buddy-sky/60 accent-buddy-coral"
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-600">Role</p>
                <div className="flex flex-wrap gap-3">
                  {["Parent", "Child"].map((role) => {
                    const active = onboarding.role === role;
                    return (
                      <motion.button
                        key={role}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          if (role === "Parent") {
                            navigate("/parent-setup");
                            return;
                          }
                          setOnboarding((prev) => ({ ...prev, role }));
                        }}
                        className={`rounded-full px-5 py-2 text-sm font-semibold shadow-soft transition ${
                          active
                            ? "bg-buddy-coral text-white"
                            : "bg-white/80 text-slate-600"
                        }`}
                      >
                        {role}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="step-2"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
                  What should we focus on?
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Pick all the learning goals that sound exciting.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {focusOptions.map((label) => {
                  const selected = onboarding.focus.includes(label);
                  return (
                    <motion.button
                      key={label}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => toggleFocus(label)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        selected
                          ? "bg-buddy-grape text-white shadow-soft"
                          : "bg-white/80 text-slate-600"
                      }`}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="step-3"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
                  Pick your vibe
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  We&apos;ll tune stories to match the energy at home.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {vibes.map((vibe) => {
                  const active = onboarding.vibe === vibe.id;
                  return (
                    <motion.button
                      key={vibe.id}
                      type="button"
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() =>
                        setOnboarding((prev) => ({
                          ...prev,
                          vibe: vibe.id,
                        }))
                      }
                      className={`flex h-full flex-col rounded-2xl border px-5 py-4 text-left shadow-soft transition ${
                        active
                          ? "border-buddy-grape bg-buddy-grape/10"
                          : "border-white/70 bg-white/80"
                      }`}
                    >
                      <span className="font-display text-lg font-semibold text-buddy-cocoa">
                        {vibe.title}
                      </span>
                      <span className="mt-2 text-sm text-slate-600">
                        {vibe.description}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              step === 1
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-white/90 text-slate-600 shadow-soft hover:-translate-y-0.5"
            }`}
          >
            Back
          </button>

          {step < 3 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setStep((prev) => Math.min(3, prev + 1))}
              className="rounded-full bg-buddy-grape px-6 py-2 text-sm font-semibold text-white shadow-soft"
            >
              Next
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={handleFinish}
              className="rounded-full bg-buddy-grape px-6 py-2 text-sm font-semibold text-white shadow-soft"
            >
              Start journey
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
