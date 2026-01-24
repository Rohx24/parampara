import { getSupabaseClient, supabase } from "./supabase";

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
  await supabase
    .from("families")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", familyId);
}

export async function touchChild(childId) {
  if (!childId) return;
  await supabase
    .from("children")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", childId);
}

export async function logEvent(childId, type, metadata = {}) {
  if (!childId || !type) return null;
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
  return getSupabaseClient(sessionToken);
}

export { DEFAULT_PROGRESS };
