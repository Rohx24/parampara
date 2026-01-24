import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchChildProfile, touchChild, touchFamily } from "../lib/db";

const SESSION_KEY = "paramparaSession";
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [childProfile, setChildProfile] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        setSessionReady(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed?.familyId || !parsed?.childId || !parsed?.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        setSessionReady(true);
        return;
      }
      const expiresAt = new Date(parsed.expiresAt).getTime();
      if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        setSessionReady(true);
        return;
      }
      setSession(parsed);
      const profile = await fetchChildProfile({
        familyId: parsed.familyId,
        childId: parsed.childId,
      });
      setChildProfile(profile);
      await Promise.all([
        touchFamily(parsed.familyId),
        touchChild(parsed.childId),
      ]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to load session", error);
    } finally {
      setSessionReady(true);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const loginChild = useCallback((nextSession, profile) => {
    const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
    const payload = {
      familyId: nextSession.familyId,
      childId: nextSession.childId,
      expiresAt,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    setSession(payload);
    if (profile) {
      setChildProfile(profile);
    }
    Promise.all([
      touchFamily(nextSession.familyId),
      touchChild(nextSession.childId),
    ]).catch(() => undefined);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setChildProfile(null);
  }, []);

  const switchChild = useCallback(() => {
    logout();
  }, [logout]);

  const value = useMemo(
    () => ({
      session,
      childProfile,
      setChildProfile,
      sessionReady,
      loginChild,
      logout,
      switchChild,
      reloadSession: loadSession,
    }),
    [childProfile, loadSession, loginChild, logout, session, sessionReady, switchChild]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
