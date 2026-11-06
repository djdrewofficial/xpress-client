import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { claimEventInvites } from '@/lib/claimInvites';
import { hydrateMembership, noteAccountType, resetMembershipMemory } from '@/lib/membership';
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

const RESET_KEY = 'xpress.passwordResetPending';

type AuthState = {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  /** A recovery link was opened. The app stays on the new-password screen until it is saved. */
  pendingPasswordReset: boolean;
  markPasswordReset: () => void;
  clearPasswordReset: () => void;
  /** Re-read the account. Pass `{ claim: true }` to link invites again first. */
  reloadProfile: (opts?: { claim?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  profile: null,
  pendingPasswordReset: false,
  markPasswordReset: () => {},
  clearPasswordReset: () => {},
  reloadProfile: async () => {},
  signOut: async () => {},
});

function firstFromMetadata(session: Session): string {
  const meta = session.user.user_metadata ?? {};
  const given = typeof meta.given_name === 'string' ? meta.given_name.trim() : '';
  const full = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  return given || full.split(/\s+/).filter(Boolean)[0] || '';
}

async function readProfile(uid: string, session: Session): Promise<Profile> {
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
  if (!firstName) firstName = firstFromMetadata(session);
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
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);
  const profileReq = useRef(0);
  const hadSession = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const markPasswordReset = useCallback(() => {
    setPendingPasswordReset(true);
    AsyncStorage.setItem(RESET_KEY, '1').catch(() => {});
  }, []);

  const clearPasswordReset = useCallback(() => {
    setPendingPasswordReset(false);
    AsyncStorage.removeItem(RESET_KEY).catch(() => {});
  }, []);

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
      if (event === 'PASSWORD_RECOVERY') {
        setPendingPasswordReset(true);
        AsyncStorage.setItem(RESET_KEY, '1').catch(() => {});
      }
      if (event === 'SIGNED_OUT') setSession(null);
      else if (next) setSession(next);
      finish();
    });
    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = useCallback(async (uid: string, current: Session, withClaim: boolean) => {
    const req = ++profileReq.current;
    await hydrateMembership(uid);
    if (withClaim) {
      // Link an email invite before we decide whether this login has an event.
      // A missing route or a 503 does not block sign-in.
      await claimEventInvites();
    }
    if (req !== profileReq.current) return;
    const next = await readProfile(uid, current);
    if (req !== profileReq.current) return;
    noteAccountType(next.accountType);
    setProfile(next);
    setReadyFor(uid);
  }, []);

  useEffect(() => {
    const current = sessionRef.current;
    const uid = current?.user.id;
    if (!uid || !current) {
      profileReq.current += 1;
      resetMembershipMemory();
      setProfile(null);
      setReadyFor(null);
      if (hadSession.current) {
        hadSession.current = false;
        setPendingPasswordReset(false);
        AsyncStorage.removeItem(RESET_KEY).catch(() => {});
      }
      return;
    }
    hadSession.current = true;
    let cancelled = false;
    let done = false;
    const watchdog = setTimeout(() => {
      if (cancelled || done) return;
      const fallback: Profile = {
        accountType: null,
        clientId: null,
        eventGuestId: null,
        employeeId: null,
        permissionTier: null,
        firstName: firstFromMetadata(current),
      };
      noteAccountType(null);
      setProfile((prev) => prev ?? fallback);
      setReadyFor((prev) => prev ?? uid);
    }, 12000);
    AsyncStorage.getItem(RESET_KEY)
      .then((value) => {
        if (!cancelled && value === '1') setPendingPasswordReset(true);
      })
      .catch(() => {});
    loadProfile(uid, current, true).finally(() => {
      done = true;
      clearTimeout(watchdog);
    });
    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
  }, [session?.user.id, loadProfile]);

  // Apple returns the name only on the first sign-in, and that write can land
  // just after the account read. Fill an empty first name without claiming again.
  const metaName = session?.user.user_metadata?.given_name || session?.user.user_metadata?.full_name;
  useEffect(() => {
    if (!session || !metaName) return;
    const next = firstFromMetadata(session);
    if (!next) return;
    setProfile((prev) => (prev && !prev.firstName ? { ...prev, firstName: next } : prev));
  }, [session, metaName]);

  const reloadProfile = useCallback(async (opts?: { claim?: boolean }) => {
    const current = sessionRef.current;
    const uid = current?.user.id;
    if (!current || !uid) return;
    await loadProfile(uid, current, opts?.claim === true);
  }, [loadProfile]);

  // Stay on the splash until the account read finishes, so a brand-new login
  // does not flash an empty planner before claim returns. Signed out, only
  // the session check matters.
  const loading = !sessionReady || (session != null && readyFor !== session.user.id);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        profile,
        pendingPasswordReset,
        markPasswordReset,
        clearPasswordReset,
        reloadProfile,
        // Local scope ends this device only. The default (global) revokes every
        // session for the user, including XOS in the browser.
        signOut: () => {
          profileReq.current += 1;
          resetMembershipMemory();
          setProfile(null);
          setReadyFor(null);
          setPendingPasswordReset(false);
          AsyncStorage.removeItem(RESET_KEY).catch(() => {});
          return supabase.auth.signOut({ scope: 'local' }).then(() => {});
        },
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
