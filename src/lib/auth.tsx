import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

type Profile = {
  accountType: 'client' | 'event_guest' | 'staff' | null;
  clientId: string | null;
  eventGuestId: string | null;
  firstName: string;
};

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
        .select('account_type, client_id, event_guest_id')
        .eq('auth_user_id', uid)
        .maybeSingle();
      if (cancelled) return;

      let firstName = '';
      if (account?.client_id) {
        const { data: c } = await supabase.from('clients').select('first_name').eq('id', account.client_id).maybeSingle();
        firstName = c?.first_name ?? '';
      } else if (account?.event_guest_id) {
        const { data: g } = await supabase.from('event_guests').select('first_name').eq('id', account.event_guest_id).maybeSingle();
        firstName = g?.first_name ?? '';
      }
      if (cancelled) return;
      setProfile({
        accountType: (account?.account_type as Profile['accountType']) ?? null,
        clientId: account?.client_id ?? null,
        eventGuestId: account?.event_guest_id ?? null,
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
