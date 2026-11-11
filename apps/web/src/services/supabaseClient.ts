import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configurationError =
  !supabaseUrl || !supabaseAnonKey
    ? "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in apps/web/.env.local before starting Aetherius."
    : null;
// Provider credentials are only transferred during the OAuth bootstrap. Never
// persist them in browser storage with the long-lived Supabase session.
export const sessionStorage = {
  getItem: (key: string) => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (
          data &&
          typeof data === "object" &&
          ("provider_token" in data || "provider_refresh_token" in data)
        ) {
          delete data.provider_token;
          delete data.provider_refresh_token;
          localStorage.setItem(key, JSON.stringify(data));
        }
      } catch {
        /* Leave SDK-owned non-session values untouched. */
      }
    }
    // The first read can transfer a legacy provider token to the backend. Its
    // persisted copy is already removed; subsequent reads are credential-free.
    return raw;
  },
  removeItem: (key: string) => localStorage.removeItem(key),
  setItem: (key: string, value: string) => {
    const data = JSON.parse(value);
    if (data && typeof data === "object") {
      delete data.provider_token;
      delete data.provider_refresh_token;
    }
    localStorage.setItem(key, JSON.stringify(data));
  },
};
export const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseAnonKey || "unconfigured",
  { auth: { storage: sessionStorage } },
);
