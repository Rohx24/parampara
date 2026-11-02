import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFamilyById, findChildByKidCode, hashPin, normalizeKidCode } from "../lib/db";
import { useSession } from "../context/SessionContext.jsx";
import AuthShell, { PinInput, authErrorClass, authInputClass, authLabelClass, authPrimaryClass } from "../components/AuthShell.jsx";

export default function KidJoin() {
  const navigate = useNavigate();
  const { loginChild } = useSession();
  const [kidCode, setKidCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const ready = Boolean(normalizeKidCode(kidCode)) && /^\d{4,6}$/.test(pin);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!ready || loading) return;
    setError("");
    setLoading(true);
    try {
      const child = await findChildByKidCode(normalizeKidCode(kidCode));
      const family = child ? await fetchFamilyById(child.family_id) : null;
      // One message for a wrong code or a wrong PIN, so neither can be guessed separately.
      if (!child || !family || (await hashPin(pin)) !== family.parent_pin_hash) {
        setError("That kid code and PIN don't match. Check them with a parent.");
        return;
      }
      loginChild({ familyId: family.id, childId: child.id }, child);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign in with a kid code" subtitle="A parent gets the kid code when they set up the family." backTo="/start">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className={authLabelClass}>
          <span>Kid code</span>
          <input
            type="text"
            autoCapitalize="characters"
            autoComplete="username"
            autoCorrect="off"
            spellCheck={false}
            value={kidCode}
            onChange={(event) => setKidCode(normalizeKidCode(event.target.value))}
            className={`${authInputClass} uppercase tracking-wide`}
            placeholder="MANGO-4821"
          />
        </label>
        <PinInput label="Parent PIN" value={pin} onChange={setPin} />
        {error ? (
          <p className={authErrorClass}>{error}</p>
        ) : null}
        <button type="submit" disabled={!ready || loading} className={authPrimaryClass}>
          {loading ? "Checking..." : "Start learning"}
        </button>
      </form>
    </AuthShell>
  );
}
