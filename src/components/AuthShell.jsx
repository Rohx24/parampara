import React, { useState } from "react";
import { Link } from "react-router-dom";

/**
 * Shared frame for the sign-in pages: the BhashaBuddy header, one back control,
 * a written step count, and the page card. Sized for readers aged 4 to 99:
 * large text, big tap targets, and words next to every symbol.
 * Pass either backTo (a route) or onBack (a handler), not both.
 */
export default function AuthShell({ title, subtitle, backTo, onBack, step, totalSteps, children }) {
  const backClass =
    "inline-flex min-h-12 items-center gap-2 rounded-full bg-white/80 px-4 text-base font-semibold text-slate-700 shadow-soft transition hover:-translate-y-0.5";
  return (
    <div className="min-h-[100dvh] bg-sparkle px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-10 sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex min-h-12 items-center justify-between gap-3">
          {onBack ? (
            <button type="button" onClick={onBack} className={backClass}>
              <span aria-hidden="true">←</span> Back
            </button>
          ) : backTo ? (
            <Link to={backTo} className={backClass}>
              <span aria-hidden="true">←</span> Back
            </Link>
          ) : (
            <span />
          )}
          <Link to="/" className="inline-flex min-h-12 items-center gap-2 font-display text-lg font-semibold text-buddy-cocoa">
            <span aria-hidden="true" className="text-2xl">🦋</span> BhashaBuddy
          </Link>
        </div>
        <div className="mt-4 rounded-3xl border border-white/60 bg-white/85 p-5 shadow-card sm:p-8">
          {step && totalSteps ? (
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-600">
                Step {step} of {totalSteps}
              </p>
              <div className="mt-2 flex gap-2" aria-hidden="true">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2 flex-1 rounded-full ${i < step ? "bg-buddy-grape" : "bg-slate-200"}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <h1 className="font-display text-3xl font-semibold text-buddy-cocoa">{title}</h1>
          {subtitle ? <p className="mt-2 text-base text-slate-600">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export const authLabelClass = "block space-y-2 text-base font-semibold text-slate-700";

export const authInputClass =
  "min-h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-lg font-semibold text-slate-800 outline-none focus:border-buddy-grape focus:ring-4 focus:ring-buddy-grape/20";

export const authPrimaryClass =
  "inline-flex min-h-14 w-full items-center justify-center rounded-full bg-buddy-grape px-6 text-lg font-semibold text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:hover:translate-y-0";

export const authErrorClass = "rounded-2xl bg-buddy-peach/70 px-4 py-3 text-base font-semibold text-slate-800";

/** Keep only digits, at most 6, for PIN fields. */
export const cleanPin = (value) => value.replace(/\D/g, "").slice(0, 6);

/** A numeric PIN field with a Show/Hide switch, so it can be checked before submitting. */
export function PinInput({ label, value, onChange, autoComplete = "current-password", autoFocus = false }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className={authLabelClass}>
      <span>{label}</span>
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          inputMode="numeric"
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => onChange(cleanPin(event.target.value))}
          className={`${authInputClass} pr-24 tracking-[0.3em]`}
          placeholder="••••"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-2 top-1/2 min-h-11 -translate-y-1/2 rounded-full px-4 text-base font-semibold text-buddy-grape"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}
