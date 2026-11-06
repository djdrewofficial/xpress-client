import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform, type AppStateStatus } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Web static render (node) has no `window`. Skipping persisted auth there keeps
// the client from touching AsyncStorage during that pass. Native and the browser
// still persist the session.
const webServer = Platform.OS === 'web' && typeof window === 'undefined';

type AuthGlobals = typeof globalThis & {
  __xpressSupabase?: SupabaseClient;
  __xpressSupabaseAuthBound?: boolean;
};

const globals = globalThis as AuthGlobals;

function buildClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // AsyncStorage, not SecureStore. A Supabase session (JWT + user) is often
      // larger than SecureStore's 2048-byte limit; a failed write drops the
      // rotated refresh token and the next refresh revokes the session.
      storage: webServer ? undefined : AsyncStorage,
      autoRefreshToken: !webServer,
      persistSession: !webServer,
      detectSessionInUrl: false,
      // Email confirmation and password reset return a ?code= on the app link.
      // Existing refresh tokens keep working. This does not turn on magic-link login.
      flowType: 'pkce',
      // Official Supabase passkey API. The server still rejects calls until
      // passkeys are enabled for this project. This does not use a staff endpoint.
      experimental: { passkey: true },
    },
  });
}

// One client per JS runtime. Fast refresh would otherwise construct a second
// client on the same stored refresh token; both refresh, GoTrue treats the
// second use as reuse, and the session is revoked (session_not_found).
export const supabase = globals.__xpressSupabase ?? buildClient();
globals.__xpressSupabase = supabase;

// Supabase's React Native guidance: refresh only while the app is foregrounded,
// and register the listener once. `autoRefreshToken` starts the ticker at
// construction; this re-syncs it when iOS/Android moves between active and
// background. `unknown` is left alone so a not-yet-reported state doesn't
// stop a ticker that just started.
if (!webServer && Platform.OS !== 'web' && !globals.__xpressSupabaseAuthBound) {
  globals.__xpressSupabaseAuthBound = true;
  const syncRefresh = (state: AppStateStatus) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else if (state === 'background' || state === 'inactive') supabase.auth.stopAutoRefresh();
  };
  AppState.addEventListener('change', syncRefresh);
  syncRefresh(AppState.currentState);
}
