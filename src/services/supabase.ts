import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const url = supabaseUrl?.trim() ?? '';
const anonKey = supabaseAnonKey?.trim() ?? '';
const hasConfig = Boolean(url && anonKey);

if (!hasConfig) {
  // 开发时给出清晰提示，避免静默失败。
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Cloud sync will be unavailable.'
  );
}

// createClient('','') throws at import time (validateSupabaseUrl / supabaseKey required).
// Use inert placeholders when unset so the SPA still boots; all real calls gate on isSupabaseReady().
const PLACEHOLDER_URL = 'https://unused.invalid';
const PLACEHOLDER_KEY = 'unused-anon-key-placeholder';

export const supabase = createClient(
  hasConfig ? url : PLACEHOLDER_URL,
  hasConfig ? anonKey : PLACEHOLDER_KEY,
  hasConfig
    ? undefined
    : {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
);

export function isSupabaseReady() {
  return hasConfig;
}

