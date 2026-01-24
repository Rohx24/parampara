import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { createFamilyWithChild, generateKidCode, hashPin } from "../lib/db";
import { useSession } from "../context/SessionContext.jsx";

const stepVariants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const languages = ["Tamil", "Telugu", "Hindi", "Kannada", "English"];

export default function ParentSetup() {
  const navigate = useNavigate();
  const { loginChild, childProfile } = useSession();
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState(8);
  const [preferredLanguage, setPreferredLanguage] = useState(languages[0]);
  const [kidCode, setKidCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const progress = useMemo(() => (step / 3) * 100, [step]);
  const pinValid = /^\d{4,6}$/.test(pin) && pin === confirmPin;
  const childValid = nickname.trim().length >= 2;

  const handleCreate = async () => {
    if (!pinValid || !childValid) return;
    setLoading(true);
    setError("");
    try {
      const parentPinHash = await hashPin(pin);
      const generatedCode = await generateKidCode();
      const { family, child } = await createFamilyWithChild({
        parentPinHash,
        child: {
          kidCode: generatedCode,
          nickname: nickname.trim(),
          age,
          preferredLanguage,
        },
      });
      setKidCode(child.kid_code);
      loginChild({ familyId: family.id, childId: child.id }, child);
      setStep(3);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    navigate(childProfile?.onboarding ? "/journey" : "/signup");
  };

  return (
    <div className="min-h-screen bg-sparkle px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-card">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-buddy-cocoa">
              Parent setup
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Secure your family with a PIN, then create a kid code.
            </p>
          </div>
          <Link
            to="/start"
            className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
          >
            Back
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

        {error ? (
          <div className="rounded-2xl bg-buddy-peach/60 px-4 py-3 text-sm font-semibold text-slate-700">
            {error}
          </div>
        ) : null}

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
                  Set your Parent PIN
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Choose a 4–6 digit PIN. This stays with your family.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-slate-600">
                  PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(event) => setPin(event.target.value.trim())}
                    className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-base font-semibold text-slate-700 shadow-soft"
                    placeholder="4-6 digits"
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold text-slate-600">
                  Confirm PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    value={confirmPin}
                    onChange={(event) => setConfirmPin(event.target.value.trim())}
                    className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-base font-semibold text-slate-700 shadow-soft"
                    placeholder="Re-enter"
                  />
                </label>
              </div>
              {!pinValid && pin.length > 0 ? (
                <p className="text-xs font-semibold text-buddy-coral">
                  PINs must match and be 4–6 digits.
                </p>
              ) : null}
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
                  Add your child
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Tell us who will be learning today.
                </p>
              </div>
              <label className="space-y-2 text-sm font-semibold text-slate-600">
                Nickname
                <input
                  type="text"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-base font-semibold text-slate-700 shadow-soft"
                  placeholder="Little Mango"
                />
              </label>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-soft">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
                  <span>Age</span>
                  <span className="rounded-full bg-buddy-mint/70 px-3 py-1 text-xs text-slate-700">
                    {age} years
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="15"
                  value={age}
                  onChange={(event) => setAge(Number(event.target.value))}
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-buddy-sky/60 accent-buddy-coral"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-600">Preferred language</p>
                <div className="flex flex-wrap gap-3">
                  {languages.map((language) => (
                    <motion.button
                      key={language}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setPreferredLanguage(language)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold shadow-soft transition ${
                        preferredLanguage === language
                          ? "bg-buddy-coral text-white"
                          : "bg-white/80 text-slate-600"
                      }`}
                    >
                      {language}
                    </motion.button>
                  ))}
                </div>
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
              className="space-y-6 text-center"
            >
              <div>
                <h2 className="font-display text-2xl font-semibold text-buddy-cocoa">
                  Your kid code is ready
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Share this code with your child to sign in.
                </p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/90 px-6 py-5 text-2xl font-semibold text-buddy-cocoa shadow-soft">
                {kidCode}
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={handleStart}
                className="rounded-full bg-buddy-grape px-6 py-3 text-sm font-semibold text-white shadow-soft"
              >
                Start learning
              </motion.button>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1 || loading}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              step === 1 || loading
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-white/90 text-slate-600 shadow-soft hover:-translate-y-0.5"
            }`}
          >
            Back
          </button>

          {step === 1 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setStep(2)}
              disabled={!pinValid}
              className={`rounded-full px-6 py-2 text-sm font-semibold shadow-soft ${
                pinValid
                  ? "bg-buddy-grape text-white"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
            >
              Next
            </motion.button>
          ) : null}

          {step === 2 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={handleCreate}
              disabled={!childValid || loading}
              className={`rounded-full px-6 py-2 text-sm font-semibold shadow-soft ${
                childValid && !loading
                  ? "bg-buddy-grape text-white"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
            >
              {loading ? "Creating..." : "Create family"}
            </motion.button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
