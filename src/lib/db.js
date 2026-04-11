import { getSupabaseClient, hasSupabase, supabase } from "./supabase";

const WORDS = [
  "MANGO",
  "LOTUS",
  "RIVER",
  "SUNNY",
  "CLOUD",
  "KITE",
  "LAMP",
  "BIRD",
  "PEARL",
  "SPICE",
  "TIGER",
  "BANYAN",
];

const DEFAULT_PROGRESS = {
  totalMinutes: 0,
  streakDays: 0,
  lastStoryId: null,
  lastGameId: null,
  lastWritingAt: null,
};

const LOCAL_DB_KEY = "paramparaLocalDB";

function readLocalDb() {
  if (typeof localStorage === "undefined") {
    return { families: [], children: [] };
  }
  const raw = localStorage.getItem(LOCAL_DB_KEY);
  if (!raw) return { families: [], children: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      families: Array.isArray(parsed?.families) ? parsed.families : [],
      children: Array.isArray(parsed?.children) ? parsed.children : [],
    };
  } catch (error) {
    return { families: [], children: [] };
  }
}

function writeLocalDb(next) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(next));
}

export function normalizeKidCode(value) {
  return value
    ? value
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "-")
        .replace(/[^A-Z0-9-]/g, "")
    : "";
}

export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function makeKidCode() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${digits}`;
}

export async function generateKidCode() {
  if (!supabase) {
    const db = readLocalDb();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = makeKidCode();
      const exists = db.children.some((child) => child.kid_code === code);
      if (!exists) return code;
    }
    throw new Error("Unable to generate unique kid code. Try again.");
  }
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = makeKidCode();
    const { data, error } = await supabase
      .from("children")
      .select("id")
      .eq("kid_code", code)
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return code;
  }
  throw new Error("Unable to generate unique kid code. Try again.");
}

export async function createFamilyWithChild({ parentPinHash, child }) {
  if (!supabase) {
    const normalizedKidCode = normalizeKidCode(child.kidCode) || makeKidCode();
    const family = {
      id: crypto.randomUUID(),
      parent_pin_hash: parentPinHash,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };
    const childRow = {
      id: crypto.randomUUID(),
      family_id: family.id,
      kid_code: normalizedKidCode,
      nickname: child.nickname,
      age: child.age,
      preferred_language: child.preferredLanguage,
      onboarding: child.onboarding ?? null,
      level: child.level ?? "starter",
      progress_summary: child.progressSummary ?? DEFAULT_PROGRESS,
      session_token: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };
    const db = readLocalDb();
    db.families.push(family);
    db.children.push(childRow);
    writeLocalDb(db);
    return { family, child: childRow };
  }
  const sessionToken = crypto.randomUUID();
  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ parent_pin_hash: parentPinHash })
    .select()
    .single();
  if (familyError) throw familyError;

  const childPayload = {
    family_id: family.id,
    kid_code: child.kidCode,
    nickname: child.nickname,
    age: child.age,
    preferred_language: child.preferredLanguage,
    onboarding: child.onboarding ?? null,
    level: child.level ?? "starter",
    progress_summary: child.progressSummary ?? DEFAULT_PROGRESS,
    session_token: sessionToken,
  };

  const { data: childRow, error: childError } = await supabase
    .from("children")
    .insert(childPayload)
    .select()
    .single();
  if (childError) throw childError;

  return { family, child: childRow };
}

export async function fetchChildProfile({ familyId, childId }) {
  if (!familyId || !childId) return null;
  if (!supabase) {
    const db = readLocalDb();
    return db.children.find(
      (child) => child.id === childId && child.family_id === familyId
    ) || null;
  }
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("id", childId)
    .eq("family_id", familyId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchFamilyById(familyId) {
  if (!familyId) return null;
  if (!supabase) {
    const db = readLocalDb();
    return db.families.find((family) => family.id === familyId) || null;
  }
  const { data, error } = await supabase
    .from("families")
    .select("*")
    .eq("id", familyId)
    .single();
  if (error) throw error;
  return data;
}

export async function findChildByKidCode(kidCode) {
  const normalized = normalizeKidCode(kidCode);
  if (!normalized) return null;
  if (!supabase) {
    const db = readLocalDb();
    return db.children.find((child) => child.kid_code === normalized) || null;
  }
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("kid_code", normalized)
    .single();
  if (error) throw error;
  return data;
}

export async function updateChildOnboarding(childId, onboarding) {
  if (!childId) return null;
  if (!supabase) {
    const db = readLocalDb();
    const index = db.children.findIndex((child) => child.id === childId);
    if (index === -1) return { id: childId, onboarding };
    const updated = { ...db.children[index], onboarding };
    db.children[index] = updated;
    writeLocalDb(db);
    return updated;
  }
  const { data, error } = await supabase
    .from("children")
    .update({ onboarding })
    .eq("id", childId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProgressSummary(childId, progressSummary) {
  if (!childId) return null;
  if (!supabase) {
    const db = readLocalDb();
    const index = db.children.findIndex((child) => child.id === childId);
    if (index === -1) return { id: childId, progress_summary: progressSummary };
    const updated = { ...db.children[index], progress_summary: progressSummary };
    db.children[index] = updated;
    writeLocalDb(db);
    return updated;
  }
  const { data, error } = await supabase
    .from("children")
    .update({ progress_summary: progressSummary })
    .eq("id", childId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function touchFamily(familyId) {
  if (!familyId) return;
  if (!supabase) {
    const db = readLocalDb();
    const index = db.families.findIndex((family) => family.id === familyId);
    if (index === -1) return;
    db.families[index] = {
      ...db.families[index],
      last_active_at: new Date().toISOString(),
    };
    writeLocalDb(db);
    return;
  }
  await supabase
    .from("families")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", familyId);
}

export async function touchChild(childId) {
  if (!childId) return;
  if (!supabase) {
    const db = readLocalDb();
    const index = db.children.findIndex((child) => child.id === childId);
    if (index === -1) return;
    db.children[index] = {
      ...db.children[index],
      last_active_at: new Date().toISOString(),
    };
    writeLocalDb(db);
    return;
  }
  await supabase
    .from("children")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", childId);
}

export async function logEvent(childId, type, metadata = {}) {
  if (!childId || !type) return null;
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("events")
    .insert({ child_id: childId, type, metadata })
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("logEvent failed", error);
    return null;
  }
  return data;
}

export async function upsertMistake(childId, mistake) {
  if (!childId || !mistake?.domain || !mistake?.item) return null;
  if (!supabase) return null;
  const payload = {
    child_id: childId,
    domain: mistake.domain,
    item: mistake.item,
    count: mistake.count ?? 1,
    last_seen_at: mistake.lastSeenAt ?? new Date().toISOString(),
    examples: mistake.examples ?? null,
  };
  const { data, error } = await supabase
    .from("mistakes")
    .upsert(payload, { onConflict: "child_id,domain,item" })
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("upsertMistake failed", error);
    return null;
  }
  return data;
}

export function getScopedSupabase(sessionToken) {
  if (!hasSupabase) return null;
  return getSupabaseClient(sessionToken);
}

// ─── Session Results ──────────────────────────────────────────────────────────

/**
 * Insert one completed story+quiz session into the session_results table.
 * Falls back silently if Supabase is unavailable (localStorage is the fallback store).
 */
export async function insertSessionResult(childId, result) {
  if (!childId || !supabase) return null;
  const payload = {
    child_id:          childId,
    ts:                result.ts || new Date().toISOString(),
    language:          result.language,
    genre:             result.genre,
    words_in_story:    result.wordsInStory   || 0,
    questions_total:   result.questionsTotal  || 0,
    questions_answered: result.questionsAnswered || 0,
    correct_count:     result.correctCount    || 0,
    accuracy_pct:      result.accuracyPct     || 0,
    weak_words_used:   result.weakWordsUsed   || null,
    rag_enabled:       result.ragEnabled      ?? true,
  };
  const { data, error } = await supabase
    .from("session_results")
    .insert(payload)
    .select()
    .single();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("insertSessionResult failed", error);
    return null;
  }
  return data;
}

/**
 * Fetch all session_results for a child, newest-first, normalised to camelCase.
 * Falls back to localStorage key bbashabuddy_session_results_${childId}.
 */
export async function fetchSessionResults(childId, limit = 200) {
  if (!childId) return [];

  // ── Supabase path ──────────────────────────────────────────────────────────
  if (supabase) {
    const { data, error } = await supabase
      .from("session_results")
      .select("*")
      .eq("child_id", childId)
      .order("ts", { ascending: true })
      .limit(limit);
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r) => ({
        sessionId:         r.id,
        ts:                r.ts,
        language:          r.language,
        genre:             r.genre,
        wordsInStory:      r.words_in_story,
        questionsTotal:    r.questions_total,
        questionsAnswered: r.questions_answered,
        correctCount:      r.correct_count,
        accuracyPct:       r.accuracy_pct,
        weakWordsUsed:     r.weak_words_used,
        ragEnabled:        r.rag_enabled,
      }));
    }
    // Fall through to localStorage on error or empty
  }

  // ── localStorage fallback ──────────────────────────────────────────────────
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(`bbashabuddy_session_results_${childId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Mistakes ─────────────────────────────────────────────────────────────────

/**
 * Fetch all mistakes for a child from Supabase, sorted by count DESC.
 * Falls back to localStorage key bhashabuddy_voice_mistakes_${childId}.
 */
export async function fetchMistakesForChild(childId, limit = 30) {
  if (!childId) return [];

  if (supabase) {
    const { data, error } = await supabase
      .from("mistakes")
      .select("domain, item, count, last_seen_at")
      .eq("child_id", childId)
      .order("count", { ascending: false })
      .limit(limit);
    if (!error && Array.isArray(data) && data.length > 0) return data;
    // Fall through
  }

  if (typeof localStorage === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(`bhashabuddy_voice_mistakes_${childId}`) ||
      localStorage.getItem("bhashabuddy_voice_mistakes");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return [];
    return Object.entries(parsed)
      .map(([item, count]) => ({ domain: "speech", item, count: Number(count), last_seen_at: null }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch {
    return [];
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────

/**
 * Fetch events for a child filtered by type and optional date range.
 * Returns [] when Supabase is unavailable (events are Supabase-only, no local fallback).
 *
 * @param {string}   childId
 * @param {string[]} types   e.g. ["voice_feedback", "voice_advance", "quiz_complete"]
 * @param {string|null} since  ISO timestamp lower bound (inclusive)
 * @param {number}   limit
 */
export async function fetchEventsForChild(childId, types = [], since = null, limit = 300) {
  if (!childId || !supabase) return [];
  try {
    let query = supabase
      .from("events")
      .select("type, ts, metadata")
      .eq("child_id", childId)
      .order("ts", { ascending: false })
      .limit(limit);
    if (types.length > 0) query = query.in("type", types);
    if (since)            query = query.gte("ts", since);
    const { data, error } = await query;
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("fetchEventsForChild failed", error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export { DEFAULT_PROGRESS };
