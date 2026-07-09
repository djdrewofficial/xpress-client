import { Component, useEffect, useState, type ReactNode } from 'react';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';

import { AuthProvider, useAuth } from '@/lib/auth';
import { BrandSplash } from '@/components/BrandSplash';
import { patchTextFonts } from '@/lib/fontPatch';

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

function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading) return <Splash label="Connecting…" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      {/* Always reachable — invite/reset deep links land here (xpressclient://auth/set-password). */}
      <Stack.Screen name="auth/set-password" />
      {/* In-app password reset (email → code → new password), from the login screen. */}
      <Stack.Screen name="auth/forgot-password" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSerifDisplay_400Regular,
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
              <StatusBar style="auto" />
              <RootNavigator />
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      )}
    </RootBoundary>
  );
}
