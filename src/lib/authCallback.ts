import { stashPendingLink, tokenFromJoinUrl } from '@/lib/eventLinks';
import {
  applyAuthLink,
  classifyAuthUrl,
  type AuthExchange,
  type AuthAdoptResult,
} from '@/lib/recoveryLink';
import { supabase } from '@/lib/supabase';

export type AdoptResult = AuthAdoptResult | 'join';

const supabaseAuth: AuthExchange = {
  exchangeCodeForSession: (code) => supabase.auth.exchangeCodeForSession(code),
  verifyOtp: (args) => supabase.auth.verifyOtp(args),
  getSession: () => supabase.auth.getSession(),
  setSession: (tokens) => supabase.auth.setSession(tokens),
};

/**
 * Join links are stashed and redeemed after a session exists.
 * Recovery links exchange a code or token hash. A recovery outcome is the only
 * one that opens the new-password screen. Implicit tokens that are not a
 * recovery leave a live session in place.
 */
export async function adoptIncomingUrl(url: string, client: AuthExchange = supabaseAuth): Promise<AdoptResult> {
  const joinToken = tokenFromJoinUrl(url);
  if (joinToken) {
    await stashPendingLink(joinToken);
    return 'join';
  }
  return applyAuthLink(classifyAuthUrl(url), client);
}
