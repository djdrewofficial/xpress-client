import { stashPendingLink, tokenFromJoinUrl } from '@/lib/eventLinks';
import {
  applyAuthLink,
  classifyAuthUrl,
  sessionUserId,
  type AuthExchange,
  type AuthAdoptResult,
} from '@/lib/recoveryLink';
import { supabase } from '@/lib/supabase';

export type AdoptResult = AuthAdoptResult | 'join';

export type AdoptOutcome = {
  status: AdoptResult;
  /** Present only when this call established the recovery session. */
  userId: string | null;
};

const supabaseAuth: AuthExchange = {
  exchangeCodeForSession: (code) => supabase.auth.exchangeCodeForSession(code),
  verifyOtp: (args) => supabase.auth.verifyOtp(args),
  getSession: () => supabase.auth.getSession(),
};

/**
 * Join links are stashed and redeemed after a session exists.
 * Recovery links exchange a code or token hash. A recovery outcome is the only
 * one that opens the new-password screen, and only for the user id it established.
 * access_token fragments are ignored. They are not a sign-in path.
 */
export async function adoptIncomingUrl(url: string, client: AuthExchange = supabaseAuth): Promise<AdoptOutcome> {
  const joinToken = tokenFromJoinUrl(url);
  if (joinToken) {
    await stashPendingLink(joinToken);
    return { status: 'join', userId: null };
  }
  const status = await applyAuthLink(classifyAuthUrl(url), client);
  if (status !== 'recovery') return { status, userId: null };
  const current = await client.getSession();
  const userId = sessionUserId(current.data.session);
  if (!userId) return { status: 'ignored', userId: null };
  return { status: 'recovery', userId };
}
