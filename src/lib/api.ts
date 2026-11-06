import type { AuthError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/* Shared helpers for talking to the XOS backend. Previously copy-pasted into
   almost every lib module. */

/** Base URL of the XOS backend (EXPO_PUBLIC_API_URL), trailing slash trimmed.
    Returns null when the env var isn't set. */
export function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, '') : null;
}

/** Access token from the current persisted session. Never a copy cached by a caller. */
async function currentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Bearer auth header for the signed-in user, or {} when signed out.
    Prefer `authorizedFetch`, which also refreshes once on a 401. */
export async function authHeader(): Promise<Record<string, string>> {
  const token = await currentAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** GoTrue rejected the refresh token itself (revoked, reused, or the session
    row is gone). A network failure is not terminal — the user stays signed in. */
export function isTerminalRefreshFailure(error: AuthError | null): boolean {
  if (!error) return false;
  const code = (error.code ?? '').toLowerCase();
  if (
    code === 'refresh_token_not_found' ||
    code === 'refresh_token_already_used' ||
    code === 'session_not_found' ||
    code === 'session_expired'
  ) {
    return true;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('refresh token not found') ||
    message.includes('invalid refresh token') ||
    (message.includes('refresh') && message.includes('already used')) ||
    message.includes('session not found') ||
    message.includes('session_not_found')
  );
}

let refreshInFlight: Promise<string | null> | null = null;

/** One refresh for every caller that just received a 401. Returns the new
    access token, or null when the refresh did not produce one. A terminal
    failure signs this device out (local scope only) so the root navigator
    shows sign-in. Other devices are left alone. */
function refreshAfterUnauthorized(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const { data, error } = await supabase.auth.refreshSession();
      if (data.session?.access_token) return data.session.access_token;
      if (isTerminalRefreshFailure(error)) {
        // Local: the refresh token is already dead. Global would revoke every
        // other session with an access token that may still be inside its JWT expiry.
        await supabase.auth.signOut({ scope: 'local' });
        return null;
      }
      // Network error, or a refresh another caller already committed. Use the
      // session now in storage when there is one; otherwise keep the user signed in.
      const { data: current } = await supabase.auth.getSession();
      return current.session?.access_token ?? null;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function withBearer(init: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  else headers.delete('Authorization');
  return { ...init, headers };
}

/** Fetch XOS with the current access token. On 401, refresh the session once
    and retry the same request. The user is sent to sign-in only when that
    refresh fails because the refresh token was revoked. */
export async function authorizedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const first = await fetch(url, withBearer(init, await currentAccessToken()));
  if (first.status !== 401 || init.signal?.aborted) return first;

  const next = await refreshAfterUnauthorized();
  if (!next || init.signal?.aborted) return first;
  return fetch(url, withBearer(init, next));
}
