import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { fetchFamilyById, hashPin } from "../lib/db";
import AuthShell, { PinInput, authErrorClass, authPrimaryClass } from "../components/AuthShell.jsx";

// The one sign-in screen. A signed-in child goes straight back in; a remembered
// child whose session expired only needs the parent PIN; everyone else picks
// "new family" or "kid code".
export default function Start() {
  const navigate = useNavigate();
  const { childProfile: activeProfile, lastChildProfile, session, loginChild, switchChild } = useSession();
  const childProfile = activeProfile || lastChildProfile;
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (session) {
      navigate("/home", { replace: true });
      return;
    }
    setPin("");
    setError("");
    setPinOpen(true);
  };

  const handlePinSubmit = async (event) => {
    event.preventDefault();
    if (!/^\d{4,6}$/.test(pin) || loading) return;
    setError("");
    setLoading(true);
    try {
      const family = await fetchFamilyById(childProfile?.family_id || session?.familyId);
      if (!family || (await hashPin(pin)) !== family.parent_pin_hash) {
        setError("That PIN doesn't match. Try again.");
        return;
      }
      loginChild({ familyId: family.id, childId: childProfile.id }, childProfile);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (childProfile && pinOpen) {
    return (
      <AuthShell title={`Welcome back, ${childProfile.nickname}`} subtitle="Ask a parent to enter the family PIN." onBack={() => setPinOpen(false)}>
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <PinInput label="Parent PIN" value={pin} onChange={setPin} autoFocus />
          {error ? (
            <p className={authErrorClass}>{error}</p>
          ) : null}
          <button type="submit" disabled={!/^\d{4,6}$/.test(pin) || loading} className={authPrimaryClass}>
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in" subtitle="Learn your family's language through stories, speaking and play." backTo="/">
      {childProfile ? (
        <div className="mb-5 rounded-2xl border border-white/60 bg-buddy-mint/70 p-5">
          <p className="text-base font-semibold text-slate-700">Saved on this device</p>
          <p className="mt-1 font-display text-2xl font-semibold text-buddy-cocoa">
            {childProfile.nickname} · {childProfile.preferred_language || "Language"}
          </p>
          <button type="button" onClick={handleContinue} className={`mt-4 ${authPrimaryClass}`}>
            Continue as {childProfile.nickname}
          </button>
          <button
            type="button"
            onClick={() => switchChild()}
            className="mt-2 min-h-12 w-full rounded-full text-base font-semibold text-slate-700 underline-offset-4 hover:underline"
          >
            Not {childProfile.nickname}? Use another account
          </button>
        </div>
      ) : null}
      <div className="space-y-4">
        <StartOption
          to="/parent-setup"
          icon="🏡"
          tint="bg-buddy-peach"
          title="I'm new here"
          description="A parent sets up the family. It takes a minute."
        />
        <StartOption
          to="/kid-join"
          icon="🔑"
          tint="bg-buddy-sky"
          title="I have a kid code"
          description="Sign in with the kid code and parent PIN."
        />
      </div>
    </AuthShell>
  );
}

// Same card style as the activity cards on the Home page.
function StartOption({ to, icon, tint, title, description }) {
  return (
    <Link
      to={to}
      className="flex min-h-20 items-center gap-4 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-card transition hover:-translate-y-1"
    >
      <span aria-hidden="true" className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${tint}`}>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-display text-xl font-semibold text-buddy-cocoa">{title}</span>
        <span className="mt-1 block text-base text-slate-600">{description}</span>
      </span>
      <span aria-hidden="true" className="text-2xl text-buddy-grape">→</span>
    </Link>
  );
}
