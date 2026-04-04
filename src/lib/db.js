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

export { DEFAULT_PROGRESS };
