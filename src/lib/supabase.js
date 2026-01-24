import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const clientCache = new Map();

export function getSupabaseClient(sessionToken) {
  if (!sessionToken) return supabase;
  if (clientCache.has(sessionToken)) return clientCache.get(sessionToken);
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        "x-session-token": sessionToken,
      },
    },
  });
  clientCache.set(sessionToken, client);
  return client;
}
