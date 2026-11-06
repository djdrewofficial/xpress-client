import { stashPendingLink, tokenFromJoinUrl } from '@/lib/eventLinks';
import { supabase } from '@/lib/supabase';

const HASH_TYPES = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const;
type HashType = (typeof HASH_TYPES)[number];

export type AdoptResult = 'recovery' | 'session' | 'join' | 'ignored';

function isHashType(value: string): value is HashType {
  return (HASH_TYPES as readonly string[]).includes(value);
}

export function parseUrlParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hash = url.includes('#') ? url.split('#')[1] ?? '' : '';
  const withoutHash = url.split('#')[0] ?? '';
  const query = withoutHash.includes('?') ? withoutHash.split('?')[1] ?? '' : '';
  for (const raw of [query, hash]) {
    if (!raw) continue;
    for (const pair of raw.split('&')) {
      const [key, value] = pair.split('=');
      if (!key) continue;
      out[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
    }
  }
  return out;
}

/**
 * Join links are stashed and redeemed after a session exists.
 * Auth links exchange a code or token hash. Implicit tokens are applied only
 * when this device has no session, so a stale link cannot clear a live one.
 */
export async function adoptIncomingUrl(url: string): Promise<AdoptResult> {
  const joinToken = tokenFromJoinUrl(url);
  if (joinToken) {
    await stashPendingLink(joinToken);
    return 'join';
  }
  const params = parseUrlParams(url);
  const type = params.type ?? '';
  try {
    if (params.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error || !data.session) return 'ignored';
      return type === 'recovery' ? 'recovery' : 'session';
    }
    if (params.token_hash && isHashType(type)) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: params.token_hash, type });
      if (error || !data.session) return 'ignored';
      return type === 'recovery' ? 'recovery' : 'session';
    }
    if (params.access_token && params.refresh_token) {
      const existing = await supabase.auth.getSession();
      // A live session wins. setSession on a stale link token can make GoTrue
      // drop the session that is already on this device.
      if (existing.data.session) return 'session';
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) return 'ignored';
      return type === 'recovery' ? 'recovery' : 'session';
    }
  } catch {
    return 'ignored';
  }
  return 'ignored';
}
