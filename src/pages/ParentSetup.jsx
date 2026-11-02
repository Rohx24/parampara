import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFamilyWithChild, generateKidCode, hashPin } from "../lib/db";
import { useSession } from "../context/SessionContext.jsx";
import AuthShell, { PinInput, authErrorClass, authInputClass, authLabelClass, authPrimaryClass } from "../components/AuthShell.jsx";

const languages = [
  { label: "Hindi", native: "हिन्दी" },
  { label: "Tamil", native: "தமிழ்" },
  { label: "Telugu", native: "తెలుగు" },
  { label: "Kannada", native: "ಕನ್ನಡ" },
  { label: "Malayalam", native: "മലയാളം" },
  { label: "English", native: "English" },
];

const ages = Array.from({ length: 11 }, (_, i) => i + 5);

// Step 1: the child. Step 2: the parent PIN, which creates the family. Step 3: the kid code.
export default function ParentSetup() {
  const navigate = useNavigate();
  const { loginChild } = useSession();
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState(8);
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [kidCode, setKidCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const childValid = nickname.trim().length >= 2 && Boolean(preferredLanguage);
  const pinValid = /^\d{4,6}$/.test(pin) && pin === confirmPin;
  const pinMismatch = confirmPin.length >= pin.length && confirmPin.length > 0 && pin !== confirmPin;

  const handleChildNext = (event) => {
    event.preventDefault();
    if (childValid) setStep(2);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!pinValid || !childValid || loading) return;
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
          onboarding: { age, role: "Child", focus: [], vibe: "gentle" },
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

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(kidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopied(false);
    }
  };

  if (step === 3) {
    return (
      <AuthShell title={`${nickname.trim()} is all set!`} subtitle="Keep this kid code. You'll need it with your PIN to sign in on another device." step={3} totalSteps={3}>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-buddy-mint/60 px-4 py-4">
          <span className="whitespace-nowrap font-display text-2xl font-semibold tracking-wide text-buddy-cocoa sm:text-3xl">{kidCode}</span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="min-h-12 rounded-full bg-white px-5 text-base font-semibold text-slate-700 shadow-soft"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-base font-semibold text-slate-600">
          The PIN can&apos;t be recovered, so keep it somewhere safe.
        </p>
        <button type="button" onClick={() => navigate("/home", { replace: true })} className={`mt-6 ${authPrimaryClass}`}>
          Start learning
        </button>
      </AuthShell>
    );
  }

  if (step === 2) {
    return (
      <AuthShell
        title="Set a parent PIN"
        subtitle="4 to 6 digits. Your child will need it with their kid code to sign in."
        onBack={() => setStep(1)}
        step={2}
        totalSteps={3}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <PinInput label="PIN" value={pin} onChange={setPin} autoComplete="new-password" autoFocus />
          <PinInput label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} autoComplete="new-password" />
          {pinMismatch ? <p className="text-base font-semibold text-red-600">The PINs don&apos;t match.</p> : null}
          {error ? (
            <p className={authErrorClass}>{error}</p>
          ) : null}
          <button type="submit" disabled={!pinValid || loading} className={authPrimaryClass}>
            {loading ? "Creating..." : "Create family"}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Who's learning?"
      subtitle="Tell us about your child. You can add more children later."
      backTo="/start"
      step={1}
      totalSteps={3}
    >
      <form onSubmit={handleChildNext} className="space-y-5">
        <label className={authLabelClass}>
          <span>Child&apos;s name or nickname</span>
          <input
            type="text"
            autoComplete="off"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            className={authInputClass}
            placeholder="Little Mango"
          />
        </label>
        <label className={authLabelClass}>
          <span>Age</span>
          <select value={age} onChange={(event) => setAge(Number(event.target.value))} className={authInputClass}>
            {ages.map((value) => (
              <option key={value} value={value}>
                {value} years
              </option>
            ))}
          </select>
        </label>
        <fieldset className="space-y-2">
          <legend className="text-base font-semibold text-slate-700">Language to learn</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {languages.map(({ label, native }) => {
              const active = preferredLanguage === label;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPreferredLanguage(label)}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 text-base font-semibold transition ${
                    active
                      ? "border-buddy-grape bg-buddy-grape text-white shadow-soft"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <span className="text-lg leading-snug">{native}</span>
                  {native !== label ? (
                    <span className={`text-sm ${active ? "text-white/90" : "text-slate-600"}`}>{label}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>
        <button type="submit" disabled={!childValid} className={authPrimaryClass}>
          Next
        </button>
      </form>
    </AuthShell>
  );
}
