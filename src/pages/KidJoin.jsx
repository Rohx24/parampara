import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchFamilyById, findChildByKidCode, hashPin } from "../lib/db";
import { useSession } from "../context/SessionContext.jsx";

export default function KidJoin() {
  const navigate = useNavigate();
  const { loginChild } = useSession();
  const [kidCode, setKidCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const child = await findChildByKidCode(kidCode);
      if (!child) {
        setError("We couldn't find that kid code. Check and try again.");
        return;
      }
      const family = await fetchFamilyById(child.family_id);
      if (!family) {
        setError("Family not found. Please ask your parent to re-check setup.");
        return;
      }
      const pinHash = await hashPin(pin);
      if (pinHash !== family.parent_pin_hash) {
        setError("Parent PIN doesn't match. Ask your parent for help.");
        return;
      }
      loginChild({ familyId: family.id, childId: child.id }, child);
      navigate("/stories");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sparkle px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-card">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-buddy-cocoa">
              Kid join
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your kid code and parent PIN to keep learning.
            </p>
          </div>
          <Link
            to="/start"
            className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:-translate-y-0.5"
          >
            Back
          </Link>
        </header>

        {error ? (
          <div className="rounded-2xl bg-buddy-peach/60 px-4 py-3 text-sm font-semibold text-slate-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="space-y-2 text-sm font-semibold text-slate-600">
            Kid code
            <input
              type="text"
              value={kidCode}
              onChange={(event) => setKidCode(event.target.value)}
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-base font-semibold text-slate-700 shadow-soft"
              placeholder="WORD-1234"
            />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-600">
            Parent PIN
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => setPin(event.target.value.trim())}
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-base font-semibold text-slate-700 shadow-soft"
              placeholder="4-6 digits"
            />
          </label>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.96 }}
            disabled={loading}
            className={`w-full rounded-full px-6 py-3 text-sm font-semibold shadow-soft ${
              loading
                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                : "bg-buddy-grape text-white"
            }`}
          >
            {loading ? "Joining..." : "Start learning"}
          </motion.button>
        </form>
      </div>
    </div>
  );
}
