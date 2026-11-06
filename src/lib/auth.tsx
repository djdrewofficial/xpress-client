import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { claimEventInvites, type ClaimResult } from '@/lib/eventAccess';
import { supabase } from '@/lib/supabase';

export type PermissionTier = 'master_admin' | 'salesperson' | 'employee';

type Profile = {
  accountType: 'client' | 'event_guest' | 'staff' | null;
  clientId: string | null;
  eventGuestId: string | null;
  employeeId: string | null;
  /** Staff role. Drives what a staff member may see on mobile (all events vs. assigned; financials). */
  permissionTier: PermissionTier | null;
  firstName: string;
};

/** Admins and salespeople see every event; plain employees see only assigned ones. */
export function staffSeesAllEvents(p: Profile | null): boolean {
  return p?.accountType === 'staff' && (p.permissionTier === 'master_admin' || p.permissionTier === 'salesperson');
}

/** Plain employees NEVER see financials/contracts on mobile; admins/sales may.
    Default-deny: a null/unknown tier is treated as NOT authorized (mirrors
    staffSeesAllEvents) so a missing employees row can't leak financials. */
export function staffSeesFinancials(p: Profile | null): boolean {
  return p?.accountType === 'staff' && (p.permissionTier === 'master_admin' || p.permissionTier === 'salesperson');
}

const EMPTY_CLAIM: ClaimResult = { reason: 'unavailable', eventIds: [] };

type AuthState = {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  /** Result of the claim that ran before this profile was loaded. */
  claim: ClaimResult;
  /** Re-read the account. Pass `{ claim: true }` to link invites again first. */
  reloadProfile: (opts?: { claim?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  profile: null,
  claim: EMPTY_CLAIM,
  reloadProfile: async () => {},
  signOut: async () => {},
});

async function readProfile(uid: string): Promise<Profile> {
  const { data: account } = await supabase
    .from('accounts')
    .select('account_type, client_id, event_guest_id, employee_id')
    .eq('auth_user_id', uid)
    .maybeSingle();

  let firstName = '';
  let permissionTier: PermissionTier | null = null;
  if (account?.client_id) {
    const { data: c } = await supabase.from('clients').select('first_name').eq('id', account.client_id).maybeSingle();
    firstName = c?.first_name ?? '';
  } else if (account?.event_guest_id) {
    const { data: g } = await supabase.from('event_guests').select('first_name').eq('id', account.event_guest_id).maybeSingle();
    firstName = g?.first_name ?? '';
  } else if (account?.employee_id) {
    const { data: e } = await supabase.from('employees').select('first_name, permission_tier').eq('id', account.employee_id).maybeSingle();
    firstName = e?.first_name ?? '';
    permissionTier = (e?.permission_tier as PermissionTier | undefined) ?? null;
  }
  return {
    accountType: (account?.account_type as Profile['accountType']) ?? null,
    clientId: account?.client_id ?? null,
    eventGuestId: account?.event_guest_id ?? null,
    employeeId: account?.employee_id ?? null,
    permissionTier,
    firstName,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [claim, setClaim] = useState<ClaimResult>(EMPTY_CLAIM);
  const profileReq = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setSessionReady(true);
    };
    // A null getSession result must not wipe a session the listener already
    // applied, and a storage/network rejection is not a sign-out. The login
    // screen is shown only when there is still no session after this settles.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) setSession(data.session);
        finish();
      })
      .catch(finish);
    // ...or if it *hangs* (never resolves and never rejects — a real release-build
    // failure mode with AsyncStorage): force past the splash after 8s.
    const timer = setTimeout(finish, 8000);
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') setSession(null);
      else if (next) setSession(next);
      finish();
    });
    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = useCallback(async (uid: string, withClaim: boolean) => {
    const req = ++profileReq.current;
    if (withClaim) {
      // Right after the one-time-code session exists, and again on a cold start,
      // link invites before we read the account or choose a screen.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const result = await claimEventInvites(controller.signal);
      clearTimeout(timer);
      if (req !== profileReq.current) return;
      setClaim(result);
    }
    const next = await readProfile(uid);
    if (req !== profileReq.current) return;
    setProfile(next);
    setReadyFor(uid);
  }, []);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) {
      profileReq.current += 1;
      setProfile(null);
      setClaim(EMPTY_CLAIM);
      setReadyFor(null);
      return;
    }
    loadProfile(uid, true);
  }, [session?.user.id, loadProfile]);

  const reloadProfile = useCallback(async (opts?: { claim?: boolean }) => {
    const uid = sessionRef.current?.user.id;
    if (!uid) return;
    await loadProfile(uid, opts?.claim === true);
  }, [loadProfile]);

  // Stay on the splash until claim + the account read finish, so routing sees
  // a partner who was just linked. Signed out, only the session check matters.
  const loading = !sessionReady || (session != null && readyFor !== session.user.id);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        profile,
        claim,
        reloadProfile,
        // Local scope ends this device only. The default (global) revokes every
        // session for the user, including XOS in the browser.
        signOut: () => {
          profileReq.current += 1;
          setProfile(null);
          setClaim(EMPTY_CLAIM);
          setReadyFor(null);
          return supabase.auth.signOut({ scope: 'local' }).then(() => {});
        },
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
