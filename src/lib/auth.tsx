import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

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

/** Plain employees NEVER see financials/contracts on mobile; admins/sales may. */
export function staffSeesFinancials(p: Profile | null): boolean {
  return p?.accountType === 'staff' && p.permissionTier !== 'employee';
}

type AuthState = {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  profile: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setLoading(false);
    };
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        finish();
      })
      // never leave the app on a blank loading screen if getSession rejects
      .catch(finish);
    // ...or if it *hangs* (never resolves and never rejects — a real release-build
    // failure mode with AsyncStorage): force past the splash after 8s.
    const timer = setTimeout(finish, 8000);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) {
      setProfile(null);
      return;
    }
    // Guard against a stale resolve: if the session changes before this finishes,
    // don't let an earlier user's profile overwrite the newer one.
    let cancelled = false;
    (async () => {
      const { data: account } = await supabase
        .from('accounts')
        .select('account_type, client_id, event_guest_id, employee_id')
        .eq('auth_user_id', uid)
        .maybeSingle();
      if (cancelled) return;

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
      if (cancelled) return;
      setProfile({
        accountType: (account?.account_type as Profile['accountType']) ?? null,
        clientId: account?.client_id ?? null,
        eventGuestId: account?.event_guest_id ?? null,
        employeeId: account?.employee_id ?? null,
        permissionTier,
        firstName,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  return (
    <AuthContext.Provider
      value={{ session, loading, profile, signOut: () => { setProfile(null); return supabase.auth.signOut().then(() => {}); } }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
