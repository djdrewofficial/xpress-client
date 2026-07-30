import { supabase } from '@/lib/supabase';

/* Shared helpers for talking to the XOS backend. Previously copy-pasted into
   almost every lib module. */

/** Base URL of the XOS backend (EXPO_PUBLIC_API_URL), trailing slash trimmed.
    Returns null when the env var isn't set. */
export function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, '') : null;
}

/** Bearer auth header for the signed-in user, or {} when signed out. */
export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
