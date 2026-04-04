import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchChildProfile, touchChild, touchFamily } from "../lib/db";

const SESSION_KEY = "paramparaSession";
const PROFILE_KEY = "paramparaChildProfile";
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

const safeParse = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const readCachedProfile = (familyId, childId) => {
  if (typeof localStorage === "undefined") return null;
  const parsed = safeParse(localStorage.getItem(PROFILE_KEY));
  if (!parsed) return null;
  if (parsed?.id === childId && parsed?.family_id === familyId) {
    return parsed;
  }
  return null;
};

const readAnyCachedProfile = () => {
  if (typeof localStorage === "undefined") return null;
  const parsed = safeParse(localStorage.getItem(PROFILE_KEY));
  return parsed || null;
};

const clearStoredSession = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
};

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [childProfile, setChildProfile] = useState(null);
  const [lastChildProfile, setLastChildProfile] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const cacheLastProfile = useCallback((profile) => {
    if (typeof localStorage === "undefined") return;
    if (!profile) return;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, []);

  const setActiveProfile = useCallback(
    (profile) => {
      setChildProfile(profile);
      if (profile) {
        setLastChildProfile(profile);
        cacheLastProfile(profile);
      }
    },
    [cacheLastProfile]
  );

  const clearActiveProfile = useCallback(() => {
    setChildProfile(null);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      if (typeof localStorage === "undefined") {
        setSessionReady(true);
        return;
      }
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        const cached = readAnyCachedProfile();
        if (cached) {
          setLastChildProfile(cached);
        }
        clearActiveProfile();
        setSessionReady(true);
        return;
      }
      const parsed = safeParse(raw);
      if (!parsed?.familyId || !parsed?.childId || !parsed?.expiresAt) {
        clearStoredSession();
        const cached = readAnyCachedProfile();
        if (cached) {
          setLastChildProfile(cached);
        }
        clearActiveProfile();
        setSessionReady(true);
        return;
      }
      const expiresAt = new Date(parsed.expiresAt).getTime();
      if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
        clearStoredSession();
        const cached = readAnyCachedProfile();
        if (cached) {
          setLastChildProfile(cached);
        }
        clearActiveProfile();
        setSessionReady(true);
        return;
      }
      setSession(parsed);
      const cachedProfile = readCachedProfile(parsed.familyId, parsed.childId);
      let profile = null;
      try {
        profile = await fetchChildProfile({
          familyId: parsed.familyId,
          childId: parsed.childId,
        });
      } catch (error) {
        profile = null;
      }
      if (profile) {
        setActiveProfile(profile);
        await Promise.all([
          touchFamily(parsed.familyId),
          touchChild(parsed.childId),
        ]);
      } else if (cachedProfile) {
        setActiveProfile(cachedProfile);
      } else {
        clearStoredSession();
        setSession(null);
        const cached = readAnyCachedProfile();
        if (cached) {
          setLastChildProfile(cached);
        } else {
          setLastChildProfile(null);
        }
        clearActiveProfile();
        return;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to load session", error);
    } finally {
      setSessionReady(true);
    }
  }, [clearActiveProfile, setActiveProfile]);

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
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    }
    setSession(payload);
    if (profile) {
      setActiveProfile(profile);
    }
    Promise.all([
      touchFamily(nextSession.familyId),
      touchChild(nextSession.childId),
    ]).catch(() => undefined);
  }, [setActiveProfile]);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
    clearActiveProfile();
  }, [clearActiveProfile]);

  const switchChild = useCallback(() => {
    logout();
  }, [logout]);

  const value = useMemo(
    () => ({
      session,
      childProfile,
      lastChildProfile,
      setChildProfile: setActiveProfile,
      sessionReady,
      loginChild,
      logout,
      switchChild,
      reloadSession: loadSession,
    }),
    [
      lastChildProfile,
      childProfile,
      loadSession,
      loginChild,
      logout,
      session,
      sessionReady,
      setActiveProfile,
      switchChild,
    ]
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
