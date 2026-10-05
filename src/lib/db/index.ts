import "server-only";
import { memoryStore } from "./memory";
import type { Store } from "./store";
import { supabaseConfigured, supabaseStore } from "./supabase";

/** Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, otherwise the in-memory demo store. */
export function getStore(): Store {
  return supabaseConfigured() ? supabaseStore : memoryStore;
}

export type { Store } from "./store";
