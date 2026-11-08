import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Stack, useRouter, useSegments, type ErrorBoundaryProps } from 'expo-router';
import { LogBox, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts, DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';

import { adoptIncomingUrl } from '@/lib/authCallback';
import { subscribeAuthUrls } from '@/lib/authLinkQueue';
import { AuthProvider, useAuth } from '@/lib/auth';
import { resetNavigationAction, rootAuthDestination } from '@/lib/recoveryGate';
import { finishAuthAdopt, startAuthAdopt } from '@/lib/recoveryLink';
import { LocaleProvider } from '@/lib/i18n';
import { BrandSplash } from '@/components/BrandSplash';
import { patchTextFonts } from '@/lib/fontPatch';

// The Timeline's nested drag lists (react-native-reorderable-list's
// NestedReorderableList with scrollable=false inside ScrollViewContainer) are the
// library's intended pattern; RN's generic "VirtualizedLists nested in a
// ScrollView" warning is a false positive here (no windowing to break), so quiet
// just that one message. Dev-only — LogBox never renders in production anyway.
LogBox.ignoreLogs(['VirtualizedLists should never be nested inside plain ScrollViews']);

// Route every <Text> through Montserrat. Guarded so a failure here can never
// take down module evaluation (which would white-screen with no error).
let patchError: unknown = null;
try {
  patchTextFonts();
} catch (e) {
  patchError = e;
}

function ErrorScreen({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = error as { message?: string; stack?: string } | undefined;
  return (
    <View style={{ flex: 1, backgroundColor: '#160f2b', padding: 24, paddingTop: 72 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 }}>Startup error</Text>
      <ScrollView style={{ flex: 1, marginBottom: 12 }}>
        <Text selectable style={{ color: '#f6b8b8', fontSize: 13, lineHeight: 19 }}>
          {String(e?.message ?? error)}
          {'\n\n'}
          {String(e?.stack ?? '')}
        </Text>
      </ScrollView>
      {onRetry ? (
        <Pressable onPress={onRetry} style={{ backgroundColor: '#4b328e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Animated brand splash (the [X] strokes meeting). Keeps the `label` for
// stuck-stage diagnosis: a labeled purple screen means we reached JS but a
// stage hung; a blank white screen means module evaluation threw before React.
function Splash({ label }: { label: string }) {
  return <BrandSplash label={label} />;
}

// expo-router's per-route boundary (catches errors inside screens).
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorScreen error={error} onRetry={retry} />;
}

// Top-level class boundary — catches render errors in the ROOT PROVIDERS
// (GestureHandler / Keyboard / Auth), which sit above expo-router's boundary.
class RootBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    if (this.state.error) return <ErrorScreen error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}

const adoptedUrls = new Set<string>();

let queuedReset = false;
const resetQueue = new Set<() => void>();

function queueResetScreen() {
  queuedReset = true;
  resetQueue.forEach((notify) => notify());
}

function clearQueuedReset() {
  queuedReset = false;
}

function subscribeResetQueue(notify: () => void) {
  resetQueue.add(notify);
  return () => {
    resetQueue.delete(notify);
  };
}

function IncomingLinks() {
  const { markPasswordReset } = useAuth();
  const markReset = useRef(markPasswordReset);
  markReset.current = markPasswordReset;
  useEffect(() => {
    const handle = async (url: string) => {
      if (adoptedUrls.has(url)) return;
      adoptedUrls.add(url);
      startAuthAdopt();
      try {
        const result = await adoptIncomingUrl(url);
        if (result.status === 'recovery' && result.userId) markReset.current(result.userId);
        if (result.status === 'expired') queueResetScreen();
      } finally {
        finishAuthAdopt();
      }
    };
    return subscribeAuthUrls((url) => {
      handle(url).catch(() => {});
    });
  }, []);
  return null;
}

function RecoveryRedirect() {
  const { session, loading, pendingPasswordReset } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [queued, setQueued] = useState(queuedReset);
  useEffect(() => subscribeResetQueue(() => setQueued(queuedReset)), []);
  const destination = rootAuthDestination({
    loading,
    hasSession: !!session,
    pendingPasswordReset,
  });
  useEffect(() => {
    const action = resetNavigationAction({
      destination,
      currentPath: segments.join('/'),
      queued,
    });
    if (action !== 'replace') return;
    clearQueuedReset();
    setQueued(false);
    router.replace('/auth/reset');
  }, [destination, queued, segments, router]);
  return null;
}

function RootNavigator() {
  const { session, loading, pendingPasswordReset } = useAuth();
  const destination = rootAuthDestination({
    loading,
    hasSession: !!session,
    pendingPasswordReset,
  });
  if (destination === 'splash') return <Splash label="Connecting…" />;
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Protected guard={destination === 'home'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={destination === 'signed-out'}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="auth/forgot-password" />
        </Stack.Protected>
        <Stack.Screen name="auth/reset" />
        <Stack.Screen name="auth/confirm" />
        <Stack.Screen name="auth/set-password" />
        <Stack.Screen name="j/[token]" />
      </Stack>
      <RecoveryRedirect />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });
  // Never let a slow/stuck font load white-screen the app: proceed after a short
  // wait even if useFonts neither resolves nor errors (release-build failure mode).
  const [fontTimedOut, setFontTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, []);
  // Hold the splash long enough for the [X] reveal to play in full, even when
  // fonts + auth resolve almost instantly on a warm start.
  const [minSplash, setMinSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setMinSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);
  if ((!fontsLoaded && !fontError && !fontTimedOut) || minSplash) return <Splash label="Loading…" />;

  return (
    <RootBoundary>
      {patchError ? (
        <ErrorScreen error={patchError} />
      ) : (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AuthProvider>
              <LocaleProvider>
                <StatusBar style="auto" />
                <IncomingLinks />
                <RootNavigator />
              </LocaleProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      )}
    </RootBoundary>
  );
}
